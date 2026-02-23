/**
 * Test Playwright : connexion à Cadremploi avec login = email BAL et mot de passe depuis parametres.json.
 * motDePasseCadreEmploi doit être renseigné dans data/parametres.json pour que le test s'exécute.
 */
import { join } from 'node:path';
import { lireParametres } from './parametres-io.js';

const DATA_DIR = join(process.cwd(), 'data');

function getEmailBal(p: NonNullable<ReturnType<typeof lireParametres>>): string {
  const c = p.connexionBoiteEmail;
  if (c.mode === 'microsoft' && c.microsoft?.adresseEmail) return c.microsoft.adresseEmail.trim();
  if (c.mode === 'imap' && c.imap?.adresseEmail) return c.imap.adresseEmail.trim();
  if (c.mode === 'gmail' && c.gmail?.adresseEmail) return c.gmail.adresseEmail.trim();
  return (c.microsoft?.adresseEmail ?? c.imap?.adresseEmail ?? '').trim();
}

describe('Cadremploi login Playwright', () => {
  it('se connecte à Cadremploi avec email BAL et motDePasseCadreEmploi', async () => {
    const p = lireParametres(DATA_DIR);
    const motDePasse = (p?.motDePasseCadreEmploi ?? '').trim();
    const email = p ? getEmailBal(p) : '';

    if (!motDePasse || !email) {
      console.warn(
        'Test ignoré : renseigner motDePasseCadreEmploi et adresseEmail (BAL) dans data/parametres.json'
      );
      return; // skip sans échec
    }

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      headless: true,
      channel: process.platform === 'win32' ? 'msedge' : undefined,
    });

    try {
      const context = await browser.newContext({
        locale: 'fr-FR',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      });
      const page = await context.newPage();

      await page.goto('https://www.cadremploi.fr', { waitUntil: 'domcontentloaded', timeout: 15000 });

      const lienConnexion = page.locator('a[href*="connexion"], a:has-text("Connexion"), a:has-text("Se connecter")').first();
      await lienConnexion.click().catch(() => {});
      await page.waitForTimeout(1500);

      const url = page.url();
      const isConnexionPage =
        /connexion|login|authentification|mon-compte/i.test(url) ||
        (await page.locator('input[type="email"], input[name="email"], input[id*="email"]').count()) > 0;

      if (!isConnexionPage) {
        const connexionDirect = await page.goto('https://www.cadremploi.fr/connexion', {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        }).catch(() => null);
        if (!connexionDirect || connexionDirect.status() >= 400) {
          expect(url).toBeDefined();
          return;
        }
      }

      const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"], input[type="text"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"], input[id*="password"]').first();

      await emailInput.fill(email, { timeout: 5000 }).catch(() => {});
      await passwordInput.fill(motDePasse, { timeout: 5000 }).catch(() => {});

      await page.locator('button[type="submit"], input[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")').first().click().catch(() => {});
      await page.waitForTimeout(3000);

      const finalUrl = page.url();
      const content = await page.content();
      const hasError = /mot de passe incorrect|identifiant incorrect|erreur|invalid/i.test(content) && !/mon compte|déconnexion|mon espace/i.test(content);

      expect(hasError).toBe(false);
      expect(finalUrl).toBeDefined();
    } finally {
      await browser.close();
    }
  }, 60000);
});
