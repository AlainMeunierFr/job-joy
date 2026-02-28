/**
 * Tests TDD pour le port « exécuter configuration Airtable » (US-1.3).
 * Baby step 3 : apiKey vide, succès (mock), erreur API (mock).
 * Baby step 4 : intégration parametres après succès.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AirtableConfigDriver } from './configuration-airtable.js';
import { MESSAGE_ERREUR_RESEAU } from './erreur-reseau.js';
import {
  executerConfigurationAirtable,
  libelleStatutConfigurationAirtable,
} from './configuration-airtable.js';
import { ecrireAirTable, lireAirTable } from './parametres-airtable.js';
import { ecrireParametres, getDefaultParametres } from './parametres-io.js';
import { airtableDriverParDefaut } from './airtable-driver-par-defaut.js';

/** 32 octets en hex (64 caractères) pour AES-256-GCM. */
const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('executerConfigurationAirtable (baby step 3)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'config-airtable-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('retourne ok: false avec message si apiKey vide', async () => {
    const driver: AirtableConfigDriver = {
      creerBaseEtTables: async () => ({ baseId: 'b', offresId: 'o' }),
    };
    const r = await executerConfigurationAirtable('', dataDir, driver);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/API Key|vide|absente/i);
  });

  it('retourne ok: false si apiKey uniquement espaces', async () => {
    const driver: AirtableConfigDriver = {
      creerBaseEtTables: async () => ({ baseId: 'b', offresId: 'o' }),
    };
    const r = await executerConfigurationAirtable('   ', dataDir, driver);
    expect(r.ok).toBe(false);
  });

  it('retourne ok: true avec baseId, offresId en cas de succès (mock)', async () => {
    const driver: AirtableConfigDriver = {
      creerBaseEtTables: async () => ({
        baseId: 'base123',
        offresId: 'offres789',
      }),
    };
    const r = await executerConfigurationAirtable('valid-key', dataDir, driver);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.baseId).toBe('base123');
      expect(r.offresId).toBe('offres789');
    }
  });

  it('retourne ok: false avec message en cas d’erreur API (mock)', async () => {
    const driver: AirtableConfigDriver = {
      creerBaseEtTables: async () => {
        throw new Error('Authentification Airtable échouée');
      },
    };
    const r = await executerConfigurationAirtable('invalid-key', dataDir, driver);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('Authentification Airtable échouée');
  });

  it("retourne message utilisateur clair en cas d'erreur réseau (ECONNREFUSED)", async () => {
    const err = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const driver: AirtableConfigDriver = {
      creerBaseEtTables: async () => {
        throw err;
      },
    };
    const r = await executerConfigurationAirtable('key', dataDir, driver);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe(MESSAGE_ERREUR_RESEAU);
  });

  it('avec driver par défaut retourne ok: false (non implémenté)', async () => {
    const r = await executerConfigurationAirtable('any-key', dataDir, airtableDriverParDefaut);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/non configurée|airtable\.base/i);
  });
});

describe('intégration parametres après configuration réussie (baby step 4)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'config-airtable-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('libelleStatutConfigurationAirtable retourne "AirTable prêt" ou "Erreur avec AirTable" + message', () => {
    expect(libelleStatutConfigurationAirtable({ ok: true, baseId: 'b', offresId: 'o' })).toBe(
      'AirTable prêt'
    );
    expect(libelleStatutConfigurationAirtable({ ok: false, message: 'API Key invalide' })).toBe(
      'Erreur avec AirTable : API Key invalide'
    );
  });

  it('après appel réussi (mock), parametres contient apiKey, base, offres', async () => {
    ecrireParametres(dataDir, getDefaultParametres());
    const driver: AirtableConfigDriver = {
      creerBaseEtTables: async () => ({
        baseId: 'baseId',
        offresId: 'offresId',
      }),
    };
    const r = await executerConfigurationAirtable('my-api-key', dataDir, driver);
    expect(r.ok).toBe(true);

    const at = lireAirTable(dataDir);
    expect(at).not.toBeNull();
    expect(at?.apiKey).toBe('my-api-key');
    expect(at?.base).toBe('baseId');
    expect(at?.offres).toBe('offresId');
  });

  it('après appel réussi, conserve l’URL de la base si elle était déjà dans parametres (bouton Ouvrir Airtable)', async () => {
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    const dataDir = mkdtempSync(join(tmpdir(), 'config-airtable-'));
    try {
      ecrireParametres(dataDir, getDefaultParametres());
      const urlBase = 'https://airtable.com/appXyz123/tblAbc/viwDef?blocks=hide';
      ecrireAirTable(dataDir, { apiKey: 'key', base: urlBase });
      const driver: AirtableConfigDriver = {
        creerBaseEtTables: async () => ({
          baseId: 'appXyz123',
          offresId: 'offresId',
        }),
      };
      const r = await executerConfigurationAirtable('key', dataDir, driver);
      expect(r.ok).toBe(true);
      const at = lireAirTable(dataDir);
      expect(at?.base).toBe(urlBase);
      expect(at?.offres).toBe('offresId');
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
      delete process.env.PARAMETRES_ENCRYPTION_KEY;
    }
  });
});
