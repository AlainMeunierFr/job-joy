#!/usr/bin/env node
/**
 * Écrit dist/build-info.json (version + buildTime [+ channel preprod]) pour affichage dans À propos.
 * Appelé par "npm run build". Si JOY_PREPROD=1, ajoute channel: "preprod".
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const pkgPath = join(projectRoot, 'package.json');
const outPath = join(projectRoot, 'dist', 'build-info.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const buildInfo: { version: string; buildTime: string; channel?: string } = {
  version: pkg.version ?? '0.0.0',
  buildTime: new Date().toISOString(),
};
if (process.env.JOY_PREPROD === '1' || process.env.PREPROD === '1') {
  buildInfo.channel = 'preprod';
}

mkdirSync(join(projectRoot, 'dist'), { recursive: true });
writeFileSync(outPath, JSON.stringify(buildInfo, null, 0), 'utf-8');
