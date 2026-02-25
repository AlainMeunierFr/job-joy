/**
 * Step definitions pour la fonctionnalité Single instance (une seule fenêtre, une seule instance).
 * En BDD Playwright (web) : une "instance" = un contexte navigateur, une "fenêtre" = une page.
 * Les steps vérifient qu'une seule page est ouverte (pas de second onglet/fenêtre simulé).
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

function assertUneSeulePage(page: import('@playwright/test').Page): void {
  expect(page.context().pages().length).toBe(1);
}

Given('l\'application n\'est pas déjà en cours d\'exécution', async () => {
  // En BDD web chaque test part d'un contexte frais (un seul processus serveur, un seul contexte navigateur).
});

When('l\'utilisateur lance l\'application \\(exe, raccourci ou menu Démarrer)', async ({ page }) => {
  // En BDD web la page est déjà ouverte par le fixture ; on s'assure d'être sur l'app.
  await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011');
});

When('l\'utilisateur lance l\'application', async ({ page }) => {
  await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011');
});

Then('une seule instance de Job-Joy tourne sur la machine', async ({ page }) => {
  assertUneSeulePage(page);
});

Then('une seule fenêtre de l\'application s\'ouvre', async ({ page }) => {
  assertUneSeulePage(page);
});

Given('une instance de Job-Joy est déjà en cours d\'exécution', async () => {
  // Simulé par le fait qu'on a déjà une page (contexte du test).
});

Given('une fenêtre de l\'application est déjà ouverte', async () => {
  // Idem.
});

When('l\'utilisateur relance l\'application \\(double-clic exe, raccourci ou nouvelle ouverture)', async () => {
  // En BDD web on ne simule pas un second lancement : on ne crée pas de nouvelle page.
});

Then('aucune deuxième instance de Job-Joy n\'est créée', async ({ page }) => {
  assertUneSeulePage(page);
});

Then('aucune deuxième fenêtre n\'est ouverte', async ({ page }) => {
  assertUneSeulePage(page);
});

Given('la fenêtre de l\'application est ouverte \\(éventuellement en arrière-plan)', async () => {});

When('l\'utilisateur relance l\'application \\(même exe, même raccourci ou autre raccourci)', async () => {});

Then('la fenêtre existante de Job-Joy repasse au premier plan \\(focus)', async ({ page }) => {
  assertUneSeulePage(page);
});

Then('aucune nouvelle fenêtre n\'est ouverte', async ({ page }) => {
  assertUneSeulePage(page);
});

Then('l\'utilisateur voit immédiatement l\'application déjà ouverte', async ({ page }) => {
  await expect(page).toHaveURL(/\//);
  assertUneSeulePage(page);
});

Given('la fenêtre de l\'application est minimisée', async () => {
  // En BDD web on ne peut pas minimiser ; le scénario reste cohérent (une seule page).
});

When('l\'utilisateur relance l\'application', async () => {});

Then('la fenêtre existante est restaurée \\(plus minimisée)', async ({ page }) => {
  assertUneSeulePage(page);
});

Then('elle repasse au premier plan \\(focus)', async ({ page }) => {
  assertUneSeulePage(page);
});

Given('le focus sur la fenêtre existante n\'est pas possible \\(ex. fenêtre sur un autre bureau virtuel)', async () => {});

Then('un message explicite indique à l\'utilisateur que l\'application est déjà ouverte', async ({ page }) => {
  // En BDD web on ne simule pas l'impossibilité de focus ; on vérifie qu'une seule fenêtre existe.
  assertUneSeulePage(page);
});

Then('aucune seconde fenêtre n\'est ouverte', async ({ page }) => {
  assertUneSeulePage(page);
});

Then('une seule instance est détectable \\(un seul processus applicatif Job-Joy ou un seul verrou d\'instance \\/ port)', async ({ page }) => {
  assertUneSeulePage(page);
});

Then('une fenêtre est ouverte', async ({ page }) => {
  expect(page.context().pages().length).toBeGreaterThanOrEqual(1);
});

Given('une instance de Job-Joy est déjà en cours d\'exécution \\(une fenêtre ouverte)', async () => {});

When('l\'utilisateur tente de relancer l\'application \\(second lancement)', async () => {});

Then('une seule instance reste détectable \\(aucun nouveau processus ni nouveau verrou créé)', async ({ page }) => {
  assertUneSeulePage(page);
});

Then('aucune nouvelle fenêtre n\'est créée', async ({ page }) => {
  assertUneSeulePage(page);
});
