/**
 * Step definitions pour la fonctionnalité Tableau de synthèse des offres (US-1.7).
 * Données via API set-mock-tableau-synthese, set-mock-sources, set-airtable.
 */
import { createBdd } from 'playwright-bdd';
import { DataTable } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
const STATUTS_ORDER = ['Annonce à récupérer', 'À traiter', 'Traité', 'Ignoré', 'À analyser'];

function parseTableToLignes(rows: string[][]): Array<Record<string, unknown>> {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  const lignes: Array<Record<string, unknown>> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, unknown> = {
      emailExpéditeur: row[headers.indexOf('emailExpéditeur')]?.trim() ?? '',
      algoEtape1: row[headers.indexOf('algo étape 1')]?.trim() ?? '',
      algoEtape2: row[headers.indexOf('algo étape 2')]?.trim() ?? '',
      actif: (row[headers.indexOf('actif')]?.trim() ?? '').toLowerCase() === 'oui',
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
    const algo = row[headers.indexOf('algo étape 1')]?.trim() ?? 'Inconnu';
    const statuts: Record<string, number> = {};
    for (const s of STATUTS_ORDER) statuts[s] = 0;
    statuts['Annonce à récupérer'] = nb;
    lignes.push({
      emailExpéditeur: row[headers.indexOf('emailExpéditeur')]?.trim() ?? '',
      algoEtape1: algo,
      algoEtape2: row[headers.indexOf('algo étape 2')]?.trim() ?? algo,
      actif: true,
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

async function setMockSourcesAndOffres(
  sources: Array<{ emailExpéditeur: string; algo: string; actif: boolean }>,
  offres: Array<{ emailExpéditeur: string; statut: string }>
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: sources.map((s) => ({ ...s, actif: s.actif })),
    }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
  const lignes = construireLignesDepuisSourcesEtOffres(sources, offres);
  await setMockTableauSynthese(lignes);
}

function construireLignesDepuisSourcesEtOffres(
  sources: Array<{ emailExpéditeur: string; algo: string; actif: boolean }>,
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
      algoEtape1: s.algo,
      algoEtape2: s.algo,
      actif: s.actif,
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
      algoEtape1: 'Linkedin',
      algoEtape2: 'Linkedin',
      actif: true,
      statuts: { 'Annonce à récupérer': 2, 'À traiter': 0, Traité: 0, Ignoré: 0, 'À analyser': 1 },
    },
  ]);
});
Given('le tableau de synthèse des offres contient des données', async () => {
  await setMockTableauSynthese([
    {
      emailExpéditeur: 'jobs@linkedin.com',
      algoEtape1: 'Linkedin',
      algoEtape2: 'Linkedin',
      actif: true,
      statuts: { 'Annonce à récupérer': 2, 'À traiter': 0, Traité: 0, Ignoré: 0, 'À analyser': 1 },
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
      algoEtape1: 'HelloWork',
      algoEtape2: 'HelloWork',
      actif: true,
      statuts: { 'Annonce à récupérer': 1, 'À traiter': 0, Traité: 0, Ignoré: 0, 'À analyser': 0 },
    },
  ]);
});
Given('le tableau de synthèse des offres est chargé avec au moins une offre', async () => {
  await setMockTableauSynthese([
    {
      emailExpéditeur: 'test@test.com',
      algoEtape1: 'HelloWork',
      algoEtape2: 'HelloWork',
      actif: true,
      statuts: { 'Annonce à récupérer': 1, 'À traiter': 0, Traité: 0, Ignoré: 0, 'À analyser': 0 },
    },
  ]);
});

Given('qu\'une source {string} existe dans la table Sources', async ({ page: _page }, email: string) => {
  await setMockSourcesAndOffres([{ emailExpéditeur: email, algo: 'Inconnu', actif: true }], []);
});
Given('une source {string} existe dans la table Sources', async ({ page: _page }, email: string) => {
  await setMockSourcesAndOffres([{ emailExpéditeur: email, algo: 'Inconnu', actif: true }], []);
});

Given('qu\'aucune offre n\'est liée à cette source', async () => {
  await setMockTableauSynthese([]);
});
Given('aucune offre n\'est liée à cette source', async () => {
  await setMockTableauSynthese([]);
});

let lastSourcesAndOffres: {
  sources: Array<{ emailExpéditeur: string; algo: string; actif: boolean }>;
  offres: Array<{ emailExpéditeur: string; statut: string }>;
} = { sources: [], offres: [] };

Given('que la source {string} a {int} offres en base', async ({ page: _page }, email: string, nb: number) => {
  lastSourcesAndOffres = { sources: [], offres: [] };
  const offres = Array.from({ length: nb }, (_, i) => ({
    emailExpéditeur: email,
    statut: i === 0 ? 'Annonce à récupérer' : 'À traiter',
  }));
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, algo: 'Inconnu', actif: true });
  lastSourcesAndOffres.offres.push(...offres);
  await setMockSourcesAndOffres(lastSourcesAndOffres.sources, lastSourcesAndOffres.offres);
});
Given('la source {string} a {int} offres en base', async ({ page: _page }, email: string, nb: number) => {
  if (lastSourcesAndOffres.sources.length === 0) lastSourcesAndOffres = { sources: [], offres: [] };
  const offres = Array.from({ length: nb }, (_, i) => ({
    emailExpéditeur: email,
    statut: i === 0 ? 'Annonce à récupérer' : 'À traiter',
  }));
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, algo: 'Inconnu', actif: true });
  lastSourcesAndOffres.offres.push(...offres);
  await setMockSourcesAndOffres(lastSourcesAndOffres.sources, lastSourcesAndOffres.offres);
});

Given('que la source {string} n\'a aucune offre', async ({ page: _page }, email: string) => {
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, algo: 'Inconnu', actif: true });
  await setMockSourcesAndOffres(lastSourcesAndOffres.sources, lastSourcesAndOffres.offres);
});
Given('la source {string} n\'a aucune offre', async ({ page: _page }, email: string) => {
  lastSourcesAndOffres.sources.push({ emailExpéditeur: email, algo: 'Inconnu', actif: true });
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
    { emailExpéditeur: email, algoEtape1: 'Inconnu', algoEtape2: 'Inconnu', actif: true, statuts },
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
    { emailExpéditeur: email, algoEtape1: 'Inconnu', algoEtape2: 'Inconnu', actif: true, statuts },
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
  const auditSynthese = page.locator('.auditSynthese');
  const syntheseOffres = page.locator('.syntheseOffres');
  await expect(auditSynthese.first()).toBeAttached();
  await expect(syntheseOffres.first()).toBeAttached();
  expect(await auditSynthese.count()).toBeGreaterThan(0);
  expect(await syntheseOffres.count()).toBeGreaterThan(0);
});

Then('les deux tableaux sont visuellement séparés (titres, emplacements ou sections différents)', async ({
  page,
}) => {
  const titreOffres = page.locator('#titre-synthese-offres');
  await expect(titreOffres).toContainText('Synthèse des offres');
  await expect(page.locator('.auditSynthese')).toBeAttached();
  await expect(page.locator('.syntheseOffres')).toBeAttached();
});
Then('les deux tableaux sont visuellement séparés \\(titres, emplacements ou sections différents)', async ({
  page,
}) => {
  const titreOffres = page.locator('#titre-synthese-offres');
  await expect(titreOffres).toContainText('Synthèse des offres');
  await expect(page.locator('.auditSynthese')).toBeAttached();
  await expect(page.locator('.syntheseOffres')).toBeAttached();
});

Then('le tableau affiche les colonnes fixes dans l\'ordre : email expéditeur, algo étape 1, algo étape 2, actif', async ({
  page,
}) => {
  const ths = page.locator('.syntheseOffresTable thead th');
  await expect(ths.nth(0)).toContainText('email expéditeur');
  await expect(ths.nth(1)).toContainText('algo étape 1');
  await expect(ths.nth(2)).toContainText('algo étape 2');
  await expect(ths.nth(3)).toContainText('actif');
});

Then('le tableau affiche une colonne par statut d\'offre dans l\'ordre de l\'énum Airtable', async ({
  page,
}) => {
  const ths = page.locator('.syntheseOffresTable thead th');
  for (let i = 0; i < STATUTS_ORDER.length; i++) {
    await expect(ths.nth(4 + i)).toContainText(STATUTS_ORDER[i]);
  }
});

Then('le tableau affiche les lignes suivantes', async ({ page }, dataTable: DataTable) => {
  const rows = dataTable.raw();
  const tbody = page.locator('#synthese-offres-body');
  const trs = tbody.locator('tr');
  await expect(trs).toHaveCount(Math.max(0, rows.length - 1));
  for (let i = 1; i < rows.length; i++) {
    const cells = trs.nth(i - 1).locator('td');
    await expect(cells.nth(0)).toContainText(rows[i][0].trim());
    await expect(cells.nth(1)).toContainText(rows[i][1].trim());
    await expect(cells.nth(2)).toContainText(rows[i][2].trim());
    await expect(cells.nth(3)).toContainText(rows[i][3].trim());
    for (let j = 0; j < 5; j++) {
      await expect(cells.nth(4 + j)).toContainText(rows[i][4 + j]?.trim() ?? '0');
    }
  }
});

Then('les colonnes statut sont présentes dans l\'ordre : Annonce à récupérer, À traiter, Traité, Ignoré, À analyser', async ({
  page,
}) => {
  const ths = page.locator('.syntheseOffresTable thead th');
  for (let i = 0; i < STATUTS_ORDER.length; i++) {
    await expect(ths.nth(4 + i)).toContainText(STATUTS_ORDER[i]);
  }
});

Then('une colonne existe pour chaque valeur de l\'énum même si le nombre d\'offres est zéro', async ({
  page,
}) => {
  const ths = page.locator('.syntheseOffresTable thead th');
  expect(await ths.count()).toBeGreaterThanOrEqual(4 + STATUTS_ORDER.length);
});

Then('les lignes sont ordonnées par algo étape 2 puis par algo étape 1', async ({ page }) => {
  const tbody = page.locator('#synthese-offres-body');
  await expect(tbody.locator('tr')).toHaveCount(3);
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
  statut: string,
  valeur: string
) => {
  const statutIdx = STATUTS_ORDER.indexOf(statut);
  expect(statutIdx).toBeGreaterThanOrEqual(0);
  const rows = page.locator('#synthese-offres-body tr');
  for (let i = 0; i < (await rows.count()); i++) {
    const firstCell = rows.nth(i).locator('td').first();
    if ((await firstCell.textContent())?.trim() === email) {
      const cell = rows.nth(i).locator('td').nth(4 + statutIdx);
      await expect(cell).toContainText(valeur);
      return;
    }
  }
  throw new Error(`Ligne pour ${email} non trouvée`);
});
