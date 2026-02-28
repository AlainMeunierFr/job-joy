/**
 * US-6.1 / US-6.2 : création des sources manquantes pour les dossiers "liste html" (audit des sources).
 */
import { normalize } from 'node:path';
import type { SourceNom, SourceEmail } from './gouvernance-sources-emails.js';
import { getListeHtmlAdresseRelative } from './liste-html-paths.js';

/** Mapping slug sous-dossier liste html → source (CA3 US-6.2). Slug inconnu → Inconnu. */
export function sourceNomPourSlugListeHtml(slug: string): SourceNom {
  const key = (slug ?? '').trim().toLowerCase();
  if (key === 'apec') return 'APEC';
  return 'Inconnu';
}

/**
 * Normalise un chemin pour stockage et comparaison (slashes uniformes, trim).
 */
export function normaliserCheminListeHtml(chemin: string): string {
  return normalize(chemin).replace(/\\/g, '/').trim();
}

/** Indique si emailExpéditeur ressemble à une adresse liste html (pas une adresse email). */
function estCheminListeHtml(emailExpéditeur: string): boolean {
  return !emailExpéditeur.includes('@');
}

/** Retourne la clé de comparaison (adresse relative "liste html/xxx") pour une source existante. */
function toAdresseRelativeListeHtml(emailExpéditeur: string): string {
  const norm = normaliserCheminListeHtml(emailExpéditeur);
  const idx = norm.indexOf('liste html/');
  if (idx >= 0) return norm.substring(idx);
  const parts = norm.split('/');
  const slug = parts[parts.length - 1] ?? '';
  return getListeHtmlAdresseRelative(slug);
}

export interface OptionsCreerSourcesManquantesListeHtml {
  dataDir: string;
  listerDossiers: (dataDir: string) => Promise<string[]>;
  getSourceDir: (dataDir: string, sourceSlug: string) => string;
  sourcesExistantes: Array<{ emailExpéditeur: string }>;
  creerSource: (source: SourceEmail) => Promise<{ sourceId: string; emailExpéditeur: string }>;
}

export interface SourceCreeeListeHtml {
  sourceId: string;
  emailExpéditeur: string;
  source: SourceNom;
}

/**
 * Pour chaque sous-dossier du dossier "liste html", crée une source en base si elle n'existe pas encore.
 * Adresse = chemin relatif "liste html/[slug]" (US-6.2), type = "liste html", source selon slug.
 */
export async function creerSourcesManquantesPourListeHtml(
  options: OptionsCreerSourcesManquantesListeHtml
): Promise<{ nbCreees: number; creees: SourceCreeeListeHtml[] }> {
  const { listerDossiers, getSourceDir, sourcesExistantes, creerSource } = options;
  const dataDir = options.dataDir;
  const dossiers = await listerDossiers(dataDir);
  const adressesExistantes = new Set(
    sourcesExistantes
      .filter((s) => estCheminListeHtml(s.emailExpéditeur))
      .map((s) => toAdresseRelativeListeHtml(s.emailExpéditeur))
  );
  const creees: SourceCreeeListeHtml[] = [];
  for (const slug of dossiers) {
    const adresseRelative = getListeHtmlAdresseRelative(slug);
    if (adressesExistantes.has(adresseRelative)) continue;
    const sourceNom = sourceNomPourSlugListeHtml(slug);
    const source: SourceEmail = {
      emailExpéditeur: adresseRelative,
      source: sourceNom,
      type: 'liste html',
      activerCreation: true,
      activerEnrichissement: false,
      activerAnalyseIA: true,
    };
    const created = await creerSource(source);
    creees.push({ sourceId: created.sourceId, emailExpéditeur: created.emailExpéditeur, source: sourceNom });
    adressesExistantes.add(toAdresseRelativeListeHtml(created.emailExpéditeur));
  }
  return { nbCreees: creees.length, creees };
}
