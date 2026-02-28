/**
 * US-7.3 : adaptateur driver V2 → interface legacy (listerSources, creerSource, mettreAJourSource).
 * Permet à run-traitement et run-audit-sources d'utiliser le driver V2 sans réécrire leur logique.
 */
import type { SourceEmail, SourceNom } from '../utils/gouvernance-sources-emails.js';
import {
  createSourcesV2Driver,
  sourceEntriesToLegacyLignes,
  getCheminListeHtmlPourSource,
  SOURCES_NOMS_CANONIQUES,
  type SourceEntryPatch,
} from '../utils/sources-v2.js';

export type SourceRuntime = SourceEmail & { sourceId: string };

export interface DriverReleveGouvernance {
  listerSources: () => Promise<SourceRuntime[]>;
  creerSource: (source: SourceEmail) => Promise<SourceRuntime>;
  mettreAJourSource?: (
    sourceId: string,
    patch: Partial<
      Pick<
        SourceEmail,
        'source' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'
      >
    >
  ) => Promise<void>;
}

function slugFromSourceNom(nom: SourceNom): string {
  const path = getCheminListeHtmlPourSource(nom);
  return path.replace(/^liste html\/?/, '').trim() || nom.toLowerCase().replace(/\s+/g, '-');
}

function buildSlugToNom(): Map<string, SourceNom> {
  const m = new Map<string, SourceNom>();
  for (const nom of SOURCES_NOMS_CANONIQUES) {
    m.set(slugFromSourceNom(nom), nom);
  }
  return m;
}

function sourceIdToNom(sourceId: string, slugToNom: Map<string, SourceNom>): SourceNom | undefined {
  if (sourceId.startsWith('liste-html-')) {
    const slug = sourceId.slice('liste-html-'.length);
    return slugToNom.get(slug);
  }
  if (sourceId.startsWith('email-')) {
    const rest = sourceId.slice('email-'.length);
    for (const slug of slugToNom.keys()) {
      const prefix = slug + '-';
      if (rest.startsWith(prefix)) return slugToNom.get(slug);
    }
  }
  return undefined;
}

/**
 * Crée un driver exposant l'interface legacy (gouvernance) à partir du driver V2.
 * - listerSources() : entrées V2 converties en lignes legacy (une par email + une par liste html).
 * - creerSource() : retourne une entrée synthétique en mémoire (non persistée) pour que le flux traitement/audit continue.
 * - mettreAJourSource(sourceId, patch) : résout sourceId → nom canonique, appelle updateSource(nom, patch).
 */
export function createSourcesLegacyAdapterFromV2(dataDir: string): DriverReleveGouvernance {
  const driverV2 = createSourcesV2Driver(dataDir);
  const slugToNom = buildSlugToNom();
  const synthetics: SourceRuntime[] = [];

  return {
    async listerSources(): Promise<SourceRuntime[]> {
      const entries = await driverV2.listSources();
      const legacy = sourceEntriesToLegacyLignes(entries);
      const fromV2 = legacy.map((l) => ({
        sourceId: l.id,
        emailExpéditeur: l.emailExpéditeur,
        source: l.source,
        type: l.type as SourceEmail['type'],
        activerCreation: l.activerCreation,
        activerEnrichissement: l.activerEnrichissement,
        activerAnalyseIA: l.activerAnalyseIA,
      }));
      return [...fromV2, ...synthetics];
    },

    async creerSource(source: SourceEmail): Promise<SourceRuntime> {
      const slug = slugFromSourceNom(source.source);
      const sourceId = source.emailExpéditeur.includes('@')
        ? `email-${slug}-${source.emailExpéditeur.trim().toLowerCase()}`
        : `liste-html-${slug}`;
      const runtime: SourceRuntime = {
        ...source,
        sourceId,
      };
      synthetics.push(runtime);
      return runtime;
    },

    async mettreAJourSource(
      sourceId: string,
      patch: Partial<
        Pick<
          SourceEmail,
          'source' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'
        >
      >
    ): Promise<void> {
      const nom = sourceIdToNom(sourceId, slugToNom);
      if (nom === undefined) return;
      const v2Patch: SourceEntryPatch = {};
      if (typeof patch.activerCreation === 'boolean') {
        const isListeHtml = sourceId.startsWith('liste-html-');
        if (isListeHtml) {
          v2Patch.creationListeHtml = { activé: patch.activerCreation };
        } else {
          v2Patch.creationEmail = { ...v2Patch.creationEmail, activé: patch.activerCreation };
        }
      }
      if (typeof patch.activerEnrichissement === 'boolean') {
        v2Patch.enrichissement = { activé: patch.activerEnrichissement };
      }
      if (typeof patch.activerAnalyseIA === 'boolean') {
        v2Patch.analyse = { activé: patch.activerAnalyseIA };
      }
      await driverV2.updateSource(nom, v2Patch);
    },
  };
}
