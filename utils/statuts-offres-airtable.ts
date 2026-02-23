/**
 * Ordre des statuts d'offres Airtable (US-1.7).
 * Source unique de vérité : à l'insertion « Annonce à récupérer », après enrichissement « À analyser ».
 */
export const STATUTS_OFFRES_AIRTABLE = [
  'Annonce à récupérer',
  'À analyser',
  'À traiter',
  'Traité',
  'Ignoré',
] as const;
