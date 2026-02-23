#!/usr/bin/env node
/**
 * Copie et fusionne les CSS : design system (globals) + styles contenu → dist/app/site.css.
 * Utilisé par "npm run build" (prod). En dev (npm run dev), le serveur lit app/*.css à la volée, ce script n’est pas exécuté.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();
const appDir = join(projectRoot, 'app');
const distAppDir = join(projectRoot, 'dist', 'app');

mkdirSync(distAppDir, { recursive: true });

const designSystem = readFileSync(join(appDir, 'globals.css'), 'utf-8');
const contentStyles = readFileSync(join(appDir, 'content-styles.css'), 'utf-8');
const siteCss = `/**
 * site.css — Design system + styles communs à tout le site.
 * Généré par scripts/copy-css.ts (globals.css + content-styles.css).
 */

${designSystem}

${contentStyles}
`;
writeFileSync(join(distAppDir, 'site.css'), siteCss, 'utf-8');
