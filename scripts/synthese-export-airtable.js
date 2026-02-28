#!/usr/bin/env node
/**
 * Synthèse à partir d'un export Airtable (TSV).
 * Usage : node scripts/synthese-export-airtable.js [fichier.tsv]
 * Si pas de fichier : lit depuis stdin (coller le bloc tabulé).
 *
 * Colonnes attendues (1ère ligne) : Étiquettes de lignes, puis statuts (A compléter, À traiter, etc.), Total général.
 * Aligne les statuts sur l'ordre du tableau de bord et affiche les totaux + comparaison si on lui passe aussi les totaux dashboard.
 */

const fs = require('fs');
const path = require('path');

const STATUTS_ORDRE = [
  'A compléter',
  'À analyser',
  'À traiter',
  'Candidaté',
  'Refusé',
  'Traité',
  'Ignoré',
  'Expiré',
  'Autre',
];

function parseTSV(content) {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split('\t'));
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0];
  const rows = lines.slice(1).map((cells) => {
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim();
    });
    return row;
  });
  return { headers, rows };
}

function normalizeStatut(name) {
  return (name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '');
}

function findStatutColumn(headers, statut) {
  const n = normalizeStatut(statut);
  for (const h of headers) {
    if (normalizeStatut(h) === n) return h;
  }
  if (statut === 'Autre') {
    const doublon = headers.find((h) => normalizeStatut(h) === 'doublon');
    if (doublon) return doublon;
  }
  return null;
}

function main() {
  let input;
  if (process.argv[2]) {
    input = fs.readFileSync(path.resolve(process.argv[2]), 'utf-8');
  } else {
    input = fs.readFileSync(0, 'utf-8');
  }

  const { headers, rows } = parseTSV(input);
  const labelCol = headers[0] || 'Étiquettes de lignes';
  const totalCol = headers.find((h) => /total/i.test(h)) || headers[headers.length - 1];

  const statutToHeader = {};
  for (const s of STATUTS_ORDRE) {
    const h = findStatutColumn(headers, s) || (s === 'Autre' ? findStatutColumn(headers, 'Doublon') : null);
    if (h) statutToHeader[s] = h;
  }

  const totauxExport = {};
  STATUTS_ORDRE.forEach((s) => (totauxExport[s] = 0));

  console.log('\n--- Synthèse export Airtable (par source) ---\n');
  console.log([labelCol, ...STATUTS_ORDRE, 'Total'].join('\t'));

  for (const row of rows) {
    const label = row[labelCol] ?? '';
    if (!label && !row[totalCol]) continue;

    const cells = [label];
    let rowTotal = 0;
    for (const s of STATUTS_ORDRE) {
      const h = statutToHeader[s];
      const val = h ? parseInt(row[h], 10) || 0 : 0;
      cells.push(val);
      rowTotal += val;
      if (label && label !== 'Total général') totauxExport[s] += val;
    }
    const totalCell = parseInt(row[totalCol], 10);
    cells.push(totalCell || rowTotal);
    console.log(cells.join('\t'));
  }

  console.log('\n--- Totaux par statut (export Airtable) ---');
  let totalGeneral = 0;
  for (const s of STATUTS_ORDRE) {
    const n = totauxExport[s] ?? 0;
    totalGeneral += n;
    console.log(`  ${s}: ${n}`);
  }
  console.log(`  Total: ${totalGeneral}`);
  console.log('');
}

main();
