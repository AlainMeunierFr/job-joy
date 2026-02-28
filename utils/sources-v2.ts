/**
 * US-7.3 : une entrée par source (SourceEntry), schéma V2 sources.json.
 * US-6.6 : liste canonique 15 noms + Inconnu, urlOfficielle, migration.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SourceNom } from './gouvernance-sources-emails.js';

/** Liste de référence US-6.6 : les 15 noms canoniques (sans Inconnu). Source de vérité pour détection d'écart. */
export const SOURCES_NOMS_REFERENCE_US_6_6: readonly string[] = [
  'Linkedin',
  'HelloWork',
  'APEC',
  'Cadre Emploi',
  'Welcome to the Jungle',
  'Job That Make Sense',
  'Indeed',
  'France Travail',
  'LesJeudis',
  'Michael Page',
  'Robert Walters',
  'Hays',
  'Monster',
  'Glassdoor',
  'Makesense',
];

/** Liste canonique des noms de sources (source de vérité) : 15 noms US-6.6 + Inconnu pour orphelins. */
export const SOURCES_NOMS_CANONIQUES: readonly SourceNom[] = [
  ...SOURCES_NOMS_REFERENCE_US_6_6,
  'Inconnu',
] as readonly SourceNom[];

export interface SourceEntry {
  source: SourceNom;
  urlOfficielle: string;
  creationEmail: { activé: boolean; emails: string[] };
  creationListeHtml: { activé: boolean };
  enrichissement: { activé: boolean };
  analyse: { activé: boolean };
}

/** US-6.6 : URL officielle par source (15 noms + Inconnu → ''). */
const URL_OFFICIELLE_PAR_SOURCE: Record<SourceNom, string> = {
  Linkedin: 'https://www.linkedin.com/jobs',
  HelloWork: 'https://www.hellowork.com',
  APEC: 'https://www.apec.fr',
  'Cadre Emploi': 'https://www.cadremploi.fr',
  'Welcome to the Jungle': 'https://www.welcometothejungle.com/fr',
  'Job That Make Sense': 'https://jobs.makesense.org/fr',
  Indeed: 'https://www.indeed.fr',
  'France Travail': 'https://www.francetravail.fr',
  LesJeudis: 'https://www.lesjeudis.com',
  'Michael Page': 'https://www.michaelpage.fr',
  'Robert Walters': 'https://www.robertwalters.fr',
  Hays: 'https://www.hays.fr',
  Monster: 'https://www.monster.fr',
  Glassdoor: 'https://www.glassdoor.fr',
  Makesense: 'https://makesense.org',
  Inconnu: '',
};

/** Dérivation 1:1 nom canonique → chemin dossier liste html (pas stocké en JSON). US-6.6 : 15 + Inconnu. */
export function getCheminListeHtmlPourSource(nom: SourceNom): string {
  const slug = slugPourSource(nom);
  return `liste html/${slug}`;
}

/** Emails par défaut en code (US-7.3). */
const EMAILS_PAR_DEFAUT_PAR_SOURCE: Partial<Record<SourceNom, string[]>> = {
  'Welcome to the Jungle': ['alerts@welcometothejungle.com'],
  Linkedin: ['jobalerts-noreply@linkedin.com', 'jobs-listings@linkedin.com'],
  'Job That Make Sense': ['jobs@makesense.org'],
  HelloWork: ['notification@emails.hellowork.com'],
  'Cadre Emploi': ['offres@alertes.cadremploi.fr'],
};

/**
 * Retourne une entrée par source canonique, toutes options activées, emails par défaut en code.
 */
export function getSourcesParDefautV2(): SourceEntry[] {
  return SOURCES_NOMS_CANONIQUES.map((source) => ({
    source,
    urlOfficielle: URL_OFFICIELLE_PAR_SOURCE[source] ?? '',
    creationEmail: {
      activé: true,
      emails: EMAILS_PAR_DEFAUT_PAR_SOURCE[source] ?? [],
    },
    creationListeHtml: { activé: true },
    enrichissement: { activé: true },
    analyse: { activé: true },
  }));
}

const SOURCES_JSON_FILENAME = 'sources.json';

function parseEntry(o: unknown): SourceEntry | null {
  if (!o || typeof o !== 'object') return null;
  const obj = o as Record<string, unknown>;
  const source = obj.source as SourceNom | undefined;
  if (!source || !SOURCES_NOMS_CANONIQUES.includes(source)) return null;
  const creationEmail = obj.creationEmail as Record<string, unknown> | undefined;
  const creationListeHtml = obj.creationListeHtml as Record<string, unknown> | undefined;
  const enrichissement = obj.enrichissement as Record<string, unknown> | undefined;
  const analyse = obj.analyse as Record<string, unknown> | undefined;
  if (!creationEmail || !creationListeHtml || !enrichissement || !analyse) return null;
  const emails = Array.isArray(creationEmail.emails)
    ? (creationEmail.emails as string[]).filter((e) => typeof e === 'string')
    : [];
  const urlOfficielle =
    typeof obj.urlOfficielle === 'string' ? obj.urlOfficielle : (URL_OFFICIELLE_PAR_SOURCE[source] ?? '');
  return {
    source,
    urlOfficielle,
    creationEmail: { activé: Boolean(creationEmail.activé), emails },
    creationListeHtml: { activé: Boolean(creationListeHtml.activé) },
    enrichissement: { activé: Boolean(enrichissement.activé) },
    analyse: { activé: Boolean(analyse.activé) },
  };
}

/**
 * Lit les sources depuis dataDir/sources.json (schéma V2). Si absent/vide/invalide, retourne liste par défaut (voir étape 5).
 */
export async function lireSourcesV2(dataDir: string): Promise<SourceEntry[]> {
  const path = join(dataDir, SOURCES_JSON_FILENAME);
  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch {
    return getSourcesParDefautV2();
  }
  const trimmed = raw.trim();
  if (!trimmed) return getSourcesParDefautV2();
  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch {
    return getSourcesParDefautV2();
  }
  const arr = Array.isArray(data) ? data : (data as { sources?: unknown[] }).sources;
  if (!Array.isArray(arr) || arr.length === 0) return getSourcesParDefautV2();
  const seen = new Set<SourceNom>();
  const entries: SourceEntry[] = [];
  for (const o of arr) {
    const e = parseEntry(o);
    if (e && !seen.has(e.source)) {
      seen.add(e.source);
      entries.push(e);
    }
  }
  if (entries.length === 0) return getSourcesParDefautV2();
  return entries;
}

/**
 * Écrit les sources dans dataDir/sources.json (schéma V2). Format : tableau d'objets SourceEntry.
 */
export async function ecrireSourcesV2(dataDir: string, entries: SourceEntry[]): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  const path = join(dataDir, SOURCES_JSON_FILENAME);
  const payload = JSON.stringify(entries, null, 2);
  await writeFile(path, payload, 'utf-8');
}

/** Patch partiel pour updateSource (nested partiel). */
export type SourceEntryPatch = Partial<{
  creationEmail: Partial<{ activé: boolean; emails: string[] }>;
  creationListeHtml: Partial<{ activé: boolean }>;
  enrichissement: Partial<{ activé: boolean }>;
  analyse: Partial<{ activé: boolean }>;
}>;

export interface SourcesV2Driver {
  listSources(): Promise<SourceEntry[]>;
  getSource(nom: SourceNom): Promise<SourceEntry | undefined>;
  updateSource(nom: SourceNom, patch: SourceEntryPatch): Promise<void>;
}

/**
 * Crée un driver V2 : listSources, getSource, updateSource (une entrée par source, persiste dans dataDir).
 */
export function createSourcesV2Driver(dataDir: string): SourcesV2Driver {
  return {
    async listSources(): Promise<SourceEntry[]> {
      return lireSourcesV2(dataDir);
    },
    async getSource(nom: SourceNom): Promise<SourceEntry | undefined> {
      const list = await lireSourcesV2(dataDir);
      return list.find((e) => e.source === nom);
    },
    async updateSource(nom: SourceNom, patch: SourceEntryPatch): Promise<void> {
      const list = await lireSourcesV2(dataDir);
      const idx = list.findIndex((e) => e.source === nom);
      if (idx < 0) return;
      const ent = list[idx];
      if (patch.creationEmail !== undefined) {
        ent.creationEmail = { ...ent.creationEmail, ...patch.creationEmail };
      }
      if (patch.creationListeHtml !== undefined) {
        ent.creationListeHtml = { ...ent.creationListeHtml, ...patch.creationListeHtml };
      }
      if (patch.enrichissement !== undefined) {
        ent.enrichissement = { ...ent.enrichissement, ...patch.enrichissement };
      }
      if (patch.analyse !== undefined) {
        ent.analyse = { ...ent.analyse, ...patch.analyse };
      }
      await ecrireSourcesV2(dataDir, list);
    },
  };
}

/** US-6.6 : entrée legacy (une par email ou par chemin liste html) avant migration. */
export interface LegacyLigneSource {
  emailExpéditeur: string;
  source: string;
  activerCreation?: boolean;
  activerEnrichissement?: boolean;
  activerAnalyseIA?: boolean;
  type?: 'email' | 'liste html';
}

/**
 * US-6.6 : migration d'entrées legacy (une par email) vers SourceEntry[] (une entrée par source, emails regroupés).
 * Les noms de source non canoniques sont mappés à Inconnu.
 */
export function migrerLegacyVersSourceEntries(lignes: LegacyLigneSource[]): SourceEntry[] {
  const bySource = new Map<SourceNom, { emails: string[]; activerCreation: boolean; activerEnrichissement: boolean; activerAnalyseIA: boolean }>();
  const canoniques = new Set(SOURCES_NOMS_CANONIQUES);
  for (const l of lignes) {
    const nom = (canoniques.has(l.source as SourceNom) ? l.source : 'Inconnu') as SourceNom;
    const email = (l.emailExpéditeur ?? '').trim();
    if (!email && l.type !== 'liste html') continue;
    let ent = bySource.get(nom);
    if (!ent) {
      ent = { emails: [], activerCreation: false, activerEnrichissement: false, activerAnalyseIA: false };
      bySource.set(nom, ent);
    }
    if (email) {
      if (!ent.emails.includes(email)) ent.emails.push(email);
    }
    if (l.activerCreation === true) ent.activerCreation = true;
    if (l.activerEnrichissement === true) ent.activerEnrichissement = true;
    if (l.activerAnalyseIA === true) ent.activerAnalyseIA = true;
  }
  return SOURCES_NOMS_CANONIQUES.filter((nom) => bySource.has(nom)).map((source) => {
    const ent = bySource.get(source)!;
    return {
      source,
      urlOfficielle: URL_OFFICIELLE_PAR_SOURCE[source] ?? '',
      creationEmail: { activé: ent.activerCreation, emails: [...ent.emails] },
      creationListeHtml: { activé: true },
      enrichissement: { activé: ent.activerEnrichissement },
      analyse: { activé: ent.activerAnalyseIA },
    };
  });
}

/**
 * Adaptateur : SourceEntry[] → format legacy (une ligne par email + une par source liste html) pour audit/traitement.
 * Permet au câblage de continuer à utiliser les consommateurs existants pendant la migration.
 */
export interface SourceLegacyLigne {
  id: string;
  emailExpéditeur: string;
  source: SourceNom;
  type: 'email' | 'liste html';
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
}

function slugPourSource(nom: SourceNom): string {
  const slug: Record<SourceNom, string> = {
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
  return slug[nom] ?? nom.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '-');
}

export function sourceEntriesToLegacyLignes(entries: SourceEntry[]): SourceLegacyLigne[] {
  const lignes: SourceLegacyLigne[] = [];
  for (const e of entries) {
    for (const email of e.creationEmail.emails) {
      lignes.push({
        id: `email-${slugPourSource(e.source)}-${email}`,
        emailExpéditeur: email,
        source: e.source,
        type: 'email',
        activerCreation: e.creationEmail.activé,
        activerEnrichissement: e.enrichissement.activé,
        activerAnalyseIA: e.analyse.activé,
      });
    }
    if (e.creationListeHtml.activé) {
      const chemin = getCheminListeHtmlPourSource(e.source);
      lignes.push({
        id: `liste-html-${slugPourSource(e.source)}`,
        emailExpéditeur: chemin,
        source: e.source,
        type: 'liste html',
        activerCreation: true,
        activerEnrichissement: e.enrichissement.activé,
        activerAnalyseIA: e.analyse.activé,
      });
    }
  }
  return lignes;
}
