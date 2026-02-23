/**
 * Tests TDD pour lecture/écriture du compte (US-1.1).
 * Délégation à parametres.json (connexionBoiteEmail, mot de passe chiffré).
 */
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ecrireCompte, lireCompte } from './compte-io.js';

const TEST_KEY = '0'.repeat(64);

describe('ecrireCompte', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'compte-io-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('crée le fichier parametres.json dans le dossier data', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'alain@maep.fr',
      motDePasse: 'MonMotDePasse',
      cheminDossier: 'C:\\Dossier',
    });
    expect(existsSync(join(dataDir, 'parametres.json'))).toBe(true);
  });

  it('contient adresse email et chemin du dossier (connexionBoiteEmail)', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'alain@maep.fr',
      motDePasse: 'MonMotDePasse',
      cheminDossier: 'C:\\Dossier',
    });
    const raw = readFileSync(join(dataDir, 'parametres.json'), 'utf-8');
    const data = JSON.parse(raw);
    expect(data.connexionBoiteEmail?.imap?.adresseEmail).toBe('alain@maep.fr');
    expect(data.connexionBoiteEmail?.dossierAAnalyser).toBe('C:\\Dossier');
  });

  it('ne stocke pas le mot de passe en clair', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'a@b.fr',
      motDePasse: 'MonMotDePasse',
      cheminDossier: 'C:\\D',
    });
    const raw = readFileSync(join(dataDir, 'parametres.json'), 'utf-8');
    expect(raw).not.toContain('MonMotDePasse');
  });

  it('stocke le mot de passe chiffré (préfixe aes256gcm)', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'a@b.fr',
      motDePasse: 'secret',
      cheminDossier: 'C:\\D',
    });
    const data = JSON.parse(readFileSync(join(dataDir, 'parametres.json'), 'utf-8'));
    const enc = data.connexionBoiteEmail?.imap?.motDePasseChiffre;
    expect(enc).toBeDefined();
    expect(enc).toMatch(/^aes256gcm:/);
  });
});

describe('lireCompte (baby step 5)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'compte-io-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('retourne adresse email et chemin dossier après écriture', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'alain@maep.fr',
      motDePasse: 'MonMotDePasse',
      cheminDossier: 'C:\\Dossier',
    });
    const lu = lireCompte(dataDir);
    expect(lu).not.toBeNull();
    expect(lu!.adresseEmail).toBe('alain@maep.fr');
    expect(lu!.cheminDossier).toBe('C:\\Dossier');
  });

  it('ne retourne pas le mot de passe en clair', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'a@b.fr',
      motDePasse: 'MonMotDePasse',
      cheminDossier: 'C:\\D',
    });
    const lu = lireCompte(dataDir);
    expect(lu).not.toBeNull();
    const hasPlainPassword = 'motDePasse' in (lu as object) && (lu as { motDePasse?: string }).motDePasse === 'MonMotDePasse';
    expect(hasPlainPassword).toBe(false);
  });

  it('retourne null si parametres.json absent', () => {
    const lu = lireCompte(dataDir);
    expect(lu).toBeNull();
  });
});
