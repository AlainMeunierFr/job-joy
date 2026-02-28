/**
 * US-7.8 : Script CLI reprise des offres Airtable → SQLite.
 * Lit la config Airtable (data/parametres.json). Si la base existe, la sauvegarde dans data/
 * (offres-AAAA-MM-JJ-HH-mm.sqlite), supprime la table offres et la recrée vide, puis import.
 *
 * Usage:
 *   npm run import:offres-airtable-vers-sqlite
 *   npm run import:offres-airtable-vers-sqlite -- --dry-run
 */
import '../utils/load-env-local.js';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getDataDirForApp } from '../utils/data-dir.js';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { initOffresRepository } from '../utils/repository-offres-sqlite.js';
import { reprendreOffresAirtableVersSqlite } from '../utils/reprise-offres-airtable-vers-sqlite.js';

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const dataDir = getDataDirForApp();
  const airtable = lireAirTable(dataDir);
  if (!airtable?.base?.trim() || !airtable?.offres?.trim()) {
    throw new Error('Base ou table Offres manquante dans data/parametres.json (section airtable)');
  }
  const apiKey = (airtable.apiKey ?? '').trim();
  if (!apiKey) {
    throw new Error('Clé API Airtable manquante (configurer Airtable dans Paramètres)');
  }
  const baseId = normaliserBaseId(airtable.base);
  const offresId = airtable.offres.trim();
  const dbPath = join(dataDir, 'offres.sqlite');

  if (dryRun) {
    console.log('--dry-run : config OK (base=%s, table=%s, db=%s). Aucun appel API.', baseId, offresId, dbPath);
    return;
  }

  if (existsSync(dbPath)) {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}`;
    const dumpPath = join(dataDir, `offres-${ts}.sqlite`);
    copyFileSync(dbPath, dumpPath);
    console.log('Sauvegarde : %s', dumpPath);
  }

  const repository = initOffresRepository(dbPath);
  try {
    repository.dropAndRecreateTable();
    const result = await reprendreOffresAirtableVersSqlite({
      apiKey,
      baseId,
      offresId,
      repository,
    });
    if (!result.ok) {
      throw new Error(result.message ?? 'Reprise échouée');
    }
    const count = repository.getAll().length;
    console.log('Reprise terminée : %d offres dans %s', count, dbPath);
    if (result.totalRecus != null) {
      console.log('API Airtable : %d enregistrement(s) reçu(s)%s.', result.totalRecus, result.echecs ? `, ${result.echecs} échec(s) upsert` : '');
      if (result.echecs && result.idsEchecs?.length) {
        console.log('IDs en échec (max 20) : %s', result.idsEchecs.join(', '));
      }
    }
  } finally {
    repository.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
