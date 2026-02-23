#!/usr/bin/env node
import '../utils/load-env-local.js';
import { join } from 'node:path';
import { runEnrichissementBackground } from './run-enrichissement-background.js';

const DATA_DIR = join(process.cwd(), 'data');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce(): Promise<boolean> {
  const result = await runEnrichissementBackground(DATA_DIR);
  if (!result.ok) {
    console.error(result.message);
    return false;
  }
  console.log(
    `Enrichissement background: candidats=${result.nbCandidates}, eligibles=${result.nbEligibles}, enrichies=${result.nbEnrichies}, echecs=${result.nbEchecs}`
  );
  result.messages.forEach((m) => console.log('  -', m));
  return true;
}

async function runDaemon(intervalMs: number): Promise<void> {
  console.log(`Worker enrichissement lance (intervalle=${intervalMs}ms).`);
  while (true) {
    await runOnce();
    await sleep(intervalMs);
  }
}

async function main(): Promise<void> {
  const mode = (process.argv[2] ?? 'once').toLowerCase();
  if (mode === 'watch' || mode === 'daemon') {
    const intervalMs = Number(process.argv[3] ?? '30000');
    await runDaemon(Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 30000);
    return;
  }

  const ok = await runOnce();
  process.exitCode = ok ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
