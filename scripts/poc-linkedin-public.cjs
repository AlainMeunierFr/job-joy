const { chromium } = require("playwright");
const fs = require("node:fs");

const URL = "https://www.linkedin.com/jobs/view/4363919743/";
const OUTPUT_PATH = "C:\\dev\\analyse-offres\\poc-linkedin-4363919743.md";

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if (await loc.count()) {
      try {
        if (await loc.isVisible({ timeout: 1000 })) {
          await loc.click({ timeout: 3000 });
          return selector;
        }
      } catch {
        // Ignore and continue with next selector.
      }
    }
  }
  return null;
}

async function clickInAllFrames(page, selectors) {
  for (const frame of page.frames()) {
    for (const selector of selectors) {
      const loc = frame.locator(selector).first();
      if (await loc.count()) {
        try {
          if (await loc.isVisible({ timeout: 800 })) {
            await loc.click({ timeout: 2500 });
            return `frame:${selector}`;
          }
        } catch {
          // Ignore and continue with next frame/selector.
        }
      }
    }
  }
  return null;
}

async function clickFirstByRegexText(page, regex) {
  const clickedText = await page.evaluate((pattern) => {
    const re = new RegExp(pattern, "i");
    const candidates = Array.from(
      document.querySelectorAll("button, a, [role='button']")
    );
    for (const el of candidates) {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      const style = window.getComputedStyle(el);
      const visible =
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        el.getBoundingClientRect().width > 0 &&
        el.getBoundingClientRect().height > 0;
      if (visible && re.test(text)) {
        el.click();
        return text;
      }
    }
    return null;
  }, regex.source);
  return clickedText;
}

async function closeLinkedInPopup(page) {
  const closeSelectors = [
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

  for (let i = 0; i < 5; i += 1) {
    let closeMethod = await clickFirstVisible(page, closeSelectors);
    if (closeMethod) return `page:${closeMethod}`;

    closeMethod = await clickInAllFrames(page, closeSelectors);
    if (closeMethod) return closeMethod;

    await page.waitForTimeout(200);
  }

  try {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    return "keyboard:Escape";
  } catch {
    return null;
  }
}

async function hasVisiblePopup(page) {
  return page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll(".artdeco-modal, .contextual-sign-in-modal")
    );
    return candidates.some((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    });
  });
}

/** Préserve les retours à la ligne, nettoie espaces et artefacts (ex. "Show less"). */
function normalizeTextPreserveLines(text) {
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

function normalizeText(text) {
  return normalizeTextPreserveLines(text).replace(/\n+/g, " ").trim();
}

function splitIntoOfferAndCompanySections(descriptionText) {
  const text = normalizeTextPreserveLines(descriptionText);
  if (!text) {
    return { offerText: "", companyText: "" };
  }

  const companyMarkers = [
    "À propos de l’entreprise",
    "About the company",
    "What Life at ",
    "Life at ",
    "Who we are",
  ];

  const lower = text.toLowerCase();
  let splitIndex = -1;
  for (const marker of companyMarkers) {
    const idx = lower.indexOf(marker.toLowerCase());
    if (idx >= 0 && (splitIndex < 0 || idx < splitIndex)) {
      splitIndex = idx;
    }
  }

  if (splitIndex < 0) {
    return { offerText: text, companyText: "" };
  }

  return {
    offerText: normalizeTextPreserveLines(text.slice(0, splitIndex)),
    companyText: normalizeTextPreserveLines(text.slice(splitIndex)),
  };
}

async function extractJobDescription(page) {
  const description = await page.evaluate(() => {
    const selectors = [
      ".description__text .show-more-less-html__markup",
      ".show-more-less-html__markup",
      ".description__text",
      ".jobs-description-content__text",
      "[data-test-id='job-details']",
    ];

    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    const candidates = [];
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const node of nodes) {
        if (!isVisible(node)) continue;
        const raw = (node.innerText || node.textContent || "").trim();
        if (raw.length >= 200) candidates.push(raw);
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.length - a.length);
      return candidates[0];
    }
    const mainSelectors = ["[role='main']", ".scaffold-layout__main", "main"];
    for (const sel of mainSelectors) {
      const main = document.querySelector(sel);
      if (!main || !isVisible(main)) continue;
      const raw = (main.innerText || main.textContent || "").trim();
      if (raw.length >= 500 && /Contexte|missions|Profil|CDI|CDD|Postuler|Apply|entreprise à mission|énergét|solaire/i.test(raw))
        return raw;
    }
    return "";
  });
  return normalizeTextPreserveLines(description);
}

/** Extrait la section sidebar "À propos de l'entreprise" (nom, abonnés, secteur, effectifs, description). */
async function extractCompanySection(page) {
  const companyText = await page.evaluate(() => {
    const isVisible = (el) => {
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
      const t = (el.innerText || el.textContent || "").trim();
      if (t.length < 100) continue;
      if (
        /\d+[\s\u00a0]*abonnés/i.test(t) ||
        /\d+[\s\u00a0]*employés/i.test(t) ||
        /Suivre|Follow/i.test(t) ||
        /Conseil|externalisation|provides digitally|digitally enhanced/i.test(t)
      )
        return t;
    }
    const all = Array.from(
      document.querySelectorAll(
        "section, aside, [class*='company'], [class*='Company'], [class*='about']"
      )
    );
    for (const el of all) {
      if (!isVisible(el)) continue;
      const t = (el.innerText || el.textContent || "").trim();
      if (
        t.length >= 200 &&
        (/\d+[\s\u00a0]*abonnés/i.test(t) || /\d+[\s\u00a0]*employés/i.test(t)) &&
        (/Suivre|Follow/i.test(t) || /Conseil|externalisation|provides digitally|digitally enhanced/i.test(t))
      )
        return t;
    }
    const walk = (node) => {
      if (!node || node.nodeType !== 1) return "";
      const t = (node.innerText || node.textContent || "").trim();
      if (
        t.length >= 300 &&
        (t.includes("provides digitally enhanced") ||
          t.includes("Conseil en externalisation") ||
          (/\d+[\s\u00a0]*abonnés/i.test(t) && /\d+[\s\u00a0]*employés/i.test(t)))
      )
        return t;
      for (const child of node.children || []) {
        const found = walk(child);
        if (found) return found;
      }
      return "";
    };
    const fromWalk = walk(document.body);
    return fromWalk || "";
  });
  return normalizeTextPreserveLines(companyText);
}

async function run() {
  const browser = await chromium.launch({ headless: false, channel: "msedge" });
  const context = await browser.newContext({
    locale: "fr-FR",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2000);

  for (let i = 0; i < 5; i += 1) {
    const cookieRefusedWith = await clickFirstVisible(page, [
      ".artdeco-global-alert button:has-text('Refuser')",
      ".artdeco-global-alert button:has-text('Reject')",
      "button.artdeco-global-alert-action:has-text('Refuser')",
      "button:has-text('Refuser')",
      "button:has-text('Reject')",
    ]);
    if (cookieRefusedWith) break;
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(500);

  const popupClosedWith = await closeLinkedInPopup(page);
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    const main = document.querySelector("[role='main']") || document.querySelector(".scaffold-layout__main") || document.body;
    if (main) main.scrollIntoView({ behavior: "instant", block: "start" });
  });
  await page.waitForTimeout(300);

  let showMoreClickedWith = await clickFirstVisible(page, [
    "button:has-text('Show more')",
    "button:has-text('Voir plus')",
    "button:has-text('Afficher plus')",
    "a:has-text('Show more')",
    "a:has-text('Voir plus')",
  ]);

  if (!showMoreClickedWith) {
    const clickedText = await clickFirstByRegexText(
      page,
      /show more|voir plus|afficher plus|plus de détails/i
    );
    showMoreClickedWith = clickedText ? `regex:${clickedText}` : null;
  }

  const popupClosedAfterShowMore = await closeLinkedInPopup(page);

  await page.waitForTimeout(800);

  try {
    await page.waitForSelector(".show-more-less-html__markup, .description__text, .jobs-description-content__text", {
      state: "visible",
      timeout: 12000,
    });
  } catch {
    // Description block may not be present (sign-in wall for this job)
  }

  const bodyText = (await page.textContent("body")) || "";
  const descriptionText = await extractJobDescription(page);
  const { offerText, companyText: inlineCompanyText } =
    splitIntoOfferAndCompanySections(descriptionText);
  const companySectionText = await extractCompanySection(page);
  const companyText =
    companySectionText.length > 0 ? companySectionText : inlineCompanyText;
  const companyFromSidebar = companySectionText.length > 0;
  const hasSigninWall =
    /join or sign in|sign in|inscrivez-vous|s'identifier|s’identifier/i.test(
      bodyText
    );
  const snippet = bodyText.replace(/\s+/g, " ").trim().slice(0, 1200);
  const extractionFailed = descriptionText.length < 400 || offerText.length < 300;

  const markdown = [
    "# POC LinkedIn public - Texte annonce",
    "",
    `- URL: ${URL}`,
    `- Date: ${new Date().toISOString()}`,
    `- Popup fermee avec: ${popupClosedWith || "n/a"}`,
    `- Show more clique avec: ${showMoreClickedWith || "n/a"}`,
    extractionFailed
      ? "- **⚠️ Description non récupérée** (mur connexion possible pour cette offre)."
      : "",
    "",
    "## Texte extrait",
    "",
    "### À propos de l’offre d’emploi",
    "",
    offerText || "_Section non détectée (contenu non disponible sans connexion pour cette offre)_",
    "",
    "### À propos de l’entreprise",
    companyFromSidebar ? "" : "_(fallback: bloc « Life at » depuis la description)_",
    "",
    companyText || "_Section non détectée_",
    "",
  ].join("\n");
  fs.writeFileSync(OUTPUT_PATH, markdown, "utf8");

  console.log(
    JSON.stringify(
      {
        url: page.url(),
        cookieRefusedWith,
        popupClosedWith,
        popupClosedAfterShowMore,
        showMoreClickedWith,
        hasSigninWall,
        popupStillVisible: await hasVisiblePopup(page),
        bodyLength: bodyText.length,
        descriptionLength: descriptionText.length,
        offerLength: offerText.length,
        companyLength: companyText.length,
        extractionFailed,
        outputPath: OUTPUT_PATH,
        snippet,
      },
      null,
      2
    )
  );

  await context.close();
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
