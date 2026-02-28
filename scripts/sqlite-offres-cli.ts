#!/usr/bin/env node
/**
 * Mini CLI pour exécuter une requête SQL sur data/offres.sqlite (sans installer sqlite3).
 * Usage:
 *   npm run cli:sqlite-offres                    → affiche chemin + nombre d'enregistrements
 *   npm run cli:sqlite-offres -- "SELECT * FROM offres LIMIT 5"
 *   npm run cli:sqlite-offres -- "SELECT source, Statut, COUNT(*) FROM offres GROUP BY source, Statut"
 */
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { getDataDirForApp } from '../utils/data-dir.js';
import Database from 'better-sqlite3';

const dataDir = getDataDirForApp();
const dbPath = join(dataDir, 'offres.sqlite');

const sqlArg = process.argv[2]?.trim();
const isDefaultCount = !sqlArg;

const sql = sqlArg || 'SELECT COUNT(*) as count FROM offres';

if (!existsSync(dbPath)) {
  console.error('Fichier introuvable:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });
try {
  const rows = db.prepare(sql).all() as Record<string, unknown>[];
  if (isDefaultCount && rows.length === 1 && 'count' in rows[0]) {
    const count = Number(rows[0].count) || 0;
    console.log(`Offres (SQLite): ${dbPath} → ${count} enregistrement(s)`);
  } else if (rows.length === 0) {
    console.log('(0 rows)');
  } else if (rows.length === 1 && Object.keys(rows[0]).length === 1 && 'count' in rows[0]) {
    console.log(rows[0].count);
  } else {
    console.table(rows);
  }
} finally {
  db.close();
}
