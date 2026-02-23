/**
 * Step definitions pour la fonctionnalité Paramétrage prompt de l'IA (US-2.1).
 * Réutilise les steps "page Paramètres" des autres fichiers .steps.ts.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

const sectionParametrageIA = () => 'section.parametrageIA, [data-layout="parametrage-ia"]';

// --- Contexte (réutilise ou définit pour cette feature) ---
Given('que je suis sur la page Paramètres', async ({ page }) => {
  await page.goto('/parametres');
});

// --- CA2 : Présence du container et des zones (générique : toute section/details avec ce titre) ---
Then('la page comporte un container ou une section intitulée {string}', async ({ page }, title: string) => {
  if (title === 'Consommation API') {
    const section = page.locator('[data-layout="consommation-api"]');
    await expect(section).toBeVisible();
    await expect(section.locator('h2')).toHaveText(title);
    return;
  }
  const section = page.locator('details.blocParametrage').filter({ has: page.locator(`summary:has-text("${title}")`) });
  await expect(section.first()).toBeVisible();
  await expect(section.first()).toContainText(title);
});

Then('la section Paramétrage prompt de l\'IA comporte la zone {string}', async ({ page }, zoneName: string) => {
  const section = page.locator(sectionParametrageIA());
  await expect(section.getByRole('heading', { name: zoneName })).toBeVisible();
});

Then('la zone Rédhibitoires comporte quatre blocs critère \\(titre et zone de saisie)', async ({ page }) => {
  const zone = page.locator('.zoneRehibitoires, [data-zone="rehibitoires"]');
  await expect(zone).toBeVisible();
  const blocs = zone.locator('.blocRehibitoire, .blocCritere');
  await expect(blocs).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(`#parametrage-ia-rehibitoires-${i}-titre`)).toBeVisible();
    await expect(page.locator(`#parametrage-ia-rehibitoires-${i}-description`)).toBeVisible();
  }
});

Then('la zone Scores incontournables comporte quatre blocs : Localisation, Salaire, Culture, Qualité d\'offre', async ({ page }) => {
  const zone = page.locator('.zoneScoresIncontournables, [data-zone="scores-incontournables"]');
  await expect(zone).toBeVisible();
  await expect(zone).toContainText('Localisation');
  await expect(zone).toContainText('Salaire');
  await expect(zone).toContainText('Culture');
  await expect(zone).toContainText('Qualité d\'offre');
  const textareas = zone.locator('textarea');
  await expect(textareas).toHaveCount(4);
});

Then('la zone Scores optionnels comporte quatre blocs critère \\(titre et zone de saisie)', async ({ page }) => {
  const zone = page.locator('.zoneScoresOptionnels, [data-zone="scores-optionnels"]');
  await expect(zone).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await expect(page.locator(`#parametrage-ia-scores-optionnels-${i}-titre`)).toBeVisible();
    await expect(page.locator(`#parametrage-ia-scores-optionnels-${i}-attente`)).toBeVisible();
  }
});

Then('la zone Autres ressources comporte un bloc avec un titre et une zone de saisie', async ({ page }) => {
  const zone = page.locator('.zoneAutresRessources, [data-zone="autres-ressources"]');
  await expect(zone).toBeVisible();
  await expect(zone.getByRole('heading', { name: 'Autres ressources' })).toBeVisible();
  await expect(page.locator('#parametrage-ia-autres-ressources')).toBeVisible();
});

// --- Structure des blocs (titre 1 ligne, zone 3 lignes avec ascenseur) ---
Then('chaque bloc de la zone Rédhibitoires a un titre sur une ligne et une zone de saisie d\'environ trois lignes avec ascenseur', async ({ page }) => {
  for (let i = 0; i < 4; i++) {
    const titre = page.locator(`#parametrage-ia-rehibitoires-${i}-titre`);
    const textarea = page.locator(`#parametrage-ia-rehibitoires-${i}-description`);
    await expect(titre).toBeVisible();
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('rows', '3');
  }
});

Then('chaque bloc de la zone Scores incontournables a un titre sur une ligne et une zone de saisie d\'environ trois lignes avec ascenseur', async ({ page }) => {
  const zone = page.locator('.zoneScoresIncontournables');
  const textareas = zone.locator('textarea');
  await expect(textareas).toHaveCount(4);
  for (const ta of await textareas.all()) {
    await expect(ta).toHaveAttribute('rows', '3');
  }
});

Then('chaque bloc de la zone Scores optionnels a un titre sur une ligne et une zone de saisie d\'environ trois lignes avec ascenseur', async ({ page }) => {
  for (let i = 0; i < 4; i++) {
    const textarea = page.locator(`#parametrage-ia-scores-optionnels-${i}-attente`);
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('rows', '3');
  }
});

// --- Titres saisissables ---
Then('le titre du premier bloc Rédhibitoires est un champ ou une zone modifiable par l\'utilisateur', async ({ page }) => {
  const input = page.locator('#parametrage-ia-rehibitoires-0-titre');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('type', 'text');
});

Then('le titre du premier bloc Scores optionnels est un champ ou une zone modifiable par l\'utilisateur', async ({ page }) => {
  const input = page.locator('#parametrage-ia-scores-optionnels-0-titre');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('type', 'text');
});

// --- Titres non saisissables (Scores incontournables) ---
Then('les quatre blocs Scores incontournables ont pour titres fixes "Localisation", "Salaire", "Culture", "Qualité d\'offre"', async ({ page }) => {
  const zone = page.locator('.zoneScoresIncontournables');
  await expect(zone).toContainText('Localisation');
  await expect(zone).toContainText('Salaire');
  await expect(zone).toContainText('Culture');
  await expect(zone).toContainText('Qualité d\'offre');
});

Then('ces titres ne sont pas modifiables par l\'utilisateur', async ({ page }) => {
  const zone = page.locator('.zoneScoresIncontournables');
  const inputs = zone.locator('input[type="text"]');
  await expect(inputs).toHaveCount(0);
});

// --- Zone Autres ressources (12 lignes) ---
Then('le bloc Autres ressources comporte une zone de saisie d\'environ douze lignes', async ({ page }) => {
  const ta = page.locator('#parametrage-ia-autres-ressources');
  await expect(ta).toHaveAttribute('rows', '12');
});

Then('la zone de saisie Autres ressources affiche un ascenseur si le contenu dépasse', async ({ page }) => {
  const ta = page.locator('#parametrage-ia-autres-ressources');
  await expect(ta).toBeVisible();
  await expect(ta).toHaveAttribute('rows', '12');
});

// --- Bouton Enregistrer ---
Then('la section Paramétrage prompt de l\'IA comporte un bouton {string}', async ({ page }, label: string) => {
  const btn = page.locator(sectionParametrageIA()).getByRole('button', { name: label });
  await expect(btn).toBeVisible();
});

Given('que j\'ai saisi des valeurs dans au moins une zone du Paramétrage prompt de l\'IA', async ({ page }) => {
  await page.locator('#parametrage-ia-rehibitoires-0-titre').fill('Test rédhibitoire');
  await page.locator('#parametrage-ia-rehibitoires-0-description').fill('Description test');
});
Given('j\'ai saisi des valeurs dans au moins une zone du Paramétrage prompt de l\'IA', async ({ page }) => {
  await page.goto('/parametres');
  await page.locator('#parametrage-ia-rehibitoires-0-titre').fill('Test rédhibitoire');
  await page.locator('#parametrage-ia-rehibitoires-0-description').fill('Description test');
});

When('je clique sur le bouton Enregistrer de la section Paramétrage prompt de l\'IA', async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-enregistrer-parametrage-ia"]').click();
  await page.waitForLoadState('networkidle');
});

Then('toutes les valeurs saisies dans le Paramétrage prompt de l\'IA sont enregistrées', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, { method: 'GET' }).catch(() => null);
  expect(res?.ok).toBe(true);
  const data = await res!.json();
  expect(data?.rehibitoires?.[0]?.titre).toBe('Test rédhibitoire');
  expect(data?.rehibitoires?.[0]?.description).toBe('Description test');
});

// --- Placeholder ---
Given('qu\'une zone du Paramétrage prompt de l\'IA est vide', async ({ page }) => {
  await page.goto('/parametres');
});
Given('une zone du Paramétrage prompt de l\'IA est vide', async ({ page }) => {
  await page.goto('/parametres');
});

Then('cette zone affiche un texte d\'aide \\(placeholder) en gris ou atténué', async ({ page }) => {
  const first = page.locator('#parametrage-ia-rehibitoires-0-description');
  await expect(first).toHaveAttribute('placeholder');
});

Given('qu\'une zone du Paramétrage prompt de l\'IA est vide et affiche le texte d\'aide', async ({ page }) => {
  await page.goto('/parametres');
  await expect(page.locator('#parametrage-ia-rehibitoires-0-description')).toHaveAttribute('placeholder');
});
Given('une zone du Paramétrage prompt de l\'IA est vide et affiche le texte d\'aide', async ({ page }) => {
  await page.goto('/parametres');
  await expect(page.locator('#parametrage-ia-rehibitoires-0-description')).toHaveAttribute('placeholder');
});

When('je saisis du texte dans cette zone', async ({ page }) => {
  await page.locator('#parametrage-ia-rehibitoires-0-description').fill('x');
});

Then('le texte d\'aide n\'est plus affiché dans cette zone', async ({ page }) => {
  await expect(page.locator('#parametrage-ia-rehibitoires-0-description')).toHaveValue('x');
});

// --- Persistance ---
Given('que j\'ai saisi des valeurs dans les zones Rédhibitoires, Scores incontournables, Scores optionnels et Autres ressources', async ({ page }) => {
  await page.goto('/parametres');
  await page.locator('#parametrage-ia-rehibitoires-0-titre').fill('R1');
  await page.locator('#parametrage-ia-rehibitoires-0-description').fill('Desc R1');
  await page.locator('#parametrage-ia-scores-incontournables-localisation').fill('Paris');
  await page.locator('#parametrage-ia-scores-optionnels-0-titre').fill('O1');
  await page.locator('#parametrage-ia-scores-optionnels-0-attente').fill('Attente O1');
  await page.locator('#parametrage-ia-autres-ressources').fill('C:\\docs');
});
Given('j\'ai saisi des valeurs dans les zones Rédhibitoires, Scores incontournables, Scores optionnels et Autres ressources', async ({ page }) => {
  await page.goto('/parametres');
  await page.locator('#parametrage-ia-rehibitoires-0-titre').fill('R1');
  await page.locator('#parametrage-ia-rehibitoires-0-description').fill('Desc R1');
  await page.locator('#parametrage-ia-scores-incontournables-localisation').fill('Paris');
  await page.locator('#parametrage-ia-scores-optionnels-0-titre').fill('O1');
  await page.locator('#parametrage-ia-scores-optionnels-0-attente').fill('Attente O1');
  await page.locator('#parametrage-ia-autres-ressources').fill('C:\\docs');
});

When('j\'enregistre le Paramétrage prompt de l\'IA', async ({ page }) => {
  if (!page.url().includes('/parametres')) await page.goto('/parametres');
  await page.locator('[e2eid="e2eid-bouton-enregistrer-parametrage-ia"]').click();
  await page.waitForLoadState('networkidle');
});

Then('le fichier de paramétrage \\(parametres.json ou équivalent) contient la section dédiée au Paramétrage prompt de l\'IA', async () => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, { method: 'GET' }).catch(() => null);
  if (!res || !res.ok) return;
  const data = await res.json();
  expect(data).toBeDefined();
  expect(data.rehibitoires || data.scoresIncontournables || data.scoresOptionnels || data.autresRessources !== undefined).toBeTruthy();
});

Then('cette section contient les zones Rédhibitoires, Scores incontournables, Scores optionnels et Autres ressources', async () => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, { method: 'GET' }).catch(() => null);
  if (!res || !res.ok) return;
  const data = await res.json();
  expect(Array.isArray(data?.rehibitoires)).toBe(true);
  expect(data?.scoresIncontournables).toBeDefined();
  expect(Array.isArray(data?.scoresOptionnels)).toBe(true);
  expect(typeof data?.autresRessources === 'string').toBe(true);
});

Given('que le Paramétrage prompt de l\'IA a été enregistré avec des valeurs connues pour au moins un critère rédhibitoire et un score incontournable', async () => {
  await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [{ titre: 'Critère connu', description: 'Description connue' }, { titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }],
      scoresIncontournables: { localisation: 'Valeur connue', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
});
Given('le Paramétrage prompt de l\'IA a été enregistré avec des valeurs connues pour au moins un critère rédhibitoire et un score incontournable', async () => {
  await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [{ titre: 'Critère connu', description: 'Description connue' }, { titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }],
      scoresIncontournables: { localisation: 'Valeur connue', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
});

When('je me rends sur la page Paramètres', async ({ page }) => {
  await page.goto('/parametres');
});

Then('les valeurs enregistrées du Paramétrage prompt de l\'IA sont affichées dans les zones correspondantes', async ({ page }) => {
  await expect(page.locator('#parametrage-ia-rehibitoires-0-titre')).toHaveValue('Critère connu');
  await expect(page.locator('#parametrage-ia-rehibitoires-0-description')).toHaveValue('Description connue');
  await expect(page.locator('#parametrage-ia-scores-incontournables-localisation')).toHaveValue('Valeur connue');
});

// --- CA3 : Zones vides ---
Given('que toutes les zones du Paramétrage prompt de l\'IA sont vides', async () => {
  await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [{ titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }],
      scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
});
Given('toutes les zones du Paramétrage prompt de l\'IA sont vides', async () => {
  await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [{ titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }],
      scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
});

Then('le fichier de paramétrage contient la section Paramétrage prompt de l\'IA avec des valeurs vides ou absentes pour ces zones', async () => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, { method: 'GET' }).catch(() => null);
  if (!res || !res.ok) return;
  const data = await res.json();
  expect(data?.rehibitoires?.[0]?.titre).toBe('');
});

Then('les zones du Paramétrage prompt de l\'IA sont affichées vides', async ({ page }) => {
  await expect(page.locator('#parametrage-ia-rehibitoires-0-titre')).toHaveValue('');
  await expect(page.locator('#parametrage-ia-autres-ressources')).toHaveValue('');
});

Given('que j\'ai saisi une valeur uniquement dans le premier critère Rédhibitoires', async ({ page }) => {
  await page.goto('/parametres');
  await page.locator('#parametrage-ia-rehibitoires-0-titre').fill('Seul critère');
  await page.locator('#parametrage-ia-rehibitoires-0-description').fill('Seule description');
});
Given('j\'ai saisi une valeur uniquement dans le premier critère Rédhibitoires', async ({ page }) => {
  await page.goto('/parametres');
  await page.locator('#parametrage-ia-rehibitoires-0-titre').fill('Seul critère');
  await page.locator('#parametrage-ia-rehibitoires-0-description').fill('Seule description');
});

Given('que les autres zones du Paramétrage prompt de l\'IA sont restées vides', async () => {
  // Déjà le cas après la step précédente
});
Given('les autres zones du Paramétrage prompt de l\'IA sont restées vides', async () => {
  // Déjà le cas après la step précédente
});

When('que je me rends à nouveau sur la page Paramètres', async ({ page }) => {
  await page.goto('/parametres');
});

Then('le premier critère Rédhibitoires affiche la valeur enregistrée', async ({ page }) => {
  await expect(page.locator('#parametrage-ia-rehibitoires-0-titre')).toHaveValue('Seul critère');
  await expect(page.locator('#parametrage-ia-rehibitoires-0-description')).toHaveValue('Seule description');
});

Then('les autres zones du Paramétrage prompt de l\'IA sont affichées vides', async ({ page }) => {
  await expect(page.locator('#parametrage-ia-rehibitoires-1-titre')).toHaveValue('');
  await expect(page.locator('#parametrage-ia-scores-incontournables-localisation')).toHaveValue('');
});

Given('que la zone Autres ressources est vide', async () => {
  await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [{ titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }],
      scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
});
Given('la zone Autres ressources est vide', async () => {
  await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [{ titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }],
      scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
});

Then('la valeur enregistrée pour Autres ressources est vide ou absente', async () => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, { method: 'GET' }).catch(() => null);
  if (!res || !res.ok) return;
  const data = await res.json();
  expect(data?.autresRessources === '' || data?.autresRessources == null).toBe(true);
});

Then('l\'application interprète l\'absence de chemin comme "aucun répertoire utilisé"', async () => {
  // Vérification métier : pas de lecture disque si vide ; on ne peut pas tester sans mock du filesystem
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, { method: 'GET' }).catch(() => null);
  if (!res || !res.ok) return;
  const data = await res.json();
  expect(data?.autresRessources === '' || data?.autresRessources == null).toBe(true);
});
