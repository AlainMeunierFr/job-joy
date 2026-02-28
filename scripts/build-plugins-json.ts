#!/usr/bin/env node
/**
 * Génère docs/plugins-list.json à partir des plugins source (même donnée que getListeSourcesPourAvantPropos).
 * Utilisé pour afficher la liste des plugins sur la page docs/telecharger.html (GitHub Pages) via chargement JSON côté client.
 * Exécuté après tsc dans "npm run build".
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getListeSourcesPourAvantPropos } from '../utils/source-plugins.js';

const projectRoot = process.cwd();
const outPath = join(projectRoot, 'docs', 'plugins-list.json');
const data = getListeSourcesPourAvantPropos();
writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
