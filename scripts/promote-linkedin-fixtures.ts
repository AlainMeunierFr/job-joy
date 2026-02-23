#!/usr/bin/env node
import '../utils/load-env-local.js';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const sourceDir = resolve(join(process.cwd(), 'data', 'debug-linkedin'));
const targetDir = resolve(join(process.cwd(), 'test', 'exemples', 'LinkedIn'));

function normalizeName(fileName: string, index: number): string {
  const clean = fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${String(index + 1).padStart(2, '0')}-${clean.endsWith('.html') ? clean : `${clean}.html`}`;
}

function main(): void {
  if (!existsSync(sourceDir)) {
    console.error(`Dossier source introuvable : ${sourceDir}`);
    console.error('Capture d’abord des emails avec npm run cli:releve-offres');
    process.exit(1);
  }

  const files = readdirSync(sourceDir)
    .filter((f) => f.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.error(`Aucun fichier .html dans : ${sourceDir}`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });

  let copied = 0;
  for (let i = 0; i < files.length; i++) {
    const srcName = files[i];
    const dstName = normalizeName(srcName, i);
    copyFileSync(join(sourceDir, srcName), join(targetDir, dstName));
    copied++;
    console.log(`Fixture ajoutée: ${dstName}`);
  }

  console.log(`${copied} fixture(s) copiée(s) vers ${targetDir}`);
}

main();
