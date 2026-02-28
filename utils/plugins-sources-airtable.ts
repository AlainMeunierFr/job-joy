/**
 * Énumération des sources (Sources.Source) dans Airtable.
 * Source unique de vérité : utilisée pour créer la table, vérifier au démarrage et en fallback.
 */
export const SOURCES_NOMS_AIRTABLE = [
  'Linkedin',
  'Inconnu',
  'HelloWork',
  'Welcome to the Jungle',
  'Job That Make Sense',
  'Cadre Emploi',
  'APEC',
] as const;

export type SourceNomAirtable = (typeof SOURCES_NOMS_AIRTABLE)[number];
