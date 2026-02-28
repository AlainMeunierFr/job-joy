/**
 * US-7.9 (CA6) : repository des vues offres (ordre colonnes, filtre, tri) en SQLite.
 * Même base que les offres (même dbPath), table séparée vues.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';

export interface VueOffresTableColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  defaultValue: unknown;
  pk: number;
}

export interface VueOffresRow {
  id: string;
  nom: string;
  parametrage: string;
}

export interface VuesOffresRepository {
  getTableInfo(): VueOffresTableColumnInfo[];
  create(nom: string, parametrage: object): string;
  getById(id: string): VueOffresRow | null;
  updateNom(id: string, nom: string): void;
  deleteById(id: string): void;
  listAll(): VueOffresRow[];
  close(): void;
}

/**
 * Initialise le repository vues (crée la table vues si besoin).
 * @param dbPath Chemin du fichier SQLite ou ':memory:' (même base que offres si même path).
 */
export function initVuesOffresRepository(dbPath: string): VuesOffresRepository {
  if (dbPath !== ':memory:') {
    const dir = dirname(dbPath);
    mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS vues (
      id TEXT PRIMARY KEY,
      nom TEXT,
      parametrage TEXT
    )
  `);

  const insertStmt = db.prepare('INSERT INTO vues (id, nom, parametrage) VALUES (?, ?, ?)');
  const getByIdStmt = db.prepare('SELECT id, nom, parametrage FROM vues WHERE id = ? LIMIT 1');
  const updateNomStmt = db.prepare('UPDATE vues SET nom = ? WHERE id = ?');
  const deleteByIdStmt = db.prepare('DELETE FROM vues WHERE id = ?');

  return {
    getTableInfo(): VueOffresTableColumnInfo[] {
      return db.prepare('PRAGMA table_info(vues)').all() as VueOffresTableColumnInfo[];
    },
    create(nom: string, parametrage: object): string {
      const id = randomUUID();
      insertStmt.run(id, nom, JSON.stringify(parametrage));
      return id;
    },
    getById(id: string): VueOffresRow | null {
      const row = getByIdStmt.get(id) as Record<string, unknown> | undefined;
      if (!row) return null;
      return {
        id: row.id as string,
        nom: row.nom as string,
        parametrage: row.parametrage as string,
      };
    },
    updateNom(id: string, nom: string): void {
      updateNomStmt.run(nom, id);
    },
    deleteById(id: string): void {
      deleteByIdStmt.run(id);
    },
    listAll(): VueOffresRow[] {
      const rows = db.prepare('SELECT id, nom, parametrage FROM vues').all() as Record<string, unknown>[];
      return rows.map((r) => ({
        id: r.id as string,
        nom: r.nom as string,
        parametrage: r.parametrage as string,
      }));
    },
    close(): void {
      db.close();
    },
  };
}
