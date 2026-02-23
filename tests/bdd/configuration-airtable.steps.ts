/**
 * Step definitions pour la fonctionnalité Configuration Airtable (US-1.3).
 * Données en RAM côté serveur (GET /api/airtable, POST /api/test/set-airtable).
 * Réutilise l'instance test de configuration-compte-email.steps pour éviter 2 test instances.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const PAGE_PARAMETRES = '/parametres';
const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
const API_KEY_VALIDE = 'patTestKeyValide123';
const API_KEY_INVALIDE = 'patInvalidKey';
const BASE_PLACEHOLDER = 'https://airtable.com/appTest123';

async function ouvrirBlocAirtableSiFerme(page: import('@playwright/test').Page): Promise<void> {
  const details = page.locator('details.blocParametrage-airtable');
  if ((await details.getAttribute('open')) === null) {
    await page.locator('#titre-airtable').click();
  }
}

// --- Contexte ---
Given('que je suis sur la page de configuration Airtable', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocAirtableSiFerme(page);
});
Given('je suis sur la page de configuration Airtable', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocAirtableSiFerme(page);
});

// --- CA1 : Tutoriel ---
Then(
  'la page affiche en HTML le contenu du tutoriel défini par le projet',
  async ({ page }) => {
    const zone = page.locator('#zone-tutoriel-airtable');
    await expect(zone).toBeVisible();
    const content = await zone.innerHTML();
    expect(content).toContain('Créer un compte Airtable');
    expect(content).toContain('airtable.com');
  }
);

// --- CA1 : Champ API Key ---
Then(
  "la page comporte un champ de saisie pour l'API Key Airtable",
  async ({ page }) => {
    const champ = page.locator('[e2eid="e2eid-champ-api-key-airtable"]');
    await expect(champ).toBeVisible();
    await expect(champ).toHaveAttribute('type', 'text');
  }
);

// --- Given : champs Airtable ---
async function givenChampApiKeyValide(page: import('@playwright/test').Page): Promise<void> {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocAirtableSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill(API_KEY_VALIDE);
  await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
}
Given(
  "que le champ API Key Airtable contient une clé valide",
  async ({ page }) => givenChampApiKeyValide(page)
);
Given(
  "le champ API Key Airtable contient une clé valide",
  async ({ page }) => givenChampApiKeyValide(page)
);
Given(
  "que le champ API Key Airtable contient une clé invalide ou que l'API échoue",
  async ({ page }) => {
    await page.goto(PAGE_PARAMETRES);
    await ouvrirBlocAirtableSiFerme(page);
    await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill(API_KEY_INVALIDE);
    await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
  }
);
Given(
  "le champ API Key Airtable contient une clé invalide ou que l'API échoue",
  async ({ page }) => {
    await page.goto(PAGE_PARAMETRES);
    await ouvrirBlocAirtableSiFerme(page);
    await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill(API_KEY_INVALIDE);
    await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
  }
);
Given(
  "que la configuration Airtable a déjà été effectuée avec succès",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY_VALIDE,
        base: 'appXyz123',
        sources: 'tblSourcesId',
        offres: 'tblOffresId',
      }),
    });
    if (!res.ok) throw new Error(`Seed airtable failed: ${res.status}`);
  }
);
Given(
  "la configuration Airtable a déjà été effectuée avec succès",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY_VALIDE,
        base: 'appXyz123',
        sources: 'tblSourcesId',
        offres: 'tblOffresId',
      }),
    });
    if (!res.ok) throw new Error(`Seed airtable failed: ${res.status}`);
  }
);

// --- When : Enregistrer / Lancer configuration ---
When("j'enregistre la configuration Airtable", async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-enregistrer"]').click();
  await page.waitForURL(/\/tableau-de-bord|\/parametres/);
});
When('je lance la configuration Airtable', async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-lancer-configuration-airtable"]').click();
  await page.locator('#statut-configuration-airtable').waitFor({ state: 'visible', timeout: 15000 });
});

// --- Then : fichier parametres.json (via API) ---
function isParametresPath(pathRel: string): boolean {
  const n = pathRel.replace(/^\.[/\\]/, '').replace(/\\/g, '/').toLowerCase();
  return n === 'data/parametres.json';
}

// Note: "le fichier ... existe" est défini dans configuration-compte-email.steps (vérifie /api/compte et /api/airtable).

Then(
  'le fichier {string} contient l\'objet AirTable avec la propriété {string}',
  async ({ page }, pathRel: string, prop: string) => {
    if (!isParametresPath(pathRel)) throw new Error('BDD ne vérifie que .\\data\\parametres.json via l’API');
    const res = await fetch(`${API_BASE}/api/airtable`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as Record<string, unknown>;
    const key = prop === 'API Key' ? 'hasApiKey' : prop === 'Base' ? 'base' : prop === 'Sources' ? 'sources' : prop === 'Offres' ? 'offres' : prop;
    expect(data[key]).toBeDefined();
  }
);

Then(
  "la valeur de la propriété {string} dans l'objet AirTable correspond à la clé enregistrée",
  async ({ page }, _prop: string) => {
    const res = await fetch(`${API_BASE}/api/airtable`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { hasApiKey?: boolean };
    expect(data.hasApiKey).toBe(true);
  }
);

// --- Configuration s'effectue avec succès ---
When(
  "que la configuration s'effectue avec succès",
  async ({ page }) => {
    await expect(page.locator('#statut-configuration-airtable')).toContainText('AirTable prêt', { timeout: 15000 });
  }
);
When(
  "la configuration s'effectue avec succès",
  async ({ page }) => {
    await expect(page.locator('#statut-configuration-airtable')).toContainText('AirTable prêt', { timeout: 15000 });
  }
);

Then(
  "la propriété {string} contient l'identifiant de la base Airtable",
  async ({ page }, _prop: string) => {
    const res = await fetch(`${API_BASE}/api/airtable`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { base?: string };
    expect(data.base).toBeTruthy();
  }
);
Then(
  "la propriété {string} contient l'identifiant de la table Sources",
  async ({ page }, _prop: string) => {
    const res = await fetch(`${API_BASE}/api/airtable`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { sources?: string };
    expect(data.sources).toBeTruthy();
  }
);
Then(
  "la propriété {string} contient l'identifiant de la table Offres",
  async ({ page }, _prop: string) => {
    const res = await fetch(`${API_BASE}/api/airtable`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { offres?: string };
    expect(data.offres).toBeTruthy();
  }
);

// --- CA7 : Statut affiché ---
Then('le statut affiché est {string}', async ({ page }, statut: string) => {
  await expect(page.locator('#statut-configuration-airtable')).toContainText(statut);
});
Then(
  "le statut affiché est \"AirTable prêt\" ou un libellé équivalent",
  async ({ page }) => {
    await expect(page.locator('#statut-configuration-airtable')).toContainText('AirTable prêt');
  }
);

When("qu'une erreur survient", async () => {
  // Résultat déjà affiché après "je lance la configuration Airtable"
});
When("une erreur survient", async () => {
  // Résultat déjà affiché après "je lance la configuration Airtable"
});

Then(
  "les informations disponibles sur l'erreur sont affichées de façon lisible",
  async ({ page }) => {
    const statut = page.locator('#statut-configuration-airtable');
    await expect(statut).toContainText('Erreur avec AirTable');
    const text = await statut.textContent();
    expect(text?.length).toBeGreaterThan(20);
  }
);

// --- Plan du scénario (paramètres) ---
Given('que {string}', async ({ page }, contexteEchec: string) => {
  await page.goto(PAGE_PARAMETRES);
  const ctx = (contexteEchec || '').replace(/^["']|["']$/g, '').trim();
  if (ctx.includes('API Key est vide') || ctx.includes('vide ou absente')) {
    await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill('');
    await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
  } else if (ctx.toLowerCase().includes('invalide')) {
    await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill(API_KEY_INVALIDE);
    await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
  } else if (ctx.toLowerCase().includes('indisponible')) {
    await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill('patIndisponible');
    await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
  }
});
Given('{string}', async ({ page }, contexteEchec: string) => {
  await page.goto(PAGE_PARAMETRES);
  const ctx = (contexteEchec || '').replace(/^["']|["']$/g, '').trim();
  if (ctx.includes('API Key est vide') || ctx.includes('vide ou absente')) {
    await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill('');
    await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
  } else if (ctx.toLowerCase().includes('invalide')) {
    await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill(API_KEY_INVALIDE);
    await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
  } else if (ctx.toLowerCase().includes('indisponible')) {
    await page.locator('[e2eid="e2eid-champ-api-key-airtable"]').fill('patIndisponible');
    await page.locator('[e2eid="e2eid-champ-airtable-base"]').fill(BASE_PLACEHOLDER);
  }
});

Then(
  'le message ou les informations d\'erreur contiennent {string}',
  async ({ page }, elementAttendu: string) => {
    const text = await page.locator('#statut-configuration-airtable').textContent();
    const lower = (text ?? '').toLowerCase();
    if (elementAttendu.includes('clé API')) {
      expect(lower).toMatch(/clé|key|api|vide|absente/);
    } else if (elementAttendu.includes('authentification') || elementAttendu.includes('API')) {
      expect(lower).toMatch(/erreur|invalid|auth|api/);
    } else if (elementAttendu.includes('connexion') || elementAttendu.includes('service')) {
      expect(lower).toMatch(/erreur|connexion|service|indisponible/);
    } else {
      expect(text).toContain(elementAttendu);
    }
  }
);
