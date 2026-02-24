/**
 * Dictionnaire des intentions métier pour le log des appels API (US-3.4).
 * Chaque point d'appel connu est documenté : intention (libellé), méthode/flux, API.
 */

export type ApiCible = 'Airtable' | 'Claude';

export interface IntentionAppelApi {
  /** Code utilisé par les appelants (ex. pour enregistrerAppel). */
  code: string;
  /** Libellé métier court pour le diagnostic. */
  intention: string;
  /** Nom de la fonction ou du flux appelant. */
  methode: string;
  api: ApiCible;
}

/** Codes d'intention exportés pour les appelants. */
export const INTENTION_TABLEAU_SYNTHESE = 'Synthèse Airtable';
export const INTENTION_OFFRE_TEST = 'Offre test';
export const INTENTION_TEST_CLAUDECODE = 'Test ClaudeCode';
export const INTENTION_ANALYSE_IA_LOT = 'Analyse IA lot';
export const INTENTION_CONFIG_AIRTABLE = 'Config Airtable';

const DICTIONNAIRE: IntentionAppelApi[] = [
  { code: INTENTION_TABLEAU_SYNTHESE, intention: INTENTION_TABLEAU_SYNTHESE, methode: 'tableau-synthese', api: 'Airtable' },
  { code: INTENTION_OFFRE_TEST, intention: INTENTION_OFFRE_TEST, methode: 'handleGetOffreTest', api: 'Airtable' },
  { code: INTENTION_TEST_CLAUDECODE, intention: INTENTION_TEST_CLAUDECODE, methode: 'handlePostTestClaudecode', api: 'Claude' },
  { code: INTENTION_ANALYSE_IA_LOT, intention: INTENTION_ANALYSE_IA_LOT, methode: 'runAnalyseIABackground', api: 'Claude' },
  { code: INTENTION_CONFIG_AIRTABLE, intention: INTENTION_CONFIG_AIRTABLE, methode: 'executerConfigurationAirtable', api: 'Airtable' },
];

/** Retourne le dictionnaire des intentions (référence pour log et diagnostic). */
export function getDictionnaireIntentions(): IntentionAppelApi[] {
  return [...DICTIONNAIRE];
}

/** Codes d'intention utilisés dans le code (pour vérifier que le dictionnaire les contient). */
export const CODES_INTENTION_UTILISES = [
  INTENTION_TABLEAU_SYNTHESE,
  INTENTION_OFFRE_TEST,
  INTENTION_TEST_CLAUDECODE,
  INTENTION_ANALYSE_IA_LOT,
  INTENTION_CONFIG_AIRTABLE,
] as const;
