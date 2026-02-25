/**
 * Tests TDD pour lecture/écriture du compte (US-1.1).
 * Délégation à parametres.json (connexionBoiteEmail, mot de passe chiffré).
 */
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { EnvoyeurEmailIdentification } from '../types/compte.js';
import {
  ecrireCompte,
  lireCompte,
  enregistrerCompteEtNotifierSiConsentement,
} from './compte-io.js';
import { lireEmailIdentificationDejaEnvoye, marquerEmailIdentificationEnvoye } from './parametres-io.js';

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

  it('après écriture formulaire avec case consentement cochée, consentementIdentification reste false tant que consentementEnvoyeLe non posé', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    });
    const lu = lireCompte(dataDir);
    expect(lu).not.toBeNull();
    expect(lu!.consentementIdentification).toBe(false);
  });

  it('après marquerEmailIdentificationEnvoye, lireCompte retourne consentementIdentification true et consentementEnvoyeLe défini', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
    });
    marquerEmailIdentificationEnvoye(dataDir);
    const lu = lireCompte(dataDir);
    expect(lu).not.toBeNull();
    expect(lu!.consentementIdentification).toBe(true);
    expect(lu!.consentementEnvoyeLe).toBeDefined();
    expect(lu!.consentementEnvoyeLe!.length).toBeGreaterThan(0);
  });

  it('après écriture sans consentement, lireCompte retourne consentementIdentification false', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
    });
    const lu = lireCompte(dataDir);
    expect(lu).not.toBeNull();
    expect(lu!.consentementIdentification).toBe(false);
  });
});

describe('enregistrerCompteEtNotifierSiConsentement (US-3.15)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'compte-io-notif-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('sauvegarde OK + envoi OK → sauvegardeOk true, envoiEmail ok true, flag envoyé à true', async () => {
    const port: EnvoyeurEmailIdentification = {
      async envoyer() {
        return { ok: true };
      },
    };
    const result = await enregistrerCompteEtNotifierSiConsentement(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    }, port);
    expect(result.sauvegardeOk).toBe(true);
    expect(result.envoiEmail).toEqual({ ok: true });
    expect(lireEmailIdentificationDejaEnvoye(dataDir)).toBe(true);
  });

  it('sauvegarde OK + envoi KO → sauvegarde considérée réussie, envoiEmail ok false', async () => {
    const port: EnvoyeurEmailIdentification = {
      async envoyer() {
        return { ok: false, message: 'SMTP refused' };
      },
    };
    const result = await enregistrerCompteEtNotifierSiConsentement(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    }, port);
    expect(result.sauvegardeOk).toBe(true);
    expect(result.envoiEmail).toEqual({ ok: false, message: 'SMTP refused' });
  });

  it('sans consentement → pas d\'envoi, sauvegardeOk true', async () => {
    const envoye: unknown[] = [];
    const port: EnvoyeurEmailIdentification = {
      async envoyer(params) {
        envoye.push(params);
        return { ok: true };
      },
    };
    const result = await enregistrerCompteEtNotifierSiConsentement(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      consentementIdentification: false,
    }, port);
    expect(result.sauvegardeOk).toBe(true);
    expect(result.envoiEmail).toBeUndefined();
    expect(envoye).toHaveLength(0);
  });

  it('consentement déjà envoyé → pas de second envoi', async () => {
    const envoye: unknown[] = [];
    const port: EnvoyeurEmailIdentification = {
      async envoyer(params) {
        envoye.push(params);
        return { ok: true };
      },
    };
    await enregistrerCompteEtNotifierSiConsentement(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    }, port);
    expect(envoye).toHaveLength(1);
    const result2 = await enregistrerCompteEtNotifierSiConsentement(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: '',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    }, port);
    expect(result2.sauvegardeOk).toBe(true);
    expect(envoye).toHaveLength(1);
  });
});
