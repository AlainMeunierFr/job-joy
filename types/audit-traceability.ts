/**
 * Schéma de l'audit de traçabilité US ↔ code.
 * Persistant dans data/audit-traceability.json.
 *
 * Orphelin = artefact qui coupe la chaîne spec ↔ code (définition directe) :
 * - US, CA, Feature, Step : orphelin si linkedIdsAval vide (pas d'implémentation en aval).
 * - TU, TI : orphelin si linkedIdsAmont vide (pas de spec) ou linkedIdsAval vide (pas de code testé).
 * - Code : orphelin si linkedIdsAmont vide (pas de lien vers US/CA).
 * Les taux (ex. % CA couverts) se calculent en exploitation à partir de ces champs.
 */
export type ArtefactType = 'us' | 'ca' | 'feature' | 'step' | 'scenario' | 'tu' | 'ti' | 'code';

export interface Artefact {
  id: string;
  type: ArtefactType;
  name: string;
  description: string;
  /** Artefacts en amont (spec : US/CA pour feature; Feature pour step; US/CA pour code ou TU). */
  linkedIdsAmont: string[];
  /** Artefacts en aval (impl : CA, Feature pour US; Step pour feature; Code pour TU; TU/TI pour code). */
  linkedIdsAval: string[];
  /** true si l'artefact coupe la chaîne (voir définition en en-tête). */
  orphan: boolean;
  auditedAt?: string;
}

export interface AuditTraceabilityData {
  generatedAt: string;
  artefacts: Record<string, Artefact>;
  byType: Record<ArtefactType, string[]>;
}
