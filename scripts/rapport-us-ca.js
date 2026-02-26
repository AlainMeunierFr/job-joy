/**
 * Rapport US / CA : compare les User Stories au code via la chaîne CA → BDD → steps → code.
 * Produit un fichier TSV avec : Dossier sprint, Numéro US, Titre US, Nb CA, Nb CA Done, Doing, ToDo, Old.
 *
 * Usage:
 *   node scripts/rapport-us-ca.js [--results=test-results.json] [--out=rapport-us-ca.tsv]
 *
 * Sans --results : Done/Doing/ToDo sont déduits des scénarios BDD uniquement (scénario présent = Doing si pas de résultats).
 * Avec --results : utilise le JSON Playwright (npx playwright test --reporter=json > test-results.json).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SPRINTS_DIR = path.join(ROOT, '.cursor', 'sprints');
const BDD_DIR = path.join(ROOT, 'tests', 'bdd');

// ----- Parsing US -----
function listUsFiles() {
  const files = [];
  if (!fs.existsSync(SPRINTS_DIR)) return files;
  for (const sprintDir of fs.readdirSync(SPRINTS_DIR)) {
    const full = path.join(SPRINTS_DIR, sprintDir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const name of fs.readdirSync(full)) {
      if (name.startsWith('US-') && name.endsWith('.md') && !name.includes('Rapport')) {
        files.push({ sprintDir, fullPath: path.join(full, name), name });
      }
    }
  }
  return files;
}

function parseUsFile(fullPath, sprintDir, name) {
  const raw = fs.readFileSync(fullPath, 'utf8');
  // Numéro US : fichier US-1.01 ou US-3.16 -> 1.01, 3.16 ; ou première ligne # US-1.1 ou #### US-1.1
  const matchFile = name.match(/US-(\d+\.\d+)/i);
  const usNum = matchFile ? matchFile[1] : '';
  const firstLine = raw.split('\n')[0] || '';
  const contentNumMatch = firstLine.match(/US-(\d+\.\d+)/i);
  const contentNum = contentNumMatch ? contentNumMatch[1] : usNum;
  const titleMatch = firstLine.match(/^#+\s*(?:US-\d+\.\d+[:\s—\-]*)?(.+)$/);
  const title = (titleMatch ? titleMatch[1].trim() : name.replace(/^US-\d+\.\d+\s*-\s*/, '').replace('.md', ''));
  const caIds = [...new Set((raw.match(/\*\*CA(\d+)\b|-\s*\*\*CA(\d+)\b|###\s*CA(\d+)\b|# --- CA(\d+)\b/gi) || [])
    .map(m => {
      const n = m.match(/\d+/);
      return n ? parseInt(n[0], 10) : null;
    })
    .filter(Boolean)
    .sort((a, b) => a - b))];
  const countCa = (raw.match(/\*\*CA\d+/gi) || []).length;
  const uniq = [...new Set(caIds)];
  const caCount = uniq.length || countCa || 1;
  return {
    sprintDir,
    usNum: usNum || contentNum,
    contentNum,
    title: title.slice(0, 200),
    caCount,
    caIds: uniq.length ? uniq : Array.from({ length: Math.max(1, caCount) }, (_, i) => i + 1),
  };
}

// ----- Parsing Features -----
function listFeatureFiles() {
  if (!fs.existsSync(BDD_DIR)) return [];
  return fs.readdirSync(BDD_DIR)
    .filter(n => n.endsWith('.feature'))
    .map(n => ({ name: n, base: n.replace('.feature', ''), fullPath: path.join(BDD_DIR, n) }));
}

const FEATURE_TO_US = {
  'configuration-compte-email': '1.1',
  'configuration-airtable': '1.3',
  'offres-emails-linkedin': '1.4',
  'redirection-parametres-config-incomplete': '1.6',
  'tableau-synthese-offres': '1.7',
  'offres-emails-hellowork': '1.8',
  'offres-emails-welcome-to-the-jungle': '1.10',
  'offres-emails-job-that-make-sense': '1.11',
  'offres-emails-cadreemploi': '1.12',
  'configuration-claudecode': '2.2',
  'parametrage-ia': '2.1',
  'prompt-ia': '2.3',
  'configuration-claudecode-test': '2.4',
  'comptage-appels-api': '2.5',
  'justifications-rehibitoires': '3.2',
  'sources-phases-activation': '3.1',
  'reorganisation-traitements': '3.5',
  'log-appels-api-intention': '3.4',
  'audit-dossier-email': '3.3',
  'gouvernance-sources-emails': '3.1',
  'single-instance': '3.12',
  'publication-application-electron': '3.6',
  'identification-utilisateurs': '3.15',
  'prerequis-enrichissement-electron': '4.6',
  'introduction-parametrage': '4.5',
};

function parseFeatureFile(fullPath, featureBase) {
  const raw = fs.readFileSync(fullPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  let featureUs = FEATURE_TO_US[featureBase] || null;
  const scenarioToCa = [];
  let currentCa = null;
  let currentUsTag = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tagUs = line.match(/@us-(\d+\.\d+)/i);
    if (tagUs) currentUsTag = tagUs[1];
    if (i <= 2 && currentUsTag) featureUs = currentUsTag;
    const caComment = line.match(/#\s*---\s*CA(\d+)\s*[:\/]|#\s*CA(\d+)\s*[:\.]/i) || line.match(/#\s*CA(\d+)\s*:/);
    if (caComment) {
      const n = parseInt(caComment[1] || caComment[2], 10);
      if (!isNaN(n)) currentCa = n;
    }
    const scenarioMatch = line.match(/^\s*Scénario:\s*(.+)$|^\s*Plan du Scénario:\s*(.+)$/);
    if (scenarioMatch && currentCa != null) {
      const title = (scenarioMatch[1] || scenarioMatch[2] || '').trim();
      scenarioToCa.push({ title, caNum: currentCa, usFromTag: currentUsTag || featureUs });
    }
  }
  return { featureUs, scenarioToCa };
}

// ----- Build (us, ca) -> scenarios count and step file exists -----
function buildBddCoverage() {
  const featureFiles = listFeatureFiles();
  const usCaToScenarios = {}; // key "usNum.caNum" -> { count, featureBases[], stepFileExists }
  const featureToUs = {};
  for (const { base, fullPath } of featureFiles) {
    const { featureUs, scenarioToCa } = parseFeatureFile(fullPath, base);
    featureToUs[base] = featureUs;
    const stepPath = path.join(BDD_DIR, `${base}.steps.ts`);
    const stepFileExists = fs.existsSync(stepPath);
    for (const { title, caNum, usFromTag } of scenarioToCa) {
      const u = usFromTag || featureUs || '';
      if (!u) continue;
      const key = `${u}.${caNum}`;
      if (!usCaToScenarios[key]) usCaToScenarios[key] = { count: 0, featureBases: [], stepFileExists: false };
      usCaToScenarios[key].count++;
      if (!usCaToScenarios[key].featureBases.includes(base)) usCaToScenarios[key].featureBases.push(base);
      usCaToScenarios[key].stepFileExists = usCaToScenarios[key].stepFileExists || stepFileExists;
    }
  }
  return { usCaToScenarios, featureToUs };
}

// ----- Playwright JSON results (optional) -----
function parsePlaywrightJson(resultsPath) {
  const raw = fs.readFileSync(resultsPath, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  // Playwright JSON: suites[].file ou .specs[].file, tests[].results[].status
  const passedBySpec = {};
  function walk(suites, parentFile) {
    if (!Array.isArray(suites)) return;
    for (const s of suites) {
      const file = s.file || parentFile || '';
      const base = file ? path.basename(file, path.extname(file)).replace(/\.spec$/, '') : '';
      if (s.specs) {
        for (const spec of s.specs) {
          const specFile = spec.file || file || '';
          let specBase = specFile ? path.basename(specFile, path.extname(specFile)).replace(/\.spec$/, '') : base;
          if (specBase.endsWith('.feature')) specBase = specBase.slice(0, -8);
          const key = specBase || base || 'unknown';
          if (!passedBySpec[key]) passedBySpec[key] = { passed: 0, failed: 0 };
          if (spec.tests) {
            for (const t of spec.tests) {
              const ok = t.results && t.results.every(r => r.status === 'passed');
              if (ok) passedBySpec[key].passed++;
              else passedBySpec[key].failed++;
            }
          }
        }
      }
      if (s.suites) walk(s.suites, file || parentFile);
    }
  }
  if (data.suites) walk(data.suites);
  return passedBySpec;
}

// ----- Aggregate status per (us, ca) -----
function aggregateStatus(usList, usCaToScenarios, passedBySpec, featureToUs) {
  const statusByUsCa = {}; // "usNum.caNum" -> { done, doing, todo, old }
  for (const us of usList) {
    for (const caNum of us.caIds) {
      const key = `${us.contentNum || us.usNum}.${caNum}`;
      const cov = usCaToScenarios[key];
      const scenariosCount = cov ? cov.count : 0;
      const stepExists = cov ? cov.stepFileExists : false;
      let done = 0, doing = 0, todo = 0, old = 0;
      if (scenariosCount === 0) {
        todo = 1;
      } else {
        if (passedBySpec && cov && cov.featureBases && cov.featureBases.length) {
          let passed = 0, failed = 0;
          for (const base of cov.featureBases) {
            const p = passedBySpec[base];
            if (p) { passed += p.passed; failed += p.failed; }
          }
          if (passed > 0 && failed === 0) done = 1;
          else if (failed > 0 || (passed > 0 && failed > 0)) doing = 1;
          else doing = 1; // scenarios exist but no result
        } else {
          doing = 1;
        }
      }
      statusByUsCa[key] = { done, doing, todo, old };
    }
  }
  return statusByUsCa;
}

// ----- Main -----
function main() {
  const args = process.argv.slice(2);
  let resultsPath = null;
  let outPath = path.join(ROOT, 'rapport-us-ca.tsv');
  for (const a of args) {
    if (a.startsWith('--results=')) resultsPath = a.slice('--results='.length);
    if (a.startsWith('--out=')) outPath = a.slice('--out='.length);
  }

  const usFiles = listUsFiles();
  const usList = usFiles.map(({ sprintDir, fullPath, name }) => parseUsFile(fullPath, sprintDir, name))
    .filter(u => u.usNum);

  const { usCaToScenarios, featureToUs } = buildBddCoverage();

  let passedBySpec = null;
  if (resultsPath && fs.existsSync(resultsPath)) {
    passedBySpec = parsePlaywrightJson(resultsPath);
  }

  const statusByUsCa = aggregateStatus(usList, usCaToScenarios, passedBySpec, featureToUs);

  const rows = [];
  const sep = '\t';
  const header = [
    'Dossier du sprint',
    'Numéro US',
    'Titre de l\'US',
    'Nombre de CA',
    'Nombre de CA Done',
    'Nombre de CA Doing',
    'Nombre de CA ToDo',
    'Nombre de CA Old',
  ].join(sep);
  rows.push(header);

  for (const us of usList) {
    let done = 0, doing = 0, todo = 0, old = 0;
    for (const caNum of us.caIds) {
      const key = `${us.contentNum || us.usNum}.${caNum}`;
      const s = statusByUsCa[key] || { done: 0, doing: 0, todo: 1, old: 0 };
      done += s.done;
      doing += s.doing;
      todo += s.todo;
      old += s.old;
    }
    const row = [
      us.sprintDir,
      us.usNum,
      us.title.replace(/\t/g, ' '),
      us.caIds.length,
      done,
      doing,
      todo,
      old,
    ].join(sep);
    rows.push(row);
  }

  const tsv = rows.join('\r\n');
  fs.writeFileSync(outPath, tsv, 'latin1');
  console.log('Rapport écrit :', outPath);
  if (!resultsPath) {
    console.log('Astuce : pour Done/Doing basés sur les tests, exécutez :');
    console.log('  npx playwright test --reporter=json > test-results.json');
    console.log('  node scripts/rapport-us-ca.js --results=test-results.json');
  }
}

main();
