/**
 * US-3.5 CA3 : Orchestration des 3 phases (création, enrichissement, analyse IA).
 * À la fin des trois phases, aucun job récurrent ne reste actif.
 */
export interface PortsOrchestrationTraitements {
  phase1Creation: () => Promise<void>;
  phase2Enrichissement: () => Promise<void>;
  phase3AnalyseIA: () => Promise<void>;
}

export interface ResultatOrchestrationTraitements {
  termine: boolean;
}

/**
 * Exécute les trois phases dans l'ordre : création → enrichissement → analyse IA.
 * Retourne un résultat indiquant que le traitement est terminé (pas de job récurrent à planifier).
 */
export async function executerOrchestrationTraitements(
  ports: PortsOrchestrationTraitements
): Promise<ResultatOrchestrationTraitements> {
  await ports.phase1Creation();
  await ports.phase2Enrichissement();
  await ports.phase3AnalyseIA();
  return { termine: true };
}
