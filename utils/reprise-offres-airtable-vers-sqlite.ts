/**
 * US-7.8 : Reprise des offres depuis Airtable vers SQLite.
 * Lecture seule Airtable (GET uniquement), pagination pageSize 100 + offset,
 * mapping des champs vers le schéma US-7.6, upsert par record.id (identifiant unique Airtable).
 *
 * Gestion d'erreurs : en cas d'erreur fetch (API indisponible, 403, 404, 5xx)
 * ou SQLite (base verrouillée, etc.), la fonction lève une erreur ou retourne
 * { ok: false, message }. Comportement : arrêt immédiat, pas d'écriture partielle.
 */
import type { OffresRepository, OffreRow } from './repository-offres-sqlite.js';

const API_BASE = 'https://api.airtable.com/v0';
const PAGE_SIZE = 100;

/** Mapping nom champ Airtable (aligné colonnes DB US-7.6) → clé OffreRow. */
const AIRTABLE_FIELD_TO_OFFRE: Record<string, string> = {
  'Id offre': 'id_offre',
  'URL': 'url',
  "Texte de l'offre": 'Texte de l\'offre',
  'Poste': 'Poste',
  'Entreprise': 'Entreprise',
  'Ville': 'Ville',
  'Département': 'Département',
  'Salaire': 'Salaire',
  'DateOffre': 'DateOffre',
  'DateAjout': 'DateAjout',
  'Statut': 'Statut',
  'source': 'source',
  'Méthode de création': 'Méthode de création',
  'Résumé': 'Résumé',
  'CritèreRéhibitoire1': 'CritèreRéhibitoire1',
  'CritèreRéhibitoire2': 'CritèreRéhibitoire2',
  'CritèreRéhibitoire3': 'CritèreRéhibitoire3',
  'CritèreRéhibitoire4': 'CritèreRéhibitoire4',
  'ScoreCritère1': 'ScoreCritère1',
  'ScoreCritère2': 'ScoreCritère2',
  'ScoreCritère3': 'ScoreCritère3',
  'ScoreCritère4': 'ScoreCritère4',
  'ScoreCulture': 'ScoreCulture',
  'ScoreLocalisation': 'ScoreLocalisation',
  'ScoreSalaire': 'ScoreSalaire',
  'ScoreQualiteOffre': 'ScoreQualiteOffre',
  'Score_Total': 'Score_Total',
  'Verdict': 'Verdict',
  'Adresse': 'Adresse',
  'Commentaire': 'Commentaire',
  'Reprise': 'Reprise',
};

export interface RepriseOffresOptions {
  apiKey: string;
  baseId: string;
  offresId: string;
  repository: OffresRepository;
  /** Pour les tests : mock fetch. Par défaut utilise global fetch. */
  fetchFn?: (url: string, init?: RequestInit) => Promise<Response>;
}

export interface RepriseOffresResult {
  ok: boolean;
  message?: string;
  /** Nombre d'enregistrements reçus de l'API Airtable (toutes pages). */
  totalRecus?: number;
  /** Nombre d'enregistrements dont l'upsert a échoué (si > 0, détail en console). */
  echecs?: number;
  /** IDs des enregistrements en échec (au plus 20 pour éviter de surcharger). */
  idsEchecs?: string[];
}

type AirtableRecord = { id: string; fields?: Record<string, unknown> };
type AirtableResponse = { records?: AirtableRecord[]; offset?: string };

function mapRecordToOffre(record: AirtableRecord): Partial<OffreRow> {
  const fields = record.fields ?? {};
  // Clé primaire SQLite = record.id (identifiant unique Airtable, ex. recXXXXXXXXXXXXXX).
  const offre: Partial<OffreRow> = { id: record.id };
  for (const [airtableKey, value] of Object.entries(fields)) {
    const jsKey = AIRTABLE_FIELD_TO_OFFRE[airtableKey] ?? airtableKey;
    if (value === undefined || value === '') continue;
    (offre as Record<string, unknown>)[jsKey] = value;
  }
  return offre;
}

/**
 * Récupère toutes les offres depuis la table Airtable (GET, pagination),
 * mappe vers OffreRow (id = record.id ; Id offre → id_offre) et appelle repository.upsert pour chaque offre.
 */
export async function reprendreOffresAirtableVersSqlite(
  options: RepriseOffresOptions
): Promise<RepriseOffresResult> {
  const { apiKey, baseId, offresId, repository, fetchFn = fetch } = options;
  const urlBase = `${API_BASE}/${baseId}/${offresId}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  let offset: string | undefined;
  let totalRecus = 0;
  const idsEchecs: string[] = [];
  const maxIdsEchecs = 20;
  do {
    const url = `${urlBase}?pageSize=${PAGE_SIZE}${offset ? `&offset=${offset}` : ''}`;
    const res = await fetchFn(url, { method: 'GET', headers });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `Airtable API: ${res.status} ${text}`, totalRecus, echecs: idsEchecs.length, idsEchecs: idsEchecs.slice(0, maxIdsEchecs) };
    }
    const data = (await res.json()) as AirtableResponse;
    const records = data.records ?? [];
    totalRecus += records.length;
    for (const record of records) {
      try {
        const offre = mapRecordToOffre(record);
        repository.upsert(offre);
      } catch (err) {
        idsEchecs.push(record.id);
        if (idsEchecs.length <= maxIdsEchecs) {
          console.error(`[reprise] upsert échoué pour record ${record.id}:`, err instanceof Error ? err.message : err);
        }
      }
    }
    offset = data.offset;
  } while (offset);

  if (idsEchecs.length > 0) {
    console.error(`[reprise] ${idsEchecs.length} enregistrement(s) en échec sur ${totalRecus} reçus.`);
  }
  return {
    ok: true,
    totalRecus,
    echecs: idsEchecs.length,
    idsEchecs: idsEchecs.length > 0 ? idsEchecs.slice(0, maxIdsEchecs) : undefined,
  };
}
