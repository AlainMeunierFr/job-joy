/**
 * Tests GET /api/histogramme-scores-offres (US Statistiques des scores).
 */
import type { ServerResponse } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  handleGetHistogrammeScoresOffres,
  listerOffresPourHistogrammeScoresDepuisSqlite,
  clearOffresRepositoryCache,
} from './api-handlers.js';
import { initOffresRepository } from '../utils/repository-offres-sqlite.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

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

describe('handleGetHistogrammeScoresOffres', () => {
  let dataDir: string;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'histogramme-scores-'));
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    clearOffresRepositoryCache();
    rmSync(dataDir, { recursive: true, force: true });
    globalThis.fetch = originalFetch;
  });

  it('sans config Airtable utilise SQLite et retourne 200 avec ok true, 10 buckets et total 0 si base vide', async () => {
    const res = createMockRes();
    await handleGetHistogrammeScoresOffres(dataDir, res);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/json; charset=utf-8' }));
    const body = getJsonBody(res);
    expect(body.ok).toBe(true);
    expect((body.buckets as unknown[]).length).toBe(10);
    expect(body.total).toBe(0);
  });

  it('retourne 200 avec ok true, 10 buckets et total quand SQLite contient des offres avec scores', async () => {
    const repo = initOffresRepository(join(dataDir, 'offres.sqlite'));
    repo.insert({ id_offre: 'O1', url: 'https://a.com/1', Score_Total: 2.5, Statut: 'Traité' });
    repo.insert({ id_offre: 'O2', url: 'https://b.com/1', Score_Total: 5.8, Statut: 'Traité' });
    repo.insert({ id_offre: 'O3', url: 'https://c.com/1', Score_Total: 9.6, Statut: 'Expiré' });
    repo.close();
    const res = createMockRes();
    await handleGetHistogrammeScoresOffres(dataDir, res);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    const body = getJsonBody(res) as { ok: boolean; buckets: Array<{ label: string; count: number }>; total: number };
    expect(body.ok).toBe(true);
    expect(body.buckets).toHaveLength(10);
    expect(body.total).toBe(3);
    const counts = (body.buckets as Array<{ count: number }>).map((b) => b.count);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('exclut les offres avec Score_Total 0 et Statut non Expiré (population)', async () => {
    const repo = initOffresRepository(join(dataDir, 'offres.sqlite'));
    repo.insert({ id_offre: 'O1', url: 'https://a.com/1', Score_Total: 1, Statut: 'Traité' });
    repo.insert({ id_offre: 'O2', url: 'https://b.com/1', Score_Total: 0, Statut: 'À traiter' });
    repo.insert({ id_offre: 'O3', url: 'https://c.com/1', Score_Total: 0, Statut: 'Expiré' });
    repo.close();
    const res = createMockRes();
    await handleGetHistogrammeScoresOffres(dataDir, res);
    const body = getJsonBody(res) as { ok: boolean; total: number };
    expect(body.ok).toBe(true);
    expect(body.total).toBe(2);
  });

  describe('listerOffresPourHistogrammeScoresDepuisSqlite (US-7.7)', () => {
    it('repo avec offres ayant Score_Total et Statut → buckets et total cohérents', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id_offre: 'O1', url: 'https://a.com/1', Score_Total: 2.5, Statut: 'Traité' });
      repo.insert({ id_offre: 'O2', url: 'https://b.com/1', Score_Total: 5.8, Statut: 'Traité' });
      repo.insert({ id_offre: 'O3', url: 'https://c.com/1', Score_Total: 9.6, Statut: 'Expiré' });

      const result = listerOffresPourHistogrammeScoresDepuisSqlite(repo);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ scoreTotal: 2.5, statut: 'Traité' });
      expect(result).toContainEqual({ scoreTotal: 5.8, statut: 'Traité' });
      expect(result).toContainEqual({ scoreTotal: 9.6, statut: 'Expiré' });
      repo.close();
    });
  });
});
