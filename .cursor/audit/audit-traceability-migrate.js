/**
 * Migration : ancien format (linkedIds) → nouveau format (linkedIdsAmont, linkedIdsAval).
 * Recalcule aussi orphan avec la règle "coupe la chaîne".
 * Usage : node scripts/audit-traceability-migrate.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const AUDIT_PATH = path.join(DATA_DIR, 'audit-traceability.json');

const AMONT_BY_TYPE = {
  us: [],
  ca: ['us'],
  feature: ['us', 'ca'],
  step: ['feature'],
  scenario: [],
  tu: ['us', 'ca'],
  ti: ['us', 'ca'],
  code: ['us', 'ca'],
};
const AVAL_BY_TYPE = {
  us: ['ca', 'feature', 'step', 'tu', 'ti', 'code'],
  ca: [],
  feature: ['step'],
  step: ['code'],
  scenario: [],
  tu: ['code'],
  ti: ['code'],
  code: ['tu', 'ti'],
};

function splitLinked(artefacts, type, linkedIds) {
  const amont = [];
  const aval = [];
  (linkedIds || []).forEach((linkedId) => {
    const t = artefacts[linkedId] && artefacts[linkedId].type;
    if (t && AMONT_BY_TYPE[type] && AMONT_BY_TYPE[type].includes(t)) amont.push(linkedId);
    else if (t && AVAL_BY_TYPE[type] && AVAL_BY_TYPE[type].includes(t)) aval.push(linkedId);
  });
  return { amont, aval };
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

function main() {
  const raw = fs.readFileSync(AUDIT_PATH, 'utf8');
  const data = JSON.parse(raw);
  const artefacts = data.artefacts || {};

  const alreadyMigrated = Object.values(artefacts).some(
    (a) => Array.isArray(a.linkedIdsAmont) && Array.isArray(a.linkedIdsAval)
  );

  for (const a of Object.values(artefacts)) {
    if (alreadyMigrated) {
      a.orphan = computeOrphan(a.type, a.linkedIdsAmont, a.linkedIdsAval);
      continue;
    }
    const linkedIds = a.linkedIds || [];
    const { amont, aval } = splitLinked(artefacts, a.type, linkedIds);
    a.linkedIdsAmont = amont;
    a.linkedIdsAval = aval;
    delete a.linkedIds;
    a.orphan = computeOrphan(a.type, a.linkedIdsAmont, a.linkedIdsAval);
  }

  data.generatedAt = new Date().toISOString();
  fs.writeFileSync(AUDIT_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('Migration effectuée :', AUDIT_PATH);
}

main();
