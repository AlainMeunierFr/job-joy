/**
 * Ordre et couleurs par défaut des statuts d'offres Airtable (US-1.7).
 * - Les couleurs sont fixées dans le code et utilisées lors de la création/sync des options (PATCH).
 * - Dernière colonne du tableau = « Autre » (hors énum, ajoutée dans STATUTS_OFFRES_AVEC_AUTRE).
 */
export const STATUTS_OFFRES_AIRTABLE_WITH_COLORS: readonly { name: string; color?: string }[] = [
  { name: 'A compléter', color: 'grayLight1' },
  { name: 'À analyser', color: 'blueBright' },
  { name: 'À traiter', color: 'orangeBright' },
  { name: 'Candidaté', color: 'greenBright' },
  { name: 'Refusé', color: 'redBright' },
  { name: 'Traité', color: 'blueBright' },
  { name: 'Ignoré', color: 'grayLight1' },
  { name: 'Expiré', color: 'grayLight1' },
];

/** Liste des libellés dans le même ordre (compatibilité). */
export const STATUTS_OFFRES_AIRTABLE = STATUTS_OFFRES_AIRTABLE_WITH_COLORS.map((c) => c.name);

/** Ordre des statuts pour le tableau de synthèse : énum + « Autre » (offres dont le statut n’est pas dans l’énum). */
export const STATUTS_OFFRES_AVEC_AUTRE: readonly string[] = [...STATUTS_OFFRES_AIRTABLE, 'Autre'];
