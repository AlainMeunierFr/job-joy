/**
 * Tests GET /api/consommation-api (US-2.5).
 */
import type { ServerResponse } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleGetConsommationApi } from './api-handlers.js';
import { enregistrerAppel } from '../utils/log-appels-api.js';

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

describe('handleGetConsommationApi', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'consommation-api-'));
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('retourne parApi vide et parIntention vide quand aucun log', () => {
    const res = createMockRes();
    handleGetConsommationApi(dataDir, res);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/json; charset=utf-8' }));
    const body = getJsonBody(res) as { parIntention?: Record<string, Record<string, number>> };
    expect(body.parIntention).toEqual({});
  });

  it('retourne une clé date avec sous-clés Claude et Airtable quand des logs existent', () => {
    enregistrerAppel(dataDir, { api: 'Claude', succes: true }, '2026-02-21');
    enregistrerAppel(dataDir, { api: 'Claude', succes: true }, '2026-02-21');
    enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, '2026-02-21');
    enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, '2026-02-21');
    enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, '2026-02-21');
    const res = createMockRes();
    handleGetConsommationApi(dataDir, res);
    const body = getJsonBody(res) as Record<string, Record<string, number> | Record<string, Record<string, number>>>;
    expect(body['2026-02-21']).toBeDefined();
    expect((body['2026-02-21'] as Record<string, number>).Claude).toBe(2);
    expect((body['2026-02-21'] as Record<string, number>).Airtable).toBe(3);
  });

  it('retourne parIntention avec totaux par date et intention (US-3.4)', () => {
    enregistrerAppel(dataDir, { api: 'Claude', succes: true, intention: 'Analyse IA lot' }, '2026-02-24');
    enregistrerAppel(dataDir, { api: 'Claude', succes: true, intention: 'Analyse IA lot' }, '2026-02-24');
    enregistrerAppel(dataDir, { api: 'Airtable', succes: true, intention: 'Synthèse Airtable' }, '2026-02-24');
    const res = createMockRes();
    handleGetConsommationApi(dataDir, res);
    const body = getJsonBody(res) as { parIntention?: Record<string, Record<string, number>> };
    expect(body.parIntention).toBeDefined();
    expect(body.parIntention!['2026-02-24']).toBeDefined();
    expect(body.parIntention!['2026-02-24']['Analyse IA lot']).toBe(2);
    expect(body.parIntention!['2026-02-24']['Synthèse Airtable']).toBe(1);
  });
});
