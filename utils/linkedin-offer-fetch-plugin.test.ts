/**
 * Tests du plugin LinkedIn Stage 2 (récupération contenu offre depuis URL).
 */
import { createLinkedinOfferFetchPlugin } from './linkedin-offer-fetch-plugin.js';

jest.mock('./linkedin-page-fetcher.js', () => ({
  fetchLinkedinJobPage: jest.fn(),
}));

const { fetchLinkedinJobPage } = jest.requireMock<{ fetchLinkedinJobPage: jest.Mock }>(
  './linkedin-page-fetcher.js'
);

describe('createLinkedinOfferFetchPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retourne ok: false pour URL vide', async () => {
    const plugin = createLinkedinOfferFetchPlugin();
    const result = await plugin.recupererContenuOffre('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/vide/);
    expect(fetchLinkedinJobPage).not.toHaveBeenCalled();
  });

  it('retourne ok: false quand le fetcher retourne une erreur', async () => {
    (fetchLinkedinJobPage as jest.Mock).mockResolvedValue({
      error: 'Description non récupérée (mur connexion).',
    });
    const plugin = createLinkedinOfferFetchPlugin();
    const result = await plugin.recupererContenuOffre('https://www.linkedin.com/jobs/view/123/');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('mur connexion');
    }
    expect(fetchLinkedinJobPage).toHaveBeenCalledWith('https://www.linkedin.com/jobs/view/123/', undefined);
  });

  it('retourne ok: true avec texteOffre quand le fetcher retourne offre et entreprise', async () => {
    (fetchLinkedinJobPage as jest.Mock).mockResolvedValue({
      offerText: 'Contexte et missions : Product Manager...',
      companyText: 'Transcom. 143 918 abonnés. Conseil en externalisation.',
    });
    const plugin = createLinkedinOfferFetchPlugin();
    const result = await plugin.recupererContenuOffre('https://www.linkedin.com/jobs/view/456/');
    expect(result.ok).toBe(true);
    expect(fetchLinkedinJobPage).toHaveBeenCalledWith('https://www.linkedin.com/jobs/view/456/', undefined);
    if (result.ok) {
      expect(result.champs.texteOffre).toContain('Contexte et missions');
      expect(result.champs.texteOffre).toContain('Transcom');
      expect(result.champs.texteOffre).toContain('À propos de l');
    }
  });

  it('stage2Implemented est true', () => {
    const plugin = createLinkedinOfferFetchPlugin();
    expect(plugin.stage2Implemented).toBe(true);
  });
});
