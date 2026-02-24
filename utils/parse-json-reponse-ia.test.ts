import { parseJsonReponseIA, validerConformiteJsonIA } from './parse-json-reponse-ia.js';
import type { ParametrageIA } from '../types/parametres.js';

describe('parseJsonReponseIA', () => {
  it('parse un JSON brut valide', () => {
    const r = parseJsonReponseIA('{"Poste":"Dev","Résumé_IA":"Résumé."}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.json.Poste).toBe('Dev');
      expect(r.json.Résumé_IA).toBe('Résumé.');
    }
  });

  it('extrait le JSON d un bloc markdown ```json ... ```', () => {
    const r = parseJsonReponseIA('```json\n{"Résumé_IA": "OK"}\n```');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.json.Résumé_IA).toBe('OK');
  });

  it('extrait le JSON entre premier { et dernier }', () => {
    const r = parseJsonReponseIA('Voici le résultat : {"Résumé_IA": "x"} Fin.');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.json.Résumé_IA).toBe('x');
  });

  it('retourne une erreur explicite pour JSON invalide', () => {
    const r = parseJsonReponseIA('{"Poste": invalid}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Unexpected token|invalid/i);
  });

  it('retourne une erreur explicite pour réponse vide', () => {
    const r = parseJsonReponseIA('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('vide');
  });

  it('retourne une erreur quand aucun objet trouvé', () => {
    const r = parseJsonReponseIA('Pas de JSON ici.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/objet JSON|{/);
  });
});

describe('validerConformiteJsonIA', () => {
  const param4rehib4opt: ParametrageIA | null = {
    rehibitoires: [
      { titre: 'A', description: 'a' },
      { titre: 'B', description: 'b' },
      { titre: 'C', description: 'c' },
      { titre: 'D', description: 'd' },
    ],
    scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
    scoresOptionnels: [
      { titre: 'O1', attente: '' },
      { titre: 'O2', attente: '' },
      { titre: 'O3', attente: '' },
      { titre: 'O4', attente: '' },
    ],
    autresRessources: '',
  };

  it('accepte un JSON conforme (4 réhib, 4 optionnels)', () => {
    const json = {
      Poste: 'BM IT',
      Entreprise: 'Akkodis',
      Ville: 'Lyon',
      Département: '69',
      Date_offre: '',
      Salaire: '',
      Résumé_IA: 'Résumé.',
      Réhibitoire3: 'Justification critère 3.',
      ScoreLocalisation: 16,
      ScoreSalaire: 5,
      ScoreCulture: 3,
      ScoreQualitéOffre: 4,
      ScoreOptionnel1: 3,
      ScoreOptionnel2: 4,
      ScoreOptionnel3: 5,
      ScoreOptionnel4: 4,
    };
    const r = validerConformiteJsonIA(json, param4rehib4opt);
    expect(r.conform).toBe(true);
  });

  it('signale clé manquante', () => {
    const r = validerConformiteJsonIA({ Poste: 'x' }, param4rehib4opt);
    expect(r.conform).toBe(false);
    if (!r.conform) expect(r.errors.some((e) => e.includes('manquante'))).toBe(true);
  });

  it('signale clé non attendue', () => {
    const json = { Poste: 'x', Entreprise: '', Ville: '', Département: '', Date_offre: '', Salaire: '', Résumé_IA: '', Réhibitoire1: 'x', ScoreLocalisation: 10, ScoreSalaire: 10, ScoreCulture: 10, ScoreQualitéOffre: 10, ScoreOptionnel1: 10, ScoreOptionnel2: 10, ScoreOptionnel3: 10, ScoreOptionnel4: 10, Inconnu: true };
    const r = validerConformiteJsonIA(json, param4rehib4opt);
    expect(r.conform).toBe(false);
    if (!r.conform) expect(r.errors.some((e) => e.includes('non attendue') && e.includes('Inconnu'))).toBe(true);
  });

  it('signale type incorrect (Réhibitoire doit être chaîne quand présent)', () => {
    const json = { Poste: 'x', Entreprise: '', Ville: '', Département: '', Date_offre: '', Salaire: '', Résumé_IA: '', Réhibitoire1: true, ScoreLocalisation: 10, ScoreSalaire: 10, ScoreCulture: 10, ScoreQualitéOffre: 10, ScoreOptionnel1: 10, ScoreOptionnel2: 10, ScoreOptionnel3: 10, ScoreOptionnel4: 10 };
    const r = validerConformiteJsonIA(json, param4rehib4opt);
    expect(r.conform).toBe(false);
    if (!r.conform) expect(r.errors.some((e) => e.includes('Réhibitoire1') && e.includes('chaîne'))).toBe(true);
  });

  describe('US-3.2 RéhibitoireN optionnel (string justification si rédhibitoire, absent sinon)', () => {
    const param2rehib: ParametrageIA | null = {
      rehibitoires: [
        { titre: 'A', description: 'a' },
        { titre: 'B', description: 'b' },
        { titre: '', description: '' },
        { titre: '', description: '' },
      ],
      scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [],
      autresRessources: '',
    };

    it('JSON avec Réhibitoire1 présent (string justification) → conform', () => {
      const json = {
        Poste: '',
        Entreprise: '',
        Ville: '',
        Département: '',
        Date_offre: '',
        Salaire: '',
        Résumé_IA: '',
        Réhibitoire1: 'Télétravail non mentionné.',
        ScoreLocalisation: 10,
        ScoreSalaire: 10,
        ScoreCulture: 10,
        ScoreQualitéOffre: 10,
      };
      const r = validerConformiteJsonIA(json, param2rehib);
      expect(r.conform).toBe(true);
    });

    it('Réhibitoire1 et Réhibitoire2 absents (optionnel) → conform', () => {
      const json = {
        Poste: '',
        Entreprise: '',
        Ville: '',
        Département: '',
        Date_offre: '',
        Salaire: '',
        Résumé_IA: '',
        ScoreLocalisation: 10,
        ScoreSalaire: 10,
        ScoreCulture: 10,
        ScoreQualitéOffre: 10,
      };
      const r = validerConformiteJsonIA(json, param2rehib);
      expect(r.conform).toBe(true);
    });

    it('Réhibitoire1 non-string (ex. booléen) → erreur', () => {
      const json = {
        Poste: '',
        Entreprise: '',
        Ville: '',
        Département: '',
        Date_offre: '',
        Salaire: '',
        Résumé_IA: '',
        Réhibitoire1: true,
        ScoreLocalisation: 10,
        ScoreSalaire: 10,
        ScoreCulture: 10,
        ScoreQualitéOffre: 10,
      };
      const r = validerConformiteJsonIA(json, param2rehib);
      expect(r.conform).toBe(false);
      if (!r.conform) expect(r.errors.some((e) => e.includes('Réhibitoire1') && e.includes('chaîne'))).toBe(true);
    });

    it('Réhibitoire1 > 500 caractères → erreur', () => {
      const json = {
        Poste: '',
        Entreprise: '',
        Ville: '',
        Département: '',
        Date_offre: '',
        Salaire: '',
        Résumé_IA: '',
        Réhibitoire1: 'x'.repeat(501),
        ScoreLocalisation: 10,
        ScoreSalaire: 10,
        ScoreCulture: 10,
        ScoreQualitéOffre: 10,
      };
      const r = validerConformiteJsonIA(json, param2rehib);
      expect(r.conform).toBe(false);
      if (!r.conform) expect(r.errors.some((e) => e.includes('Réhibitoire1') && e.includes('500'))).toBe(true);
    });
  });
});
