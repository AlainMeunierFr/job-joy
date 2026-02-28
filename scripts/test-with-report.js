/**
 * Lance la suite de tests Jest et, en cas d'échec, écrit tout le sorti dans
 * un fichier rapport que tu peux passer en paramètre (ex. à Cursor : @rapport-erreurs-tests.txt).
 *
 * Usage:
 *   node scripts/test-with-report.js
 *   npm run test:report
 *
 * En cas d'échec, le rapport est écrit dans rapport-erreurs-tests.txt à la racine du projet.
 * Le chemin du fichier est affiché en fin d'exécution.
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'rapport-erreurs-tests.txt');

const jest = spawn('npx', ['jest', ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
});

let stdout = '';
let stderr = '';

jest.stdout.on('data', (chunk) => {
  const s = chunk.toString();
  stdout += s;
  process.stdout.write(chunk);
});

jest.stderr.on('data', (chunk) => {
  const s = chunk.toString();
  stderr += s;
  process.stderr.write(chunk);
});

jest.on('close', (code) => {
  if (code !== 0) {
    const report = [
      '# Rapport d\'erreurs des tests',
      '',
      `Date: ${new Date().toISOString()}`,
      `Code de sortie: ${code}`,
      '',
      '--- stdout ---',
      stdout,
      '',
      '--- stderr ---',
      stderr,
    ].join('\n');
    writeFileSync(REPORT_PATH, report, 'utf-8');
    console.error(`\n[Rapport écrit] ${REPORT_PATH}`);
    console.error('Tu peux le passer en paramètre, ex. : @rapport-erreurs-tests.txt');
  }
  process.exit(code ?? 1);
});

jest.on('error', (err) => {
  console.error('Erreur lors du lancement de Jest:', err);
  process.exit(1);
});
