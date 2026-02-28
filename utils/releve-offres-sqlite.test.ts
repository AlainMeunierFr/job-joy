/**
 * US-7.7 : tests du driver relève offres SQLite (RelèveOffresDriver).
 */
import { initOffresRepository } from './repository-offres-sqlite.js';
import { createReleveOffresSqliteDriver } from './releve-offres-sqlite.js';

describe('releve-offres-sqlite', () => {
  describe('creerOffres', () => {
    it('avec repo en mémoire, creerOffres([{ idOffre, url, ... }], "Linkedin", "email") → le repository contient une offre avec cette URL et source Linkedin', async () => {
      const repo = initOffresRepository(':memory:');
      const getSourceLinkedIn = async () => ({ found: false as const });
      const driver = createReleveOffresSqliteDriver({ repository: repo, getSourceLinkedIn });

      const offres = [
        {
          idOffre: 'li-123',
          url: 'https://linkedin.com/jobs/view/123',
          dateAjout: '2025-02-28T10:00:00.000Z',
          statut: 'A compléter',
          poste: 'Dev',
          entreprise: 'Acme',
        },
      ];
      await driver.creerOffres(offres, 'Linkedin', 'email');

      const all = repo.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].url).toBe('https://linkedin.com/jobs/view/123');
      expect(all[0].source).toBe('Linkedin');
      expect(all[0].Statut).toBe('A compléter');
      expect(all[0]['Méthode de création']).toBe('email');
      repo.close();
    });
  });
});
