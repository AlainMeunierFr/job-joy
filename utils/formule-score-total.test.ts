/**
 * Tests US-2.7 : calcul du score total (formule math.js, moyenne pondérée, arrondi).
 */
import {
  evaluerFormule,
  FORMULE_DEFAULT,
  scoreTotalEntier,
  scoreTotalUnDecimal,
  construireScope,
  getDefaultFormuleDuScoreTotal,
  mergeFormuleDuScoreTotal,
  calculerScoreTotal,
} from './formule-score-total.js';

describe('formule-score-total', () => {
  describe('evaluerFormule', () => {
    it('évalue une formule simple avec scope (ScoreSalaire + ScoreCulture) → 8', () => {
      const result = evaluerFormule('ScoreSalaire + ScoreCulture', {
        ScoreSalaire: 5,
        ScoreCulture: 3,
      });
      expect(result).toBe(8);
    });

    it('lance une erreur si la formule est vide ou blanche', () => {
      expect(() => evaluerFormule('', { ScoreSalaire: 1 })).toThrow('Formule vide');
      expect(() => evaluerFormule('   ', { ScoreSalaire: 1 })).toThrow('Formule vide');
    });

    it('lance une erreur si l\'expression math.js est invalide', () => {
      expect(() => evaluerFormule('x + ', { x: 1 })).toThrow();
    });
  });

  describe('FORMULE_DEFAULT (moyenne pondérée en excluant les 0)', () => {
    it('calcule la moyenne pondérée en n\'incluant que les scores > 0', () => {
      const scope = {
        ScoreLocalisation: 5,
        ScoreSalaire: 0,
        ScoreCulture: 3,
        ScoreQualitéOffre: 0,
        ScoreCritère1: 0,
        ScoreCritère2: 0,
        ScoreCritère3: 0,
        ScoreCritère4: 0,
        coefScoreLocalisation: 1,
        coefScoreSalaire: 1,
        coefScoreCulture: 1,
        coefScoreQualiteOffre: 1,
        coefScoreOptionnel1: 1,
        coefScoreOptionnel2: 1,
        coefScoreOptionnel3: 1,
        coefScoreOptionnel4: 1,
      };
      const result = evaluerFormule(FORMULE_DEFAULT, scope);
      expect(result).toBe(4); // (5+3)/2
    });

    it('retourne 0 si tous les scores sont à 0', () => {
      const scope = {
        ScoreLocalisation: 0,
        ScoreSalaire: 0,
        ScoreCulture: 0,
        ScoreQualitéOffre: 0,
        ScoreCritère1: 0,
        ScoreCritère2: 0,
        ScoreCritère3: 0,
        ScoreCritère4: 0,
        coefScoreLocalisation: 1,
        coefScoreSalaire: 1,
        coefScoreCulture: 1,
        coefScoreQualiteOffre: 1,
        coefScoreOptionnel1: 1,
        coefScoreOptionnel2: 1,
        coefScoreOptionnel3: 1,
        coefScoreOptionnel4: 1,
      };
      const result = evaluerFormule(FORMULE_DEFAULT, scope);
      expect(result).toBe(0);
    });
  });

  describe('scoreTotalEntier', () => {
    it('arrondit au plus proche entier (4.6 → 5, 4.4 → 4)', () => {
      expect(scoreTotalEntier(4.6)).toBe(5);
      expect(scoreTotalEntier(4.4)).toBe(4);
    });
  });

  describe('scoreTotalUnDecimal', () => {
    it('arrondit à 1 chiffre après la virgule (4.67 → 4.7, 4.64 → 4.6)', () => {
      expect(scoreTotalUnDecimal(4.67)).toBe(4.7);
      expect(scoreTotalUnDecimal(4.64)).toBe(4.6);
    });
  });

  describe('construireScope', () => {
    it('retourne un scope avec les noms de variables scores et coefficients alignés US-2.7', () => {
      const scores = {
        ScoreLocalisation: 5,
        ScoreSalaire: 3,
        ScoreCulture: 2,
        ScoreQualitéOffre: 1,
        ScoreCritère1: 0,
        ScoreCritère2: 0,
        ScoreCritère3: 0,
        ScoreCritère4: 0,
      };
      const coefs = {
        coefScoreLocalisation: 1,
        coefScoreSalaire: 1,
        coefScoreCulture: 1,
        coefScoreQualiteOffre: 1,
        coefScoreOptionnel1: 1,
        coefScoreOptionnel2: 1,
        coefScoreOptionnel3: 1,
        coefScoreOptionnel4: 1,
      };
      const scope = construireScope(scores, coefs);
      expect(scope.ScoreLocalisation).toBe(5);
      expect(scope.ScoreSalaire).toBe(3);
      expect(scope.ScoreCulture).toBe(2);
      expect(scope.ScoreQualitéOffre).toBe(1);
      expect(scope.ScoreCritère1).toBe(0);
      expect(scope.ScoreCritère2).toBe(0);
      expect(scope.ScoreCritère3).toBe(0);
      expect(scope.ScoreCritère4).toBe(0);
      expect(scope.coefScoreLocalisation).toBe(1);
      expect(scope.coefScoreSalaire).toBe(1);
      expect(scope.coefScoreCulture).toBe(1);
      expect(scope.coefScoreQualiteOffre).toBe(1);
      expect(scope.coefScoreOptionnel1).toBe(1);
      expect(scope.coefScoreOptionnel2).toBe(1);
      expect(scope.coefScoreOptionnel3).toBe(1);
      expect(scope.coefScoreOptionnel4).toBe(1);
    });
  });

  describe('getDefaultFormuleDuScoreTotal', () => {
    it('retourne tous les coefficients à 1 et formule = FORMULE_DEFAULT', () => {
      const def = getDefaultFormuleDuScoreTotal();
      expect(def.coefScoreLocalisation).toBe(1);
      expect(def.coefScoreSalaire).toBe(1);
      expect(def.coefScoreCulture).toBe(1);
      expect(def.coefScoreQualiteOffre).toBe(1);
      expect(def.coefScoreOptionnel1).toBe(1);
      expect(def.coefScoreOptionnel2).toBe(1);
      expect(def.coefScoreOptionnel3).toBe(1);
      expect(def.coefScoreOptionnel4).toBe(1);
      expect(def.formule).toBe(FORMULE_DEFAULT);
    });
  });

  describe('mergeFormuleDuScoreTotal', () => {
    it('retourne les défauts si partial est null ou undefined', () => {
      expect(mergeFormuleDuScoreTotal(null).formule).toBe(FORMULE_DEFAULT);
      expect(mergeFormuleDuScoreTotal(undefined).coefScoreSalaire).toBe(1);
    });

    it('fusionne les champs fournis avec les défauts pour les manquants', () => {
      const merged = mergeFormuleDuScoreTotal({
        coefScoreSalaire: 2,
        formule: 'ScoreSalaire',
      });
      expect(merged.coefScoreSalaire).toBe(2);
      expect(merged.formule).toBe('ScoreSalaire');
      expect(merged.coefScoreLocalisation).toBe(1);
      expect(merged.coefScoreOptionnel4).toBe(1);
    });
  });

  describe('calculerScoreTotal', () => {
    it('avec formule personnalisée ScoreSalaire + ScoreCulture retourne 8 (1 décimale : 8.0)', () => {
      const scores = {
        ScoreLocalisation: 0,
        ScoreSalaire: 5,
        ScoreCulture: 3,
        ScoreQualitéOffre: 0,
        ScoreCritère1: 0,
        ScoreCritère2: 0,
        ScoreCritère3: 0,
        ScoreCritère4: 0,
      };
      const params = mergeFormuleDuScoreTotal({ formule: 'ScoreSalaire + ScoreCulture' });
      expect(calculerScoreTotal(scores, params)).toBe(8);
    });

    it('avec formule par défaut et scores partiels retourne moyenne pondérée (ex. (5+3)/2 = 4)', () => {
      const scores = {
        ScoreLocalisation: 5,
        ScoreSalaire: 0,
        ScoreCulture: 3,
        ScoreQualitéOffre: 0,
        ScoreCritère1: 0,
        ScoreCritère2: 0,
        ScoreCritère3: 0,
        ScoreCritère4: 0,
      };
      const params = getDefaultFormuleDuScoreTotal();
      expect(calculerScoreTotal(scores, params)).toBe(4);
    });

    it('avec formule par défaut arrondit à 1 décimale (ex. 14/3 → 4.7)', () => {
      const scores = {
        ScoreLocalisation: 5,
        ScoreSalaire: 4,
        ScoreCulture: 5,
        ScoreQualitéOffre: 0,
        ScoreCritère1: 0,
        ScoreCritère2: 0,
        ScoreCritère3: 0,
        ScoreCritère4: 0,
      };
      const params = getDefaultFormuleDuScoreTotal();
      expect(calculerScoreTotal(scores, params)).toBe(4.7); // formule par défaut contient round(..., 1)
    });

    it('avec formule personnalisée sans round retourne la valeur brute (ex. 14/3)', () => {
      const scores = {
        ScoreLocalisation: 5,
        ScoreSalaire: 4,
        ScoreCulture: 5,
        ScoreQualitéOffre: 0,
        ScoreCritère1: 0,
        ScoreCritère2: 0,
        ScoreCritère3: 0,
        ScoreCritère4: 0,
      };
      const params = mergeFormuleDuScoreTotal({ formule: '(ScoreLocalisation + ScoreSalaire + ScoreCulture) / 3' });
      expect(calculerScoreTotal(scores, params)).toBe(14 / 3); // pas d’arrondi dans l’app, la formule ne contient pas round
    });
  });
});
