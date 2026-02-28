/**
 * US-7.8 : tests TDD reprise offres Airtable → SQLite (mocks, pas d'API réelle).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { initOffresRepository } from './repository-offres-sqlite.js';
import { reprendreOffresAirtableVersSqlite } from './reprise-offres-airtable-vers-sqlite.js';

const API_BASE = 'https://api.airtable.com/v0';

describe('reprise-offres-airtable-vers-sqlite', () => {
  describe('module reprise (baby step 1)', () => {
    it('récupère une page Airtable (2 offres) et insère dans le repository (id = record ID)', async () => {
      const repo = initOffresRepository(':memory:');
      const rec1 = 'recReprise001';
      const rec2 = 'recReprise002';
      const mockFetch = async (url: string) => {
        expect(url).toMatch(new RegExp(`^${API_BASE}/baseId/offresId\\?.*pageSize=100`));
        expect(url).not.toMatch(/method.*POST|PATCH|DELETE/i);
        return new Response(
          JSON.stringify({
            records: [
              { id: rec1, fields: { UID: rec1, 'Id offre': 'I1', URL: 'https://a.com/1', Poste: 'Dev' } },
              { id: rec2, fields: { UID: rec2, 'Id offre': 'I2', URL: 'https://a.com/2', Statut: 'À importer' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };
      const result = await reprendreOffresAirtableVersSqlite({
        apiKey: 'key',
        baseId: 'baseId',
        offresId: 'offresId',
        repository: repo,
        fetchFn: mockFetch,
      });
      expect(result.ok).toBe(true);
      const all = repo.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((o) => o.id).sort()).toEqual([rec1, rec2].sort());
      repo.close();
    });
  });

  describe('pagination (baby step 2)', () => {
    it('gère offset Airtable : 2 appels GET, toutes les offres insérées', async () => {
      const repo = initOffresRepository(':memory:');
      let callCount = 0;
      const mockFetch = async (url: string) => {
        callCount++;
        if (callCount === 1) {
          expect(url).not.toContain('offset=');
          return new Response(
            JSON.stringify({
              records: [
                { id: 'recPage1a', fields: { UID: 'recPage1a', 'Id offre': 'P1a', URL: 'https://p1a.com' } },
                { id: 'recPage1b', fields: { UID: 'recPage1b', 'Id offre': 'P1b', URL: 'https://p1b.com' } },
              ],
              offset: 'offsetPage2',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        expect(url).toContain('offset=offsetPage2');
        return new Response(
          JSON.stringify({
            records: [{ id: 'recPage2', fields: { UID: 'recPage2', 'Id offre': 'P2', URL: 'https://p2.com' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };
      const result = await reprendreOffresAirtableVersSqlite({
        apiKey: 'k',
        baseId: 'b',
        offresId: 't',
        repository: repo,
        fetchFn: mockFetch,
      });
      expect(result.ok).toBe(true);
      expect(callCount).toBe(2);
      const all = repo.getAll();
      expect(all).toHaveLength(3);
      expect(all.map((o) => o.id).sort()).toEqual(['recPage1a', 'recPage1b', 'recPage2'].sort());
      repo.close();
    });
  });

  describe('mapping exhaustif (baby step 3)', () => {
    it('offre Airtable sans champ Poste (absent) → insérée avec UID, champ Poste vide ou défaut', async () => {
      const repo = initOffresRepository(':memory:');
      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            records: [
              { id: 'recIncomplet', fields: { UID: 'recIncomplet', URL: 'https://incomplet.com/1' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      await reprendreOffresAirtableVersSqlite({
        apiKey: 'k',
        baseId: 'b',
        offresId: 't',
        repository: repo,
        fetchFn: mockFetch,
      });
      const offre = repo.getById('recIncomplet');
      expect(offre).not.toBeNull();
      expect(offre!.id).toBe('recIncomplet');
      expect(offre!.url).toBe('https://incomplet.com/1');
      expect(offre!.Poste === undefined || offre!.Poste === null || offre!.Poste === '').toBe(true);
      repo.close();
    });

    it('une offre Airtable avec plusieurs champs → getById retourne les mêmes valeurs', async () => {
      const repo = initOffresRepository(':memory:');
      const recordId = 'recABC123XYZ';
      const mockFetch = async () =>
        new Response(
          JSON.stringify({
            records: [
              {
                id: recordId,
                fields: {
                  UID: recordId,
                  'Id offre': 'I1',
                  source: 'APEC',
                  Statut: 'À importer',
                  URL: 'https://apec.com/1',
                  Poste: 'Dev',
                  Résumé: 'Résumé Airtable',
                  Entreprise: 'Acme',
                  Ville: 'Paris',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      await reprendreOffresAirtableVersSqlite({
        apiKey: 'k',
        baseId: 'b',
        offresId: 't',
        repository: repo,
        fetchFn: mockFetch,
      });
      const offre = repo.getById(recordId);
      expect(offre).not.toBeNull();
      expect(offre!.id).toBe(recordId);
      expect(offre!.id_offre).toBe('I1');
      expect(offre!.source).toBe('APEC');
      expect(offre!.Statut).toBe('À importer');
      expect(offre!.url).toBe('https://apec.com/1');
      expect(offre!.Poste).toBe('Dev');
      expect(offre!.Résumé).toBe('Résumé Airtable');
      expect(offre!.Entreprise).toBe('Acme');
      expect(offre!.Ville).toBe('Paris');
      repo.close();
    });
  });

  describe('idempotence (baby step 4)', () => {
    it('deux reprises avec les mêmes 2 records mais champs modifiés → 2 offres, mise à jour', async () => {
      const repo = initOffresRepository(':memory:');
      const recA = 'recIdemA';
      const recB = 'recIdemB';
      let callCount = 0;
      const mockFetch = async () => {
        callCount++;
        return new Response(
          JSON.stringify({
            records: [
              { id: recA, fields: { UID: recA, 'Id offre': 'A1', URL: 'https://a.com', Poste: callCount === 1 ? 'Ancien poste' : 'Nouveau poste' } },
              { id: recB, fields: { UID: recB, 'Id offre': 'B1', URL: 'https://b.com', Statut: callCount === 1 ? 'À importer' : 'Importée' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      };
      await reprendreOffresAirtableVersSqlite({
        apiKey: 'k',
        baseId: 'b',
        offresId: 't',
        repository: repo,
        fetchFn: mockFetch,
      });
      expect(repo.getAll()).toHaveLength(2);
      expect(repo.getById(recA)!.Poste).toBe('Ancien poste');
      expect(repo.getById(recB)!.Statut).toBe('À importer');

      await reprendreOffresAirtableVersSqlite({
        apiKey: 'k',
        baseId: 'b',
        offresId: 't',
        repository: repo,
        fetchFn: mockFetch,
      });
      expect(repo.getAll()).toHaveLength(2);
      expect(repo.getById(recA)!.Poste).toBe('Nouveau poste');
      expect(repo.getById(recB)!.Statut).toBe('Importée');
      repo.close();
    });
  });

  describe('script CLI (baby step 5)', () => {
    it('script et npm script existent (logique reprise testée par les mocks ci-dessus)', () => {
      expect(existsSync(join(process.cwd(), 'scripts', 'import-offres-airtable-vers-sqlite.ts'))).toBe(true);
      const pkg = require(join(process.cwd(), 'package.json'));
      expect(pkg.scripts['import:offres-airtable-vers-sqlite']).toBeDefined();
      expect(pkg.scripts['import:offres-airtable-vers-sqlite']).toContain('import-offres-airtable-vers-sqlite');
    });
  });

  describe('gestion d’erreurs (baby step 6)', () => {
    it('mock fetch 503 → reprendreOffresAirtableVersSqlite retourne ok: false avec message', async () => {
      const repo = initOffresRepository(':memory:');
      const mockFetch = async () => new Response('Service Unavailable', { status: 503 });
      const result = await reprendreOffresAirtableVersSqlite({
        apiKey: 'k',
        baseId: 'b',
        offresId: 't',
        repository: repo,
        fetchFn: mockFetch,
      });
      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/503|Service Unavailable|Airtable/);
      expect(repo.getAll()).toHaveLength(0);
      repo.close();
    });
  });

  describe('lecture seule Airtable (baby step 7)', () => {
    it('le module reprise n’utilise que GET (pas de POST/PATCH/DELETE)', () => {
      const { readFileSync } = require('node:fs');
      const src = readFileSync(join(process.cwd(), 'utils', 'reprise-offres-airtable-vers-sqlite.ts'), 'utf-8');
      expect(src).toContain("method: 'GET'");
      expect(src).not.toMatch(/method:\s*['"](?:POST|PATCH|DELETE|PUT)['"]/);
    });
  });
});
