/**
 * Tableau de synthèse des offres (US-1.7).
 * Construit un tableau croisé dynamique : une ligne par expéditeur, colonnes statuts.
 */
import { STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';
import type { AlgoSource } from './gouvernance-sources-emails.js';

/** Ordre de tri des lignes : algo étape 2 puis algo étape 1 (CA3 BDD). */
const ORDRE_TRI_ALGO: AlgoSource[] = ['HelloWork', 'Linkedin', 'Inconnu'];

export interface SourcePourTableau {
  emailExpéditeur: string;
  algo: AlgoSource;
  actif: boolean;
}

export interface OffrePourTableau {
  emailExpéditeur: string;
  statut: string;
}

export interface LigneTableauSynthese {
  emailExpéditeur: string;
  algoEtape1: string;
  algoEtape2: string;
  actif: boolean;
  statuts: Record<string, number>;
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
    if (statut && statuts[statut] !== undefined) statuts[statut] += 1;
  }

  const lignes = Array.from(compteursParExpediteur.entries()).map(([key, statuts]) => {
    const source = indexSources.get(key)!;
    return {
      emailExpéditeur: source.emailExpéditeur,
      algoEtape1: source.algo,
      algoEtape2: source.algo,
      actif: source.actif,
      statuts: { ...statuts },
    };
  });

  const indexOfAlgo = (a: string) => {
    const i = ORDRE_TRI_ALGO.indexOf(a as AlgoSource);
    return i >= 0 ? i : ORDRE_TRI_ALGO.length;
  };
  lignes.sort((a, b) => {
    const cmp2 = indexOfAlgo(a.algoEtape2) - indexOfAlgo(b.algoEtape2);
    if (cmp2 !== 0) return cmp2;
    const cmp1 = indexOfAlgo(a.algoEtape1) - indexOfAlgo(b.algoEtape1);
    if (cmp1 !== 0) return cmp1;
    return a.emailExpéditeur.localeCompare(b.emailExpéditeur);
  });
  return lignes;
}
