/**
 * Tests pour le fetcher de contenu d'offre (US-1.4 CA3).
 */
import { createFetcherContenuOffre } from './fetcher-contenu-offre.js';

jest.mock('./linkedin-page-fetcher.js', () => ({
  fetchLinkedinJobPage: jest.fn().mockResolvedValue({ error: 'LinkedIn mock' }),
}));

describe('createFetcherContenuOffre', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retourne ok: false pour URL vide', async () => {
    const fetcher = createFetcherContenuOffre();
    const r = await fetcher.recupererContenuOffre('');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/vide/);
  });

  it('retourne ok: false pour une URL non supportée (pas de plugin)', async () => {
    const fetcher = createFetcherContenuOffre();
    const r = await fetcher.recupererContenuOffre('https://example.com/job');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/Aucune source/i);
  });

  it('délègue au plugin LinkedIn et retourne son résultat', async () => {
    const fetcher = createFetcherContenuOffre();
    const r = await fetcher.recupererContenuOffre('https://www.linkedin.com/jobs/view/1/');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('LinkedIn mock');
  });

  it('route vers le plugin JTMS via URL makesense', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<script type="application/ld+json">{"@type":"JobPosting","title":"PM","description":"<p>Desc</p>","hiringOrganization":{"name":"Acme"}}</script>',
    });
    const fetcher = createFetcherContenuOffre();
    const r = await fetcher.recupererContenuOffre('https://jobs.makesense.org/fr/jobs/abc');
    expect(r.ok).toBe(true);
  });

  it('route vers le plugin Cadre Emploi via URL cadremploi', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><h1>Product Manager</h1><div>ENTREPRISE Acme</div></html>',
    });
    const fetcher = createFetcherContenuOffre();
    const r = await fetcher.recupererContenuOffre('https://www.cadremploi.fr/emploi/detail_offre?offreId=1');
    expect(r.ok).toBe(true);
  });
});
