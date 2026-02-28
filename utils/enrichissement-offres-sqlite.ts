/**
 * US-7.7 : driver enrichissement offres qui utilise le repository SQLite (au lieu d'Airtable).
 */
import type {
  EnrichissementOffresDriver,
  ChampsOffreAirtable,
} from './enrichissement-offres.js';
import type { OffreAAnalyser } from './enrichissement-offres.js';
import type { OffreARecuperer } from '../types/offres-releve.js';
import type { OffresRepository, OffreRow } from './repository-offres-sqlite.js';

const STATUT_A_COMPLETER = 'A compléter';
const STATUT_A_ANALYSER = 'À analyser';

export interface EnrichissementOffresSqliteDriverOptions {
  repository: OffresRepository;
  /** Si fourni, getOffresAAnalyser ne retourne que les offres dont la source est dans cet ensemble. */
  sourceNomsActifs?: Set<string> | string[];
}

function rowToOffreARecuperer(row: OffreRow): OffreARecuperer {
  return {
    id: row.id,
    url: (row.url ?? '').trim() || '',
    statut: (row.Statut as string) ?? '',
    poste: typeof row.Poste === 'string' ? row.Poste : undefined,
    entreprise: typeof row.Entreprise === 'string' ? row.Entreprise : undefined,
    ville: typeof row.Ville === 'string' ? row.Ville : undefined,
    département: typeof row.Département === 'string' ? row.Département : undefined,
    salaire: typeof row.Salaire === 'string' ? row.Salaire : undefined,
    dateOffre: typeof row.DateOffre === 'string' ? row.DateOffre : undefined,
  };
}

function rowToOffreAAnalyser(row: OffreRow): OffreAAnalyser {
  return {
    id: row.id,
    poste: typeof row.Poste === 'string' ? row.Poste : undefined,
    ville: typeof row.Ville === 'string' ? row.Ville : undefined,
    texteOffre: typeof row['Texte de l\'offre'] === 'string' ? row['Texte de l\'offre'] : undefined,
    entreprise: typeof row.Entreprise === 'string' ? row.Entreprise : undefined,
    salaire: typeof row.Salaire === 'string' ? row.Salaire : undefined,
    dateOffre: typeof row.DateOffre === 'string' ? row.DateOffre : undefined,
    departement: typeof row.Département === 'string' ? row.Département : undefined,
  };
}

/**
 * Crée un EnrichissementOffresDriver qui lit/écrit dans le repository SQLite.
 */
export function createEnrichissementOffresSqliteDriver(
  options: EnrichissementOffresSqliteDriverOptions
): EnrichissementOffresDriver {
  const { repository, sourceNomsActifs } = options;
  const actifsSet =
    sourceNomsActifs instanceof Set
      ? sourceNomsActifs
      : Array.isArray(sourceNomsActifs)
        ? new Set(sourceNomsActifs.map((s) => String(s).trim()).filter(Boolean))
        : undefined;

  return {
    async getOffresARecuperer(): Promise<OffreARecuperer[]> {
      const rows = repository.getByStatut(STATUT_A_COMPLETER);
      return rows.map(rowToOffreARecuperer);
    },

    async updateOffre(recordId: string, champs: ChampsOffreAirtable): Promise<void> {
      repository.updateById(recordId, champs as Partial<OffreRow>);
    },

    async getOffresAAnalyser(): Promise<OffreAAnalyser[]> {
      const rows = repository.getByStatut(STATUT_A_ANALYSER);
      const filtered =
        actifsSet && actifsSet.size > 0
          ? rows.filter((row) => actifsSet.has(String(row.source ?? '').trim()))
          : rows;
      return filtered.map(rowToOffreAAnalyser);
    },
  };
}
