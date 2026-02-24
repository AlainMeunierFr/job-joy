/**
 * US-3.1 : Valeurs par défaut des 3 checkboxes (Activer la création, enrichissement, analyse IA)
 * à la création d'une source, selon les capacités du plugin.
 */
import type { PluginSource } from './gouvernance-sources-emails.js';

export interface RegistryPourActivation {
  getEmailPlugin(plugin: PluginSource): unknown;
  getOfferFetchPlugin(plugin: PluginSource | string): { stage2Implemented?: boolean } | undefined;
}

export interface DefaultActivationSource {
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
}

/**
 * Retourne les valeurs par défaut des 3 checkboxes pour une source créée avec ce plugin.
 * - Activer la création = true si le plugin dispose d'un parseur email (phase 1).
 * - Activer l'enrichissement = true si le plugin a l'étape 2 implémentée (stage2Implemented).
 * - Activer l'analyse par IA = true par défaut.
 */
export function getDefaultActivationForPlugin(
  plugin: PluginSource,
  registry: RegistryPourActivation
): DefaultActivationSource {
  const emailPlugin = registry.getEmailPlugin(plugin);
  const offerPlugin = registry.getOfferFetchPlugin(plugin);
  return {
    activerCreation: !!emailPlugin,
    activerEnrichissement: !!offerPlugin?.stage2Implemented,
    activerAnalyseIA: true,
  };
}
