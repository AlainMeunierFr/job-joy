/**
 * US-7.2 : lecture/écriture de data/sources.json (même structure que table Airtable Sources).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SourceEmail, SourceNom } from './gouvernance-sources-emails.js';
import { getDefaultActivationForSource } from './default-activation-source.js';
import { getListeSourcesPourAvantPropos } from './source-plugins.js';
import { createSourceRegistry } from './source-plugins.js';

export type SourceAvecId = SourceEmail & { id: string };

const SOURCES_JSON_FILENAME = 'sources.json';

/** Slug stable pour chaque SourceNom. US-6.6 : 15 + Inconnu. */
function idPourSourceNom(source: SourceNom): string {
  const map: Record<SourceNom, string> = {
    Linkedin: 'linkedin',
    HelloWork: 'hellowork',
    APEC: 'apec',
    'Cadre Emploi': 'cadre-emploi',
    'Welcome to the Jungle': 'welcome-to-the-jungle',
    'Job That Make Sense': 'job-that-make-sense',
    Indeed: 'indeed',
    'France Travail': 'france-travail',
    LesJeudis: 'lesjeudis',
    'Michael Page': 'michael-page',
    'Robert Walters': 'robert-walters',
    Hays: 'hays',
    Monster: 'monster',
    Glassdoor: 'glassdoor',
    Makesense: 'makesense',
    Inconnu: 'inconnu',
  };
  return map[source] ?? source.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Retourne la liste des sources par défaut (getListeSourcesPourAvantPropos + getDefaultActivationForSource).
 */
export function getSourcesParDefaut(): SourceAvecId[] {
  const registry = createSourceRegistry();
  const lignes = getListeSourcesPourAvantPropos();
  return lignes.map((ligne) => {
    const sourceNom = ligne.source as SourceNom;
    const def = getDefaultActivationForSource(sourceNom, registry);
    return {
      id: idPourSourceNom(sourceNom),
      emailExpéditeur: ligne.email.trim().toLowerCase(),
      source: sourceNom,
      type: 'email' as const,
      activerCreation: def.activerCreation,
      activerEnrichissement: def.activerEnrichissement,
      activerAnalyseIA: def.activerAnalyseIA,
    };
  });
}

/**
 * Lit les sources depuis dataDir/sources.json. Si le fichier est absent, vide ou JSON invalide,
 * retourne la liste par défaut.
 */
export async function lireSources(dataDir: string): Promise<SourceAvecId[]> {
  const path = join(dataDir, SOURCES_JSON_FILENAME);
  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch {
    return getSourcesParDefaut();
  }
  const trimmed = raw.trim();
  if (!trimmed) return getSourcesParDefaut();
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return getSourcesParDefaut();
  }
  const arr = Array.isArray(data) ? data : (data as { sources?: unknown[] }).sources;
  if (!Array.isArray(arr) || arr.length === 0) return getSourcesParDefaut();
  return arr.map((o) => ({
    id: String((o as { id?: string }).id ?? ''),
    emailExpéditeur: String((o as { emailExpéditeur?: string }).emailExpéditeur ?? ''),
    source: (o as { source?: SourceNom }).source ?? 'Inconnu',
    type: ((o as { type?: string }).type === 'liste html' ? 'liste html' : 'email') as SourceEmail['type'],
    activerCreation: Boolean((o as { activerCreation?: boolean }).activerCreation),
    activerEnrichissement: Boolean((o as { activerEnrichissement?: boolean }).activerEnrichissement),
    activerAnalyseIA: Boolean((o as { activerAnalyseIA?: boolean }).activerAnalyseIA),
  }));
}

/**
 * Écrit les sources dans dataDir/sources.json. Format : tableau d'objets avec id.
 */
export async function ecrireSources(dataDir: string, sources: SourceAvecId[]): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const path = join(dataDir, SOURCES_JSON_FILENAME);
  const payload = JSON.stringify(sources, null, 2);
  await writeFile(path, payload, 'utf-8');
}
