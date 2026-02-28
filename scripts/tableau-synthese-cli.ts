#!/usr/bin/env node
/**
 * Appelle l'API tableau de synthèse (même handler que GET /api/tableau-synthese-offres)
 * et affiche la réponse JSON. Même accès aux données que le serveur (source unique).
 *
 * Usage: npm run cli:tableau-synthese
 */
import '../utils/load-env-local.js';
import { mkdirSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { handleGetTableauSyntheseOffres } from '../app/api-handlers.js';
import { getDataDirForApp } from '../utils/data-dir.js';

const DATA_DIR = (() => {
  const dir = getDataDirForApp();
  mkdirSync(dir, { recursive: true });
  return dir;
})();

const res = {
  body: '',
  statusCode: 0,
  writeHead(code: number) {
    this.statusCode = code;
  },
  end(chunk: unknown) {
    this.body = typeof chunk === 'string' ? chunk : String(chunk);
  },
} as ServerResponse & { body: string; statusCode: number };

await handleGetTableauSyntheseOffres(DATA_DIR, res);
try {
  console.log(JSON.stringify(JSON.parse(res.body), null, 2));
} catch {
  console.log(res.body);
}
