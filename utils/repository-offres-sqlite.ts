/**
 * US-7.6 : repository (driver) de stockage des offres dans SQLite.
 * Schéma aligné sur la table Offres Airtable.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';

export interface TableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  defaultValue: unknown;
  pk: number;
}

/** Colonnes métier alignées Airtable (hors id). Ordre utilisé pour INSERT. */
const COLONNES_OFFRES = [
  'Id offre', 'URL', "Texte de l'offre", 'Poste', 'Entreprise', 'Ville', 'Département', 'Salaire',
  'DateOffre', 'DateAjout', 'Statut', 'source', 'Méthode de création', 'Résumé',
  'CritèreRéhibitoire1', 'CritèreRéhibitoire2', 'CritèreRéhibitoire3', 'CritèreRéhibitoire4',
  'ScoreCritère1', 'ScoreCritère2', 'ScoreCritère3', 'ScoreCritère4',
  'ScoreCulture', 'ScoreLocalisation', 'ScoreSalaire', 'ScoreQualiteOffre', 'Score_Total',
  'Verdict', 'Adresse', 'Commentaire', 'Reprise',
] as const;

const COLONNES_NUMERIQUES = new Set([
  'ScoreCritère1', 'ScoreCritère2', 'ScoreCritère3', 'ScoreCritère4',
  'ScoreCulture', 'ScoreLocalisation', 'ScoreSalaire', 'ScoreQualiteOffre', 'Score_Total',
]);

/** Mapping nom colonne DB → clé JS (OffreRow). */
const DB_TO_JS: Record<string, string> = {
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

/** Ligne offre (noms de colonnes alignés Airtable ; en JS on utilise id_offre pour "Id offre"). */
export interface OffreRow {
  id: string;
  id_offre?: string | null;
  url?: string | null;
  [key: string]: unknown;
}

export interface OffresRepository {
  getTableInfo(): TableColumnInfo[];
  /** Insère une offre. Si id non fourni, génère un UID (UUID v4). */
  insert(offre: Partial<OffreRow>): void;
  /** Upsert par id_offre (ou URL si id_offre vide) : UPDATE si existe, sinon INSERT. */
  upsert(offre: Partial<OffreRow>): void;
  /** Mise à jour partielle par UID (seuls les champs fournis sont modifiés). */
  updateById(uid: string, patch: Partial<OffreRow>): void;
  getById(uid: string): OffreRow | null;
  getByStatut(statut: string): OffreRow[];
  getBySource(source: string): OffreRow[];
  deleteById(uid: string): void;
  getAll(): OffreRow[];
  /** Supprime la table offres et la recrée vide (même schéma). Pour reprise complète. */
  dropAndRecreateTable(): void;
  /** Ferme la connexion (pour tests ou libération explicite). */
  close(): void;
}

/** Types que better-sqlite3 accepte en binding : number, string, bigint, Buffer, null. */
function toSqliteBindable(val: unknown): string | number | bigint | Buffer | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') return val;
  if (typeof val === 'bigint') return val;
  if (Buffer.isBuffer(val)) return val;
  if (Array.isArray(val)) return val.length === 1 ? toSqliteBindable(val[0]) : JSON.stringify(val);
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'boolean') return val ? 1 : 0;
  return String(val);
}

/**
 * Initialise le repository offres (crée la base et la table offres si besoin).
 * @param dbPath Chemin du fichier SQLite ou ':memory:' pour une base en mémoire.
 */
function getVal(offre: Partial<OffreRow>, dbCol: string): unknown {
  const jsKey = DB_TO_JS[dbCol] ?? dbCol;
  const v = (offre as Record<string, unknown>)[jsKey];
  return v === undefined || v === '' ? null : v;
}

/** Pour une colonne numérique, renvoie la valeur en number ; sinon inchangé. (Exporté pour tests couverture.) */
export function _coerceNumericCol(dbCol: string, val: unknown): unknown {
  if (COLONNES_NUMERIQUES.has(dbCol) && typeof val !== 'number' && val !== null && val !== undefined) {
    return Number(val);
  }
  return val;
}

function rowToOffre(row: Record<string, unknown>): OffreRow {
  const out: OffreRow = { id: row.id as string };
  for (const dbCol of COLONNES_OFFRES) {
    const jsKey = DB_TO_JS[dbCol] ?? dbCol;
    let val = row[dbCol];
    if (val !== undefined && val !== null) {
      val = _coerceNumericCol(dbCol, val);
      out[jsKey] = val;
    }
  }
  return out;
}

export function initOffresRepository(dbPath: string): OffresRepository {
  if (dbPath !== ':memory:') {
    const dir = dirname(dbPath);
    mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  const cols = COLONNES_OFFRES.map((c) => {
    const q = `"${c.replace(/"/g, '""')}"`;
    return COLONNES_NUMERIQUES.has(c) ? `${q} REAL` : `${q} TEXT`;
  }).join(', ');
  const createTableSql = `CREATE TABLE offres ( id TEXT PRIMARY KEY, ${cols} )`;
  db.exec(createTableSql.replace('CREATE TABLE offres', 'CREATE TABLE IF NOT EXISTS offres'));

  const getByidOffre = db.prepare<[string]>('SELECT id FROM offres WHERE "Id offre" = ? LIMIT 1');
  const getByUrl = db.prepare<[string]>('SELECT id FROM offres WHERE "URL" = ? LIMIT 1');
  const placeholders = COLONNES_OFFRES.map(() => '?').join(', ');
  const insertCols = ['id', ...COLONNES_OFFRES.map((c) => `"${c.replace(/"/g, '""')}"`)].join(', ');
  const insertStmt = db.prepare(`INSERT INTO offres (${insertCols}) VALUES (?, ${placeholders})`);

  function updateOffre(id: string, patch: Partial<OffreRow>): void {
    for (const dbCol of COLONNES_OFFRES) {
      const jsKey = DB_TO_JS[dbCol] ?? dbCol;
      const v = (patch as Record<string, unknown>)[jsKey];
      if (v === undefined) continue;
      const bindable = toSqliteBindable(_coerceNumericCol(dbCol, v));
      const quoted = `"${dbCol.replace(/"/g, '""')}"`;
      db.prepare(`UPDATE offres SET ${quoted} = ? WHERE id = ?`).run(bindable, id);
    }
  }

  function runInsert(offre: Partial<OffreRow>, id: string): void {
    const values: (string | number | bigint | Buffer | null)[] = [
      toSqliteBindable(id)!,
      ...COLONNES_OFFRES.map((c) => toSqliteBindable(_coerceNumericCol(c, getVal(offre, c)))),
    ];
    insertStmt.run(...values);
  }

  const selectAll = 'SELECT id, ' + COLONNES_OFFRES.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ') + ' FROM offres';

  return {
    getTableInfo(): TableColumnInfo[] {
      return db.prepare('PRAGMA table_info(offres)').all() as TableColumnInfo[];
    },
    insert(offre: Partial<OffreRow>): void {
      const id = offre.id ?? randomUUID();
      runInsert(offre, id);
    },
    upsert(offre: Partial<OffreRow>): void {
      // Id fourni (ex. reprise Airtable : id = record ID) : un enregistrement par id, pas de déduplication id_offre/url
      if (offre.id) {
        const existing = db.prepare(`${selectAll} WHERE id = ? LIMIT 1`).get(offre.id);
        if (existing) {
          updateOffre(offre.id, offre);
          return;
        }
        runInsert(offre, offre.id);
        return;
      }
      const idOffre = offre.id_offre?.trim() || null;
      const url = offre.url?.trim() || null;
      let existingId: string | undefined;
      if (idOffre) {
        const row = getByidOffre.get(idOffre) as { id: string } | undefined;
        existingId = row?.id;
      }
      if (existingId === undefined && url) {
        const row = getByUrl.get(url) as { id: string } | undefined;
        existingId = row?.id;
      }
      if (existingId !== undefined) {
        updateOffre(existingId, offre);
        return;
      }
      const id = offre.id ?? randomUUID();
      runInsert(offre, id);
    },
    updateById(uid: string, patch: Partial<OffreRow>): void {
      updateOffre(uid, patch);
    },
    getById(uid: string): OffreRow | null {
      const row = db.prepare(`${selectAll} WHERE id = ? LIMIT 1`).get(uid) as Record<string, unknown> | undefined;
      if (!row) return null;
      return rowToOffre(row);
    },
    getByStatut(statut: string): OffreRow[] {
      const rows = db.prepare(`${selectAll} WHERE "Statut" = ?`).all(statut) as Record<string, unknown>[];
      return rows.map(rowToOffre);
    },
    getBySource(source: string): OffreRow[] {
      const rows = db.prepare(`${selectAll} WHERE "source" = ?`).all(source) as Record<string, unknown>[];
      return rows.map(rowToOffre);
    },
    dropAndRecreateTable(): void {
      db.exec('DROP TABLE IF EXISTS offres');
      db.exec(createTableSql);
    },
    deleteById(uid: string): void {
      db.prepare('DELETE FROM offres WHERE id = ?').run(uid);
    },
    getAll(): OffreRow[] {
      const rows = db.prepare(selectAll).all() as Record<string, unknown>[];
      return rows.map(rowToOffre);
    },
    close(): void {
      db.close();
    },
  };
}
