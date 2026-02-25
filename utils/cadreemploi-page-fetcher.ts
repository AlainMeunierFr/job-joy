/**
 * Récupération du HTML d'une page d'offre Cadre emploi via Playwright.
 * Utilisé en fallback quand fetch() renvoie 403 (anti-crawler).
 * US-4.6 : accepte un HtmlFetcher optionnel pour le mode Electron packagé (sans Playwright).
 */

import type { HtmlFetcher } from './electron-html-fetcher.js';

export type CadreEmploiPageResult = { html: string } | { error: string };

const CADREMPLOI_URL_PATTERN = /cadremploi\.fr|emails\.alertes\.cadremploi\.fr/i;

/**
 * Charge l'URL avec Playwright (ou via htmlFetcher si fourni) et retourne le HTML de la page.
 */
export async function fetchCadreEmploiPage(
  url: string,
  htmlFetcher?: HtmlFetcher
): Promise<CadreEmploiPageResult> {
  const u = (url ?? '').trim();
  if (!u) return { error: 'URL vide.' };
  if (!CADREMPLOI_URL_PATTERN.test(u)) {
    return { error: 'URL non reconnue comme page Cadre emploi.' };
  }

  if (htmlFetcher) {
    try {
      const html = await htmlFetcher.fetchHtml(u);
      if (!html || html.length < 500) {
        return { error: 'Page Cadre emploi vide ou trop courte après chargement.' };
      }
      return { html };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: `Erreur Playwright Cadre emploi: ${message}` };
    }
  }

  let browser: Awaited<ReturnType<Awaited<typeof import('playwright')>['chromium']['launch']>> | null = null;

  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      channel: process.platform === 'win32' ? 'msedge' : undefined,
    });
    const context = await browser.newContext({
      locale: 'fr-FR',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const html = await page.content();
    if (!html || html.length < 500) {
      return { error: 'Page Cadre emploi vide ou trop courte après chargement.' };
    }
    return { html };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Erreur Playwright Cadre emploi: ${message}` };
  } finally {
    if (browser) await browser.close();
  }
}
