/**
 * Step definitions pour la fonctionnalité Statistiques des scores (histogramme des scores des offres).
 * Réutilise "tableau de bord est affiché" depuis tableau-synthese-offres.steps.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

const blocHistogrammeScores = () => '[data-layout="histogramme-scores-offres"]';

Then('la page comporte un bloc {string}', async ({ page }, name: string) => {
  if (name !== 'Statistiques des scores') throw new Error('Seul le bloc "Statistiques des scores" est supporté');
  const section = page.locator(blocHistogrammeScores());
  await expect(section).toBeVisible();
  await expect(section.locator('h2')).toHaveText(name);
});

Then('le bloc "Statistiques des scores" comporte le titre {string}', async ({ page }, title: string) => {
  await expect(page.locator(blocHistogrammeScores()).locator('h2')).toHaveText(title);
});

Then(
  'le bloc "Statistiques des scores" comporte un texte d\'intro mentionnant les offres avec score ou statut Expiré',
  async ({ page }) => {
    const section = page.locator(blocHistogrammeScores());
    const intro = section.locator('.histogrammeScoresOffresIntro');
    await expect(intro).toBeVisible();
    await expect(intro).toContainText(/score|Expiré/i);
  }
);

Then('le bloc "Statistiques des scores" comporte une zone graphique (canvas) pour l\'histogramme', async ({ page }) => {
  const section = page.locator(blocHistogrammeScores());
  const canvas = section.locator('#histogramme-scores-chart, canvas');
  await expect(canvas.first()).toBeVisible();
});

Then('le bloc "Statistiques des scores" comporte un bouton {string}', async ({ page }, label: string) => {
  const section = page.locator(blocHistogrammeScores());
  const btn = section.getByRole('button', { name: label }).or(section.locator('[e2eid="e2eid-bouton-calculer-histogramme-scores"]'));
  await expect(btn.first()).toBeVisible();
});

/** Réutilise "que la configuration Airtable est opérationnelle" depuis tableau-synthese-offres.steps. */

Given('que la configuration Airtable n\'est pas renseignée', async () => {
  const res = await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: '', base: '', sources: '', offres: '' }),
  });
  if (!res.ok) throw new Error(`set-airtable (clear): ${res.status}`);
});

const lastApiStore: { status?: number; json?: Record<string, unknown> } = {};

When('j\'appelle l\'API GET {string}', async ({}, path: string) => {
  const slug = path === 'histogramme-scores-offres' ? 'histogramme-scores-offres' : path;
  const res = await fetch(`${API_BASE}/api/${slug}`, { cache: 'no-store' });
  lastApiStore.status = res.status;
  lastApiStore.json = (await res.json()) as Record<string, unknown>;
});

Then('la réponse a le statut {int}', async ({}, status: number) => {
  expect(lastApiStore.status).toBe(status);
});

Then('la réponse JSON contient un tableau {string} avec {int} éléments', async ({}, key: string, count: number) => {
  const arr = lastApiStore.json?.[key];
  expect(Array.isArray(arr)).toBe(true);
  expect((arr as unknown[]).length).toBe(count);
});

Then('la réponse JSON contient un champ {string} de type nombre', async ({}, key: string) => {
  expect(typeof lastApiStore.json?.[key]).toBe('number');
});

Then('la réponse JSON contient {string} à {word}', async ({}, key: string, value: string) => {
  const num = Number(value);
  const expected = Number.isNaN(num) ? (value === 'false' ? false : value === 'true' ? true : value) : num;
  expect(lastApiStore.json?.[key]).toEqual(expected);
});

Then('la réponse JSON contient un tableau {string} vide', async ({}, key: string) => {
  const arr = lastApiStore.json?.[key];
  expect(Array.isArray(arr) && arr.length === 0).toBe(true);
});
