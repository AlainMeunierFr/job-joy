import { join } from 'node:path';
import { createEnrichissementOffresSqliteDriver } from '../utils/enrichissement-offres-sqlite.js';
import { initOffresRepository } from '../utils/repository-offres-sqlite.js';
import { executerEnrichissementOffres } from '../utils/enrichissement-offres.js';
import { createSourceRegistry } from '../utils/source-plugins.js';

export type ResultatEnrichissementBackground =
  | { ok: true; nbEnrichies: number; nbEchecs: number; messages: string[]; nbCandidates: number; nbEligibles: number }
  | { ok: false; message: string };

export type EtatEnrichissementBackground =
  | { ok: true; nbCandidates: number; nbEligibles: number }
  | { ok: false; message: string };

export async function getEnrichissementBackgroundState(dataDir: string): Promise<EtatEnrichissementBackground> {
  const dir = dataDir || join(process.cwd(), 'data');
  const repository = initOffresRepository(join(dir, 'offres.sqlite'));
  const baseDriver = createEnrichissementOffresSqliteDriver({ repository });

  const registry = createSourceRegistry();
  const candidates = await baseDriver.getOffresARecuperer();
  const eligibles = candidates.filter((offre) => {
    const handler = registry.getOfferFetchSourceByUrl(offre.url);
    return !!handler && handler.stage2Implemented;
  });

  return {
    ok: true,
    nbCandidates: candidates.length,
    nbEligibles: eligibles.length,
  };
}

export type OptionsRunEnrichissementBackground = {
  onProgress?: (offre: { id: string; url: string }, index: number, total: number, sourceNom?: string) => void;
  /** Appelé à chaque changement de statut (pour mise à jour chirurgicale du tableau par ligne, identifiée par email). */
  onTransition?: (emailExpéditeur: string, statutAvant: string, statutApres: string) => void;
  /** Si retourne true, la boucle d'enrichissement s'arrête immédiatement (ex. bouton Arrêter le traitement). */
  shouldAbort?: () => boolean;
};

export async function runEnrichissementBackground(
  dataDir: string,
  options?: OptionsRunEnrichissementBackground
): Promise<ResultatEnrichissementBackground> {
  const dir = dataDir || join(process.cwd(), 'data');
  const repository = initOffresRepository(join(dir, 'offres.sqlite'));
  const baseDriver = createEnrichissementOffresSqliteDriver({ repository });

  const registry = createSourceRegistry();
  const candidates = await baseDriver.getOffresARecuperer();
  const eligibles = candidates.filter((offre) => {
    const handler = registry.getOfferFetchSourceByUrl(offre.url);
    return !!handler && handler.stage2Implemented;
  });

  const driverFiltre = {
    async getOffresARecuperer() {
      return eligibles;
    },
    async updateOffre(recordId: string, champs: { [key: string]: string | undefined }) {
      await baseDriver.updateOffre(recordId, champs);
    },
  };

  const fetcher = {
    async recupererContenuOffre(url: string) {
      const handler = registry.getOfferFetchSourceByUrl(url);
      if (!handler || !handler.stage2Implemented) {
        return {
          ok: false as const,
          message: `Aucune source étape 2 implémentée pour l'URL: ${url}`,
        };
      }
      return handler.recupererContenuOffre(url);
    },
  };

  const onProgress = options?.onProgress
    ? (offre: { id: string; url: string }, index: number, total: number) => {
        const sourceNom = registry.getOfferFetchSourceByUrl(offre.url)?.source;
        options.onProgress!(offre, index, total, sourceNom);
      }
    : undefined;

  const onTransition = options?.onTransition
    ? (offre: { emailExpéditeur?: string }, statutAvant: string, statutApres: string) => {
        const email = (offre.emailExpéditeur ?? '').trim().toLowerCase();
        if (email) options.onTransition!(email, statutAvant, statutApres);
      }
    : undefined;

  const result = await executerEnrichissementOffres({
    driver: driverFiltre,
    fetcher,
    onProgress,
    onTransition,
    shouldAbort: options?.shouldAbort,
  });

  if (!result.ok) return result;
  return {
    ok: true,
    nbCandidates: candidates.length,
    nbEligibles: eligibles.length,
    nbEnrichies: result.nbEnrichies,
    nbEchecs: result.nbEchecs,
    messages: result.messages,
  };
}
