/**
 * Tests TDD pour la section Paramétrage IA dans parametres.json (US-2.1)
 * et pour la partie modifiable du prompt IA (US-2.3).
 * Baby steps : un test à la fois, RED → GREEN → REFACTOR.
 */
import type { ParametresPersistes } from '../types/parametres.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getDefaultParametres,
  lireParametres,
  ecrireParametres,
  ecrireParametresFromForm,
  lirePartieModifiablePrompt,
  ecrirePartieModifiablePrompt,
  lireEmailIdentificationDejaEnvoye,
  marquerEmailIdentificationEnvoye,
} from './parametres-io.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('ParametresPersistes.promptIA (US-2.3)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-io-prompt-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('un objet ParametresPersistes peut avoir la propriété promptIA', () => {
    const p: ParametresPersistes = {
      ...getDefaultParametres(),
      promptIA: 'Tu es un assistant veille emploi.',
    };
    expect(p.promptIA).toBe('Tu es un assistant veille emploi.');
  });

  it('écriture puis lecture de la partie modifiable → texte identique', () => {
    const texte = 'Tu es un agent de veille emploi. Résume de façon factuelle.';
    ecrirePartieModifiablePrompt(dataDir, texte);
    expect(lirePartieModifiablePrompt(dataDir)).toBe(texte);
  });

  it('absence de section promptIA → lirePartieModifiablePrompt retourne chaîne vide', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    expect(lirePartieModifiablePrompt(dataDir)).toBe('');
  });
});

describe('section Paramétrage IA dans parametres.json', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-io-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('lireParametres sur un fichier sans section parametrageIA → parametrageIA est undefined', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    const lu = lireParametres(dataDir);
    expect(lu).not.toBeNull();
    expect(lu?.parametrageIA).toBeUndefined();
  });

  it('écrit parametrageIA.rehibitoires puis relit → valeurs identiques', () => {
    const p = getDefaultParametres();
    p.parametrageIA = {
      rehibitoires: [{ titre: 'R1', description: 'desc' }],
      scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [],
      autresRessources: '',
    };
    ecrireParametres(dataDir, p);
    const lu = lireParametres(dataDir);
    expect(lu?.parametrageIA?.rehibitoires).toHaveLength(1);
    expect(lu?.parametrageIA?.rehibitoires?.[0]).toEqual({ titre: 'R1', description: 'desc' });
  });

  it('écrit les 4 zones (rehibitoires, scoresIncontournables, scoresOptionnels, autresRessources) puis relit → tout conservé', () => {
    const p = getDefaultParametres();
    p.parametrageIA = {
      rehibitoires: [
        { titre: 'R1', description: 'd1' },
        { titre: 'R2', description: 'd2' },
      ],
      scoresIncontournables: {
        localisation: 'Paris',
        salaire: '50k',
        culture: 'startup',
        qualiteOffre: 'détails',
      },
      scoresOptionnels: [
        { titre: 'SO1', attente: 'a1' },
        { titre: 'SO2', attente: 'a2' },
      ],
      autresRessources: 'C:\\docs\\cv',
    };
    ecrireParametres(dataDir, p);
    const lu = lireParametres(dataDir);
    expect(lu?.parametrageIA?.rehibitoires).toHaveLength(2);
    expect(lu?.parametrageIA?.rehibitoires).toEqual([
      { titre: 'R1', description: 'd1' },
      { titre: 'R2', description: 'd2' },
    ]);
    expect(lu?.parametrageIA?.scoresIncontournables).toEqual({
      localisation: 'Paris',
      salaire: '50k',
      culture: 'startup',
      qualiteOffre: 'détails',
    });
    expect(lu?.parametrageIA?.scoresOptionnels).toHaveLength(2);
    expect(lu?.parametrageIA?.scoresOptionnels).toEqual([
      { titre: 'SO1', attente: 'a1' },
      { titre: 'SO2', attente: 'a2' },
    ]);
    expect(lu?.parametrageIA?.autresRessources).toBe('C:\\docs\\cv');
  });

  it('écrit parametrageIA avec tableaux/champs vides puis relit → section présente, valeurs vides', () => {
    const p = getDefaultParametres();
    p.parametrageIA = {
      rehibitoires: [],
      scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [],
      autresRessources: '',
    };
    ecrireParametres(dataDir, p);
    const lu = lireParametres(dataDir);
    expect(lu?.parametrageIA).toBeDefined();
    expect(lu?.parametrageIA?.rehibitoires).toEqual([]);
    expect(lu?.parametrageIA?.scoresIncontournables).toEqual({
      localisation: '',
      salaire: '',
      culture: '',
      qualiteOffre: '',
    });
    expect(lu?.parametrageIA?.scoresOptionnels).toEqual([]);
    expect(lu?.parametrageIA?.autresRessources).toBe('');
  });
});

describe('emailIdentificationDejaEnvoye (US-3.15)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametres-io-ident-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('après enregistrement compte avec consentement, emailIdentificationDejaEnvoye est false', () => {
    ecrireParametresFromForm(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    });
    expect(lireEmailIdentificationDejaEnvoye(dataDir)).toBe(false);
  });

  it('après marquerEmailIdentificationEnvoye, lireEmailIdentificationDejaEnvoye retourne true', () => {
    ecrireParametresFromForm(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    });
    marquerEmailIdentificationEnvoye(dataDir);
    expect(lireEmailIdentificationDejaEnvoye(dataDir)).toBe(true);
  });

  it('ré-enregistrement avec consentement préserve le flag emailIdentificationDejaEnvoye', () => {
    ecrireParametresFromForm(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    });
    marquerEmailIdentificationEnvoye(dataDir);
    ecrireParametresFromForm(dataDir, {
      adresseEmail: 'user@test.fr',
      motDePasse: '',
      cheminDossier: 'INBOX',
      consentementIdentification: true,
    });
    expect(lireEmailIdentificationDejaEnvoye(dataDir)).toBe(true);
  });
});
