/**
 * US-6.1 : parser APEC pour la page de recherche (liste HTML).
 * Une offre = une carte (lien englobant card card-offer) ; l'URL cible est celle de la page détail offre.
 * Structure APEC : <a href=".../emploi/detail-offre/ID..."><apec-recherche-resultat><div class="card card-offer ...">...
 * On n'extrait que les href contenant "detail-offre" pour ignorer les liens navigation/footer.
 */
import { getListeHtmlSourceDir } from './liste-html-paths.js';
import { deplacerFichierVersTraite } from './liste-html-traite.js';
import { lireFichiersHtmlEnAttente } from './lire-fichiers-html-en-attente.js';

export type OffreApecExtraite = { url: string };

export type UrlApecAvecSource = { url: string; sourceFile?: string };

export type DepsExtraireUrlsApecDepuisDossier = {
  lireFichiersHtmlEnAttente: (dir: string) => Promise<Array<{ filePath: string; content: string }>>;
};

/** Regex pour repérer les liens vers une page détail offre APEC (évite les autres URL du body). */
const HREF_DETAIL_OFFRE = /href\s*=\s*["']([^"']*\/emploi\/detail-offre\/[^"']*)["']/gi;

/** Extrait l'ID d'offre depuis une URL détail APEC (ex. .../detail-offre/178177253W ou .../detail-offre/178177253W?foo=bar → 178177253W). */
export function extraireIdOffreApec(url: string): string | null {
  const match = /\/emploi\/detail-offre\/([^/?]+)/i.exec(url?.trim() ?? '');
  return match ? match[1] : null;
}

/**
 * Extrait les URL d'offres depuis le HTML d'une page de recherche APEC.
 * Ne retourne que les URL des cartes d'offres (detail-offre), pas toutes les URL de la page.
 * Déduplique par ID d'offre (une même carte peut contenir plusieurs liens vers la même offre).
 */
export function extraireOffresApecFromHtml(html: string): OffreApecExtraite[] {
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  HREF_DETAIL_OFFRE.lastIndex = 0;
  while ((m = HREF_DETAIL_OFFRE.exec(html)) !== null) {
    const url = m[1]?.trim();
    if (url) urls.push(url);
  }
  const seenIds = new Set<string>();
  const deduped: OffreApecExtraite[] = [];
  for (const url of urls) {
    const id = extraireIdOffreApec(url);
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      deduped.push({ url });
    } else if (!id) {
      deduped.push({ url });
    }
  }
  return deduped;
}

/**
 * Lit les fichiers HTML en attente du dossier source (liste html/<slug>), parse chaque fichier, retourne une liste unique d'URLs.
 */
export async function extraireUrlsApecDepuisDossier(
  dataDir: string,
  sourceSlug: string,
  deps: DepsExtraireUrlsApecDepuisDossier = { lireFichiersHtmlEnAttente }
): Promise<UrlApecAvecSource[]> {
  const sourceDir = getListeHtmlSourceDir(dataDir, sourceSlug);
  return extraireUrlsApecDepuisDossierDir(sourceDir, deps);
}

/**
 * Même extraction en passant directement le chemin du dossier source (ex. pour le CLI avec argument).
 */
export async function extraireUrlsApecDepuisDossierDir(
  sourceDir: string,
  deps: DepsExtraireUrlsApecDepuisDossier = { lireFichiersHtmlEnAttente }
): Promise<UrlApecAvecSource[]> {
  const fichiers = await deps.lireFichiersHtmlEnAttente(sourceDir);
  const seenIds = new Set<string>();
  const result: UrlApecAvecSource[] = [];
  for (const { filePath, content } of fichiers) {
    const offres = extraireOffresApecFromHtml(content);
    for (const { url } of offres) {
      const id = extraireIdOffreApec(url);
      const key = id ?? url;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        result.push({ url, sourceFile: filePath });
      }
    }
  }
  return result;
}

/**
 * Extraction des URLs depuis les fichiers HTML en attente du dossier source, puis déplacement
 * de chaque fichier traité vers le sous-dossier "traité". Retourne la liste unique d'URLs (dédupliquée par ID).
 */
export async function extraireUrlsApecDepuisDossierDirEtDeplacer(
  sourceDir: string,
  deps: DepsExtraireUrlsApecDepuisDossier = { lireFichiersHtmlEnAttente }
): Promise<UrlApecAvecSource[]> {
  const fichiers = await deps.lireFichiersHtmlEnAttente(sourceDir);
  const seenIds = new Set<string>();
  const result: UrlApecAvecSource[] = [];
  for (const { filePath, content } of fichiers) {
    const offres = extraireOffresApecFromHtml(content);
    for (const { url } of offres) {
      const id = extraireIdOffreApec(url);
      const key = id ?? url;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        result.push({ url, sourceFile: filePath });
      }
    }
    await deplacerFichierVersTraite(filePath, sourceDir);
  }
  return result;
}

/**
 * Même extraction + déplacement en passant par dataDir et sourceSlug (ex. pour le CLI sans argument).
 */
export async function extraireUrlsApecDepuisDossierEtDeplacer(
  dataDir: string,
  sourceSlug: string,
  deps: DepsExtraireUrlsApecDepuisDossier = { lireFichiersHtmlEnAttente }
): Promise<UrlApecAvecSource[]> {
  const sourceDir = getListeHtmlSourceDir(dataDir, sourceSlug);
  return extraireUrlsApecDepuisDossierDirEtDeplacer(sourceDir, deps);
}
