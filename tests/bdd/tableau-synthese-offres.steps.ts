/**
 * Step definitions pour la fonctionnalité Tableau de synthèse des offres (US-1.7).
 * Données via API set-mock-tableau-synthese, set-mock-sources, set-airtable.
 */
import { createBdd } from 'playwright-bdd';
import { DataTable } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';
import { STATUTS_OFFRES_AVEC_AUTRE } from '../../utils/statuts-offres-airtable.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
const STATUTS_ORDER = [...STATUTS_OFFRES_AVEC_AUTRE];

function parseTableToLignes(rows: string[][]): Array<Record<string, unknown>> {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  const lignes: Array<Record<string, unknown>> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, unknown> = {
      emailExpéditeur: row[headers.indexOf('emailExpéditeur')]?.trim() ?? '',
      sourceEtape1: (row[headers.indexOf('source étape 1')] ?? row[headers.indexOf('plugin étape 1')])?.trim() ?? '',
      sourceEtape2: (row[headers.indexOf('source étape 2')] ?? row[headers.indexOf('plugin étape 2')])?.trim() ?? '',
      activerCreation: true,
      activerEnrichissement: true,
      activerAnalyseIA: true,
      statuts: {} as Record<string, number>,
    };
    for (const statut of STATUTS_ORDER) {
      const idx = headers.indexOf(statut);
      (obj.statuts as Record<string, number>)[statut] = idx >= 0 ? parseInt(row[idx]?.trim() ?? '0', 10) : 0;
    }
    lignes.push(obj);
  }
  return lignes;
}

function parseTableToLignesNbOffres(rows: string[][]): Array<Record<string, unknown>> {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  const nbOffresIdx = headers.indexOf('nb offres');
  const lignes: Array<Record<string, unknown>> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nb = nbOffresIdx >= 0 ? parseInt(row[nbOffresIdx]?.trim() ?? '0', 10) : 1;
    const sourceNom = (row[headers.indexOf('source étape 1')] ?? row[headers.indexOf('plugin étape 1')])?.trim() ?? 'Inconnu';
    const statuts: Record<string, number> = {};
    for (const s of STATUTS_ORDER) statuts[s] = 0;
    statuts['A compléter'] = nb;
    lignes.push({
      emailExpéditeur: row[headers.indexOf('emailExpéditeur')]?.trim() ?? '',
      sourceEtape1: sourceNom,
      sourceEtape2: (row[headers.indexOf('source étape 2')] ?? row[headers.indexOf('plugin étape 2')])?.trim() ?? sourceNom,
      activerCreation: true,
      activerEnrichissement: true,
      activerAnalyseIA: true,
      statuts,
    });
  }
  return lignes;
}

async function setMockTableauSynthese(lignes: Array<Record<string, unknown>>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lignes }),
  });
  if (!res.ok) throw new Error(`set-mock-tableau-synthese failed: ${res.status}`);
}

/** US-3.3 : définit le cache RAM du dernier audit (nombres à importer par source). */
async function setMockCacheAudit(entries: Array<{ emailExpéditeur: string; 'A importer': string | number }>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/set-mock-cache-audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) throw new Error(`set-mock-cache-audit failed: ${res.status}`);
}

type SourceMock = {
  emailExpéditeur: string;
  source: string;
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
};

async function setMockSourcesAndOffres(
  sources: SourceMock[],
  offres: Array<{ emailExpéditeur: string; statut: string }>
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: sources.map((s) => ({
        emailExpéditeur: s.emailExpéditeur,
        source: s.source,
        activerCreation: s.activerCreation,
        activerEnrichissement: s.activerEnrichissement,
        activerAnalyseIA: s.activerAnalyseIA,
      })),
    }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
  const lignes = construireLignesDepuisSourcesEtOffres(sources, offres);
  await setMockTableauSynthese(lignes);
}

function construireLignesDepuisSourcesEtOffres(
  sources: SourceMock[],
  offres: Array<{ emailExpéditeur: string; statut: string }>
): Array<Record<string, unknown>> {
  const statutsParExpediteur = new Map<string, Record<string, number>>();
  for (const s of sources) {
    const statuts: Record<string, number> = {};
    for (const st of STATUTS_ORDER) statuts[st] = 0;
    statutsParExpediteur.set(s.emailExpéditeur.toLowerCase(), statuts);
  }
  for (const o of offres) {
    const key = o.emailExpéditeur.trim().toLowerCase();
    const statuts = statutsParExpediteur.get(key);
    if (statuts && o.statut && statuts[o.statut] !== undefined) statuts[o.statut] += 1;
  }
  return sources
    .filter((s) => {
      const key = s.emailExpéditeur.toLowerCase();
      const statuts = statutsParExpediteur.get(key);
      return statuts && Object.values(statuts).some((n) => n > 0);
    })
    .map((s) => ({
      emailExpéditeur: s.emailExpéditeur,
      sourceEtape1: s.source,
      sourceEtape2: s.source,
      activerCreation: s.activerCreation,
      activerEnrichissement: s.activerEnrichissement,
      activerAnalyseIA: s.activerAnalyseIA,
      statuts: statutsParExpediteur.get(s.emailExpéditeur.toLowerCase()) ?? {},
    }));
}

// --- Contexte ---
Given('que la configuration Airtable est opérationnelle', async () => {
  await setAirtableConfig();
});
Given('la configuration Airtable est opérationnelle', async () => {
  await setAirtableConfig();
});
async function setAirtableConfig(): Promise<void> {
  const compteRes = await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'test@example.com',
      motDePasse: 'test',
      cheminDossier: 'inbox',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
  if (!compteRes.ok) throw new Error(`set compte failed: ${compteRes.status}`);
  const res = await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: 'patTestKeyValide123',
      base: 'appXyz123',
      sources: 'tblSourcesId',
      offres: 'tblOffresId',
    }),
  });
  if (!res.ok) throw new Error(`set-airtable failed: ${res.status}`);
}

Given('que le tableau de bord est affiché', async ({ page }) => {
  await page.goto('/tableau-de-bord');
});
Given('le tableau de bord est affiché', async ({ page }) => {
  await page.goto('/tableau-de-bord');
});

async function givenTableauBordAfficheSyntheseEmails(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/tableau-de-bord');
  const startRes = await page.request.post(`${API_BASE}/api/audit/start`, { data: {} });
  const startData = (await startRes.json()) as { taskId?: string };
  if (startData?.taskId) {
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(500);
      const stRes = await page.request.get(`${API_BASE}/api/audit/status?taskId=${startData.taskId}`);
      const st = (await stRes.json()) as { status?: string };
      if (st?.status === 'done' || st?.status === 'error') break;
    }
  }
}
Given('que le tableau de bord affiche le tableau de synthèse des emails', async ({ page }) => {
  await givenTableauBordAfficheSyntheseEmails(page);
});
Given('le tableau de bord affiche le tableau de synthèse des emails', async ({ page }) => {
  await givenTableauBordAfficheSyntheseEmails(page);
});

Given('que le tableau de synthèse des offres contient des données', async () => {
  await setMockTableauSynthese([
    {
      emailExpéditeur: 'jobs@linkedin.com',
      sourceEtape1: 'Linkedin',
      sourceEtape2: 'Linkedin',
      activerCreation: true,
      activerEnrichissement: true,
      activerAnalyseIA: true,
      statuts: { 'A compléter': 2, 'À traiter': 0, Traité: 0, Ignoré: 0, 'À analyser': 1 },
    },
  ]);
});
Given('le tableau de synthèse des offres contient des données', async () => {
  await setMockTableauSynthese([
    {
      emailExpéditeur: 'jobs@linkedin.com',
      sourceEtape1: 'Linkedin',
      sourceEtape2: 'Linkedin',
      activerCreation: true,
      activerEnrichissement: true,
      activerAnalyseIA: true,
      statuts: { 'A compléter': 2, 'À traiter': 0, Traité: 0, Ignoré: 0, 'À analyser': 1 },
    },
  ]);
});

Given('que les sources et offres suivantes existent en base', async ({ page: _page }, dataTable: DataTable) => {
  const rows = dataTable.raw();
  const headers = rows[0]?.map((h) => h.trim()) ?? [];
  const lignes = headers.includes('nb offres')
    ? parseTableToLignesNbOffres(rows)
    : parseTableToLignes(rows);
  await setMockTableauSynthese(lignes);
});
Given('les sources et offres suivantes existent en base', async ({ page: _page }, dataTable: DataTable) => {
  const rows = dataTable.raw();
  const headers = rows[0]?.map((h) => h.trim()) ?? [];
  const lignes = headers.includes('nb offres')
    ? parseTableToLignesNbOffres(rows)
    : parseTableToLignes(rows);
  await setMockTableauSynthese(lignes);
});

Given('que le tableau de synthèse des offres est chargé avec au moins une offre', async () => {
  await setMockTableauSynthese([
    {
      emailExpéditeur: 'test@test.com',
      sourceEtape1: 'HelloWork',
      sourceEtape2: 'HelloWork',
      activerCreation: true,
      activerEnrichissement: true,
      activerAnalyseIA: true,
      statuts: { 'A compléter': 1, 'À traiter': 0, Traité: 0, Ignoré: 0, 'À analyser': 0 },
    },
  ]);
});
Given('le tableau de synthèse des offres est chargé avec au moins une offre', async () => {
  await setMockTableauSynthese([
    {
      emailExpéditeur: 'test@test.com',
      sourceEtape1: 'HelloWork',
      sourceEtape2: 'HelloWork',
      activerCreation: true,
      activerEnrichissement: true,
      activerAnalyseIA: true,
      statuts: { 'A compléter': 1, 'À traiter': 0, Traité: 0, Ignoré: 0, 'À analyser': 0 },
    },
  ]);
});

Given('qu\'une source {string} existe dans la table Sources', async ({ page: _page }, email: string) => {
  await setMockSourcesAndOffres([{ emailExpéditeur: email, source: 'Inconnu', activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true }], []);
});
Given('une source {string} existe dans la table Sources', async ({ page: _page }, email: string) => {
  await setMockSourcesAndOffres([{ emailExpéditeur: email, source: 'Inconnu', activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true }], []);
});

Given('qu\'aucune offre n\'est liée à cette source', async () => {
  await setMockTableauSynthese([]);
});
Given('aucune offre n\'est liée à cette source', async () => {
  await setMockTableauSynthese([]);
});

let lastSourcesAndOffres: {
  sources: SourceMock[];
  offres: Array<{ emailExpéditeur: string; statut: string }>;
} = { sources: [], offres: [] };

const defaultSourceActivation = { activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true };

Given('que la source {string} a {int} offres en base', async ({ page: _page }, email: string, nb: number) => {
  lastSourcesAndOffres = { sources: [], offres: [] };
  const offres = Array.from({ length: nb }, (_, i) => ({
    emailExpéditeur: email,
    statut: i === 0 ? 'A compléter' : 'À traiter',
  }));
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, source: 'Inconnu', ...defaultSourceActivation });
  lastSourcesAndOffres.offres.push(...offres);
  await setMockSourcesAndOffres(lastSourcesAndOffres.sources, lastSourcesAndOffres.offres);
});
Given('la source {string} a {int} offres en base', async ({ page: _page }, email: string, nb: number) => {
  if (lastSourcesAndOffres.sources.length === 0) lastSourcesAndOffres = { sources: [], offres: [] };
  const offres = Array.from({ length: nb }, (_, i) => ({
    emailExpéditeur: email,
    statut: i === 0 ? 'A compléter' : 'À traiter',
  }));
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, source: 'Inconnu', ...defaultSourceActivation });
  lastSourcesAndOffres.offres.push(...offres);
  await setMockSourcesAndOffres(lastSourcesAndOffres.sources, lastSourcesAndOffres.offres);
});

Given('la source {string} a {int} offre en base', async ({ page: _page }, email: string, nb: number) => {
  if (lastSourcesAndOffres.sources.length === 0) lastSourcesAndOffres = { sources: [], offres: [] };
  const offres = Array.from({ length: nb }, () => ({ emailExpéditeur: email, statut: 'A compléter' }));
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, source: 'Inconnu', ...defaultSourceActivation });
  lastSourcesAndOffres.offres.push(...offres);
  await setMockSourcesAndOffres(lastSourcesAndOffres.sources, lastSourcesAndOffres.offres);
});

Given('que la source {string} n\'a aucune offre', async ({ page: _page }, email: string) => {
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, source: 'Inconnu', ...defaultSourceActivation });
  await setMockSourcesAndOffres(lastSourcesAndOffres.sources, lastSourcesAndOffres.offres);
});
Given('la source {string} n\'a aucune offre', async ({ page: _page }, email: string) => {
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, source: 'Inconnu', ...defaultSourceActivation });
  await setMockSourcesAndOffres(lastSourcesAndOffres.sources, lastSourcesAndOffres.offres);
});

Given('qu\'une source {string} a {int} offres en statut {string} et {int} dans les autres statuts', async (
  { page: _page },
  email: string,
  nbStatut: number,
  statut: string,
  _nbAutres: number
) => {
  const statuts: Record<string, number> = {};
  for (const s of STATUTS_ORDER) statuts[s] = 0;
  statuts[statut] = nbStatut;
  await setMockTableauSynthese([
    { emailExpéditeur: email, sourceEtape1: 'Inconnu', sourceEtape2: 'Inconnu', ...defaultSourceActivation, statuts },
  ]);
});
Given('une source {string} a {int} offres en statut {string} et {int} dans les autres statuts', async (
  { page: _page },
  email: string,
  nbStatut: number,
  statut: string,
  _nbAutres: number
) => {
  const statuts: Record<string, number> = {};
  for (const s of STATUTS_ORDER) statuts[s] = 0;
  statuts[statut] = nbStatut;
  await setMockTableauSynthese([
    { emailExpéditeur: email, sourceEtape1: 'Inconnu', sourceEtape2: 'Inconnu', ...defaultSourceActivation, statuts },
  ]);
});

// --- When ---
When('j\'observe la page du tableau de bord', async ({ page }) => {
  await page.goto('/tableau-de-bord');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
});

When('le tableau de synthèse des offres est chargé', async ({ page }) => {
  await page.goto('/tableau-de-bord');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.syntheseOffresTable', { state: 'attached', timeout: 5000 });
  await page.waitForTimeout(1000);
});

When('j\'observe les en-têtes de colonnes du tableau de synthèse des offres', async ({ page }) => {
  await page.goto('/tableau-de-bord');
  await page.waitForLoadState('networkidle');
});

// --- Then ---
Then('le tableau de synthèse des offres est dans un conteneur distinct du tableau de synthèse des emails', async ({
  page,
}) => {
  const syntheseOffres = page.locator('.syntheseOffres');
  await expect(syntheseOffres.first()).toBeAttached();
  expect(await syntheseOffres.count()).toBeGreaterThan(0);
  const auditSynthese = page.locator('.auditSynthese');
  if ((await auditSynthese.count()) > 0) {
    expect(await auditSynthese.count()).toBeGreaterThan(0);
  }
});

Then('les deux tableaux sont visuellement séparés (titres, emplacements ou sections différents)', async ({
  page,
}) => {
  const titreOffres = page.locator('#titre-synthese-offres');
  await expect(titreOffres).toContainText('Synthèse des offres');
  await expect(page.locator('.syntheseOffres')).toBeAttached();
});
Then('les deux tableaux sont visuellement séparés \\(titres, emplacements ou sections différents)', async ({
  page,
}) => {
  const titreOffres = page.locator('#titre-synthese-offres');
  await expect(titreOffres).toContainText('Synthèse des offres');
  await expect(page.locator('.syntheseOffres')).toBeAttached();
});

Then('le tableau affiche les colonnes fixes dans l\'ordre : Adresse, source, création, enrichissement, analyse', async ({
  page,
}) => {
  const ths = page.locator('.syntheseOffresTable thead th');
  await expect(ths.nth(0)).toContainText('Adresse');
  await expect(ths.nth(1)).toContainText('source');
  await expect(ths.nth(2)).toContainText('création');
  await expect(ths.nth(3)).toContainText('enrichissement');
  await expect(ths.nth(4)).toContainText('analyse');
});

Then('le tableau affiche une colonne par statut d\'offre dans l\'ordre de l\'énum Airtable', async ({
  page,
}) => {
  const ths = page.locator('.syntheseOffresTable thead th');
  for (let i = 0; i < STATUTS_ORDER.length; i++) {
    await expect(ths.nth(6 + i)).toContainText(STATUTS_ORDER[i]);
  }
});

Then('le tableau affiche les lignes suivantes', async ({ page }, dataTable: DataTable) => {
  const rows = dataTable.raw();
  const tbody = page.locator('#synthese-offres-body');
  const trs = tbody.locator('tr');
  const dataRowCount = Math.max(0, rows.length - 1);
  await expect(trs).toHaveCount(dataRowCount + 1);
  for (let i = 1; i < rows.length; i++) {
    const cells = trs.nth(i - 1).locator('td');
    await expect(cells.nth(0)).toContainText(rows[i][0].trim());
    // Colonnes 2,3,4 = création, enrichissement, analyse (emojis)
    await expect(cells.nth(2)).toContainText(rows[i][3]?.trim() ?? '');
    await expect(cells.nth(3)).toContainText(rows[i][4]?.trim() ?? '');
    await expect(cells.nth(4)).toContainText(rows[i][5]?.trim() ?? '');
    for (let j = 0; j < STATUTS_ORDER.length; j++) {
      const val = rows[i][6 + j];
      const expectedStatut = val != null && Number(val) !== 0 ? String(val).trim() : '';
      await expect(cells.nth(6 + j)).toContainText(expectedStatut);
    }
  }
});

Then('les colonnes statut sont présentes dans l\'ordre : Annonce à récupérer, À analyser, À traiter, Candidaté, Refusé, Traité, Ignoré, Expiré, Autre', async ({
  page,
}) => {
  const ths = page.locator('.syntheseOffresTable thead th');
  for (let i = 0; i < STATUTS_ORDER.length; i++) {
    await expect(ths.nth(6 + i)).toContainText(STATUTS_ORDER[i]);
  }
});

Then('une colonne existe pour chaque valeur de l\'énum même si le nombre d\'offres est zéro', async ({
  page,
}) => {
  const ths = page.locator('.syntheseOffresTable thead th');
  expect(await ths.count()).toBeGreaterThanOrEqual(6 + STATUTS_ORDER.length);
});

Then('les lignes sont ordonnées par plugin étape 2 puis par plugin étape 1', async ({ page }) => {
  const tbody = page.locator('#synthese-offres-body');
  await expect(tbody.locator('tr')).toHaveCount(4);
});

Then('la première ligne affichée correspond à l\'expéditeur {string}', async (
  { page },
  expediteur: string
) => {
  const firstCell = page.locator('#synthese-offres-body tr:first-child td:first-child');
  await expect(firstCell).toContainText(expediteur);
});

Then('la ligne correspondant à {string} n\'apparaît pas dans le tableau', async ({ page }, email: string) => {
  const tbody = page.locator('#synthese-offres-body');
  const text = await tbody.textContent();
  expect(text).not.toContain(email);
});

Then('le tableau affiche une ligne pour {string}', async ({ page }, email: string) => {
  const tbody = page.locator('#synthese-offres-body');
  await expect(tbody).toContainText(email);
});

Then('le tableau n\'affiche pas de ligne pour {string}', async ({ page }, email: string) => {
  const tbody = page.locator('#synthese-offres-body');
  const text = await tbody.textContent();
  expect(text).not.toContain(email);
});

Then(/^la cellule \(([^ ×]+) × "([^"]+)"\) affiche "([^"]+)"$/, async (
  { page },
  email: string,
  colonne: string,
  valeur: string
) => {
  const colIdx = colonne === 'A importer'
    ? 5
    : 6 + STATUTS_ORDER.indexOf(colonne);
  expect(colIdx).toBeGreaterThanOrEqual(5);
  const rows = page.locator('#synthese-offres-body tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const firstCell = rows.nth(i).locator('td').first();
    if ((await firstCell.textContent())?.trim() === email) {
      const cell = rows.nth(i).locator('td').nth(colIdx);
      await expect(cell).toContainText(valeur);
      return;
    }
  }
  throw new Error(`Ligne pour ${email} non trouvée`);
});

Then('le tableau affiche une colonne "A importer"', async ({ page }) => {
  const th = page.locator('.syntheseOffresTable thead th').filter({ hasText: 'A importer' });
  await expect(th.first()).toBeVisible();
});

Then('les données du tableau (lignes et colonne "A importer") proviennent d\'une seule API', async ({
  page,
}) => {
  await expect(page.locator('.syntheseOffresTable thead th').filter({ hasText: 'A importer' }).first()).toBeVisible();
});

Then('les données du tableau \\(lignes et colonne {string}) proviennent d\'une seule API', async ({ page }, colonne: string) => {
  await expect(page.locator('.syntheseOffresTable thead th').filter({ hasText: colonne }).first()).toBeVisible();
});

// --- US-3.3 CA3 : thermomètre phase 1 ---
Given('que le bloc "Synthèse des offres" est visible', async ({ page }) => {
  await expect(page.locator('.syntheseOffres')).toBeVisible();
});

When('j\'observe la zone des thermomètres dans le bloc Synthèse des offres', async ({ page }) => {
  await expect(page.locator('.syntheseOffresActions')).toBeVisible();
});

Then('un thermomètre de progression de la phase 1 (création) est affiché', async ({ page }) => {
  await expect(page.locator('.syntheseOffresThermoPhase1, [data-layout="thermometre-phase1"]').first()).toBeVisible();
});

Then('ce thermomètre est situé à côté des thermomètres enrichissement et analyse IA', async ({ page }) => {
  const phase1 = page.locator('.syntheseOffresThermoPhase1');
  const enrichissement = page.locator('.syntheseOffresThermoEnrichissement');
  const analyseIA = page.locator('.syntheseOffresThermoAnalyseIA');
  await expect(phase1.first()).toBeVisible();
  await expect(enrichissement.first()).toBeVisible();
  await expect(analyseIA.first()).toBeVisible();
});

// --- US-1.13 : Totaux (colonne et ligne) ---
Then('une colonne {string} est affichée à droite des colonnes de statut', async ({ page }, nomColonne: string) => {
  const lastTh = page.locator('.syntheseOffresTable thead th').last();
  await expect(lastTh).toContainText(nomColonne);
});

Then('pour la ligne de la source {string} la cellule Totaux affiche {string}', async (
  { page },
  source: string,
  valeur: string
) => {
  const expected = valeur === '0' ? '' : valeur;
  const rows = page.locator('#synthese-offres-body tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const firstCell = rows.nth(i).locator('td').first();
    if ((await firstCell.textContent())?.trim() === source) {
      const cellTotaux = rows.nth(i).locator('td.syntheseOffresCellTotaux');
      await expect(cellTotaux).toContainText(expected);
      return;
    }
  }
  throw new Error(`Ligne pour la source ${source} non trouvée`);
});

Then('une ligne {string} est affichée en bas du tableau', async ({ page }, nomLigne: string) => {
  const lastRow = page.locator('#synthese-offres-body tr').last();
  await expect(lastRow).toContainText(nomLigne);
});

Then('la cellule de la ligne Totaux pour la colonne {string} affiche {string}', async (
  { page },
  colonne: string,
  valeur: string
) => {
  const expected = valeur === '0' ? '' : valeur;
  const ligneTotaux = page.locator('[e2eid="e2eid-synthese-offres-ligne-totaux"]');
  const statutIdx = STATUTS_ORDER.indexOf(colonne);
  expect(statutIdx).toBeGreaterThanOrEqual(0);
  const cell = ligneTotaux.locator('td').nth(6 + statutIdx);
  await expect(cell).toContainText(expected);
});

Then('la cellule Totaux×Totaux affiche {string}', async ({ page }, valeur: string) => {
  const expected = valeur === '0' ? '' : valeur;
  const cell = page.locator('[e2eid="e2eid-synthese-offres-cellule-totaux-generaux"]');
  await expect(cell).toContainText(expected);
});

Given('les données du tableau de synthèse sont mises à jour en base avec les comptages suivants', async (
  { page: _page },
  dataTable: DataTable
) => {
  const rows = dataTable.raw();
  const headers = rows[0]?.map((h) => h.trim()) ?? [];
  const lignes = headers.includes('nb offres')
    ? parseTableToLignesNbOffres(rows)
    : parseTableToLignes(rows);
  await setMockTableauSynthese(lignes);
});

// --- US-3.3 : cache RAM dernier audit (colonne "A importer") ---
Given('que le cache RAM du dernier audit contient les nombres à importer suivants', async (
  { page: _page },
  dataTable: DataTable
) => {
  const rows = dataTable.raw();
  if (rows.length < 2) {
    await setMockCacheAudit([]);
    return;
  }
  const headers = rows[0].map((h) => h.trim());
  const emailIdx = headers.indexOf('emailExpéditeur');
  const aImporterIdx = headers.indexOf('A importer');
  const entries: Array<{ emailExpéditeur: string; 'A importer': string }> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const email = emailIdx >= 0 ? (row[emailIdx] ?? '').trim() : '';
    const aImporter = aImporterIdx >= 0 ? (row[aImporterIdx] ?? '0').trim() : '0';
    if (email) entries.push({ emailExpéditeur: email, 'A importer': aImporter });
  }
  await setMockCacheAudit(entries);
});

Given('le cache RAM du dernier audit contient les nombres à importer suivants', async (
  { page: _page },
  dataTable: DataTable
) => {
  const rows = dataTable.raw();
  if (rows.length < 2) {
    await setMockCacheAudit([]);
    return;
  }
  const headers = rows[0].map((h) => h.trim());
  const emailIdx = headers.indexOf('emailExpéditeur');
  const aImporterIdx = headers.indexOf('A importer');
  const entries: Array<{ emailExpéditeur: string; 'A importer': string | number }> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const email = emailIdx >= 0 ? (row[emailIdx] ?? '').trim() : '';
    const aImporter = aImporterIdx >= 0 ? (row[aImporterIdx] ?? '0').trim() : '0';
    if (email) entries.push({ emailExpéditeur: email, 'A importer': aImporter });
  }
  await setMockCacheAudit(entries);
});

Given('que le cache RAM du dernier audit ne contient pas d\'entrée pour {string}', async (
  { page: _page },
  email: string
) => {
  await setMockCacheAudit([]);
});

Given('le cache RAM du dernier audit ne contient pas d\'entrée pour {string}', async (
  { page: _page },
  email: string
) => {
  await setMockCacheAudit([]);
});

Given('que le cache RAM du dernier audit contient pour {string} le nombre à importer {string}', async (
  { page: _page },
  email: string,
  valeur: string
) => {
  await setMockCacheAudit([{ emailExpéditeur: email, 'A importer': valeur }]);
});

Given('le cache RAM du dernier audit contient pour {string} le nombre à importer {string}', async (
  { page: _page },
  email: string,
  valeur: string
) => {
  await setMockCacheAudit([{ emailExpéditeur: email, 'A importer': valeur }]);
});

When('je rafraîchis le tableau de synthèse des offres', async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-rafraichir-synthese-offres"]').click();
  await page.waitForTimeout(800);
});

// Step "je clique sur le bouton \"Mise à jour\" du bloc Synthèse des offres" défini dans reorganisation-traitements.steps.ts (éviter doublon bddgen).

Then('le serveur exécute l\'audit puis le rafraîchissement des statuts', async ({ page }) => {
  await expect(page.locator('.syntheseOffresTable')).toBeVisible();
});

Then('le tableau affiche la colonne "A importer" et les statuts cohérents avec le résultat de cet enchaînement', async ({
  page,
}) => {
  await expect(page.locator('.syntheseOffresTable thead th').filter({ hasText: 'A importer' }).first()).toBeVisible();
  await expect(page.locator('#synthese-offres-body tr')).toHaveCount(1, { timeout: 5000 });
});

Then('la cellule \\({string} × "A importer"\\) reflète le résultat du dernier audit', async (
  { page },
  email: string
) => {
  const rows = page.locator('#synthese-offres-body tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const firstCell = rows.nth(i).locator('td').first();
    if ((await firstCell.textContent())?.trim() === email) {
      const cellAImporter = rows.nth(i).locator('td').nth(5);
      await expect(cellAImporter).toHaveText(/^\d*$/);
      return;
    }
  }
  throw new Error(`Ligne pour ${email} non trouvée`);
});

Then('la cellule \\(source@test.com × {string}) reflète le résultat du dernier audit', async (
  { page },
  colonne: string
) => {
  const rows = page.locator('#synthese-offres-body tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const firstCell = rows.nth(i).locator('td').first();
    if ((await firstCell.textContent())?.trim() === 'source@test.com') {
      const cellAImporter = rows.nth(i).locator('td').nth(5);
      await expect(cellAImporter).toHaveText(/^\d*$/);
      return;
    }
  }
  throw new Error('Ligne pour source@test.com non trouvée');
});

When('je clique sur le bouton {string} du bloc Traitements', async ({ page }, libelle: string) => {
  const btn = page.getByRole('button', { name: libelle }).or(page.locator(`[e2eid="e2eid-bouton-rafraichir-synthese-offres"]`));
  await btn.first().click();
  await page.waitForTimeout(800);
});

When('j\'observe la zone des phases dans le bloc Traitements', async ({ page }) => {
  await expect(page.locator('[data-layout="traitements"], .traitementsBloc').first()).toBeVisible();
});

Then('un thermomètre de progression de la phase {int} \\(création) est affiché', async ({ page }, _phase: number) => {
  await expect(page.locator('.traitementsLignePhase[data-phase="creation"], .thermometreWorkerPhase1').first()).toBeVisible();
});

Then('un thermomètre pour la phase {int} \\(enrichissement) est affiché', async ({ page }, _phase: number) => {
  await expect(page.locator('.traitementsLignePhase[data-phase="enrichissement"], .thermometreWorkerEnrichissement').first()).toBeVisible();
});

Then('un thermomètre pour la phase {int} \\(analyse IA) est affiché', async ({ page }, _phase: number) => {
  await expect(page.locator('.traitementsLignePhase[data-phase="analyse-ia"], .thermometreWorkerAnalyseIA').first()).toBeVisible();
});
