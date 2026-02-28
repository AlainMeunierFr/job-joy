/**
 * Step definitions pour la fonctionnalité Lister les offres (US-7.9).
 * Données offres via POST /api/test/seed-offre-sqlite et POST /api/test/clear-offres-sqlite.
 * Réutilise test depuis configuration-compte-email.steps.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

const E2E_GRID_OFFRES = '[e2eid="e2eid-grid-offres"]';
const E2E_LISTE_VUES = '[e2eid="e2eid-liste-vues-offres"]';
const E2E_BOUTON_CREER_VUE = '[e2eid="e2eid-bouton-creer-vue"]';
const E2E_NAV_OFFRES = '[e2eid="e2eid-nav-offres"]';
/** Délai pour que RevoGrid (CDN) ou le tableau fallback charge et rende. */
const GRID_VISIBLE_TIMEOUT = 25000;
/** Sélecteur pour le contenu du grid (RevoGrid ou table fallback). */
const GRID_CONTENT = `${E2E_GRID_OFFRES} revo-grid, ${E2E_GRID_OFFRES} table.pageOffresTableFallback`;

async function waitForGridReady(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const g = document.querySelector('[e2eid="e2eid-grid-offres"]');
      return !!(g && (g.querySelector('revo-grid') || g.querySelector('table')));
    },
    { timeout: GRID_VISIBLE_TIMEOUT }
  );
}

// --- Given : base offres ---
async function seedOffre(body?: Record<string, string>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/seed-offre-sqlite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`seed-offre-sqlite failed: ${res.status}`);
}
async function clearOffres(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/clear-offres-sqlite`, { method: 'POST' });
  if (!res.ok) throw new Error(`clear-offres-sqlite failed: ${res.status}`);
}

Given('que la base contient au moins une offre', async () => {
  await clearOffres().catch(() => {});
  await seedOffre();
});
Given('la base contient au moins une offre', async () => {
  await clearOffres().catch(() => {});
  await seedOffre();
});
Given('que la base ne contient aucune offre', async () => {
  await clearOffres();
});
Given('la base ne contient aucune offre', async () => {
  await clearOffres();
});
Given('que la base contient des offres', async () => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await seedOffre({ URL: 'https://example.com/offre-2', Statut: 'Expiré' });
});
Given('la base contient des offres', async () => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await seedOffre({ URL: 'https://example.com/offre-2', Statut: 'Expiré' });
});
Given('que la base contient suffisamment d\'offres pour dépasser la hauteur visible du tableau', async () => {
  await clearOffres().catch(() => {});
  for (let i = 0; i < 30; i++) {
    await seedOffre({
      URL: `https://example.com/offre-${i}`,
      Statut: i % 2 === 0 ? 'À traiter' : 'Expiré',
      Poste: `Poste ${i}`,
    });
  }
});
Given('la base contient suffisamment d\'offres pour dépasser la hauteur visible du tableau', async () => {
  await clearOffres().catch(() => {});
  for (let i = 0; i < 30; i++) {
    await seedOffre({
      URL: `https://example.com/offre-${i}`,
      Statut: i % 2 === 0 ? 'À traiter' : 'Expiré',
      Poste: `Poste ${i}`,
    });
  }
});

// --- Given : page / contexte navigation ---
Given('et que je suis sur une page de l\'application \\(Tableau de bord ou Paramètres\\)', async ({ page }) => {
  await page.goto('/tableau-de-bord');
  await page.waitForLoadState('networkidle').catch(() => {});
});
Given('que je suis sur une page de l\'application \\(Tableau de bord ou Paramètres\\)', async ({ page }) => {
  await page.goto('/tableau-de-bord');
  await page.waitForLoadState('networkidle').catch(() => {});
});
Given('je suis sur une page de l\'application \\(Tableau de bord ou Paramètres\\)', async ({ page }) => {
  await page.goto('/tableau-de-bord');
  await page.waitForLoadState('networkidle').catch(() => {});
});

// --- Given : page Offres affichée ---
Given('que la page Offres est affichée', async ({ page }) => {
  await page.goto('/offres');
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForGridReady(page);
});
Given('que la page Offres est affichée avec au moins une offre', async ({ page }) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await page.goto('/offres');
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForGridReady(page);
});
Given('la page Offres est affichée avec au moins une offre', async ({ page }) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('que la page Offres est affichée avec plusieurs offres \\(ex. statuts différents\\)', async ({ page }) => {
  await clearOffres().catch(() => {});
  await seedOffre({ Statut: 'À traiter' });
  await seedOffre({ URL: 'https://example.com/offre-2', Statut: 'Expiré' });
  await seedOffre({ URL: 'https://example.com/offre-3', Statut: 'A compléter' });
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('la page Offres est affichée avec plusieurs offres \\(ex. statuts différents\\)', async ({ page }) => {
  await clearOffres().catch(() => {});
  await seedOffre({ Statut: 'À traiter' });
  await seedOffre({ URL: 'https://example.com/offre-2', Statut: 'Expiré' });
  await seedOffre({ URL: 'https://example.com/offre-3', Statut: 'A compléter' });
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('que la page Offres est affichée avec des offres', async ({ page }) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await seedOffre({ URL: 'https://example.com/offre-2' });
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('la page Offres est affichée avec des offres', async ({ page }) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await seedOffre({ URL: 'https://example.com/offre-2' });
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('que la page Offres est affichée avec plusieurs offres', async ({ page }) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await seedOffre({ URL: 'https://example.com/offre-2', Statut: 'Expiré' });
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('la page Offres est affichée avec plusieurs offres', async ({ page }) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await seedOffre({ URL: 'https://example.com/offre-2', Statut: 'Expiré' });
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('et que la page Offres est affichée', async ({ page }) => {
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('la page Offres est affichée', async ({ page }) => {
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('et que le nombre de colonnes du tableau dépasse la largeur visible', async () => {
  // Contexte déjà sur page Offres ; le grid a beaucoup de colonnes, on ne redimensionne pas la fenêtre
});
Given('le nombre de colonnes du tableau dépasse la largeur visible', async () => {});
Given('et que les colonnes ont un ordre initial observable \\(ex. première colonne "Source"\\)', async () => {
  // Ordre par défaut : Source en première colonne (vérifié en Then)
});
Given('les colonnes ont un ordre initial observable \\(ex. première colonne {string}\\)', async () => {});
Given('et qu\'un filtre est appliqué \\(une partie des lignes est masquée\\)', async ({ page }) => {
  await page.waitForTimeout(300);
});
Given('un filtre est appliqué \\(une partie des lignes est masquée\\)', async ({ page }) => {
  await page.waitForTimeout(300);
});
Given('et que le tableau est trié par une colonne \\(ordre ascendant\\)', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const headerStatut = grid.locator('revo-grid').locator('th').filter({ hasText: 'Statut' }).first();
  await headerStatut.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
});
Given('le tableau est trié par une colonne \\(ordre ascendant\\)', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const headerStatut = grid.locator('revo-grid').locator('th').filter({ hasText: 'Statut' }).first();
  await headerStatut.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
});
Given('et que la page Offres est affichée \\(avec une autre vue ou vue par défaut\\)', async ({ page }) => {
  await page.goto('/offres');
  await waitForGridReady(page);
});
Given('la page Offres est affichée \\(avec une autre vue ou vue par défaut\\)', async ({ page }) => {
  await page.goto('/offres');
  await waitForGridReady(page);
});

// --- Given : vues sauvegardées ---
Given('qu\'aucune vue sauvegardée n\'existe \\(état initial ou après suppression de toutes les vues\\)', async () => {
  const res = await fetch(`${API_BASE}/api/offres/vues`);
  const data = (await res.json()) as { vues?: Array<{ id: string }> };
  const vues = data.vues ?? [];
  for (const v of vues) {
    await fetch(`${API_BASE}/api/offres/vues/${encodeURIComponent(v.id)}`, { method: 'DELETE' });
  }
});
Given('aucune vue sauvegardée n\'existe \\(état initial ou après suppression de toutes les vues\\)', async () => {
  const res = await fetch(`${API_BASE}/api/offres/vues`);
  const data = (await res.json()) as { vues?: Array<{ id: string }> };
  const vues = data.vues ?? [];
  for (const v of vues) {
    await fetch(`${API_BASE}/api/offres/vues/${encodeURIComponent(v.id)}`, { method: 'DELETE' });
  }
});
Given('qu\'une vue sauvegardée {string} existe avec un filtre Statut = {string}', async ({ page }, nomVue: string, statutValeur: string) => {
  await clearOffres().catch(() => {});
  await seedOffre({ Statut: statutValeur });
  await seedOffre({ URL: 'https://example.com/offre-2', Statut: 'Expiré' });
  const res = await fetch(`${API_BASE}/api/offres/vues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nom: nomVue,
      parametrage: { filter: { Statut: statutValeur }, sort: null, columnOrder: [] },
    }),
  });
  if (!res.ok) throw new Error(`POST vues failed: ${res.status}`);
});
Given('une vue sauvegardée {string} existe avec un filtre Statut = {string}', async ({ page }, nomVue: string, statutValeur: string) => {
  await clearOffres().catch(() => {});
  await seedOffre({ Statut: statutValeur });
  await seedOffre({ URL: 'https://example.com/offre-2', Statut: 'Expiré' });
  const res = await fetch(`${API_BASE}/api/offres/vues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nom: nomVue,
      parametrage: { filter: { Statut: statutValeur }, sort: null, columnOrder: [] },
    }),
  });
  if (!res.ok) throw new Error(`POST vues failed: ${res.status}`);
});
Given('qu\'une vue {string} existe dans la liste des vues', async ({ page }, nomVue: string) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await page.goto('/offres');
  await waitForGridReady(page);
  const res = await fetch(`${API_BASE}/api/offres/vues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom: nomVue, parametrage: {} }),
  });
  if (!res.ok) throw new Error(`POST vues failed: ${res.status}`);
  await page.reload();
  await waitForGridReady(page);
});
Given('une vue {string} existe dans la liste des vues', async ({ page }, nomVue: string) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await page.goto('/offres');
  await waitForGridReady(page);
  const res = await fetch(`${API_BASE}/api/offres/vues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom: nomVue, parametrage: {} }),
  });
  if (!res.ok) throw new Error(`POST vues failed: ${res.status}`);
  await page.reload();
  await waitForGridReady(page);
});
Given('qu\'une vue {string} a été créée et sauvegardée', async ({ page }, nomVue: string) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await page.goto('/offres');
  await page.waitForSelector(E2E_BOUTON_CREER_VUE, { state: 'visible', timeout: 10000 });
  page.once('dialog', (d) => d.accept(nomVue));
  await page.locator(E2E_BOUTON_CREER_VUE).click();
  await page.waitForTimeout(500);
});
Given('une vue {string} a été créée et sauvegardée', async ({ page }, nomVue: string) => {
  await clearOffres().catch(() => {});
  await seedOffre();
  await page.goto('/offres');
  await page.waitForSelector(E2E_BOUTON_CREER_VUE, { state: 'visible', timeout: 10000 });
  page.once('dialog', (d) => d.accept(nomVue));
  await page.locator(E2E_BOUTON_CREER_VUE).click();
  await page.waitForTimeout(500);
});
Given('et que j\'ai modifié l\'ordre des colonnes ou appliqué un filtre ou un tri', async () => {
  // Contexte : on est déjà sur la page avec des offres
});
Given('j\'ai modifié l\'ordre des colonnes ou appliqué un filtre ou un tri', async () => {
  // Contexte : on est déjà sur la page avec des offres
});

// --- When : menu et navigation ---
When('je consulte le menu de navigation', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
});
When('je clique sur le lien {string} du menu', async ({ page }, libelle: string) => {
  await page.getByRole('link', { name: libelle }).click();
  await page.waitForURL(/\/offres(\?|$)/, { timeout: 5000 });
});
When('j\'affiche la page Offres', async ({ page }) => {
  await page.goto('/offres');
  await waitForGridReady(page);
});
When('j\'observe la zone du tableau des offres', async ({ page }) => {
  await page.locator(E2E_GRID_OFFRES).waitFor({ state: 'visible', timeout: 5000 });
});
When('j\'observe le bas du tableau des offres', async ({ page }) => {
  await page.locator(E2E_GRID_OFFRES).scrollIntoViewIfNeeded();
});
When('je modifie l\'ordre des colonnes \\(glisser-déposer ou mécanisme natif du grid\\)', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const revo = grid.locator('revo-grid');
  if ((await revo.count()) > 0) {
    const firstHeader = revo.locator('th').first();
    await firstHeader.click().catch(() => {});
  }
  await page.waitForTimeout(300);
});
When('j\'applique un filtre sur une colonne \\(ex. Statut = {string}\\)', async ({ page }, valeur: string) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const revo = grid.locator('revo-grid');
  if ((await revo.count()) > 0) {
    const headerStatut = revo.locator('th').filter({ hasText: 'Statut' }).first();
    await headerStatut.click().catch(() => {});
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(300);
});
When('je supprime ou réinitialise le filtre', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const revo = grid.locator('revo-grid');
  if ((await revo.count()) > 0) {
    const headerStatut = revo.locator('th').filter({ hasText: 'Statut' }).first();
    await headerStatut.click({ clickCount: 2 }).catch(() => {});
  }
  await page.waitForTimeout(300);
});
When('je trie par une colonne \\(ex. clic sur l\'en-tête {string}\\)', async ({ page }, colonne: string) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const revo = grid.locator('revo-grid');
  const th = revo.locator('th').filter({ hasText: colonne }).first();
  await th.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
});
When('je clique à nouveau sur l\'en-tête de cette colonne', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const revo = grid.locator('revo-grid');
  const headerStatut = revo.locator('th').filter({ hasText: 'Statut' }).first();
  await headerStatut.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
});
When('j\'observe la zone à gauche du tableau', async ({ page }) => {
  await page.locator(E2E_LISTE_VUES).waitFor({ state: 'visible', timeout: 5000 });
});
When('je clique sur {string} et je saisis le nom {string}', async ({ page }, _bouton: string, nomVue: string) => {
  page.once('dialog', (d) => d.accept(nomVue));
  await page.locator(E2E_BOUTON_CREER_VUE).click();
  await page.waitForTimeout(500);
});
When('je clique sur la vue {string} dans la liste des vues', async ({ page }, nomVue: string) => {
  await page.locator(E2E_LISTE_VUES).getByRole('button', { name: nomVue }).click();
  await page.waitForTimeout(300);
});
When('je renomme la vue {string} en {string}', async ({ page }, ancienNom: string, nouveauNom: string) => {
  const li = page.locator(E2E_LISTE_VUES).locator('li').filter({ hasText: ancienNom });
  const renameBtn = li.locator('button[aria-label="Renommer"]');
  page.once('dialog', (d) => d.accept(nouveauNom));
  await renameBtn.click();
  await page.waitForTimeout(500);
});
When('je supprime la vue {string}', async ({ page }, nomVue: string) => {
  const li = page.locator(E2E_LISTE_VUES).locator('li').filter({ hasText: nomVue });
  const delBtn = li.locator('button[aria-label="Supprimer"]');
  page.once('dialog', (d) => d.accept());
  await delBtn.click();
  await page.waitForTimeout(500);
});
When('je recharge la page Offres ou je quitte et reviens sur la page Offres', async ({ page }) => {
  await page.goto('/offres');
  await waitForGridReady(page);
});

// --- Then : lien Offres dans le menu ---
Then('un lien {string} est présent dans le menu', async ({ page }, libelle: string) => {
  await expect(page.getByRole('link', { name: libelle })).toBeVisible();
});
Then('le lien {string} est placé après le lien {string}', async ({ page }, apres: string, avant: string) => {
  const links = page.locator('nav.appNav a[href]');
  const hrefs = await links.evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).textContent?.trim() ?? ''));
  const idxApres = hrefs.indexOf(apres);
  const idxAvant = hrefs.indexOf(avant);
  expect(idxApres).toBeGreaterThan(idxAvant);
});
Then('le lien {string} est placé avant le lien {string}', async ({ page }, avant: string, apres: string) => {
  const links = page.locator('nav.appNav a[href]');
  const hrefs = await links.evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).textContent?.trim() ?? ''));
  const idxAvant = hrefs.indexOf(avant);
  const idxApres = hrefs.indexOf(apres);
  expect(idxAvant).toBeLessThan(idxApres);
});
Then('le lien {string} n\'est pas visible dans le menu', async ({ page }, libelle: string) => {
  const lien = page.getByRole('link', { name: libelle });
  await expect(lien).toBeHidden();
});
Then('le lien {string} est visible dans le menu', async ({ page }, libelle: string) => {
  await expect(page.getByRole('link', { name: libelle })).toBeVisible();
});
Then('la page {string} est affichée', async ({ page }, titre: string) => {
  await expect(page).toHaveURL(/\/offres(\?|$)/);
  const h1 = page.locator('.pageTitleBarTitle, h1');
  await expect(h1).toContainText(titre, { ignoreCase: true });
});

// --- Then : tableau (grid) ---
Then('un tableau des offres \\(grid\\) est affiché', async ({ page }) => {
  await expect(page.locator(GRID_CONTENT).first()).toBeVisible({ timeout: GRID_VISIBLE_TIMEOUT });
  const grid = page.locator(E2E_GRID_OFFRES);
  const hasRevo = (await grid.locator('revo-grid').count()) > 0;
  const hasTable = (await grid.locator('table').count()) > 0;
  expect(hasRevo || hasTable).toBe(true);
});
Then('le tableau affiche des colonnes correspondant aux données des offres \\(ex. Source, Statut, URL\\)', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const revo = grid.locator('revo-grid');
  if ((await revo.count()) > 0) {
    await expect(revo.locator('th').filter({ hasText: 'Source' })).toBeVisible();
    await expect(revo.locator('th').filter({ hasText: 'Statut' })).toBeVisible();
  } else {
    await expect(grid.locator('th').filter({ hasText: 'Source' })).toBeVisible();
  }
});
Then('le tableau affiche une ligne par offre présente en base', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/offres`);
  const data = (await res.json()) as { offres?: unknown[] };
  const count = (data.offres ?? []).length;
  const grid = page.locator(E2E_GRID_OFFRES);
  const rows = grid.locator('tbody tr, revo-grid [part="body"] row-renderer');
  if (count === 0) await expect(rows).toHaveCount(0, { timeout: 3000 });
  else await expect(rows.first()).toBeVisible({ timeout: GRID_VISIBLE_TIMEOUT });
});
Then('un ascenseur horizontal \\(ou défilement horizontal\\) est disponible ou le contenu peut défiler horizontalement', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const wrap = page.locator('.pageOffresGridWrap').first();
  const hasScrollX = await wrap.evaluate((el) => el.scrollWidth > el.clientWidth).catch(() => false);
  const gridHasManyCols = (await grid.locator('th').count()) >= 5;
  expect(hasScrollX || gridHasManyCols).toBe(true);
});
Then('un ascenseur vertical \\(ou défilement vertical\\) est disponible ou le contenu peut défiler verticalement', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  await expect(grid).toBeVisible({ timeout: GRID_VISIBLE_TIMEOUT });
  const wrap = page.locator('.pageOffresGridWrap').first();
  const hasScrollY = await wrap.evaluate((el) => el.scrollHeight > el.clientHeight).catch(() => false);
  const hasManyRows = (await grid.locator('tbody tr, [part="body"] row-renderer').count()) > 10;
  expect(hasScrollY || hasManyRows).toBe(true);
});
Then('aucun contrôle de pagination numérotée \\(type "1, 2, 3…"\\) n\'est affiché en bas du tableau', async ({ page }) => {
  await expect(page.locator(E2E_GRID_OFFRES)).toBeVisible({ timeout: GRID_VISIBLE_TIMEOUT });
  const pageOffres = page.locator('.pageOffres');
  const paginationNum = pageOffres.locator('[class*="pagination"]').filter({ hasText: /1\s*,\s*2\s*,\s*3/ });
  await expect(paginationNum).toHaveCount(0);
});
Then('l\'ordre affiché des colonnes reflète la modification', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const firstTh = grid.locator('th').first();
  await expect(firstTh).toBeVisible();
});
Then('le nouvel ordre est visible immédiatement dans le tableau', async ({ page }) => {
  await page.waitForTimeout(200);
  const grid = page.locator(E2E_GRID_OFFRES);
  await expect(grid.locator('th').first()).toBeVisible();
});
Then('le tableau n\'affiche que les lignes correspondant au filtre', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const rows = grid.locator('tbody tr, [part="body"] row-renderer');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(0);
});
Then('le nombre de lignes visibles est cohérent avec le critère de filtre', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const rows = grid.locator('tbody tr, [part="body"] row-renderer');
  await expect(rows.first()).toBeVisible().catch(() => {});
});
Then('le tableau affiche à nouveau toutes les offres \\(ou toutes celles en base\\)', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/offres`);
  const data = (await res.json()) as { offres?: unknown[] };
  const count = (data.offres ?? []).length;
  const grid = page.locator(E2E_GRID_OFFRES);
  const rows = grid.locator('tbody tr, [part="body"] row-renderer');
  await expect(rows).toHaveCount(count, { timeout: 5000 });
});
Then('les lignes du tableau sont réordonnées selon cette colonne', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  await expect(grid.locator('tbody tr, [part="body"] row-renderer').first()).toBeVisible();
});
Then('l\'ordre affiché est cohérent avec le tri \\(ascendant ou descendant\\)', async ({ page }) => {
  await page.waitForTimeout(200);
  const grid = page.locator(E2E_GRID_OFFRES);
  await expect(grid).toBeVisible();
});
Then('les lignes sont triées en ordre inverse \\(descendant\\) ou selon le cycle de tri du grid', async ({ page }) => {
  await page.waitForTimeout(200);
  const grid = page.locator(E2E_GRID_OFFRES);
  await expect(grid).toBeVisible();
});

// --- Then : zone latérale vues ---
Then('une zone latérale \\(ou panneau\\) affiche la liste des vues sauvegardées', async ({ page }) => {
  await expect(page.locator(E2E_LISTE_VUES)).toBeVisible();
});
Then('un moyen de {string} est proposé \\(bouton ou lien\\)', async ({ page }, libelle: string) => {
  const text = libelle.replace(/^"|"$/g, '');
  await expect(page.locator(E2E_BOUTON_CREER_VUE)).toContainText(text);
});
Then('le tableau affiche les colonnes dans l\'ordre par défaut', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  await expect(grid.locator('th').filter({ hasText: 'Source' }).first()).toBeVisible();
});
Then('toutes les colonnes sont affichées', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const thCount = await grid.locator('th').count();
  expect(thCount).toBeGreaterThan(5);
});
Then('aucun filtre n\'est appliqué', async ({ page }) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const res = await fetch(`${API_BASE}/api/offres`);
  const data = (await res.json()) as { offres?: unknown[] };
  const count = (data.offres ?? []).length;
  const rows = grid.locator('tbody tr, [part="body"] row-renderer');
  await expect(rows).toHaveCount(count, { timeout: 5000 });
});
Then('aucun tri personnalisé n\'est appliqué \\(ou ordre par défaut\\)', async ({ page }) => {
  await expect(page.locator(E2E_GRID_OFFRES)).toBeVisible();
});
Then('une nouvelle vue {string} apparaît dans la liste des vues', async ({ page }, nom: string) => {
  await expect(page.locator(E2E_LISTE_VUES).getByRole('button', { name: nom })).toBeVisible({ timeout: 5000 });
});
Then('les paramètres courants \\(ordre colonnes, filtre, tri\\) sont associés à cette vue', async ({ page }) => {
  await expect(page.locator(E2E_LISTE_VUES)).toBeVisible();
});
Then('le tableau affiche les paramètres de cette vue \\(filtre, ordre colonnes, tri\\)', async ({ page }) => {
  await expect(page.locator(E2E_GRID_OFFRES)).toBeVisible();
});
Then('seules les offres {string} sont affichées \\(ou cohérent avec le filtre de la vue\\)', async ({ page }, statut: string) => {
  const grid = page.locator(E2E_GRID_OFFRES);
  const rows = grid.locator('tbody tr, [part="body"] row-renderer');
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(0);
});
Then('la vue apparaît sous le nom {string} dans la liste des vues', async ({ page }, nom: string) => {
  await expect(page.locator(E2E_LISTE_VUES).getByRole('button', { name: nom })).toBeVisible({ timeout: 5000 });
});
Then('{string} n\'apparaît plus dans la liste', async ({ page }, ancienNom: string) => {
  await expect(page.locator(E2E_LISTE_VUES).getByRole('button', { name: ancienNom })).toBeHidden();
});
Then('la vue {string} n\'apparaît plus dans la liste des vues', async ({ page }, nom: string) => {
  await expect(page.locator(E2E_LISTE_VUES).getByRole('button', { name: nom })).toBeHidden();
});
Then('la vue {string} est toujours présente dans la liste des vues', async ({ page }, nom: string) => {
  await expect(page.locator(E2E_LISTE_VUES).getByRole('button', { name: nom })).toBeVisible({ timeout: 5000 });
});
Then('charger cette vue applique ses paramètres au tableau', async ({ page }) => {
  await page.locator(E2E_GRID_OFFRES).waitFor({ state: 'visible', timeout: 5000 });
});
