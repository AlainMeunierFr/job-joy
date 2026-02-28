import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAirtableDriverReel } from './airtable-driver-reel.js';
import { SOURCES_NOMS_AIRTABLE } from './plugins-sources-airtable.js';

interface FieldDef {
  name: string;
  type: string;
  options?: { choices?: Array<{ name: string }> };
}

function okJson(body: unknown): {
  ok: true;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
} {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('createAirtableDriverReel - table Offres uniquement (US-7.2)', () => {
  let tempDir: string;
  const baseId = 'appBaseX';

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'airtable-reel-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('crée la table Offres avec source et Méthode de création (US-7.2 CA5)', async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    const globalFetch = globalThis.fetch;
    let schemaCalls = 0;
    globalThis.fetch = jest.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      const method = (opts?.method ?? 'GET').toUpperCase();
      const body = opts?.body ? JSON.parse(opts.body as string) : undefined;
      calls.push({ url, method, body });

      if (url.includes(`/meta/bases/${baseId}/tables`) && method === 'GET') {
        schemaCalls += 1;
        if (schemaCalls === 1) return okJson({ tables: [] });
        return okJson({
          tables: [{ id: 'tblOffres', name: 'Offres', fields: [] }],
        });
      }
      if (url.includes(`/meta/bases/${baseId}/tables`) && method === 'POST') {
        const name = (body as { name?: string }).name;
        if (name === 'Offres') return okJson({ id: 'tblOffres' });
      }
      if (url.includes(`/meta/bases/${baseId}/tables/tblOffres`) && method === 'PATCH') {
        return okJson({});
      }
      throw new Error(`Appel fetch inattendu: ${method} ${url}`);
    });

    try {
      const driver = createAirtableDriverReel({ baseId });
      const r = await driver.creerBaseEtTables('pat-test');
      expect(r).toEqual({ baseId, offresId: 'tblOffres' });

      const createOffresCall = calls.find(
        (c) => c.method === 'POST' && c.url.includes(`/meta/bases/${baseId}/tables`) && (c.body as { name?: string })?.name === 'Offres'
      );
      expect(createOffresCall).toBeDefined();
      const fields = (createOffresCall?.body as { fields: FieldDef[] }).fields;
      const fieldNames = fields.map((f: FieldDef) => f.name);
      expect(fieldNames).toContain('source');
      expect(fieldNames).toContain('Méthode de création');
      const sourceField = fields.find((f: FieldDef) => f.name === 'source');
      expect(sourceField?.type).toBe('singleSelect');
      expect((sourceField?.options?.choices ?? []).map((c: { name: string }) => c.name)).toEqual(
        expect.arrayContaining([...SOURCES_NOMS_AIRTABLE, 'manuelle'])
      );
      const methodeField = fields.find((f: FieldDef) => f.name === 'Méthode de création');
      expect(methodeField?.type).toBe('singleSelect');
      expect((methodeField?.options?.choices ?? []).map((c: { name: string }) => c.name)).toEqual(['email', 'liste html', 'manuelle']);

      const createSourcesCalls = calls.filter(
        (c) => c.method === 'POST' && (c.body as { name?: string })?.name === 'Sources'
      );
      expect(createSourcesCalls).toHaveLength(0);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('réutilise une table Offres existante sans la recréer', async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      const method = (opts?.method ?? 'GET').toUpperCase();
      const body = opts?.body ? JSON.parse(opts.body as string) : undefined;
      calls.push({ url, method, body });

      if (url.includes(`/meta/bases/${baseId}/tables`) && method === 'GET') {
        return okJson({
          tables: [{ id: 'tblOffres', name: 'Offres', fields: [] }],
        });
      }
      if (url.includes(`/meta/bases/${baseId}/tables/tblOffres`) && method === 'PATCH') {
        return okJson({});
      }
      throw new Error(`Appel fetch inattendu: ${method} ${url}`);
    });

    try {
      const driver = createAirtableDriverReel({ baseId });
      const r = await driver.creerBaseEtTables('pat-test');
      expect(r).toEqual({ baseId, offresId: 'tblOffres' });
      const createTableCalls = calls.filter(
        (c) => c.method === 'POST' && c.url === `https://api.airtable.com/v0/meta/bases/${baseId}/tables`
      );
      expect(createTableCalls).toHaveLength(0);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
