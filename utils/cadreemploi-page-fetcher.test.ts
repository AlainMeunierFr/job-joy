/**
 * Tests pour fetchCadreEmploiPage avec htmlFetcher (US-4.6).
 */
import type { HtmlFetcher } from './electron-html-fetcher.js';
import { fetchCadreEmploiPage } from './cadreemploi-page-fetcher.js';

describe('fetchCadreEmploiPage', () => {
  describe('avec htmlFetcher fourni', () => {
    it('utilise le HTML retourné par le fetcher et retourne { html }', async () => {
      const expectedHtml = '<html><body><h1>Offre Cadre emploi</h1><p>Contenu assez long.</p></body></html>'.repeat(20);
      const htmlFetcher: HtmlFetcher = {
        fetchHtml: jest.fn().mockResolvedValue(expectedHtml),
      };

      const result = await fetchCadreEmploiPage(
        'https://www.cadremploi.fr/emploi/detail_offre?offreId=1',
        htmlFetcher
      );

      expect(result).toEqual({ html: expectedHtml });
      expect(htmlFetcher.fetchHtml).toHaveBeenCalledWith('https://www.cadremploi.fr/emploi/detail_offre?offreId=1');
    });

    it('retourne une erreur si le HTML est trop court', async () => {
      const htmlFetcher: HtmlFetcher = {
        fetchHtml: jest.fn().mockResolvedValue('<html><body>court</body></html>'),
      };

      const result = await fetchCadreEmploiPage(
        'https://www.cadremploi.fr/emploi/detail_offre?offreId=1',
        htmlFetcher
      );

      expect(result).toEqual({ error: 'Page Cadre emploi vide ou trop courte après chargement.' });
    });

    it('retourne une erreur si l’URL est vide même avec htmlFetcher', async () => {
      const htmlFetcher: HtmlFetcher = { fetchHtml: jest.fn() };
      const result = await fetchCadreEmploiPage('', htmlFetcher);
      expect(result).toEqual({ error: 'URL vide.' });
      expect(htmlFetcher.fetchHtml).not.toHaveBeenCalled();
    });

    it('retourne une erreur si l’URL n’est pas Cadre emploi même avec htmlFetcher', async () => {
      const htmlFetcher: HtmlFetcher = { fetchHtml: jest.fn() };
      const result = await fetchCadreEmploiPage('https://example.com/job', htmlFetcher);
      expect(result).toEqual({ error: 'URL non reconnue comme page Cadre emploi.' });
      expect(htmlFetcher.fetchHtml).not.toHaveBeenCalled();
    });

    it('retourne une erreur si le fetcher lève', async () => {
      const htmlFetcher: HtmlFetcher = {
        fetchHtml: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      const result = await fetchCadreEmploiPage(
        'https://www.cadremploi.fr/emploi/detail_offre?offreId=1',
        htmlFetcher
      );
      expect(result).toHaveProperty('error');
      expect((result as { error: string }).error).toMatch(/Erreur.*Cadre emploi|Network error/);
    });
  });
});
