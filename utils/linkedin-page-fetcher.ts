/**
 * Récupération du contenu d'une page d'offre LinkedIn en mode invité (Playwright).
 * Utilisé par le plugin Stage 2 LinkedIn ; logique issue du POC scripts/poc-linkedin-public.cjs.
 * US-4.6 : accepte un HtmlFetcher optionnel pour le mode Electron packagé (sans Playwright).
 */

import type { HtmlFetcher } from './electron-html-fetcher.js';
import { parseHTML } from 'linkedom';

export type LinkedinPageResult =
  | { offerText: string; companyText: string }
  | { error: string };

const CLOSE_POPUP_SELECTORS = [
  "button[aria-label='Ignorer']",
  "button.modal__dismiss",
  "button.contextual-sign-in-modal__modal-dismiss-icon",
  "button.artdeco-modal__dismiss",
  "button[aria-label*='Dismiss' i]",
  "button[aria-label*='Close' i]",
  "button[aria-label*='Fermer' i]",
  "button[aria-label*='Refuser' i]",
  "button:has-text('No thanks')",
  "button:has-text('Non merci')",
  "button:has-text('Not now')",
  "button:has-text('Plus tard')",
  ".contextual-sign-in-modal button[data-tracking-control-name*='dismiss']",
];

function normalizeTextPreserveLines(text: string): string {
  if (!text || typeof text !== "string") return "";
  let t = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  t = t.replace(/\s*(Show less|Voir moins)\s*$/i, "").trim();
  return t;
}

function splitOfferAndCompany(descriptionText: string): { offerText: string; companyText: string } {
  const text = normalizeTextPreserveLines(descriptionText);
  if (!text) return { offerText: "", companyText: "" };
  const companyMarkers = [
    "What Life at ",
    "Life at ",
    "Who we are",
    "À propos de l'entreprise",
    "About the company",
  ];
  const lower = text.toLowerCase();
  let splitIndex = -1;
  for (const marker of companyMarkers) {
    const idx = lower.indexOf(marker.toLowerCase());
    if (idx >= 0 && (splitIndex < 0 || idx < splitIndex)) splitIndex = idx;
  }
  if (splitIndex < 0) return { offerText: text, companyText: "" };
  return {
    offerText: normalizeTextPreserveLines(text.slice(0, splitIndex)),
    companyText: normalizeTextPreserveLines(text.slice(splitIndex)),
  };
}

/**
 * Extrait description et section entreprise depuis le HTML d'une page LinkedIn (parsing Node, pas Playwright).
 */
function extractFromLinkedInHtml(html: string): { descriptionText: string; companyText: string } {
  const { document } = parseHTML(html);
  const descriptionSelectors = [
    ".description__text .show-more-less-html__markup",
    ".show-more-less-html__markup",
    ".description__text",
    ".jobs-description-content__text",
    "[data-test-id='job-details']",
  ];
  const candidates: string[] = [];
  for (const selector of descriptionSelectors) {
    const nodes = document.querySelectorAll(selector);
    for (const node of nodes) {
      const raw = (node as HTMLElement).innerText?.trim() ?? (node.textContent ?? "").trim();
      if (raw.length >= 200) candidates.push(raw);
    }
  }
  let descriptionText = "";
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.length - a.length);
    descriptionText = candidates[0] ?? "";
  }
  if (!descriptionText) {
    const mainSelectors = ["[role='main']", ".scaffold-layout__main", "main"];
    for (const sel of mainSelectors) {
      const main = document.querySelector(sel);
      if (!main) continue;
      const raw = (main as HTMLElement).innerText?.trim() ?? (main.textContent ?? "").trim();
      if (
        raw.length >= 500 &&
        /Contexte|missions|Profil|CDI|CDD|Postuler|Apply|entreprise à mission|énergét|solaire/i.test(raw)
      ) {
        descriptionText = raw;
        break;
      }
    }
  }

  const companySelectors = [
    ".jobs-company__company-info",
    ".jobs-company",
    "[data-test-id='about-company']",
    "section.jobs-company",
    ".job-details-how-you-match",
  ];
  let companyText = "";
  for (const selector of companySelectors) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const t = ((el as HTMLElement).innerText ?? el.textContent ?? "").trim();
    if (t.length < 100) continue;
    if (
      /\d+[\s\u00a0]*abonnés/i.test(t) ||
      /\d+[\s\u00a0]*employés/i.test(t) ||
      /Suivre|Follow/i.test(t) ||
      /Conseil|externalisation|provides digitally|digitally enhanced/i.test(t)
    ) {
      companyText = t;
      break;
    }
  }
  if (!companyText) {
    const all = document.querySelectorAll(
      "section, aside, [class*='company'], [class*='Company'], [class*='about']"
    );
    for (const el of all) {
      const t = ((el as HTMLElement).innerText ?? el.textContent ?? "").trim();
      if (
        t.length >= 200 &&
        (/\d+[\s\u00a0]*abonnés/i.test(t) || /\d+[\s\u00a0]*employés/i.test(t)) &&
        (/Suivre|Follow/i.test(t) ||
          /Conseil|externalisation|provides digitally|digitally enhanced/i.test(t))
      ) {
        companyText = t;
        break;
      }
    }
  }

  return {
    descriptionText: normalizeTextPreserveLines(descriptionText),
    companyText: normalizeTextPreserveLines(companyText),
  };
}

/**
 * Récupère le texte "À propos de l'offre" et "À propos de l'entreprise" depuis une URL LinkedIn Jobs.
 * Si htmlFetcher est fourni (mode Electron packagé), utilise le HTML récupéré par le fetcher sans Playwright.
 * Sinon lance un navigateur headless Playwright.
 */
export async function fetchLinkedinJobPage(
  url: string,
  htmlFetcher?: HtmlFetcher
): Promise<LinkedinPageResult> {
  const u = (url ?? "").trim();
  if (!u) return { error: "URL vide." };
  if (!/linkedin\.com\/jobs\/view\//i.test(u)) {
    return { error: "URL non reconnue comme page LinkedIn Jobs." };
  }

  if (htmlFetcher) {
    try {
      const html = await htmlFetcher.fetchHtml(u);
      const { descriptionText, companyText: companySectionText } = extractFromLinkedInHtml(html);
      const { offerText, companyText: inlineCompany } = splitOfferAndCompany(descriptionText);
      const companyText = companySectionText.length > 0 ? companySectionText : inlineCompany;
      const extractionFailed = descriptionText.length < 400 || offerText.length < 300;
      if (extractionFailed && companyText.length < 100) {
        return {
          error:
            "Description non récupérée (mur connexion ou contenu non disponible pour cette offre).",
        };
      }
      return { offerText, companyText };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: `Erreur LinkedIn: ${message}` };
    }
  }

  let browser: Awaited<ReturnType<Awaited<typeof import("playwright")>["chromium"]["launch"]>> | null = null;

  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({
      headless: true,
      channel: process.platform === "win32" ? "msedge" : undefined,
    });
    const context = await browser.newContext({
      locale: "fr-FR",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1400, height: 900 });

    await page.goto(u, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    for (let i = 0; i < 5; i += 1) {
      const clicked = await clickFirstVisible(page, [
        ".artdeco-global-alert button:has-text('Refuser')",
        ".artdeco-global-alert button:has-text('Reject')",
        "button.artdeco-global-alert-action:has-text('Refuser')",
        "button:has-text('Refuser')",
        "button:has-text('Reject')",
      ]);
      if (clicked) break;
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(500);

    await closeLinkedInPopup(page);
    await page.waitForTimeout(400);

    await page.evaluate(() => {
      const main =
        document.querySelector("[role='main']") ||
        document.querySelector(".scaffold-layout__main") ||
        document.body;
      if (main) (main as HTMLElement).scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(300);

    await clickFirstVisible(page, [
      "button:has-text('Show more')",
      "button:has-text('Voir plus')",
      "button:has-text('Afficher plus')",
      "a:has-text('Show more')",
      "a:has-text('Voir plus')",
    ]);
    if (!(await clickFirstByRegexText(page, /show more|voir plus|afficher plus|plus de détails/i))) {
      // optional
    }
    await closeLinkedInPopup(page);
    await page.waitForTimeout(800);

    const descriptionText = await extractJobDescription(page);
    const { offerText, companyText: inlineCompany } = splitOfferAndCompany(descriptionText);
    const companySectionText = await extractCompanySection(page);
    const companyText = companySectionText.length > 0 ? companySectionText : inlineCompany;

    const extractionFailed = descriptionText.length < 400 || offerText.length < 300;
    if (extractionFailed && companyText.length < 100) {
      return {
        error:
          "Description non récupérée (mur connexion ou contenu non disponible pour cette offre).",
      };
    }

    return { offerText, companyText };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Erreur LinkedIn: ${message}` };
  } finally {
    if (browser) await browser.close();
  }
}

async function clickFirstVisible(
  page: { locator: (s: string) => { first: () => { count: () => Promise<number>; isVisible: (o: { timeout: number }) => Promise<boolean>; click: (o: { timeout: number }) => Promise<void> } } },
  selectors: string[]
): Promise<string | null> {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if ((await loc.count()) === 0) continue;
    try {
      if (await loc.isVisible({ timeout: 1000 })) {
        await loc.click({ timeout: 3000 });
        return selector;
      }
    } catch {
      // continue
    }
  }
  return null;
}

async function clickInAllFrames(
  page: { frames: () => { locator: (s: string) => { first: () => { count: () => Promise<number>; isVisible: (o: { timeout: number }) => Promise<boolean>; click: (o: { timeout: number }) => Promise<void> } } }[] },
  selectors: string[]
): Promise<string | null> {
  for (const frame of page.frames()) {
    for (const selector of selectors) {
      const loc = frame.locator(selector).first();
      if ((await loc.count()) === 0) continue;
      try {
        if (await loc.isVisible({ timeout: 800 })) {
          await loc.click({ timeout: 2500 });
          return `frame:${selector}`;
        }
      } catch {
        // continue
      }
    }
  }
  return null;
}

async function closeLinkedInPopup(page: {
  locator: (s: string) => { first: () => { count: () => Promise<number>; isVisible: (o: { timeout: number }) => Promise<boolean>; click: (o: { timeout: number }) => Promise<void> } };
  frames: () => { locator: (s: string) => { first: () => { count: () => Promise<number>; isVisible: (o: { timeout: number }) => Promise<boolean>; click: (o: { timeout: number }) => Promise<void> } } }[];
  waitForTimeout: (ms: number) => Promise<void>;
  keyboard: { press: (k: string) => Promise<void> };
}): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    const closed = await clickFirstVisible(page, CLOSE_POPUP_SELECTORS);
    if (closed) return;
    const closedFrame = await clickInAllFrames(page, CLOSE_POPUP_SELECTORS);
    if (closedFrame) return;
    await page.waitForTimeout(200);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}

async function clickFirstByRegexText(
  page: { evaluate: (fn: (pattern: string) => string | null, pattern: string) => Promise<string | null> },
  regex: RegExp
): Promise<string | null> {
  return page.evaluate(
    (pattern: string) => {
      const re = new RegExp(pattern, "i");
      const candidates = Array.from(document.querySelectorAll("button, a, [role='button']"));
      for (const el of candidates) {
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const visible =
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          rect.width > 0 &&
          rect.height > 0;
        if (visible && re.test(text)) {
          (el as HTMLElement).click();
          return text;
        }
      }
      return null;
    },
    regex.source
  );
}

async function extractJobDescription(page: {
  evaluate: (fn: () => string) => Promise<string>;
}): Promise<string> {
  const description = await page.evaluate(() => {
    const selectors = [
      ".description__text .show-more-less-html__markup",
      ".show-more-less-html__markup",
      ".description__text",
      ".jobs-description-content__text",
      "[data-test-id='job-details']",
    ];
    const isVisible = (el: Element) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const candidates: string[] = [];
    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector);
      for (const node of nodes) {
        if (!isVisible(node)) continue;
        const raw = (node as HTMLElement).innerText?.trim() ?? (node.textContent ?? "").trim();
        if (raw.length >= 200) candidates.push(raw);
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.length - a.length);
      return candidates[0] ?? "";
    }
    const mainSelectors = ["[role='main']", ".scaffold-layout__main", "main"];
    for (const sel of mainSelectors) {
      const main = document.querySelector(sel);
      if (!main || !isVisible(main)) continue;
      const raw = (main as HTMLElement).innerText?.trim() ?? (main.textContent ?? "").trim();
      if (
        raw.length >= 500 &&
        /Contexte|missions|Profil|CDI|CDD|Postuler|Apply|entreprise à mission|énergét|solaire/i.test(raw)
      )
        return raw;
    }
    return "";
  });
  return normalizeTextPreserveLines(description);
}

async function extractCompanySection(page: {
  evaluate: (fn: () => string) => Promise<string>;
}): Promise<string> {
  const companyText = await page.evaluate(() => {
    const isVisible = (el: Element) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const selectors = [
      ".jobs-company__company-info",
      ".jobs-company",
      "[data-test-id='about-company']",
      "section.jobs-company",
      ".job-details-how-you-match",
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (!el || !isVisible(el)) continue;
      const t = ((el as HTMLElement).innerText ?? el.textContent ?? "").trim();
      if (t.length < 100) continue;
      if (
        /\d+[\s\u00a0]*abonnés/i.test(t) ||
        /\d+[\s\u00a0]*employés/i.test(t) ||
        /Suivre|Follow/i.test(t) ||
        /Conseil|externalisation|provides digitally|digitally enhanced/i.test(t)
      )
        return t;
    }
    const all = document.querySelectorAll(
      "section, aside, [class*='company'], [class*='Company'], [class*='about']"
    );
    for (const el of all) {
      if (!isVisible(el)) continue;
      const t = ((el as HTMLElement).innerText ?? el.textContent ?? "").trim();
      if (
        t.length >= 200 &&
        (/\d+[\s\u00a0]*abonnés/i.test(t) || /\d+[\s\u00a0]*employés/i.test(t)) &&
        (/Suivre|Follow/i.test(t) ||
          /Conseil|externalisation|provides digitally|digitally enhanced/i.test(t))
      )
        return t;
    }
    const walk = (node: Node): string => {
      if (!node || node.nodeType !== 1) return "";
      const el = node as Element;
      const t = ((el as HTMLElement).innerText ?? el.textContent ?? "").trim();
      if (
        t.length >= 300 &&
        (t.includes("provides digitally enhanced") ||
          t.includes("Conseil en externalisation") ||
          (/\d+[\s\u00a0]*abonnés/i.test(t) && /\d+[\s\u00a0]*employés/i.test(t)))
      )
        return t;
      for (const child of el.children ?? []) {
        const found = walk(child);
        if (found) return found;
      }
      return "";
    };
    return walk(document.body);
  });
  return normalizeTextPreserveLines(companyText);
}
