#!/usr/bin/env node
/**
 * Démarre le serveur pour les tests BDD.
 * Données compte en RAM uniquement (BDD_IN_MEMORY_STORE=1), aucun fichier écrasé.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

process.env.PORT = process.env.PORT ?? '3011';
process.env.BDD_MOCK_CONNECTEUR = '1';
process.env.BDD_IN_MEMORY_STORE = '1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '..', 'app', 'server.js');
await import(pathToFileURL(serverPath).href);
