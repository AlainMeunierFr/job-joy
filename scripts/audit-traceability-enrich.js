/**
 * Enrichit data/audit-traceability.json avec des liens sémantiques (commentaires code → US/CA).
 * À lancer après le script d'audit (option 7 du menu) ou via commande /audit-code.
 * Prérequis : le JSON doit être au format linkedIdsAmont / linkedIdsAval (généré par option 7 ou après migration).
 * Lit audit-traceability.json, ajoute les liens ci-dessous, recalcule orphelins, réécrit le fichier.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const AUDIT_PATH = path.join(DATA_DIR, 'audit-traceability.json');

/** Liens sémantiques : artefact (code/TU/TI) → [us/ca ids]. Preuves : commentaires ou noms de fichiers. */
const SEMANTIC_LINKS = {
  // Code app (commentaires en-tête ou dans le code)
  'code:app:server.ts': ['us:1.02'],
  'code:app:layout-html.ts': ['us:1.02', 'us:1.06', 'us:1.07', 'us:3.16', 'us:3.3', 'us:3.5'],
  'code:app:page-html.ts': ['us:1.01', 'us:1.06', 'us:2.1', 'us:2.2', 'us:2.3', 'us:2.4', 'us:3.15'],
  'code:app:api-handlers.ts': ['us:1.01', 'us:1.03', 'us:1.07', 'us:1.13', 'us:2.4', 'us:2.5', 'us:3.1', 'us:3.3', 'us:3.4', 'us:3.15', 'us:4.6'],
  'code:utils:envoi-identification-airtable.ts': ['us:3.15'],
  'code:utils:compte-io.ts': ['us:3.15'],
  // TU qui citent explicitement des US
  'tu:app:layout-html.test.ts': ['us:1.06', 'us:3.16', 'us:3.5', 'us:1.07', 'us:1.13', 'us:2.5', 'us:3.3'],
  'tu:app:page-html.a-propos.test.ts': ['us:3.16'],
  'tu:app:page-html.claudecode.test.ts': ['us:2.2', 'us:2.4', 'us:3.2'],
  'tu:utils:extraction-offres-email.test.ts': ['us:1.05', 'us:1.09', 'us:1.10', 'us:1.11', 'us:1.12'],
  // TI
  'ti:connecteur-email-imap.integration.test': ['us:3.17'],
  'ti:configuration-airtable.integration.test': ['us:1.03'],
};

/** Lien code/TU/TI → US : from a en aval to (US), to a from en amont. */
function addLink(artefacts, fromId, toId) {
  const from = artefacts[fromId];
  const to = artefacts[toId];
  if (!from || !to) return;
  if (!from.linkedIdsAmont.includes(toId)) from.linkedIdsAmont.push(toId);
  if (!to.linkedIdsAval.includes(fromId)) to.linkedIdsAval.push(fromId);
}

function computeOrphan(type, linkedIdsAmont, linkedIdsAval) {
  const noAval = !linkedIdsAval || linkedIdsAval.length === 0;
  const noAmont = !linkedIdsAmont || linkedIdsAmont.length === 0;
  if (['us', 'ca', 'feature', 'step'].includes(type)) return noAval;
  if (type === 'scenario') return true;
  if (type === 'tu' || type === 'ti') return noAmont || noAval;
  if (type === 'code') return noAmont;
  return true;
}

function recomputeOrphans(artefacts) {
  for (const a of Object.values(artefacts)) {
    a.orphan = computeOrphan(a.type, a.linkedIdsAmont, a.linkedIdsAval);
  }
}

function main() {
  const raw = fs.readFileSync(AUDIT_PATH, 'utf8');
  const data = JSON.parse(raw);

  for (const [artefactId, targetIds] of Object.entries(SEMANTIC_LINKS)) {
    for (const toId of targetIds) {
      addLink(data.artefacts, artefactId, toId);
    }
  }

  recomputeOrphans(data.artefacts);
  data.generatedAt = new Date().toISOString();

  fs.writeFileSync(AUDIT_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('Audit enrichi (liens sémantiques + orphelins recalculés) :', AUDIT_PATH);
}

main();
