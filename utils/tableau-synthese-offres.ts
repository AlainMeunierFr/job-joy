/**
 * Tableau de synthèse des offres (US-1.7).
 * Construit un tableau croisé dynamique : une ligne par expéditeur, colonnes statuts.
 */
import { STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';
import type { PluginSource } from './gouvernance-sources-emails.js';

/** Ordre de tri des lignes : plugin étape 2 puis plugin étape 1 (CA3 BDD). */
const ORDRE_TRI_PLUGIN: PluginSource[] = ['HelloWork', 'Linkedin', 'Inconnu'];

export interface SourcePourTableau {
  emailExpéditeur: string;
  plugin: PluginSource;
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
  pluginEtape1: string;
  pluginEtape2: string;
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

export function construireTableauSynthese(options: OptionsTableauSynthese): LigneTableauSynthese[] {
  const { sources, offres, statutsOrdre = STATUTS_OFFRES_AIRTABLE } = options;
  if (offres.length === 0) return [];

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
    const statut = offre.statut?.trim() || '';
    if (!statut) continue;
    if (statuts[statut] !== undefined) {
      statuts[statut] += 1;
    } else if (statuts['Autre'] !== undefined) {
      statuts['Autre'] += 1;
    }
  }

  const lignes = Array.from(compteursParExpediteur.entries()).map(([key, statuts]) => {
    const source = indexSources.get(key)!;
    return {
      emailExpéditeur: source.emailExpéditeur,
      pluginEtape1: source.plugin,
      pluginEtape2: source.plugin,
      activerCreation: source.activerCreation,
      activerEnrichissement: source.activerEnrichissement,
      activerAnalyseIA: source.activerAnalyseIA,
      statuts: { ...statuts },
      aImporter: 0,
    };
  });

  const indexOfPlugin = (a: string) => {
    const i = ORDRE_TRI_PLUGIN.indexOf(a as PluginSource);
    return i >= 0 ? i : ORDRE_TRI_PLUGIN.length;
  };
  lignes.sort((a, b) => {
    const cmp2 = indexOfPlugin(a.pluginEtape2) - indexOfPlugin(b.pluginEtape2);
    if (cmp2 !== 0) return cmp2;
    const cmp1 = indexOfPlugin(a.pluginEtape1) - indexOfPlugin(b.pluginEtape1);
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
