/**
 * Tests GET /api/tableau-synthese-offres (US-7.4).
 * Airtable est requis : sans config on renvoie une erreur (503).
 * US-7.7 : test listerOffresPourTableauDepuisSqlite.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleGetTableauSyntheseOffres, listerOffresPourTableauDepuisSqlite, clearOffresRepositoryCache } from './api-handlers.js';
import { initOffresRepository } from '../utils/repository-offres-sqlite.js';

function createMockRes(): ServerResponse {
  return {
    writeHead: jest.fn(),
    end: jest.fn(),
  } as unknown as ServerResponse;
}

function getJsonBody(res: ServerResponse): Record<string, unknown> {
  const endMock = res.end as unknown as jest.Mock;
  return JSON.parse(String(endMock.mock.calls[0][0] ?? '{}')) as Record<string, unknown>;
}

describe('GET /api/tableau-synthese-offres', () => {
  it('sans configuration Airtable utilise SQLite et renvoie 200 avec lignes (éventuellement vides)', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'tableau-synthese-sqlite-'));
    try {
      const res = createMockRes();
      await handleGetTableauSyntheseOffres(dataDir, res);

      expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/json; charset=utf-8' }));
      const body = getJsonBody(res);
      expect(Array.isArray(body.lignes)).toBe(true);
      expect(Array.isArray(body.statutsOrdre)).toBe(true);
    } finally {
      clearOffresRepositoryCache();
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  describe('listerOffresPourTableauDepuisSqlite (US-7.7)', () => {
    it('repo en mémoire avec 2 offres (source A, statut S1) et (source B, statut S2) → résultat contient les 2 entrées avec statuts cohérents', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id_offre: 'O1', url: 'https://a.com/1', source: 'Linkedin', Statut: 'S1' });
      repo.insert({ id_offre: 'O2', url: 'https://b.com/1', source: 'APEC', Statut: 'S2' });
      const sourceNomVersEmail = new Map<string, string>([
        ['Linkedin', 'a@x.com'],
        ['APEC', 'b@y.com'],
      ]);

      const result = listerOffresPourTableauDepuisSqlite(repo, sourceNomVersEmail);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ emailExpéditeur: 'a@x.com', statut: 'S1' });
      expect(result).toContainEqual({ emailExpéditeur: 'b@y.com', statut: 'S2' });
      repo.close();
    });
  });
});
