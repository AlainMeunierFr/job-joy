/**
 * US-7.7 : driver relève offres qui utilise le repository SQLite (au lieu d'Airtable).
 */
import type { RelèveOffresDriver } from './relève-offres-linkedin.js';
import type { SourceLinkedInResult } from '../types/offres-releve.js';
import type { OffreInsert, ResultatCreerOffres, MethodeCreationOffre } from '../types/offres-releve.js';
import type { OffresRepository, OffreRow } from './repository-offres-sqlite.js';

export interface ReleveOffresSqliteDriverOptions {
  repository: OffresRepository;
  getSourceLinkedIn: () => Promise<SourceLinkedInResult>;
}

function offreInsertToRow(o: OffreInsert, sourceId: string, methodeCreation: MethodeCreationOffre): Partial<OffreRow> {
  return {
    id_offre: o.idOffre,
    url: o.url,
    DateAjout: o.dateAjout,
    ...(o.dateOffre && { DateOffre: o.dateOffre }),
    Statut: o.statut,
    source: sourceId,
    'Méthode de création': methodeCreation,
    ...(o.poste && { Poste: o.poste }),
    ...(o.entreprise && { Entreprise: o.entreprise }),
    ...((o.ville ?? o.lieu) && { Ville: o.ville ?? o.lieu }),
    ...(o.département && { Département: o.département }),
    ...(o.salaire && { Salaire: o.salaire }),
  };
}

/**
 * Crée un RelèveOffresDriver qui écrit dans le repository SQLite.
 * getSourceLinkedIn est délégué (ex. composite/sources JSON).
 */
export function createReleveOffresSqliteDriver(
  options: ReleveOffresSqliteDriverOptions
): RelèveOffresDriver {
  const { repository, getSourceLinkedIn } = options;

  return {
    async getSourceLinkedIn() {
      return getSourceLinkedIn();
    },

    async creerOffres(
      offres: OffreInsert[],
      sourceId: string,
      methodeCreation: MethodeCreationOffre = 'email'
    ): Promise<ResultatCreerOffres> {
      const sourceNom = String(sourceId).trim();
      if (!sourceNom) {
        throw new Error('creerOffres: nom de source requis.');
      }
      if (offres.length === 0) {
        return { nbCreees: 0, nbDejaPresentes: 0 };
      }
      for (const o of offres) {
        const row = offreInsertToRow(o, sourceNom, methodeCreation);
        repository.upsert(row);
      }
      return { nbCreees: offres.length, nbDejaPresentes: 0 };
    },
  };
}
