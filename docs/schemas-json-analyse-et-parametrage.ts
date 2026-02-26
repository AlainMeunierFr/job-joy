/**
 * Schémas TypeScript pour une IA externe : structure, noms de propriétés et types.
 * - JsonReponseAnalyseIA : JSON attendu en sortie de la phase d'analyse (injection Airtable).
 * - ParametrageIA (et sous-types) : JSON de paramétrage (critères, scores, prompt).
 *
 * À fournir en entrée à une IA qui connaît le parcours / expériences / compétences du candidat.
 */

// =============================================================================
// 1. JSON DE RÉPONSE ANALYSE (sortie IA → injecté dans Airtable)
// =============================================================================

/** Score entier 0–20 (tous les champs Score*). */
export type ScoreAnalyse = number; // 0..20

/**
 * Objet JSON que l'IA d'analyse doit retourner (et que l'app mappe vers Airtable).
 * Règles : uniquement ces clés ; pas de null (utiliser "" pour un texte absent) ;
 * Résumé_IA : un paragraphe factuel, 2–4 phrases, sans markdown.
 */
export interface JsonReponseAnalyseIA {
  // --- Champs texte (obligatoires, chaînes ; "" si absent)
  Poste: string;
  Entreprise: string;
  Ville: string;
  Département: string;
  Date_offre: string;
  Salaire: string;
  /** Un paragraphe, factuel, sans ** ni listes. */
  Résumé_IA: string;

  // --- Critères rédhibitoires (optionnels : présents seulement si le critère est rédhibitoire)
  /** Justification courte si rédhibitoire ; max 500 caractères. Ne pas inclure la clé si non rédhibitoire. */
  Réhibitoire1?: string;
  Réhibitoire2?: string;
  Réhibitoire3?: string;
  Réhibitoire4?: string;

  // --- Scores incontournables (obligatoires, entiers 0–20)
  ScoreLocalisation: ScoreAnalyse;
  ScoreSalaire: ScoreAnalyse;
  ScoreCulture: ScoreAnalyse;
  ScoreQualitéOffre: ScoreAnalyse;

  // --- Scores optionnels (présents selon le paramétrage ; entiers 0–20)
  ScoreOptionnel1?: ScoreAnalyse;
  ScoreOptionnel2?: ScoreAnalyse;
  ScoreOptionnel3?: ScoreAnalyse;
  ScoreOptionnel4?: ScoreAnalyse;
}

// Note : la liste réelle des clés (Réhibitoire1..4, ScoreOptionnel1..4) dépend du paramétrage.
// Seules les clés configurées dans ParametrageIA sont attendues ; les autres ne doivent pas figurer.

// =============================================================================
// 2. JSON DE PARAMÉTRAGE (configuration critères, scores, prompt)
// =============================================================================

/** Une paire (titre, description) pour un critère rédhibitoire. */
export interface Rehibitoire {
  titre: string;
  description: string;
}

/** Une paire (titre, attente) pour un score optionnel. */
export interface ScoreOptionnel {
  titre: string;
  attente: string;
}

/** Scores incontournables : 4 zones texte (descriptions/attentes pour chaque score 0–20). */
export interface ScoresIncontournables {
  localisation: string;
  salaire: string;
  culture: string;
  qualiteOffre: string;
}

/**
 * Section Paramétrage IA (dans parametres.json).
 * Définit quels critères et scores sont utilisés → détermine les clés attendues dans JsonReponseAnalyseIA.
 */
export interface ParametrageIA {
  /** Jusqu'à 4 paires (titre, description) pour critères rédhibitoires. */
  rehibitoires: Rehibitoire[];
  /** 4 zones texte : localisation, salaire, culture, qualiteOffre. */
  scoresIncontournables: ScoresIncontournables;
  /** Jusqu'à 4 paires (titre, attente) pour scores optionnels. */
  scoresOptionnels: ScoreOptionnel[];
  /** Zone texte : chemin répertoire ou autres ressources. */
  autresRessources: string;
}

/** Racine du fichier parametres.json (extrait : seulement la partie utile pour l’IA). */
export interface ParametresPourIA {
  /** Section Paramétrage IA (critères, scores, autres ressources). */
  parametrageIA?: ParametrageIA;
  /** Partie modifiable du prompt IA (rôle, ton, consignes). */
  promptIA?: string;
}
