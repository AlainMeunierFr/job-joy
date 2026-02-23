import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAirtableDriverReel } from './airtable-driver-reel.js';

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

describe('createAirtableDriverReel - schéma Sources US-1.6', () => {
  let tempDir: string;
  const baseId = 'appBaseX';

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'airtable-reel-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('crée la table Sources avec emailExpéditeur/algo/actif (sans import CSV)', async () => {
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
          tables: [
            { id: 'tblSources', name: 'Sources', fields: [] },
            { id: 'tblOffres', name: 'Offres', fields: [] },
          ],
        });
      }
      if (url.includes(`/meta/bases/${baseId}/tables`) && method === 'POST') {
        const name = (body as { name?: string }).name;
        if (name === 'Sources') return okJson({ id: 'tblSources' });
        if (name === 'Offres') return okJson({ id: 'tblOffres' });
      }
      if (url.endsWith(`/${baseId}/tblSources`) && method === 'POST') {
        return okJson({ records: [{ id: 'rec1' }] });
      }
      throw new Error(`Appel fetch inattendu: ${method} ${url}`);
    });

    try {
      const driver = createAirtableDriverReel({ baseId });
      const r = await driver.creerBaseEtTables('pat-test');
      expect(r).toEqual({ baseId, sourcesId: 'tblSources', offresId: 'tblOffres' });

      const createSourcesCall = calls.find(
        (c) => c.method === 'POST' && c.url.includes(`/meta/bases/${baseId}/tables`) && (c.body as { name?: string })?.name === 'Sources'
      );
      expect(createSourcesCall).toBeDefined();
      const fields = (createSourcesCall?.body as { fields: FieldDef[] }).fields;
      expect(fields.map((f: FieldDef) => f.name)).toEqual(['emailExpéditeur', 'algo', 'actif']);
      const algoField = fields.find((f: FieldDef) => f.name === 'algo');
      expect(algoField?.type).toBe('singleSelect');
      expect(algoField?.options?.choices?.map((c: { name: string }) => c.name)).toEqual([
        'Linkedin',
        'Inconnu',
        'HelloWork',
        'Welcome to the Jungle',
      ]);
      const sourceRecordCreates = calls.filter(
        (c) => c.method === 'POST' && c.url.endsWith(`/${baseId}/tblSources`) && !!(c.body as { records?: unknown[] })?.records
      );
      expect(sourceRecordCreates).toHaveLength(0);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('réutilise une table Sources existante sans import de données', async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      const method = (opts?.method ?? 'GET').toUpperCase();
      const body = opts?.body ? JSON.parse(opts.body as string) : undefined;
      calls.push({ url, method, body });

      if (url.includes(`/meta/bases/${baseId}/tables`) && method === 'GET') {
        return okJson({
          tables: [
            {
              id: 'tblSources',
              name: 'Sources',
              fields: [
                { id: 'fldEmail', name: 'emailExpéditeur', type: 'singleLineText' },
                { id: 'fldAlgo', name: 'algo', type: 'singleSelect' },
                { id: 'fldActif', name: 'actif', type: 'checkbox' },
              ],
            },
            { id: 'tblOffres', name: 'Offres', fields: [] },
          ],
        });
      }
      if (url.includes(`/meta/bases/${baseId}/tables/tblOffres/fields/`) && method === 'PATCH') {
        return okJson({});
      }
      throw new Error(`Appel fetch inattendu: ${method} ${url}`);
    });

    try {
      const driver = createAirtableDriverReel({ baseId });
      await driver.creerBaseEtTables('pat-test');
      const createSourcesCalls = calls.filter(
        (c) => c.method === 'POST' && c.url.includes(`/meta/bases/${baseId}/tables`) && (c.body as { name?: string })?.name === 'Sources'
      );
      expect(createSourcesCalls).toHaveLength(0);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
