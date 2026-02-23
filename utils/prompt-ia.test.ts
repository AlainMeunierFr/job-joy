/**
 * Tests TDD pour la construction du prompt IA (US-2.3).
 * Baby steps : RED → GREEN → REFACTOR.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getPartieModifiablePromptDefaut,
  construirePromptComplet,
  construireListeClesJson,
  PARTIE_FIXE_PROMPT_IA,
} from './prompt-ia.js';
import { ecrirePartieModifiablePrompt, getDefaultParametres, ecrireParametres } from './parametres-io.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('getPartieModifiablePromptDefaut (US-2.3)', () => {
  it('retourne une chaîne non vide', () => {
    const defaut = getPartieModifiablePromptDefaut();
    expect(defaut).not.toBe('');
    expect(defaut.length).toBeGreaterThan(0);
  });

  it('contient des éléments attendus (rôle, résumé ou marqueurs)', () => {
    const defaut = getPartieModifiablePromptDefaut();
    const contientRôle = /rôle|agent|veille/i.test(defaut);
    const contientResume = /résumé|résume/i.test(defaut);
    const contientMarqueur = /\{\{|\}\}|__|critères|rédhibitoire|score/i.test(defaut);
    expect(contientRôle || contientResume || contientMarqueur).toBe(true);
  });
});

describe('construirePromptComplet (US-2.3)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'prompt-ia-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('sans partie modifiable enregistrée → prompt contient partie fixe et valeur par défaut', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    const prompt = construirePromptComplet(dataDir, null);
    expect(prompt.startsWith(PARTIE_FIXE_PROMPT_IA)).toBe(true);
    expect(prompt).toContain('**Rôle**');
    expect(prompt).toContain(getPartieModifiablePromptDefaut());
  });

  it('avec partie modifiable enregistrée → prompt contient partie fixe et texte enregistré', () => {
    const textePerso = 'Instructions personnalisées : sois concis.';
    ecrirePartieModifiablePrompt(dataDir, textePerso);
    const prompt = construirePromptComplet(dataDir, null);
    expect(prompt.startsWith(PARTIE_FIXE_PROMPT_IA)).toBe(true);
    expect(prompt).toContain(textePerso);
  });

  it('avec parametrageIA fourni → les placeholders sont remplacés par les valeurs', () => {
    const texteAvecPlaceholders = 'Rédhibitoire : {{REHIBITOIRE1_TITRE}} — {{REHIBITOIRE1_DESCRIPTION}}. Localisation : {{SCORE_LOCALISATION}}. Optionnel : {{SCORE_OPTIONNEL1_TITRE}} — {{SCORE_OPTIONNEL1_ATTENTE}}. Ressources : {{AUTRES_RESSOURCES}}.';
    ecrirePartieModifiablePrompt(dataDir, texteAvecPlaceholders);
    const parametrageIA = {
      rehibitoires: [{ titre: 'Télétravail', description: 'Au moins 2 j/semaine' }],
      scoresIncontournables: { localisation: 'Île-de-France', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [{ titre: 'Stack technique', attente: 'TypeScript' }],
      autresRessources: 'C:\\cv.pdf',
    };
    const prompt = construirePromptComplet(dataDir, parametrageIA);
    expect(prompt).toContain('Télétravail');
    expect(prompt).toContain('Au moins 2 j/semaine');
    expect(prompt).toContain('Île-de-France');
    expect(prompt).toContain('Stack technique');
    expect(prompt).toContain('TypeScript');
    expect(prompt).toContain('C:\\cv.pdf');
    expect(prompt).not.toContain('{{REHIBITOIRE1_TITRE}}');
    expect(prompt).not.toContain('{{SCORE_LOCALISATION}}');
    expect(prompt).not.toContain('{{SCORE_OPTIONNEL1_TITRE}}');
    expect(prompt).not.toContain('{{AUTRES_RESSOURCES}}');
  });
});

describe('partie fixe du prompt (US-2.3 CA2)', () => {
  it('le prompt construit contient JSON et champs attendus (Poste, Résumé_IA, ScoreLocalisation, etc.)', () => {
    const defaut = getPartieModifiablePromptDefaut();
    const promptComplet = PARTIE_FIXE_PROMPT_IA + defaut;
    expect(promptComplet).toMatch(/JSON|json/i);
    expect(promptComplet).toContain('Poste');
    expect(promptComplet).toContain('Résumé_IA');
    expect(promptComplet).toContain('ScoreLocalisation');
    expect(promptComplet).toContain('ScoreSalaire');
    expect(promptComplet).toContain('ScoreCulture');
    expect(promptComplet).toContain('ScoreQualitéOffre');
  });
});

describe('construireListeClesJson (clés explicites, uniquement configurées)', () => {
  it('sans paramétrage → uniquement champs de base + scores incontournables', () => {
    const liste = construireListeClesJson(null);
    expect(liste).toContain('Poste, Entreprise, Ville, Département, Date_offre, Salaire, Résumé_IA');
    expect(liste).toContain('ScoreLocalisation, ScoreSalaire, ScoreCulture, ScoreQualitéOffre');
    expect(liste).not.toContain('Réhibitoire');
    expect(liste).not.toContain('ScoreOptionnel');
  });

  it('avec 2 réhibitoires et 2 scores optionnels configurés → liste explicite sans 3 ni 4', () => {
    const parametrageIA = {
      rehibitoires: [
        { titre: 'Localisation', description: 'Hors IDF rédhibitoire' },
        { titre: 'Salaire', description: 'Non mentionné = rédhibitoire' },
        { titre: '', description: '' },
        { titre: '', description: '' },
      ],
      scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [
        { titre: 'Langues', attente: 'Anglais' },
        { titre: 'Secteur', attente: 'IT' },
        { titre: '', attente: '' },
        { titre: '', attente: '' },
      ],
      autresRessources: '',
    };
    const liste = construireListeClesJson(parametrageIA);
    expect(liste).toContain('Réhibitoire1, Réhibitoire2');
    expect(liste).not.toContain('Réhibitoire3');
    expect(liste).not.toContain('Réhibitoire4');
    expect(liste).toContain('ScoreOptionnel1, ScoreOptionnel2');
    expect(liste).not.toContain('ScoreOptionnel3');
    expect(liste).not.toContain('ScoreOptionnel4');
  });
});
