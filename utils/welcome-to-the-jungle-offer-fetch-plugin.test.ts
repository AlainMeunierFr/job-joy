import { createWelcomeToTheJungleOfferFetchPlugin } from './welcome-to-the-jungle-offer-fetch-plugin.js';

describe('createWelcomeToTheJungleOfferFetchPlugin', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retourne ok false pour URL vide', async () => {
    const plugin = createWelcomeToTheJungleOfferFetchPlugin();
    const result = await plugin.recupererContenuOffre('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('URL vide');
  });

  it("retourne les champs principaux quand la page expose un JobPosting JSON-LD", async () => {
    const plugin = createWelcomeToTheJungleOfferFetchPlugin();
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "JobPosting",
              "title": "Product Manager",
              "description": "<p>Texte de l'offre détaillé</p>",
              "hiringOrganization": { "name": "Acme" },
              "jobLocation": { "address": { "addressLocality": "Paris" } }
            }
          </script>
        </head>
      </html>
    `;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => html,
    });

    const result = await plugin.recupererContenuOffre('https://www.welcometothejungle.com/fr/companies/acme/jobs/pm');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.champs.texteOffre).toContain("Texte de l'offre");
      expect(result.champs.poste).toBe('Product Manager');
      expect(result.champs.entreprise).toBe('Acme');
      expect(result.champs.ville).toBe('Paris');
    }
  });

  it('retourne un motif anti-crawler explicite en HTTP 403', async () => {
    const plugin = createWelcomeToTheJungleOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    const result = await plugin.recupererContenuOffre('https://www.welcometothejungle.com/fr/companies/acme/jobs/pm');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/anti-crawler|inaccessible/i);
  });
});
