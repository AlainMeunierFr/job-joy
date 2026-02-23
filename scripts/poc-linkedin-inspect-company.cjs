const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ headless: true, channel: "msedge" });
  const p = await b.newPage({ locale: "fr-FR" });
  await p.goto("https://www.linkedin.com/jobs/view/4372483625/", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await p.waitForTimeout(8000);
  const r = await p.evaluate(() => {
    const bodyText = (document.body && document.body.innerText) || "";
    const hasAbonnes = /abonnés|abonnes/i.test(bodyText);
    const hasConseil = /Conseil en externalisation/i.test(bodyText);
    const hasProvides = /provides digitally enhanced/i.test(bodyText);
    const sel = [];
    document
      .querySelectorAll(
        '[class*="company"], [class*="Company"], [class*="about"]'
      )
      .forEach((el) => {
        const c = el.className;
        if (typeof c === "string") sel.push(c.slice(0, 100));
      });
    const texts = [];
    document.querySelectorAll("section, aside, div[class]").forEach((el) => {
      const t = (el.innerText || "").trim();
      if (
        t.length >= 150 &&
        (/\d+[\s\u00a0]*abonnés/i.test(t) || /Conseil en externalisation/i.test(t)) &&
        /Transcom provides digitally/i.test(t)
      )
        texts.push({ tag: el.tagName, cls: (el.className || "").slice(0, 80), len: t.length });
    });
    return {
      bodyHas: { hasAbonnes, hasConseil, hasProvides },
      classes: [...new Set(sel)].slice(0, 25),
      blocks: texts.slice(0, 5),
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
