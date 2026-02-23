/**
 * Tests pour récupération du texte d'une offre (US-2.4, baby step 1).
 */
import { recupererTexteOffreTest, createOffreTestDriverAirtable } from './offre-test.js';

describe('offre-test', () => {
  describe('recupererTexteOffreTest', () => {
    it('retourne null quand le driver retourne null', async () => {
      const driver = { getTexteUneOffre: async () => null };
      const result = await recupererTexteOffreTest(driver);
      expect(result).toBeNull();
    });

    it('retourne le texte quand le driver retourne une chaîne', async () => {
      const driver = { getTexteUneOffre: async () => 'Contenu offre test' };
      const result = await recupererTexteOffreTest(driver);
      expect(result).toBe('Contenu offre test');
    });
  });

  describe('createOffreTestDriverAirtable', () => {
    it('retourne null quand l’API ne renvoie aucun enregistrement', async () => {
      const mockFetch = async () =>
        ({
          ok: true,
          json: async () => ({ records: [] }),
        }) as Response;
      const driver = createOffreTestDriverAirtable(
        { apiKey: 'key', baseId: 'appX', offresId: 'tblY' },
        mockFetch
      );
      const result = await driver.getTexteUneOffre();
      expect(result).toBeNull();
    });

    it('retourne le texte du champ "Texte de l\'offre" du premier enregistrement', async () => {
      const mockFetch = async () =>
        ({
          ok: true,
          json: async () => ({
            records: [{ id: 'rec1', fields: { 'Texte de l\'offre': 'Résumé de l\'offre ici.' } }],
          }),
        }) as Response;
      const driver = createOffreTestDriverAirtable(
        { apiKey: 'key', baseId: 'appX', offresId: 'tblY' },
        mockFetch
      );
      const result = await driver.getTexteUneOffre();
      expect(result).toBe('Résumé de l\'offre ici.');
    });

    it('retourne le texte du champ Contenu si "Texte de l\'offre" absent', async () => {
      const mockFetch = async () =>
        ({
          ok: true,
          json: async () => ({
            records: [{ id: 'rec1', fields: { Contenu: 'Contenu alternatif' } }],
          }),
        }) as Response;
      const driver = createOffreTestDriverAirtable(
        { apiKey: 'key', baseId: 'appX', offresId: 'tblY' },
        mockFetch
      );
      const result = await driver.getTexteUneOffre();
      expect(result).toBe('Contenu alternatif');
    });

    it('retourne null si les champs texte sont vides', async () => {
      const mockFetch = async () =>
        ({
          ok: true,
          json: async () => ({
            records: [{ id: 'rec1', fields: { 'Texte de l\'offre': '', Statut: 'À traiter' } }],
          }),
        }) as Response;
      const driver = createOffreTestDriverAirtable(
        { apiKey: 'key', baseId: 'appX', offresId: 'tblY' },
        mockFetch
      );
      const result = await driver.getTexteUneOffre();
      expect(result).toBeNull();
    });
  });
});
