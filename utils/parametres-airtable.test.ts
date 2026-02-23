/**
 * Tests TDD pour la section AirTable de parametres.json (US-1.3).
 * Baby step 1 : lecture/écriture de la section airtable.
 * Baby step 2 : fonctions lire/écrire champs AirTable.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getDefaultParametres,
  lireParametres,
  ecrireParametres,
} from './parametres-io.js';
import { lireAirTable, ecrireAirTable } from './parametres-airtable.js';

describe('section AirTable dans parametres.json (baby step 1)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-airtable-'));
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('persiste et relit la section airtable (apiKey, base, sources, offres)', () => {
    const p = getDefaultParametres();
    p.airtable = {
      apiKey: 'secret-key',
      base: 'baseId123',
      sources: 'sourcesId456',
      offres: 'offresId789',
    };
    ecrireParametres(dataDir, p);

    const lu = lireParametres(dataDir);
    expect(lu?.airtable).toBeDefined();
    expect(lu?.airtable?.apiKey).toBe('secret-key');
    expect(lu?.airtable?.base).toBe('baseId123');
    expect(lu?.airtable?.sources).toBe('sourcesId456');
    expect(lu?.airtable?.offres).toBe('offresId789');
  });
});

/** 32 octets en hex (64 caractères) pour AES-256-GCM. */
const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('lireAirTable / ecrireAirTable (baby step 2)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-airtable-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('lireAirTable retourne null si parametres absent ou sans section airtable', () => {
    expect(lireAirTable(dataDir)).toBeNull();
    ecrireParametres(dataDir, getDefaultParametres());
    expect(lireAirTable(dataDir)).toBeNull();
  });

  it('ecrireAirTable enregistre apiKey et lireAirTable la retourne', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireAirTable(dataDir, { apiKey: 'my-api-key' });
    const at = lireAirTable(dataDir);
    expect(at?.apiKey).toBe('my-api-key');
  });

  it('ecrireAirTable fusionne base, sources, offres avec l’existant', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireAirTable(dataDir, { apiKey: 'key' });
    ecrireAirTable(dataDir, { base: 'baseId', sources: 'sourcesId', offres: 'offresId' });
    const at = lireAirTable(dataDir);
    expect(at?.apiKey).toBe('key');
    expect(at?.base).toBe('baseId');
    expect(at?.sources).toBe('sourcesId');
    expect(at?.offres).toBe('offresId');
  });
});
