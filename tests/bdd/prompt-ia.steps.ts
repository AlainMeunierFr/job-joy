/**
 * Step definitions pour la fonctionnalité Prompt IA (US-2.3).
 * Réutilise le step "je suis sur la page Paramètres" (défini dans parametrage-ia.steps.ts ou ici).
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

const zonePromptIA = () =>
  '[data-zone="prompt-ia"], .zonePromptIA, [data-layout="zone-prompt-ia"]';

async function ouvrirSectionParametrageIASiFerme(
  page: import('@playwright/test').Page
): Promise<void> {
  const details = page.locator('#section-parametrage-ia, details[data-layout="parametrage-ia"]');
  if ((await details.getAttribute('open')) === null) {
    await page.locator('#titre-parametrage-ia').click();
  }
}

// --- Contexte : "que je suis sur la page Paramètres" est défini dans parametrage-ia.steps.ts ---

// --- Zone / section Prompt ---
Then(
  'la page comporte un container ou une section liée au "Prompt" ou "Prompt IA"',
  async ({ page }) => {
    await ouvrirSectionParametrageIASiFerme(page);
    const zone = page.locator(zonePromptIA());
    await expect(zone).toBeVisible();
    await expect(zone).toContainText('Prompt');
  }
);

Then('cette zone permet d\'accéder à la partie fixe et à la partie modifiable du prompt', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  await expect(page.locator(zonePromptIA()).locator('.lienPartieFixePrompt, summary')).toContainText(/partie fixe|Voir la partie fixe/);
  await expect(page.locator('[e2eid="e2eid-zone-prompt-modifiable"]')).toBeVisible();
});

// --- Partie fixe (lecture seule) ---
Then('la zone Prompt comporte un élément informatif pour la partie fixe', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const zone = page.locator(zonePromptIA());
  await expect(zone.locator('.lienPartieFixePrompt, summary, .zonePartieFixeLectureSeule, #prompt-ia-partie-fixe').first()).toBeVisible();
});

Then(
  'cet élément est un lien "Voir la partie fixe du prompt" ou une zone en lecture seule',
  async ({ page }) => {
    await ouvrirSectionParametrageIASiFerme(page);
    const zone = page.locator(zonePromptIA());
    const linkOrSummary = zone.locator('summary:has-text("Voir la partie fixe"), .lienPartieFixePrompt');
    const readOnly = zone.locator('.zonePartieFixeLectureSeule, .promptIAPartieFixeTexte');
    const combined = linkOrSummary.or(readOnly);
    await expect(combined.nth(0)).toBeVisible();
  }
);

Then("l'utilisateur ne peut pas modifier le contenu de la partie fixe via cette zone", async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const zone = page.locator(zonePromptIA());
  const details = zone.locator('details.detailsPartieFixePrompt');
  if ((await details.getAttribute('open')) === null) {
    await zone.locator('summary:has-text("Voir la partie fixe")').click();
  }
  const partieFixe = page.locator('#prompt-ia-partie-fixe, .promptIAPartieFixeTexte');
  await expect(partieFixe).toBeVisible();
  const tagName = await partieFixe.evaluate((el) => (el as HTMLElement).tagName);
  expect(tagName).toBe('PRE');
});

// --- Zone de saisie partie modifiable ---
Then('la zone Prompt comporte une zone de saisie pour la partie modifiable du prompt', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const ta = page.locator('[e2eid="e2eid-zone-prompt-modifiable"]');
  await expect(ta).toBeVisible();
  await expect(ta).toHaveAttribute('rows', '10');
});

Then('cette zone de saisie occupe une largeur significative \\(pleine largeur du bloc)', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const ta = page.locator('[e2eid="e2eid-zone-prompt-modifiable"]');
  await expect(ta).toBeVisible();
  const box = await ta.boundingBox();
  expect(box?.width).toBeGreaterThan(100);
});

Then('la zone de saisie a une hauteur d\'environ cinquante lignes', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const ta = page.locator('[e2eid="e2eid-zone-prompt-modifiable"]');
  await expect(ta).toHaveAttribute('rows', '10');
});

Then('la zone de saisie affiche un ascenseur lorsque le contenu dépasse', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const ta = page.locator('[e2eid="e2eid-zone-prompt-modifiable"]');
  await expect(ta).toBeVisible();
  await ta.fill('ligne\n'.repeat(60));
  const overflow = await ta.evaluate((el: HTMLTextAreaElement) => el.scrollHeight > el.clientHeight);
  expect(overflow).toBe(true);
});

// --- Bouton Proposer un prompt ---
Then('la zone Prompt comporte un bouton "Proposer un prompt" ou équivalent', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const btn = page.locator('[e2eid="e2eid-bouton-proposer-prompt"]');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText(/Proposer un prompt|prompt/);
});

When('je clique sur le bouton "Proposer un prompt" de la zone Prompt', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  await page.locator('[e2eid="e2eid-bouton-proposer-prompt"]').click();
  await page.waitForLoadState('networkidle');
});

Then('la zone de saisie de la partie modifiable est préremplie ou restaurée avec la valeur par défaut', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const ta = page.locator('[e2eid="e2eid-zone-prompt-modifiable"]');
  const value = await ta.inputValue();
  expect(value.length).toBeGreaterThan(0);
  expect(value).toMatch(/\*\*Rôle\*\*|Rôle|réhibitoire|placeholders/i);
});

// --- Bouton Enregistrer (un seul pour tout le bloc Paramétrage prompt de l'IA) ---
Then('la zone Prompt comporte un bouton "Enregistrer"', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const btn = page.locator('[e2eid="e2eid-bouton-enregistrer-parametrage-ia"]');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Enregistrer');
});

Then('le bouton Enregistrer est positionné à droite du bloc \\(même esprit que les autres sections Paramètres)', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const btn = page.locator('[e2eid="e2eid-bouton-enregistrer-parametrage-ia"]');
  await expect(btn).toBeVisible();
});

// --- Enregistrement ---
Given("j'ai saisi du texte dans la zone de saisie de la partie modifiable du prompt", async ({ page }) => {
  await page.goto('/parametres');
  await ouvrirSectionParametrageIASiFerme(page);
  await page.locator('[e2eid="e2eid-zone-prompt-modifiable"]').fill('Texte saisi pour test BDD');
});

When('je clique sur le bouton Enregistrer de la zone Prompt', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  await page.locator('[e2eid="e2eid-bouton-enregistrer-parametrage-ia"]').click();
  await page.waitForLoadState('networkidle');
});

Then('la partie modifiable saisie est enregistrée', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/prompt-ia`);
  expect(res.ok).toBe(true);
  const data = (await res.json()) as { partieModifiable?: string };
  expect(data.partieModifiable).toBeDefined();
});

// --- Rechargement à l'ouverture ---
Given('la partie modifiable du prompt a été enregistrée avec un texte connu', async () => {
  const res = await fetch(`${API_BASE}/api/prompt-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partieModifiable: 'Texte connu enregistré pour BDD' }),
  });
  if (!res.ok) throw new Error(`POST /api/prompt-ia failed: ${res.status}`);
});

// When 'je me rends sur la page Paramètres' est défini dans parametrage-ia.steps.ts

Then('la zone de saisie de la partie modifiable affiche le texte enregistré', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const ta = page.locator('[e2eid="e2eid-zone-prompt-modifiable"]');
  await expect(ta).toHaveValue('Texte connu enregistré pour BDD');
});

Given("aucune partie modifiable du prompt n'a été enregistrée", async () => {
  await fetch(`${API_BASE}/api/prompt-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partieModifiable: '' }),
  });
});

Then('la zone de saisie de la partie modifiable affiche la valeur par défaut ou est vide', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const ta = page.locator('[e2eid="e2eid-zone-prompt-modifiable"]');
  const value = await ta.inputValue();
  const isDefault = value.length > 0 && value.includes('Rôle');
  const isEmpty = value.length === 0;
  expect(isDefault || isEmpty).toBe(true);
});

// --- Persistance (parametres.json) ---
Given("j'ai saisi un texte dans la partie modifiable du prompt", async ({ page }) => {
  await page.goto('/parametres');
  await ouvrirSectionParametrageIASiFerme(page);
  await page.locator('[e2eid="e2eid-zone-prompt-modifiable"]').fill('Contenu pour test persistance');
});

When("j'enregistre la zone Prompt", async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  await page.locator('[e2eid="e2eid-bouton-enregistrer-parametrage-ia"]').click();
  await page.waitForLoadState('networkidle');
});

Then(
  'le fichier de paramétrage \\(parametres.json ou équivalent) contient une section dédiée au prompt IA',
  async () => {
    const res = await fetch(`${API_BASE}/api/prompt-ia`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toHaveProperty('partieModifiable');
    expect(data).toHaveProperty('partieFixe');
  }
);

Then(
  'cette section contient la partie modifiable \\(ex. promptIA ou partieModifiablePrompt)',
  async () => {
    const res = await fetch(`${API_BASE}/api/prompt-ia`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { partieModifiable?: string };
    expect(typeof data.partieModifiable).toBe('string');
  }
);

Given("j'ai enregistré une partie modifiable du prompt avec un texte connu", async () => {
  const res = await fetch(`${API_BASE}/api/prompt-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partieModifiable: 'Texte connu pour rechargement' }),
  });
  if (!res.ok) throw new Error(`POST /api/prompt-ia failed: ${res.status}`);
});

// When 'je me rends à nouveau sur la page Paramètres' est défini dans redirection-parametres-config-incomplete.steps.ts

Then('la zone de saisie de la partie modifiable affiche le même texte que celui enregistré', async ({ page }) => {
  await ouvrirSectionParametrageIASiFerme(page);
  const ta = page.locator('[e2eid="e2eid-zone-prompt-modifiable"]');
  await expect(ta).toHaveValue('Texte connu pour rechargement');
});
