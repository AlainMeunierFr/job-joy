import { join } from 'node:path';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { createAirtableEnrichissementDriver } from '../utils/airtable-enrichissement-driver.js';
import { getBaseSchema } from '../utils/airtable-ensure-enums.js';
import { executerEnrichissementOffres } from '../utils/enrichissement-offres.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { createSourcePluginsRegistry } from '../utils/source-plugins.js';

/** Résout l'id de la table Sources depuis la config ou le schéma de la base (pour filtrer par sources actives). */
async function resolveSourcesId(
  apiKey: string,
  baseId: string,
  configSources: string | undefined
): Promise<string | undefined> {
  const trimmed = configSources?.trim();
  if (trimmed) return trimmed;
  const schema = await getBaseSchema(baseId, apiKey);
  const sourcesTable = schema.find((t) => (t.name ?? '').trim().toLowerCase() === 'sources');
  return sourcesTable?.id;
}

export type ResultatEnrichissementBackground =
  | { ok: true; nbEnrichies: number; nbEchecs: number; messages: string[]; nbCandidates: number; nbEligibles: number }
  | { ok: false; message: string };

export type EtatEnrichissementBackground =
  | { ok: true; nbCandidates: number; nbEligibles: number }
  | { ok: false; message: string };

export async function getEnrichissementBackgroundState(dataDir: string): Promise<EtatEnrichissementBackground> {
  const dir = dataDir || join(process.cwd(), 'data');
  const airtable = lireAirTable(dir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.offres?.trim()) {
    return { ok: false, message: 'Configuration Airtable incomplète (apiKey, base, offres).' };
  }

  const baseId = normaliserBaseId(airtable.base);
  const sourcesId = await resolveSourcesId(airtable.apiKey.trim(), baseId, airtable.sources);
  const baseDriver = createAirtableEnrichissementDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId: airtable.offres,
    sourcesId,
  });

  const registry = createSourcePluginsRegistry();
  const candidates = await baseDriver.getOffresARecuperer();
  const eligibles = candidates.filter((offre) => {
    const plugin = registry.getOfferFetchPluginByUrl(offre.url);
    return !!plugin && plugin.stage2Implemented;
  });

  return {
    ok: true,
    nbCandidates: candidates.length,
    nbEligibles: eligibles.length,
  };
}

export type OptionsRunEnrichissementBackground = {
  onProgress?: (offre: { id: string; url: string }, index: number, total: number, plugin?: string) => void;
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
  const airtable = lireAirTable(dir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.offres?.trim()) {
    return { ok: false, message: 'Configuration Airtable incomplète (apiKey, base, offres).' };
  }

  const baseId = normaliserBaseId(airtable.base);
  const sourcesId = await resolveSourcesId(airtable.apiKey.trim(), baseId, airtable.sources);
  const baseDriver = createAirtableEnrichissementDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId: airtable.offres,
    sourcesId,
  });

  const registry = createSourcePluginsRegistry();
  const candidates = await baseDriver.getOffresARecuperer();
  const eligibles = candidates.filter((offre) => {
    const plugin = registry.getOfferFetchPluginByUrl(offre.url);
    return !!plugin && plugin.stage2Implemented;
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
      const plugin = registry.getOfferFetchPluginByUrl(url);
      if (!plugin || !plugin.stage2Implemented) {
        return {
          ok: false as const,
          message: `Aucun plugin étape 2 implémenté pour l'URL: ${url}`,
        };
      }
      return plugin.recupererContenuOffre(url);
    },
  };

  const onProgress = options?.onProgress
    ? (offre: { id: string; url: string }, index: number, total: number) => {
        const plugin = registry.getOfferFetchPluginByUrl(offre.url)?.plugin;
        options.onProgress!(offre, index, total, plugin);
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
