import { join } from 'node:path';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { createAirtableEnrichissementDriver } from '../utils/airtable-enrichissement-driver.js';
import { executerEnrichissementOffres } from '../utils/enrichissement-offres.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { createSourcePluginsRegistry } from '../utils/source-plugins.js';

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
  const baseDriver = createAirtableEnrichissementDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId: airtable.offres,
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
  onProgress?: (offre: { id: string; url: string }, index: number, total: number, algo?: string) => void;
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
  const baseDriver = createAirtableEnrichissementDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId: airtable.offres,
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
        const algo = registry.getOfferFetchPluginByUrl(offre.url)?.algo;
        options.onProgress!(offre, index, total, algo);
      }
    : undefined;

  const result = await executerEnrichissementOffres({
    driver: driverFiltre,
    fetcher,
    onProgress,
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
