/**
 * Tests TDD pour la section Mistral dans parametres.json (US-8.1).
 * Même logique que parametres-claudecode : clé stockée chiffrée (apiKeyChiffre), jamais en clair.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ParametresPersistes } from '../types/parametres.js';
import {
  getDefaultParametres,
  lireParametres,
  ecrireParametres,
  chiffrerMotDePasse,
} from './parametres-io.js';
import { lireMistral, ecrireMistral } from './parametres-mistral.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('types Mistral et ParametresPersistes (baby step 1)', () => {
  it('ParametresPersistes accepte une section mistral avec apiKeyChiffre', () => {
    const p: ParametresPersistes = {
      ...getDefaultParametres(),
      mistral: { apiKeyChiffre: 'aes256gcm:iv:ct:tag' },
    };
    expect(p.mistral).toBeDefined();
    expect(p.mistral?.apiKeyChiffre).toBe('aes256gcm:iv:ct:tag');
  });
});

describe('lireMistral', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-mistral-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('retourne null si parametres.json absent ou sans section mistral', () => {
    expect(lireMistral(dataDir)).toBeNull();
    ecrireParametres(dataDir, getDefaultParametres());
    expect(lireMistral(dataDir)).toBeNull();
  });

  it('retourne la section mistral avec apiKey déchiffrée quand apiKeyChiffre est présente', () => {
    const encrypted = chiffrerMotDePasse('my-mistral-key');
    const p = getDefaultParametres();
    p.mistral = { apiKeyChiffre: encrypted };
    ecrireParametres(dataDir, p);

    const lu = lireMistral(dataDir);
    expect(lu).not.toBeNull();
    expect(lu?.apiKey).toBe('my-mistral-key');
  });
});

describe('ecrireMistral', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-mistral-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('écrit apiKey chiffrée : le fichier ne contient pas la clé en clair, lireMistral retourne la clé', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireMistral(dataDir, { apiKey: 'secret-mistral' });

    const rawContent = readFileSync(join(dataDir, 'parametres.json'), 'utf-8');
    expect(rawContent).not.toContain('"apiKey"');
    expect(rawContent).not.toContain('secret-mistral');

    const lu = lireMistral(dataDir);
    expect(lu?.apiKey).toBe('secret-mistral');
  });

  it('ecrireMistral sans apiKey dans updates conserve la section existante (apiKeyChiffre non écrasée)', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireMistral(dataDir, { apiKey: 'kept-key' });
    ecrireMistral(dataDir, {});
    const lu = lireMistral(dataDir);
    expect(lu?.apiKey).toBe('kept-key');
    expect(lu?.hasApiKey).toBe(true);
  });

  it('ecrireMistral sur fichier sans mistral crée la section (apiKeyChiffre vide si pas de clé fournie)', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireMistral(dataDir, {});
    const lu = lireMistral(dataDir);
    expect(lu).not.toBeNull();
    expect(lu?.hasApiKey).toBe(false);
  });
});

describe('indicateur hasApiKey Mistral', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-mistral-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('lireMistral retourne hasApiKey true quand apiKeyChiffre est présente', () => {
    const p = getDefaultParametres();
    p.mistral = { apiKeyChiffre: chiffrerMotDePasse('stored-mistral-key') };
    ecrireParametres(dataDir, p);

    const lu = lireMistral(dataDir);
    expect(lu).not.toBeNull();
    expect(lu?.hasApiKey).toBe(true);
  });

  it('lireMistral retourne hasApiKey false quand section mistral absente ou sans apiKeyChiffre', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    expect(lireMistral(dataDir)).toBeNull();

    const p = getDefaultParametres();
    p.mistral = {};
    ecrireParametres(dataDir, p);
    const lu = lireMistral(dataDir);
    expect(lu?.hasApiKey).toBe(false);
  });
});
