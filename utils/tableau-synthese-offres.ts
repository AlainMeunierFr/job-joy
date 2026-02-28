/**
 * Tableau de synthèse des offres (US-1.7).
 * Construit un tableau croisé dynamique : une ligne par expéditeur, colonnes statuts.
 */
import { STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';
import type { SourceNom, TypeSource } from './gouvernance-sources-emails.js';

/** Ordre de tri des lignes : source étape 2 puis source étape 1 (CA3 BDD). */
const ORDRE_TRI_SOURCE: SourceNom[] = ['HelloWork', 'Linkedin', 'APEC', 'Inconnu'];

export interface SourcePourTableau {
  emailExpéditeur: string;
  source: SourceNom;
  /** Type de la source (email vs liste html) pour savoir quelle capacité phase 1 utiliser. */
  type?: TypeSource;
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
}

export interface OffrePourTableau {
  emailExpéditeur: string;
  statut: string;
}

export interface LigneTableauSynthese {
  emailExpéditeur: string;
  sourceEtape1: string;
  sourceEtape2: string;
  /** Type de la source (email / liste html) pour calcul phase1Implemented. */
  typeSource?: TypeSource;
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
  statuts: Record<string, number>;
  /** Nombre d'offres à importer pour cette source (US-3.3, issu du cache audit). */
  aImporter: number;
}

/** Totaux du tableau de synthèse (US-1.13) : par ligne, par colonne (statut), et général. */
export interface TotauxTableauSynthese {
  totalParLigne: number[];
  totalParColonne: Record<string, number>;
  totalGeneral: number;
}

export interface OptionsTableauSynthese {
  sources: SourcePourTableau[];
  offres: OffrePourTableau[];
  statutsOrdre?: readonly string[];
}

/** Repository pour produire le tableau de synthèse (injection pour tests et app). */
export interface TableauSyntheseRepository {
  listerSources(): Promise<SourcePourTableau[]>;
  listerOffres(): Promise<OffrePourTableau[]>;
}

/** Produit le tableau de synthèse prêt pour le dashboard à partir du repository. */
export async function produireTableauSynthese(
  repo: TableauSyntheseRepository,
  statutsOrdre: readonly string[] = STATUTS_OFFRES_AIRTABLE
): Promise<LigneTableauSynthese[]> {
  const [sources, offres] = await Promise.all([repo.listerSources(), repo.listerOffres()]);
  return construireTableauSynthese({ sources, offres, statutsOrdre });
}

function normaliserEmail(email: string): string {
  return email.trim().toLowerCase();
}

function creerStatutsVides(statutsOrdre: readonly string[]): Record<string, number> {
  const statuts: Record<string, number> = {};
  for (const s of statutsOrdre) statuts[s] = 0;
  return statuts;
}

/** Compare sans tenir compte des accents ni de la casse (pour rapprocher Airtable du tableau). */
function normaliserPourComparaison(s: string): string {
  return (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '');
}

/**
 * Ramène le statut Airtable (éventuellement sans accent ou autre casse) vers la clé canonique du tableau.
 * Ex. "A completer" → "A compléter", "A traiter" → "À traiter", "refusé" → "Refusé".
 */
function statutCanonique(statutBrut: string, statutsOrdre: readonly string[]): string {
  const s = statutBrut?.trim() || '';
  if (!s) return '';
  if (statutsOrdre.includes(s)) return s;
  const n = normaliserPourComparaison(s);
  for (const canon of statutsOrdre) {
    if (canon !== 'Autre' && normaliserPourComparaison(canon) === n) return canon;
  }
  return 'Autre';
}

/** Indique si l'expéditeur est un chemin liste html (pas une adresse email). US-6.1 */
function estSourceListeHtml(emailExpéditeur: string): boolean {
  return !emailExpéditeur.includes('@');
}

export function construireTableauSynthese(options: OptionsTableauSynthese): LigneTableauSynthese[] {
  const { sources, offres, statutsOrdre = STATUTS_OFFRES_AIRTABLE } = options;
  const indexSources = new Map(sources.map((s) => [normaliserEmail(s.emailExpéditeur), s]));
  const compteursParExpediteur = new Map<string, Record<string, number>>();

  for (const offre of offres) {
    const key = normaliserEmail(offre.emailExpéditeur);
    const source = indexSources.get(key);
    if (!source) continue;

    let statuts = compteursParExpediteur.get(key);
    if (!statuts) {
      statuts = creerStatutsVides(statutsOrdre);
      compteursParExpediteur.set(key, statuts);
    }
    const statutBrut = offre.statut?.trim() || '';
    if (!statutBrut) continue;
    const statut = statutCanonique(statutBrut, statutsOrdre);
    if (!statut) continue;
    if (statuts[statut] !== undefined) {
      statuts[statut] += 1;
    } else if (statuts['Autre'] !== undefined) {
      statuts['Autre'] += 1;
    }
  }

  const typeSourcePour = (s: SourcePourTableau): TypeSource =>
    s.type ?? (estSourceListeHtml(s.emailExpéditeur) ? 'liste html' : 'email');

  let lignes = Array.from(compteursParExpediteur.entries()).map(([key, statuts]) => {
    const source = indexSources.get(key)!;
    return {
      emailExpéditeur: source.emailExpéditeur,
      sourceEtape1: source.source,
      sourceEtape2: source.source,
      typeSource: typeSourcePour(source),
      activerCreation: source.activerCreation,
      activerEnrichissement: source.activerEnrichissement,
      activerAnalyseIA: source.activerAnalyseIA,
      statuts: { ...statuts },
      aImporter: 0,
    };
  });

  // US-6.1 : inclure les sources "liste html" (chemin) sans offres pour afficher "À importer".
  for (const [key, source] of indexSources) {
    if (compteursParExpediteur.has(key)) continue;
    if (!estSourceListeHtml(source.emailExpéditeur)) continue;
    lignes.push({
      emailExpéditeur: source.emailExpéditeur,
      sourceEtape1: source.source,
      sourceEtape2: source.source,
      typeSource: typeSourcePour(source),
      activerCreation: source.activerCreation,
      activerEnrichissement: source.activerEnrichissement,
      activerAnalyseIA: source.activerAnalyseIA,
      statuts: creerStatutsVides(statutsOrdre),
      aImporter: 0,
    });
  }

  const indexOfSourceNom = (a: string) => {
    const i = ORDRE_TRI_SOURCE.indexOf(a as SourceNom);
    return i >= 0 ? i : ORDRE_TRI_SOURCE.length;
  };
  lignes.sort((a, b) => {
    const cmp2 = indexOfSourceNom(a.sourceEtape2) - indexOfSourceNom(b.sourceEtape2);
    if (cmp2 !== 0) return cmp2;
    const cmp1 = indexOfSourceNom(a.sourceEtape1) - indexOfSourceNom(b.sourceEtape1);
    if (cmp1 !== 0) return cmp1;
    return a.emailExpéditeur.localeCompare(b.emailExpéditeur);
  });
  return lignes;
}

/**
 * Fusionne le cache audit (nombre à importer par email) dans les lignes du tableau (US-3.3).
 * Pour chaque ligne, définit aImporter = cache[email normalisé] ?? 0.
 */
export function mergeCacheDansLignes(
  lignes: LigneTableauSynthese[],
  cache: Record<string, number>
): LigneTableauSynthese[] {
  return lignes.map((ligne) => ({
    ...ligne,
    aImporter: cache[normaliserEmail(ligne.emailExpéditeur)] ?? 0,
  }));
}

/**
 * US-6.1 : enrichit le cache audit avec le nombre de fichiers .html en attente pour chaque source "liste html" (chemin).
 * À utiliser avant mergeCacheDansLignes pour que la colonne "À importer" affiche le bon nombre pour ces sources.
 */
export async function enrichirCacheAImporterListeHtml(
  cacheAudit: Record<string, number>,
  sources: Array<{ emailExpéditeur: string }>,
  compterFichiersListeHtml: (sourceDir: string) => Promise<number>
): Promise<Record<string, number>> {
  const out = { ...cacheAudit };
  for (const s of sources) {
    if (!estSourceListeHtml(s.emailExpéditeur)) continue;
    const key = normaliserEmail(s.emailExpéditeur);
    out[key] = await compterFichiersListeHtml(s.emailExpéditeur);
  }
  return out;
}

/**
 * Calcule les totaux du tableau de synthèse (US-1.13).
 * - totalParLigne[i] = somme des statuts de la ligne i
 * - totalParColonne[statut] = somme des valeurs de ce statut sur toutes les lignes
 * - totalGeneral = somme de tous les totalParLigne (ou des totalParColonne)
 */
export function calculerTotauxTableauSynthese(
  lignes: Array<{ statuts: Record<string, number> }>,
  statutsOrdre: readonly string[]
): TotauxTableauSynthese {
  const totalParColonne: Record<string, number> = {};
  for (const s of statutsOrdre) totalParColonne[s] = 0;

  const totalParLigne: number[] = [];
  for (const ligne of lignes) {
    let sumLigne = 0;
    for (const s of statutsOrdre) {
      const v = ligne.statuts[s] ?? 0;
      totalParColonne[s] += v;
      sumLigne += v;
    }
    totalParLigne.push(sumLigne);
  }

  const totalGeneral = totalParLigne.reduce((a, b) => a + b, 0);
  return { totalParLigne, totalParColonne, totalGeneral };
}
