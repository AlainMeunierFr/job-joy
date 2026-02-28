/**
 * US-7.2 : driver sources JSON — même interface que la partie « sources » du driver Airtable.
 */
import { randomUUID } from 'node:crypto';
import type { SourceEmail } from './gouvernance-sources-emails.js';
import { lireSources, ecrireSources, type SourceAvecId } from './sources-io.js';

export type SourceRuntime = SourceEmail & { sourceId: string };

function toRuntime(s: SourceAvecId): SourceRuntime {
  const { id, ...rest } = s;
  return { ...rest, sourceId: id };
}

/**
 * Crée un driver qui lit/écrit les sources dans dataDir/sources.json.
 */
export function createSourcesJsonDriver(dataDir: string): {
  listerSources(): Promise<SourceRuntime[]>;
  creerSource(source: SourceEmail): Promise<SourceRuntime>;
  mettreAJourSource(
    sourceId: string,
    patch: Partial<
      Pick<
        SourceEmail,
        'source' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'
      >
    >
  ): Promise<void>;
} {
  return {
    async listerSources(): Promise<SourceRuntime[]> {
      const sources = await lireSources(dataDir);
      return sources.map(toRuntime);
    },

    async creerSource(source: SourceEmail): Promise<SourceRuntime> {
      const sources = await lireSources(dataDir);
      const id = randomUUID();
      const entree: SourceAvecId = {
        id,
        emailExpéditeur: source.emailExpéditeur.trim().toLowerCase(),
        source: source.source,
        type: source.type ?? 'email',
        activerCreation: source.activerCreation,
        activerEnrichissement: source.activerEnrichissement,
        activerAnalyseIA: source.activerAnalyseIA,
      };
      sources.push(entree);
      await ecrireSources(dataDir, sources);
      return toRuntime(entree);
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
      const sources = await lireSources(dataDir);
      const idx = sources.findIndex((s) => s.id === sourceId);
      if (idx < 0) return;
      if (patch.source !== undefined) sources[idx].source = patch.source;
      if (patch.type !== undefined) sources[idx].type = patch.type;
      if (typeof patch.activerCreation === 'boolean')
        sources[idx].activerCreation = patch.activerCreation;
      if (typeof patch.activerEnrichissement === 'boolean')
        sources[idx].activerEnrichissement = patch.activerEnrichissement;
      if (typeof patch.activerAnalyseIA === 'boolean')
        sources[idx].activerAnalyseIA = patch.activerAnalyseIA;
      await ecrireSources(dataDir, sources);
    },
  };
}
