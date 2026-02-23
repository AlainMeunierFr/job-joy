/**
 * Tests TDD pour la section ClaudeCode dans parametres.json (US-2.2).
 * Baby step 1 : types ParametresPersistes accepte claudecode.
 * Baby step 2 : lireClaudeCode (null si absent, apiKey déchiffrée si présente).
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
import { lireClaudeCode, ecrireClaudeCode } from './parametres-claudecode.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('types ClaudeCode et ParametresPersistes (baby step 1)', () => {
  it('ParametresPersistes accepte une section claudecode avec apiKeyChiffre', () => {
    const p: ParametresPersistes = {
      ...getDefaultParametres(),
      claudecode: { apiKeyChiffre: 'aes256gcm:iv:ct:tag' },
    };
    expect(p.claudecode).toBeDefined();
    expect(p.claudecode?.apiKeyChiffre).toBe('aes256gcm:iv:ct:tag');
  });
});

describe('lireClaudeCode (baby step 2)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-claudecode-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('retourne null si parametres.json absent ou sans section claudecode', () => {
    expect(lireClaudeCode(dataDir)).toBeNull();
    ecrireParametres(dataDir, getDefaultParametres());
    expect(lireClaudeCode(dataDir)).toBeNull();
  });

  it('retourne la section claudecode avec apiKey déchiffrée quand apiKeyChiffre est présente', () => {
    const encrypted = chiffrerMotDePasse('my-secret-key');
    const p = getDefaultParametres();
    p.claudecode = { apiKeyChiffre: encrypted };
    ecrireParametres(dataDir, p);

    const lu = lireClaudeCode(dataDir);
    expect(lu).not.toBeNull();
    expect(lu?.apiKey).toBe('my-secret-key');
  });
});

describe('ecrireClaudeCode (baby step 3)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-claudecode-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('écrit apiKey chiffrée : le fichier ne contient pas la clé en clair, lireClaudeCode retourne la clé', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireClaudeCode(dataDir, { apiKey: 'secret' });

    const rawContent = readFileSync(join(dataDir, 'parametres.json'), 'utf-8');
    expect(rawContent).not.toContain('"apiKey"');
    expect(rawContent).not.toContain('secret');

    const lu = lireClaudeCode(dataDir);
    expect(lu?.apiKey).toBe('secret');
  });

  it('ecrireClaudeCode sans apiKey dans updates conserve la section existante (apiKeyChiffre non écrasée)', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireClaudeCode(dataDir, { apiKey: 'kept' });
    ecrireClaudeCode(dataDir, {});
    const lu = lireClaudeCode(dataDir);
    expect(lu?.apiKey).toBe('kept');
    expect(lu?.hasApiKey).toBe(true);
  });

  it('ecrireClaudeCode sur fichier sans claudecode crée la section (apiKeyChiffre vide si pas de clé fournie)', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireClaudeCode(dataDir, {});
    const lu = lireClaudeCode(dataDir);
    expect(lu).not.toBeNull();
    expect(lu?.hasApiKey).toBe(false);
  });
});

describe('indicateur hasApiKey (baby step 4)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-claudecode-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('lireClaudeCode retourne hasApiKey true quand apiKeyChiffre est présente (sans exiger la clé)', () => {
    const p = getDefaultParametres();
    p.claudecode = { apiKeyChiffre: chiffrerMotDePasse('stored-key') };
    ecrireParametres(dataDir, p);

    const lu = lireClaudeCode(dataDir);
    expect(lu).not.toBeNull();
    expect(lu?.hasApiKey).toBe(true);
  });

  it('lireClaudeCode retourne hasApiKey false quand section claudecode absente ou sans apiKeyChiffre', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    expect(lireClaudeCode(dataDir)).toBeNull();

    const p = getDefaultParametres();
    p.claudecode = {};
    ecrireParametres(dataDir, p);
    const lu = lireClaudeCode(dataDir);
    expect(lu?.hasApiKey).toBe(false);
  });
});
