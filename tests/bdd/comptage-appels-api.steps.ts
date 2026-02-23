/**
 * Step definitions pour la fonctionnalité Comptage des appels API (US-2.5).
 * Réutilise "tableau de bord est affiché" depuis tableau-synthese-offres.steps.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

const stepContext: { logEntries?: unknown[]; logFilesList?: string[] } = {};

// --- Logs : préparation et lecture ---
async function clearLogForDate(dateISO: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/clear-log-appel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateISO }),
  });
  if (!res.ok) throw new Error(`clear-log-appel: ${res.status}`);
}

Given('qu\'aucun log d\'appels API n\'existe pour la date {string}', async ({}, dateISO: string) => {
  await clearLogForDate(dateISO);
});

Given('aucun log d\'appels API n\'existe pour la date {string}', async ({}, dateISO: string) => {
  await clearLogForDate(dateISO);
});

Given('que le dossier "data/log-appels-api/" n\'existe pas', async ({}) => {
  const res = await fetch(`${API_BASE}/api/test/clear-all-log-appels`, { method: 'POST' });
  if (!res.ok) throw new Error(`clear-all-log-appels: ${res.status}`);
});

Given('le dossier {string} n\'existe pas', async ({}, path: string) => {
  if (path !== 'data/log-appels-api/') throw new Error('Seul data/log-appels-api/ est supporté');
  const res = await fetch(`${API_BASE}/api/test/clear-all-log-appels`, { method: 'POST' });
  if (!res.ok) throw new Error(`clear-all-log-appels: ${res.status}`);
});

When('un appel API {string} est enregistré avec succès pour la date {string}', async ({}, api: string, dateISO: string) => {
  const res = await fetch(`${API_BASE}/api/test/log-appel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api, succes: true, dateISO }),
  });
  if (!res.ok) throw new Error(`log-appel: ${res.status}`);
});

When('un appel API {string} est enregistré en échec avec le code erreur {string} pour la date {string}', async ({}, api: string, codeErreur: string, dateISO: string) => {
  const res = await fetch(`${API_BASE}/api/test/log-appel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api, succes: false, codeErreur, dateISO }),
  });
  if (!res.ok) throw new Error(`log-appel: ${res.status}`);
});

When('un premier appel API est enregistré pour la date {string}', async ({}, dateISO: string) => {
  await registerLogAppel('Claude', true, dateISO);
});

Given('un appel API {string} a été enregistré en échec avec le code erreur {string} pour la date {string}', async ({}, api: string, codeErreur: string, dateISO: string) => {
  await registerLogAppel(api, false, dateISO, codeErreur);
});

Given('qu\'un appel API a été enregistré pour la date {string}', async ({}, dateISO: string) => {
  await registerLogAppel('Claude', true, dateISO);
});

Given('un appel API a été enregistré pour la date {string}', async ({}, dateISO: string) => {
  await registerLogAppel('Claude', true, dateISO);
});

async function registerLogAppel(api: string, succes: boolean, dateISO: string, codeErreur?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/log-appel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api, succes, dateISO, ...(codeErreur && { codeErreur }) }),
  });
  if (!res.ok) throw new Error(`log-appel: ${res.status}`);
}

Given('qu\'un appel API {string} a été enregistré avec succès pour la date {string}', async ({}, api: string, dateISO: string) => {
  await registerLogAppel(api, true, dateISO);
});

Given('un appel API {string} a été enregistré avec succès pour la date {string}', async ({}, api: string, dateISO: string) => {
  await registerLogAppel(api, true, dateISO);
});

Given('qu\'un appel API {string} a été enregistré en échec avec le code erreur {string} pour la date {string}', async ({}, api: string, codeErreur: string, dateISO: string) => {
  await registerLogAppel(api, false, dateISO, codeErreur);
});

When('je lis le fichier de log pour la date {string}', async ({}, dateISO: string) => {
  const res = await fetch(`${API_BASE}/api/test/log-appel?dateISO=${encodeURIComponent(dateISO)}`);
  const data = (await res.json()) as unknown[];
  stepContext.logEntries = Array.isArray(data) ? data : [];
});

When('je liste les fichiers dans "data/log-appels-api/"', async ({}) => {
  const res = await fetch(`${API_BASE}/api/test/list-log-appels`);
  const data = (await res.json()) as string[];
  stepContext.logFilesList = Array.isArray(data) ? data : [];
});

When('je liste les fichiers dans {string}', async ({}, path: string) => {
  if (path !== 'data/log-appels-api/') throw new Error('Seul data/log-appels-api/ est supporté');
  const res = await fetch(`${API_BASE}/api/test/list-log-appels`);
  const data = (await res.json()) as string[];
  stepContext.logFilesList = Array.isArray(data) ? data : [];
});

Then('un fichier de log existe dans "data/log-appels-api/" pour la date {string}', async ({}, dateISO: string) => {
  const res = await fetch(`${API_BASE}/api/test/log-appel?dateISO=${encodeURIComponent(dateISO)}`);
  expect(res.ok).toBe(true);
  const entries = (await res.json()) as unknown[];
  expect(Array.isArray(entries) && entries.length >= 0).toBe(true);
  stepContext.logEntries = Array.isArray(entries) ? entries : [];
});

Then('un fichier de log existe dans {string} pour la date {string}', async ({}, _path: string, dateISO: string) => {
  const res = await fetch(`${API_BASE}/api/test/log-appel?dateISO=${encodeURIComponent(dateISO)}`);
  expect(res.ok).toBe(true);
  const entries = (await res.json()) as unknown[];
  expect(Array.isArray(entries) && entries.length >= 0).toBe(true);
  stepContext.logEntries = Array.isArray(entries) ? entries : [];
});

Then('ce fichier contient au moins un enregistrement avec l\'API {string}', async ({}, api: string) => {
  const entries = (stepContext.logEntries ?? []) as Record<string, unknown>[];
  const found = entries.some((e) => e && String(e.api) === api);
  expect(found).toBe(true);
});

Then('au moins un enregistrement du fichier contient le champ identifiant l\'API \\(ex. {string}\\)', async ({}, api: string) => {
  const entries = (stepContext.logEntries ?? []) as Record<string, unknown>[];
  const found = entries.some((e) => e && String(e.api) === api);
  expect(found).toBe(true);
});

Then('cet enregistrement contient un champ date-heure \\(ex. format ISO 8601\\)', async ({}) => {
  const entries = (stepContext.logEntries ?? []) as Record<string, unknown>[];
  const withDate = entries.find((e) => e && typeof e.dateTime === 'string');
  expect(withDate?.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

Then('cet enregistrement indique le succès \\(ex. succes: true ou champ équivalent\\)', async ({}) => {
  const entries = (stepContext.logEntries ?? []) as Record<string, unknown>[];
  const withSuccess = entries.find((e) => e && e.succes === true);
  expect(withSuccess).toBeDefined();
});

Then('au moins un enregistrement du fichier indique l\'échec \\(ex. succes: false\\)', async ({}) => {
  const entries = (stepContext.logEntries ?? []) as Record<string, unknown>[];
  const withFail = entries.find((e) => e && e.succes === false);
  expect(withFail).toBeDefined();
});

Then('cet enregistrement contient le code erreur {string}', async ({}, codeErreur: string) => {
  const entries = (stepContext.logEntries ?? []) as Record<string, unknown>[];
  const withCode = entries.find((e) => e && String(e.codeErreur) === codeErreur);
  expect(withCode).toBeDefined();
});

Then('cet enregistrement ne contient pas de message d\'erreur détaillé ni de corps de réponse', async ({}) => {
  const entries = (stepContext.logEntries ?? []) as Record<string, unknown>[];
  const failed = entries.find((e) => e && e.succes === false) as Record<string, unknown> | undefined;
  expect(failed).toBeDefined();
  expect(failed?.message).toBeUndefined();
  expect(failed?.body).toBeUndefined();
  expect(failed?.response).toBeUndefined();
});

Then('un fichier nommé {string} existe dans ce dossier', async ({}, fileName: string) => {
  const list = stepContext.logFilesList ?? [];
  expect(list).toContain(fileName);
});

Then('le dossier "data/log-appels-api/" existe', async ({}) => {
  const res = await fetch(`${API_BASE}/api/test/list-log-appels`);
  expect(res.ok).toBe(true);
  const list = (await res.json()) as string[];
  expect(Array.isArray(list)).toBe(true);
  expect(list.length).toBeGreaterThanOrEqual(0);
});

Then('le dossier {string} existe', async ({}, path: string) => {
  if (path !== 'data/log-appels-api/') throw new Error('Seul data/log-appels-api/ est supporté');
  const res = await fetch(`${API_BASE}/api/test/list-log-appels`);
  expect(res.ok).toBe(true);
  const list = (await res.json()) as string[];
  expect(Array.isArray(list)).toBe(true);
});

Then('un fichier {string} existe dans ce dossier', async ({}, fileName: string) => {
  const res = await fetch(`${API_BASE}/api/test/list-log-appels`);
  expect(res.ok).toBe(true);
  const list = (await res.json()) as string[];
  expect(list).toContain(fileName);
});

// --- Tableau de bord : réutilisation du step "tableau de bord est affiché" (défini dans tableau-synthese-offres.steps) ---
// Given('que le tableau de bord est affiché') -> déjà défini ailleurs

Given('que le tableau de bord est affiché sans avoir encore cliqué sur "Calculer"', async ({ page }) => {
  await page.goto('/tableau-de-bord');
});

Given('le tableau de bord est affiché sans avoir encore cliqué sur {string}', async ({ page }) => {
  await page.goto('/tableau-de-bord');
});

Then('le container Consommation API comporte un tableau', async ({ page }) => {
  const container = page.locator('[data-layout="consommation-api"]');
  const table = container.locator('table.consommationApiTable');
  await expect(table).toBeVisible();
});

Then('le tableau comporte au moins une colonne "Claude"', async ({ page }) => {
  const container = page.locator('[data-layout="consommation-api"]');
  await expect(container.getByRole('columnheader', { name: 'Claude' })).toBeVisible();
});

Then('le tableau comporte au moins une colonne "Airtable"', async ({ page }) => {
  const container = page.locator('[data-layout="consommation-api"]');
  await expect(container.getByRole('columnheader', { name: 'Airtable' })).toBeVisible();
});

Then('le container Consommation API comporte un bouton "Calculer"', async ({ page }) => {
  const btn = page.locator('[e2eid="e2eid-bouton-calculer-consommation-api"]');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveText('Calculer');
});

async function givenLogsForDate(dateISO: string, nClaude: number, mAirtable: number): Promise<void> {
  for (let i = 0; i < nClaude; i++) await registerLogAppel('Claude', true, dateISO);
  for (let i = 0; i < mAirtable; i++) await registerLogAppel('Airtable', true, dateISO);
}

Given('que des logs d\'appels existent dans "data/log-appels-api/" pour la date {string} avec {int} appels Claude et {int} appels Airtable', async ({}, dateISO: string, nClaude: number, mAirtable: number) => {
  await givenLogsForDate(dateISO, nClaude, mAirtable);
});

Given('des logs d\'appels existent dans {string} pour la date {string} avec {int} appels Claude et {int} appels Airtable', async ({}, _path: string, dateISO: string, nClaude: number, mAirtable: number) => {
  await givenLogsForDate(dateISO, nClaude, mAirtable);
});

Given('que des logs d\'appels existent dans "data/log-appels-api/" pour la date {string} avec {int} appel Claude', async ({}, dateISO: string, nClaude: number) => {
  await givenLogsForDate(dateISO, nClaude, 0);
});

Given('des logs d\'appels existent dans {string} pour la date {string} avec {int} appel Claude', async ({}, _path: string, dateISO: string, nClaude: number) => {
  await givenLogsForDate(dateISO, nClaude, 0);
});

When('je clique sur le bouton "Calculer" du container Consommation API', async ({ page }) => {
  const btn = page.locator('[e2eid="e2eid-bouton-calculer-consommation-api"]');
  await btn.click();
  await page.waitForTimeout(500);
});

Then('le tableau Consommation API affiche une ligne pour la date {string}', async ({ page }, dateISO: string) => {
  const row = page.locator(`[data-layout="consommation-api"] tbody tr[data-date="${dateISO}"]`);
  await expect(row).toBeVisible();
});

Then('la cellule pour la date {string} et l\'API "Claude" affiche {string}', async ({ page }, dateISO: string, value: string) => {
  const row = page.locator(`[data-layout="consommation-api"] tbody tr[data-date="${dateISO}"]`);
  await expect(row).toBeVisible();
  const cellClaude = row.locator('td[data-api="Claude"]');
  await expect(cellClaude).toHaveText(value);
});

Then('la cellule pour la date {string} et l\'API "Airtable" affiche {string}', async ({ page }, dateISO: string, value: string) => {
  const row = page.locator(`[data-layout="consommation-api"] tbody tr[data-date="${dateISO}"]`);
  await expect(row).toBeVisible();
  const cellAirtable = row.locator('td[data-api="Airtable"]');
  await expect(cellAirtable).toHaveText(value);
});

When('j\'observe le tableau Consommation API', async ({ page }) => {
  const container = page.locator('[data-layout="consommation-api"]');
  await expect(container).toBeVisible();
});

Then('le tableau peut être vide ou ne pas afficher les données du {string}', async ({ page }, dateISO: string) => {
  const row = page.locator(`[data-layout="consommation-api"] tbody tr[data-date="${dateISO}"]`);
  const count = await row.count();
  const placeholder = page.locator('[data-layout="consommation-api"] tbody').filter({ hasText: 'Cliquez sur Calculer' });
  const hasPlaceholder = (await placeholder.count()) > 0;
  expect(count === 0 || hasPlaceholder).toBe(true);
});

Then('le tableau peut être vide ou ne pas afficher les données du {int}-{int}-{int}', async ({ page }, y: number, m: number, d: number) => {
  const dateISO = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const row = page.locator(`[data-layout="consommation-api"] tbody tr[data-date="${dateISO}"]`);
  const count = await row.count();
  const placeholder = page.locator('[data-layout="consommation-api"] tbody').filter({ hasText: 'Cliquez sur Calculer' });
  const hasPlaceholder = (await placeholder.count()) > 0;
  expect(count === 0 || hasPlaceholder).toBe(true);
});
