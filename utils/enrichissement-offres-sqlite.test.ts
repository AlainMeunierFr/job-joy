/**
 * US-7.7 : tests du driver enrichissement offres SQLite (EnrichissementOffresDriver).
 */
import { initOffresRepository } from './repository-offres-sqlite.js';
import { createEnrichissementOffresSqliteDriver } from './enrichissement-offres-sqlite.js';

const STATUT_A_COMPLETER = 'A compléter';

describe('enrichissement-offres-sqlite', () => {
  describe('getOffresARecuperer et updateOffre', () => {
    it('repo avec une offre Statut A compléter, getOffresARecuperer() → 1 offre', async () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({
        id: 'rec-1',
        id_offre: 'O1',
        url: 'https://example.com/job/1',
        Statut: STATUT_A_COMPLETER,
      });
      const driver = createEnrichissementOffresSqliteDriver({ repository: repo });

      const offres = await driver.getOffresARecuperer();
      expect(offres).toHaveLength(1);
      expect(offres[0].id).toBe('rec-1');
      expect(offres[0].url).toBe('https://example.com/job/1');
      expect(offres[0].statut).toBe(STATUT_A_COMPLETER);
      repo.close();
    });

    it('updateOffre(id, { Statut: "Importée" }) → repo.getById(id).Statut === "Importée"', async () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({
        id: 'rec-2',
        id_offre: 'O2',
        url: 'https://example.com/job/2',
        Statut: STATUT_A_COMPLETER,
      });
      const driver = createEnrichissementOffresSqliteDriver({ repository: repo });

      await driver.updateOffre('rec-2', { Statut: 'Importée' });

      const row = repo.getById('rec-2');
      expect(row).not.toBeNull();
      expect(row!.Statut).toBe('Importée');
      repo.close();
    });
  });

  describe('getOffresAAnalyser', () => {
    it('offre avec Statut À analyser → getOffresAAnalyser() retourne cette offre', async () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({
        id: 'rec-3',
        id_offre: 'O3',
        url: 'https://example.com/job/3',
        Statut: 'À analyser',
        Poste: 'Dev',
        Ville: 'Paris',
      });
      const driver = createEnrichissementOffresSqliteDriver({ repository: repo });

      const offres = await driver.getOffresAAnalyser!();
      expect(offres).toHaveLength(1);
      expect(offres[0].id).toBe('rec-3');
      expect(offres[0].poste).toBe('Dev');
      expect(offres[0].ville).toBe('Paris');
      repo.close();
    });
  });
});
