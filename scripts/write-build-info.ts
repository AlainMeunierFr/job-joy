#!/usr/bin/env node
/**
 * Écrit dist/build-info.json (version + buildTime) pour affichage dans À propos.
 * Appelé par "npm run build".
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const pkgPath = join(projectRoot, 'package.json');
const outPath = join(projectRoot, 'dist', 'build-info.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const buildInfo = {
  version: pkg.version ?? '0.0.0',
  buildTime: new Date().toISOString(),
};

mkdirSync(join(projectRoot, 'dist'), { recursive: true });
writeFileSync(outPath, JSON.stringify(buildInfo, null, 0), 'utf-8');
