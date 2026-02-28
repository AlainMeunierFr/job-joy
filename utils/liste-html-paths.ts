/**
 * US-6.1 : chemins du dossier "liste html" et sous-dossiers par source.
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Retourne le chemin du dossier "liste html" sous le répertoire de données.
 */
export function getListeHtmlDir(dataDir: string): string {
  return join(dataDir, 'liste html');
}

/**
 * Retourne le chemin du sous-dossier source (ex. apec) sous "liste html".
 */
export function getListeHtmlSourceDir(dataDir: string, sourceSlug: string): string {
  return join(getListeHtmlDir(dataDir), sourceSlug);
}

/** @deprecated Utiliser getListeHtmlSourceDir (alias conservé pour compat). */
export const getListeHtmlPluginDir = getListeHtmlSourceDir;

/** Préfixe de l'adresse relative pour les sources liste html (US-6.2). */
const LISTE_HTML_PREFIX = 'liste html/';

/**
 * Retourne l'adresse relative (identifiant stocké en Sources.Adresse) pour un sous-dossier liste html.
 * Ex. getListeHtmlAdresseRelative('apec') => 'liste html/apec'
 */
export function getListeHtmlAdresseRelative(pluginSlug: string): string {
  return `${LISTE_HTML_PREFIX}${pluginSlug}`;
}

/**
 * Convertit une adresse relative liste html (ex. "liste html/apec") en chemin absolu.
 */
export function toFullPathListeHtml(dataDir: string, adresseRelative: string): string {
  return join(dataDir, adresseRelative);
}

/** Nom du dossier à ignorer à la racine de "liste html" (fichiers déjà traités). */
const SOUS_DOSSIER_IGNORE = 'traité';

/**
 * Liste les noms des sous-dossiers du dossier "liste html" (un par source, ex. apec).
 * Ignore le dossier "traité" s'il est à la racine. Si "liste html" n'existe pas, retourne [].
 */
export async function listerDossiersSourceListeHtml(dataDir: string): Promise<string[]> {
  const dir = getListeHtmlDir(dataDir);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && e.name !== SOUS_DOSSIER_IGNORE)
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/** @deprecated Utiliser listerDossiersSourceListeHtml */
export const listerDossiersPluginListeHtml = listerDossiersSourceListeHtml;
