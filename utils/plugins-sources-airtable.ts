/**
 * Énumération des plugins (Sources.Plugin) dans Airtable.
 * Source unique de vérité : utilisée pour créer la table, vérifier au démarrage et en fallback.
 */
export const PLUGINS_SOURCES_AIRTABLE = [
  'Linkedin',
  'Inconnu',
  'HelloWork',
  'Welcome to the Jungle',
  'Job That Make Sense',
  'Cadre Emploi',
] as const;

export type PluginSourceAirtable = (typeof PLUGINS_SOURCES_AIRTABLE)[number];
