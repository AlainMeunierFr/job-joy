/**
 * US-3.1 : Valeurs par défaut des 3 checkboxes (Activer la création, enrichissement, analyse IA)
 * à la création d'une source, selon les capacités de la source.
 */
import type { SourceNom } from './gouvernance-sources-emails.js';

export interface RegistryPourActivation {
  getEmailSource(sourceNom: SourceNom): unknown;
  getOfferFetchSource(sourceNom: SourceNom | string): { stage2Implemented?: boolean } | undefined;
}

export interface DefaultActivationSource {
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
}

/**
 * Retourne les valeurs par défaut des 3 checkboxes pour une source créée avec ce nom.
 * - Activer la création = true si la source dispose d'un parseur email (phase 1).
 * - Activer l'enrichissement = true si la source a l'étape 2 implémentée (stage2Implemented).
 * - Activer l'analyse par IA = true par défaut.
 */
export function getDefaultActivationForSource(
  sourceNom: SourceNom,
  registry: RegistryPourActivation
): DefaultActivationSource {
  const emailSource = registry.getEmailSource(sourceNom);
  const offerSource = registry.getOfferFetchSource(sourceNom);
  return {
    activerCreation: !!emailSource,
    activerEnrichissement: !!offerSource?.stage2Implemented,
    activerAnalyseIA: true,
  };
}
