#!/usr/bin/env node
import '../utils/load-env-local.js';
/**
 * Configuration Airtable en ligne de commande (même flux que l’app, US-1.3).
 * Bases Free : créer la base dans Airtable, renseigner son URL dans parametres.json > airtable.base.
 *
 * Usage: npm run cli:configuration-airtable
 *
 * Source unique : data/parametres.json (section airtable : apiKey, base).
 */
import { join } from 'node:path';
import {
  executerConfigurationAirtable,
  libelleStatutConfigurationAirtable,
} from '../utils/configuration-airtable.js';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { airtableDriverParDefaut } from '../utils/airtable-driver-par-defaut.js';
import { createAirtableDriverReel } from '../utils/airtable-driver-reel.js';
import { normaliserBaseId } from '../utils/airtable-url.js';

const DATA_DIR = join(process.cwd(), 'data');

async function main(): Promise<void> {
  const airtable = lireAirTable(DATA_DIR);
  const apiKey = airtable?.apiKey || '';
  const baseUrlOuId = airtable?.base || '';
  const baseId = baseUrlOuId ? normaliserBaseId(baseUrlOuId) : '';

  const driver = baseId
    ? createAirtableDriverReel({ baseId: baseUrlOuId })
    : airtableDriverParDefaut;

  const result = await executerConfigurationAirtable(apiKey, DATA_DIR, driver);
  const libelle = libelleStatutConfigurationAirtable(result);
  console.log(libelle);
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error('Erreur avec AirTable :', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
