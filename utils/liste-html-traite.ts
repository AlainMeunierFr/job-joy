/**
 * US-6.1 : création du sous-dossier "traité" et déplacement des fichiers après extraction.
 */
import { mkdir, rename } from 'node:fs/promises';
import { join, basename } from 'node:path';

const SOUS_DOSSIER_TRAITE = 'traité';

/**
 * Crée le sous-dossier "traité" sous sourceDir s'il n'existe pas (mkdir recursive).
 * Retourne le chemin du dossier "traité".
 */
export async function ensureTraiteDir(sourceDir: string): Promise<string> {
  const traitePath = join(sourceDir, SOUS_DOSSIER_TRAITE);
  await mkdir(traitePath, { recursive: true });
  return traitePath;
}

/**
 * Déplace le fichier filePath vers <sourceDir>/traité/<basename>.
 * Crée le sous-dossier "traité" s'il n'existe pas.
 * Si un fichier du même nom existe déjà dans traité, il est écrasé (comportement de fs.rename).
 */
export async function deplacerFichierVersTraite(
  filePath: string,
  sourceDir: string
): Promise<void> {
  const traitePath = await ensureTraiteDir(sourceDir);
  const dest = join(traitePath, basename(filePath));
  await rename(filePath, dest);
}
