import { createJobThatMakeSenseOfferFetchPlugin } from './job-that-make-sense-offer-fetch-plugin.js';

describe('createJobThatMakeSenseOfferFetchPlugin', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retourne ok false pour URL vide', async () => {
    const plugin = createJobThatMakeSenseOfferFetchPlugin();
    const result = await plugin.recupererContenuOffre('');
    expect(result.ok).toBe(false);
  });

  it('retourne champs exploitables via JSON-LD JobPosting', async () => {
    const plugin = createJobThatMakeSenseOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html><head>
          <script type="application/ld+json">
            {"@type":"JobPosting","title":"Product Manager","description":"<p>Texte de l'offre JTMS</p>","hiringOrganization":{"name":"Acme"},"jobLocation":{"address":{"addressLocality":"Paris"}}}
          </script>
        </head></html>
      `,
    });
    const result = await plugin.recupererContenuOffre('https://jobs.makesense.org/jobs/abc');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.champs.texteOffre).toContain("Texte de l'offre JTMS");
      expect(result.champs.poste).toBe('Product Manager');
      expect(result.champs.entreprise).toBe('Acme');
      expect(result.champs.ville).toBe('Paris');
    }
  });

  it('retourne motif anti-crawler explicite en HTTP 403', async () => {
    const plugin = createJobThatMakeSenseOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    const result = await plugin.recupererContenuOffre('https://jobs.makesense.org/jobs/abc');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/anti-crawler|inaccessible/i);
  });
});
