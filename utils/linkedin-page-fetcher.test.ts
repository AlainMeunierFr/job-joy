/**
 * Tests pour fetchLinkedinJobPage avec htmlFetcher (US-4.6).
 * Sans htmlFetcher, le comportement Playwright reste inchangé (API à un argument conservée).
 */
import type { HtmlFetcher } from './electron-html-fetcher.js';
import { fetchLinkedinJobPage } from './linkedin-page-fetcher.js';

describe('fetchLinkedinJobPage', () => {
  describe('avec htmlFetcher fourni', () => {
    it('utilise le HTML retourné par le fetcher et extrait offerText/companyText', async () => {
      const longDesc =
        'Description de l\'offre avec assez de contenu. Contexte missions Profil CDI Postuler. ' +
        'Lorem ipsum dolor sit amet. '.repeat(15) +
        'About the company Nous sommes une entreprise avec des employés.';
      const linkedInHtml = `
        <html><body>
          <div class="show-more-less-html__markup">${longDesc}</div>
        </body></html>`;
      const htmlFetcher: HtmlFetcher = {
        fetchHtml: jest.fn().mockResolvedValue(linkedInHtml),
      };

      const result = await fetchLinkedinJobPage(
        'https://www.linkedin.com/jobs/view/123/',
        htmlFetcher
      );

      expect('error' in result ? result.error : null).toBeNull();
      expect(result).toHaveProperty('offerText');
      expect(result).toHaveProperty('companyText');
      if (!('error' in result)) {
        expect(result.offerText.length).toBeGreaterThan(0);
        expect(htmlFetcher.fetchHtml).toHaveBeenCalledWith('https://www.linkedin.com/jobs/view/123/');
      }
    });

    it('retourne une erreur si l’URL est vide même avec htmlFetcher', async () => {
      const htmlFetcher: HtmlFetcher = { fetchHtml: jest.fn() };
      const result = await fetchLinkedinJobPage('', htmlFetcher);
      expect(result).toEqual({ error: 'URL vide.' });
      expect(htmlFetcher.fetchHtml).not.toHaveBeenCalled();
    });

    it('retourne une erreur si l’URL n’est pas LinkedIn Jobs même avec htmlFetcher', async () => {
      const htmlFetcher: HtmlFetcher = { fetchHtml: jest.fn() };
      const result = await fetchLinkedinJobPage('https://example.com/job', htmlFetcher);
      expect(result).toEqual({ error: 'URL non reconnue comme page LinkedIn Jobs.' });
      expect(htmlFetcher.fetchHtml).not.toHaveBeenCalled();
    });
  });
});
