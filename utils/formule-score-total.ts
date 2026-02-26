/**
 * US-2.7 : Calcul du score total via formule math.js (scope = scores + coefficients).
 */
import { evaluate } from 'mathjs';
import type { FormuleDuScoreTotal } from '../types/parametres.js';

/** Nom des scores dans le scope (alignés US-2.7). Exportés pour l'UI (liste variables). */
export const NOMS_SCORES = [
  'ScoreLocalisation',
  'ScoreSalaire',
  'ScoreCulture',
  'ScoreQualitéOffre',
  'ScoreCritère1',
  'ScoreCritère2',
  'ScoreCritère3',
  'ScoreCritère4',
] as const;

/** Nom des coefficients dans le scope (alignés US-2.7). Exportés pour l'UI (liste variables). */
export const NOMS_COEFS = [
  'coefScoreLocalisation',
  'coefScoreSalaire',
  'coefScoreCulture',
  'coefScoreQualiteOffre',
  'coefScoreOptionnel1',
  'coefScoreOptionnel2',
  'coefScoreOptionnel3',
  'coefScoreOptionnel4',
] as const;

/**
 * Formule par défaut : moyenne pondérée en excluant les scores à 0, arrondie à 1 chiffre après la virgule (round math.js).
 * Numérateur = somme des (coef × score) pour score > 0, dénominateur = somme des coef pour score > 0 ; si dénominateur 0 → 0.
 */
const _num =
  '(ScoreLocalisation>0 ? coefScoreLocalisation*ScoreLocalisation : 0) + (ScoreSalaire>0 ? coefScoreSalaire*ScoreSalaire : 0) + (ScoreCulture>0 ? coefScoreCulture*ScoreCulture : 0) + (ScoreQualitéOffre>0 ? coefScoreQualiteOffre*ScoreQualitéOffre : 0) + (ScoreCritère1>0 ? coefScoreOptionnel1*ScoreCritère1 : 0) + (ScoreCritère2>0 ? coefScoreOptionnel2*ScoreCritère2 : 0) + (ScoreCritère3>0 ? coefScoreOptionnel3*ScoreCritère3 : 0) + (ScoreCritère4>0 ? coefScoreOptionnel4*ScoreCritère4 : 0)';
const _den =
  '(ScoreLocalisation>0 ? coefScoreLocalisation : 0) + (ScoreSalaire>0 ? coefScoreSalaire : 0) + (ScoreCulture>0 ? coefScoreCulture : 0) + (ScoreQualitéOffre>0 ? coefScoreQualiteOffre : 0) + (ScoreCritère1>0 ? coefScoreOptionnel1 : 0) + (ScoreCritère2>0 ? coefScoreOptionnel2 : 0) + (ScoreCritère3>0 ? coefScoreOptionnel3 : 0) + (ScoreCritère4>0 ? coefScoreOptionnel4 : 0)';

export const FORMULE_DEFAULT = `(${_den}) > 0 ? round((${_num}) / (${_den}), 1) : 0`;

/**
 * Ramène le résultat du calcul à un entier (arrondi mathématique).
 */
export function scoreTotalEntier(resultat: number): number {
  return Math.round(resultat);
}

/**
 * Ramène le résultat à 1 chiffre après la virgule (arrondi mathématique).
 * Utilisé pour le score total (formule par défaut et stockage).
 */
export function scoreTotalUnDecimal(resultat: number): number {
  return Math.round(resultat * 10) / 10;
}

/** Scores utilisables dans la formule (noms US-2.7). Peut contenir ScoreQualiteOffre (Airtable) ou ScoreQualitéOffre (IA). */
export type ScoresPourFormule = Partial<Record<(typeof NOMS_SCORES)[number], number>> & {
  ScoreQualiteOffre?: number;
};

/** Coefficients formule (noms US-2.7). */
export type CoefficientsFormule = Partial<Record<(typeof NOMS_COEFS)[number], number>>;

/**
 * Construit le scope math.js (scores + coefficients) à partir des scores IA et des coefficients.
 * Alias : ScoreQualiteOffre (Airtable) → ScoreQualitéOffre dans le scope.
 */
export function construireScope(
  scores: ScoresPourFormule,
  coefs: CoefficientsFormule
): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const k of NOMS_SCORES) {
    const v = k === 'ScoreQualitéOffre'
      ? (scores.ScoreQualitéOffre ?? (scores as Record<string, number>).ScoreQualiteOffre) ?? 0
      : (scores as Record<string, number>)[k] ?? 0;
    scope[k] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  }
  for (const k of NOMS_COEFS) {
    const v = (coefs as Record<string, number>)[k] ?? 1;
    scope[k] = typeof v === 'number' && Number.isFinite(v) ? v : 1;
  }
  return scope;
}

/**
 * Retourne les valeurs par défaut pour formuleDuScoreTotal (tous coef à 1, formule = FORMULE_DEFAULT).
 */
export function getDefaultFormuleDuScoreTotal(): FormuleDuScoreTotal {
  return {
    coefScoreLocalisation: 1,
    coefScoreSalaire: 1,
    coefScoreCulture: 1,
    coefScoreQualiteOffre: 1,
    coefScoreOptionnel1: 1,
    coefScoreOptionnel2: 1,
    coefScoreOptionnel3: 1,
    coefScoreOptionnel4: 1,
    formule: FORMULE_DEFAULT,
  };
}

/**
 * Use case : calcule le score total à partir des scores IA et des paramètres formule.
 * Construit le scope, évalue la formule (ou FORMULE_DEFAULT si vide). Le résultat n'est pas arrondi par l'app : c'est la formule (ex. formule par défaut avec round(..., 1)) qui fixe le format.
 */
export function calculerScoreTotal(
  scores: ScoresPourFormule,
  paramsFormule: FormuleDuScoreTotal
): number {
  const scope = construireScope(scores, paramsFormule);
  const formule = (paramsFormule.formule ?? '').trim() || FORMULE_DEFAULT;
  return evaluerFormule(formule, scope);
}

/**
 * Fusionne un objet partiel avec les défauts (tous champs manquants = défaut).
 */
export function mergeFormuleDuScoreTotal(
  partial: Partial<FormuleDuScoreTotal> | null | undefined
): FormuleDuScoreTotal {
  const def = getDefaultFormuleDuScoreTotal();
  if (!partial || typeof partial !== 'object') return def;
  return {
    coefScoreLocalisation: partial.coefScoreLocalisation ?? def.coefScoreLocalisation,
    coefScoreSalaire: partial.coefScoreSalaire ?? def.coefScoreSalaire,
    coefScoreCulture: partial.coefScoreCulture ?? def.coefScoreCulture,
    coefScoreQualiteOffre: partial.coefScoreQualiteOffre ?? def.coefScoreQualiteOffre,
    coefScoreOptionnel1: partial.coefScoreOptionnel1 ?? def.coefScoreOptionnel1,
    coefScoreOptionnel2: partial.coefScoreOptionnel2 ?? def.coefScoreOptionnel2,
    coefScoreOptionnel3: partial.coefScoreOptionnel3 ?? def.coefScoreOptionnel3,
    coefScoreOptionnel4: partial.coefScoreOptionnel4 ?? def.coefScoreOptionnel4,
    formule: typeof partial.formule === 'string' && partial.formule.trim() !== ''
      ? partial.formule.trim()
      : def.formule,
  };
}

/**
 * Évalue une expression math.js avec le scope (variables nom → valeur).
 * @param formule - Expression math.js (ex. "ScoreSalaire + ScoreCulture")
 * @param scope - Variables disponibles (scores et coefficients)
 * @returns Résultat numérique de l'évaluation
 * @throws Error si formule est vide ou si math.js lève (expression invalide)
 */
export function evaluerFormule(formule: string, scope: Record<string, number>): number {
  const trimmed = (formule ?? '').trim();
  if (trimmed === '') {
    throw new Error('Formule vide');
  }
  const result = evaluate(trimmed, scope);
  return typeof result === 'number' && Number.isFinite(result) ? result : 0;
}
