jest.mock('./cadreemploi-page-fetcher.js', () => ({
  fetchCadreEmploiPage: jest.fn().mockResolvedValue({ error: 'Playwright non utilisé dans ce test' }),
}));

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

  it('en HTTP 403/429 tente Playwright en fallback ; si le fetcher échoue retourne son erreur', async () => {
    const plugin = createCadreEmploiOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    const result = await plugin.recupererContenuOffre('https://www.cadremploi.fr/emploi/detail_offre?offreId=1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('Playwright');
  });

  it('n’extrait pas un faux salaire type ID de tracking ou "req"', async () => {
    const plugin = createCadreEmploiOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html><head><title>Offre</title></head><body>
          <h1>Chef de projet</h1>
          <div>01KGMB4EV3G2HZ2EH96AQ94SPM</div>
          <div>Salaire req</div>
          <div>ENTREPRISE Acme Quelles sont les missions Description.</div>
        </body></html>
      `,
    });
    const result = await plugin.recupererContenuOffre('https://www.cadremploi.fr/emploi/detail_offre?offreId=1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.champs.salaire).toBeUndefined();
    }
  });

  it('extrait un salaire réaliste (Salaire : 45 000 €)', async () => {
    const plugin = createCadreEmploiOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html><head><title>Offre</title></head><body>
          <h1>Chef de projet</h1>
          <div>Salaire : 45 000 € brut par an</div>
          <div>ENTREPRISE Acme Quelles sont les missions Description.</div>
        </body></html>
      `,
    });
    const result = await plugin.recupererContenuOffre('https://www.cadremploi.fr/emploi/detail_offre?offreId=1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.champs.salaire).toBeDefined();
      expect(result.champs.salaire).toMatch(/45\s*000\s*€|45\s*000/);
    }
  });
});
