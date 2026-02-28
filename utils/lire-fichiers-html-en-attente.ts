/**
 * US-6.1 : lecture des fichiers HTML "en attente" dans un dossier (racine uniquement, pas les sous-dossiers comme "traité").
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type FichierHtmlLu = { filePath: string; content: string };

/**
 * Liste les fichiers .html à la racine de dir (pas dans les sous-dossiers), lit leur contenu.
 */
export async function lireFichiersHtmlEnAttente(dir: string): Promise<FichierHtmlLu[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const htmlFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.html'))
    .map((e) => join(dir, e.name));
  const results: FichierHtmlLu[] = [];
  for (const filePath of htmlFiles) {
    const content = await readFile(filePath, 'utf-8');
    results.push({ filePath, content });
  }
  return results;
}

/**
 * US-6.1 : nombre de fichiers .html en attente dans le dossier (racine uniquement, hors sous-dossier "traité").
 */
export async function compterFichiersHtmlEnAttente(sourceDir: string): Promise<number> {
  const fichiers = await lireFichiersHtmlEnAttente(sourceDir);
  return fichiers.length;
}
