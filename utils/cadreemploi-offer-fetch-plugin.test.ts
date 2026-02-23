import { createCadreEmploiOfferFetchPlugin } from './cadreemploi-offer-fetch-plugin.js';

describe('createCadreEmploiOfferFetchPlugin', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retourne ok false pour URL vide', async () => {
    const plugin = createCadreEmploiOfferFetchPlugin();
    const result = await plugin.recupererContenuOffre('');
    expect(result.ok).toBe(false);
  });

  it('retourne champs exploitables depuis HTML', async () => {
    const plugin = createCadreEmploiOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html>
          <head><title>Product Manager</title></head>
          <body>
            <h1>Product Manager</h1>
            <div>ENTREPRISE Acme</div>
            <div>Quelles sont les missions ? Piloter la roadmap produit Informations complémentaires</div>
          </body>
        </html>
      `,
    });

    const result = await plugin.recupererContenuOffre('https://www.cadremploi.fr/emploi/detail_offre?offreId=1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.champs.poste).toBe('Product Manager');
      expect(result.champs.entreprise).toBe('Acme');
      expect(result.champs.texteOffre).toContain('Quelles sont les missions');
    }
  });

  it('retourne motif anti-crawler explicite en HTTP 429', async () => {
    const plugin = createCadreEmploiOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    const result = await plugin.recupererContenuOffre('https://www.cadremploi.fr/emploi/detail_offre?offreId=1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/anti-crawler|inaccessible/i);
  });
});
