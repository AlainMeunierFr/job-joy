#!/usr/bin/env node
/**
 * US-3.11 : CLI pour incrémenter la version dans package.json (utilisable par Menu.ps1).
 * Usage: node dist/scripts/bump-version-cli.js [major|schema|feature|hotfix]
 * Ne fait pas de git (reste dans Menu.ps1).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bumpVersion, type BumpType } from '../utils/bump-version.js';

const VALID_TYPES: BumpType[] = ['major', 'schema', 'feature', 'hotfix'];

function main(): void {
  const type = process.argv[2];
  if (!type || !VALID_TYPES.includes(type as BumpType)) {
    console.error('Usage: node bump-version-cli.js <major|schema|feature|hotfix>');
    process.exit(1);
  }

  const cwd = process.cwd();
  const path = join(cwd, 'package.json');
  const raw = readFileSync(path, 'utf-8');
  const pkg = JSON.parse(raw) as { version?: string };

  const current = pkg.version ?? '0.0.0.0';
  const next = bumpVersion(current, type as BumpType);
  pkg.version = next;

  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log(next);
}

main();
