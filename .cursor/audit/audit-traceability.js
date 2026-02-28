/**
 * Audit de traçabilité : artefacts + liens non ambigus.
 * Produit data/audit-traceability.json (ou draft si --draft).
 * Le LLM peut compléter ensuite les liens sémantiques et orphelins (commande /audit-code).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SPRINTS_DIR = path.join(ROOT, '.cursor', 'sprints');
const BDD_DIR = path.join(ROOT, 'tests', 'bdd');
const APP_DIR = path.join(ROOT, 'app');
const UTILS_DIR = path.join(ROOT, 'utils');
const DATA_DIR = path.join(ROOT, 'data');

/** Normalise un tag US (ex. 1.1 → 1.01) pour aligner avec les noms de fichiers US-X.YY. Évite les doublons us:1.01 / us:1.1. */
function normalizeUsTag(tag) {
  if (!tag || typeof tag !== 'string') return tag;
  const parts = tag.split('.');
  if (parts.length !== 2) return tag;
  const minor = parts[1];
  const minorNum = parseInt(minor, 10);
  if (Number.isNaN(minorNum)) return tag;
  const minorStr = minor.length === 1 && minorNum < 10 ? '0' + minor : minor;
  return parts[0] + '.' + minorStr;
}

function collectArtifacts() {
  const artefacts = {};
  const byType = { us: [], ca: [], feature: [], step: [], scenario: [], tu: [], ti: [], code: [] };

  // ---- US ----
  if (fs.existsSync(SPRINTS_DIR)) {
    for (const sprintDir of fs.readdirSync(SPRINTS_DIR)) {
      const full = path.join(SPRINTS_DIR, sprintDir);
      if (!fs.statSync(full).isDirectory()) continue;
      for (const name of fs.readdirSync(full)) {
        if (!name.startsWith('US-') || !name.endsWith('.md') || name.includes('Rapport')) continue;
        const fullPath = path.join(full, name);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const matchFile = name.match(/US-(\d+\.\d+)/i);
        const usNum = matchFile ? matchFile[1] : '';
        const firstLine = raw.split('\n')[0] || '';
        const titleMatch = firstLine.match(/^#+\s*(?:US-\d+\.\d+[:\s—\-]*)?(.+)$/);
        const title = (titleMatch ? titleMatch[1].trim() : name.replace(/^US-\d+\.\d+\s*-\s*/, '').replace('.md', ''));
        const caMatches = raw.match(/\*\*CA(\d+)\b|# --- CA(\d+)\b/gi) || [];
        const caIds = [...new Set(caMatches.map(m => m.match(/\d+/)?.[0]).filter(Boolean).map(Number).sort((a, b) => a - b))];
        const caTitlesByNum = {};
        const caTitleRegex = /\*\*CA(\d+)\s*[–\-]\s*([^*\n]+?)(?:\s*\*\*|$)/gm;
        let m;
        while ((m = caTitleRegex.exec(raw)) !== null) {
          const num = parseInt(m[1], 10);
          const tit = m[2].trim().replace(/\s+/g, ' ').slice(0, 200);
          if (tit && (!caTitlesByNum[num] || tit.length > (caTitlesByNum[num] || '').length)) caTitlesByNum[num] = tit;
        }
        const id = `us:${usNum}`;
        const caList = caIds.map((n) => `ca:${usNum}.${n}`);
        artefacts[id] = {
          id,
          type: 'us',
          name: `US-${usNum}`,
          description: title.slice(0, 300),
          linkedIdsAmont: [],
          linkedIdsAval: caList,
          orphan: false,
        };
        byType.us.push(id);
        for (const n of caIds) {
          const caId = `ca:${usNum}.${n}`;
          const caDesc = caTitlesByNum[n] || `Critère d'acceptation ${n} de US-${usNum}`;
          if (!artefacts[caId]) {
            artefacts[caId] = {
              id: caId,
              type: 'ca',
              name: `CA${n}`,
              description: caDesc,
              linkedIdsAmont: [id],
              linkedIdsAval: [],
              orphan: false,
            };
            byType.ca.push(caId);
          } else {
            if (!artefacts[caId].linkedIdsAmont.includes(id)) artefacts[caId].linkedIdsAmont.push(id);
            if (caTitlesByNum[n] && artefacts[caId].description === `Critère d'acceptation ${n} de US-${usNum}`) {
              artefacts[caId].description = caDesc;
            }
          }
        }
      }
    }
  }

  // ---- Features BDD ----
  const FEATURE_TO_US = {
    'configuration-compte-email': '1.1', 'configuration-airtable': '1.3', 'offres-emails-linkedin': '1.4',
    'redirection-parametres-config-incomplete': '1.6', 'tableau-synthese-offres': '1.7', 'offres-emails-hellowork': '1.8',
    'offres-emails-welcome-to-the-jungle': '1.10', 'offres-emails-job-that-make-sense': '1.11', 'offres-emails-cadreemploi': '1.12',
    'configuration-claudecode': '2.2', 'parametrage-ia': '2.1', 'prompt-ia': '2.3', 'configuration-claudecode-test': '2.4',
    'comptage-appels-api': '2.5', 'justifications-rehibitoires': '3.2', 'sources-phases-activation': '3.1',
    'reorganisation-traitements': '3.5', 'log-appels-api-intention': '3.4', 'audit-dossier-email': '3.3',
    'gouvernance-sources-emails': '3.1', 'single-instance': '3.12', 'publication-application-electron': '3.6',
    'identification-utilisateurs': '3.15', 'prerequis-enrichissement-electron': '4.6', 'introduction-parametrage': '4.5',
  };
  if (fs.existsSync(BDD_DIR)) {
    for (const name of fs.readdirSync(BDD_DIR)) {
      if (!name.endsWith('.feature')) continue;
      const base = name.replace('.feature', '');
      const fullPath = path.join(BDD_DIR, name);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const usTagRaw = raw.match(/@us-(\d+\.\d+)/i)?.[1] || FEATURE_TO_US[base];
      const usTag = usTagRaw ? normalizeUsTag(usTagRaw) : null;
      const firstLine = raw.split('\n').find(l => l.includes('Fonctionnalité:'));
      const desc = (firstLine || '').replace(/Fonctionnalité:\s*/, '').trim().slice(0, 200);
      const featId = `feature:${base}`;
      const stepId = `step:${base}`;
      const linked = [stepId];
      const amontFeat = [];
      if (usTag) {
        const usId = `us:${usTag}`;
        if (!artefacts[usId]) {
          artefacts[usId] = { id: usId, type: 'us', name: `US-${usTag}`, description: '(référencé par feature BDD)', linkedIdsAmont: [], linkedIdsAval: [], orphan: false };
          byType.us.push(usId);
        }
        amontFeat.push(usId);
        if (!artefacts[usId].linkedIdsAval.includes(featId)) artefacts[usId].linkedIdsAval.push(featId);
      }
      artefacts[featId] = {
        id: featId,
        type: 'feature',
        name: base,
        description: desc,
        linkedIdsAmont: amontFeat,
        linkedIdsAval: [stepId],
        orphan: false,
      };
      byType.feature.push(featId);
      const stepPath = path.join(BDD_DIR, `${base}.steps.ts`);
      artefacts[stepId] = {
        id: stepId,
        type: 'step',
        name: `${base}.steps.ts`,
        description: fs.existsSync(stepPath) ? 'Steps Playwright BDD' : 'Steps manquants',
        linkedIdsAmont: [featId],
        linkedIdsAval: [],
        orphan: false,
      };
      byType.step.push(stepId);
    }
  }

  // ---- TU / TI ----
  function addTestFile(relPath, type) {
    const base = path.basename(relPath, path.extname(relPath));
    const id = type === 'ti' ? `ti:${base}` : `tu:${relPath.replace(/[/\\]/g, ':')}`;
    if (artefacts[id]) return;
    const fullPath = path.join(ROOT, relPath);
    const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
    const importMatch = content.match(/import\s+.*from\s+['"](\.\.\/)*([^'"]+)['"]/g);
    const codeRefs = (importMatch || [])
      .map(m => m.replace(/.*['"](\.\.\/)*([^'"]+)['"].*/, '$2').replace(/\.js$/, '.ts'))
      .filter(p => !p.includes('.test.') && !p.includes('.steps.'));
    const codeIds = codeRefs.map(p => `code:${p.replace(/[/\\]/g, ':')}`);
    artefacts[id] = {
      id,
      type,
      name: path.basename(relPath),
      description: type === 'ti' ? 'Test d\'intégration' : 'Test unitaire',
      linkedIdsAmont: [],
      linkedIdsAval: [...new Set(codeIds)],
      orphan: false,
    };
    byType[type].push(id);
    codeIds.forEach((cid) => {
      if (!artefacts[cid]) {
        artefacts[cid] = { id: cid, type: 'code', name: cid.replace(/^code:/, ''), description: '', linkedIdsAmont: [], linkedIdsAval: [], orphan: false };
        byType.code.push(cid);
      }
      if (!artefacts[cid].linkedIdsAval.includes(id)) artefacts[cid].linkedIdsAval.push(id);
    });
  }
  function walkDir(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const rel = prefix ? `${prefix}/${name}` : name;
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        if (name !== 'node_modules' && name !== 'dist') walkDir(full, rel);
      } else if (name.endsWith('.test.ts') && !name.endsWith('.steps.ts')) {
        if (name.includes('integration')) addTestFile(rel, 'ti');
        else addTestFile(rel, 'tu');
      }
    }
  }
  walkDir(APP_DIR, 'app');
  walkDir(UTILS_DIR, 'utils');

  // ---- Fichiers code (app, utils) sans test déjà lié ----
  function addCodeFile(relPath) {
    const id = `code:${relPath.replace(/[/\\]/g, ':')}`;
    if (artefacts[id]) return;
    artefacts[id] = {
      id,
      type: 'code',
      name: path.basename(relPath),
      description: relPath,
      linkedIdsAmont: [],
      linkedIdsAval: [],
      orphan: false,
    };
    byType.code.push(id);
  }
  function walkCode(dir, prefix = '') {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const rel = prefix ? `${prefix}/${name}` : name;
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        if (name !== 'node_modules' && name !== 'dist') walkCode(full, rel);
      } else if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')) {
        addCodeFile(rel);
      }
    }
  }
  walkCode(APP_DIR, 'app');
  walkCode(UTILS_DIR, 'utils');

  // ---- Orphelins : coupe la chaîne (pas d'aval pour spec, pas d'amont pour impl) ----
  function computeOrphan(type, linkedIdsAmont, linkedIdsAval) {
    const noAval = !linkedIdsAval || linkedIdsAval.length === 0;
    const noAmont = !linkedIdsAmont || linkedIdsAmont.length === 0;
    if (['us', 'ca', 'feature', 'step'].includes(type)) return noAval;
    if (type === 'scenario') return true;
    if (type === 'tu' || type === 'ti') return noAmont || noAval;
    if (type === 'code') return noAmont;
    return true;
  }
  for (const a of Object.values(artefacts)) {
    a.orphan = computeOrphan(a.type, a.linkedIdsAmont, a.linkedIdsAval);
  }

  return {
    generatedAt: new Date().toISOString(),
    artefacts,
    byType,
  };
}

function main() {
  const draft = process.argv.includes('--draft');
  const outPath = path.join(DATA_DIR, draft ? 'audit-traceability-draft.json' : 'audit-traceability.json');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const data = collectArtifacts();
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Audit écrit :', outPath);
  if (draft) console.log('Complétez avec la commande /audit-code dans Cursor (analyse sémantique + orphelins).');
}

main();
