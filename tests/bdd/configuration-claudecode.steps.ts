/**
 * Step definitions pour la fonctionnalité Configuration ClaudeCode (US-2.2).
 * Réutilise le test depuis configuration-compte-email.steps.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const PAGE_PARAMETRES = '/parametres';
const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
const API_KEY_CLAUDE_VALIDE = 'sk-ant-test-key-123';

const sectionClaudeCode = () =>
  'details.blocParametrage-claudecode, [data-layout="configuration-claudecode"]';

function ouvrirBlocClaudeCodeSiFerme(page: import('@playwright/test').Page): Promise<void> {
  const details = page.locator('details.blocParametrage-claudecode');
  return details.getAttribute('open').then((open) => {
    if (open === null) {
      return page.locator('#titre-claudecode').click();
    }
  });
}

// --- Contexte (réutilisé par la feature via Contexte) ---
Given('que je suis sur la page Paramètres', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
});

// --- CA1 : Section et tutoriel (step "section intitulée" défini dans parametrage-ia.steps) ---
Then(
  'cette section comporte un lien ou un accès au tutoriel définissant comment obtenir une API Key ClaudeCode et acheter des crédits \\(tokens)',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const zone = page.locator('#zone-tutoriel-claudecode');
    await expect(zone).toBeVisible();
    const content = await zone.textContent();
    expect(content).toMatch(/API|clé|crédit|token|key/i);
  }
);

Then(
  'la section Configuration ClaudeCode affiche en HTML le contenu du tutoriel défini par le projet',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const zone = page.locator('#zone-tutoriel-claudecode');
    await expect(zone).toBeVisible();
    const html = await zone.innerHTML();
    expect(html.length).toBeGreaterThan(50);
    expect(html).toMatch(/<h[12]|Créer|compte|API|clé/i);
  }
);

// --- CA2 : Champ API Key masqué ---
Then(
  "la section Configuration ClaudeCode comporte un champ de saisie pour l'API Key ClaudeCode",
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const champ = page.locator('[e2eid="e2eid-champ-api-key-claudecode"]');
    await expect(champ).toBeVisible();
  }
);

Then(
  "ce champ est de type mot de passe ou équivalent \\(saisie masquée)",
  async ({ page }) => {
    const champ = page.locator('[e2eid="e2eid-champ-api-key-claudecode"]');
    await expect(champ).toHaveAttribute('type', 'password');
  }
);

Given("qu'aucune API Key ClaudeCode n'est enregistrée", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: '' }),
  });
  if (!res.ok) throw new Error(`set-claudecode clear failed: ${res.status}`);
});

Given("aucune API Key ClaudeCode n'est enregistrée", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: '' }),
  });
  if (!res.ok) throw new Error(`set-claudecode clear failed: ${res.status}`);
});

Then(
  'la section Configuration ClaudeCode comporte le champ API Key vide ou affichant un placeholder',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const champ = page.locator('[e2eid="e2eid-champ-api-key-claudecode"]');
    await expect(champ).toBeVisible();
    const value = await champ.inputValue();
    expect(value).toBe('');
  }
);

Then(
  'la section n\'affiche pas l\'indicateur "Déjà enregistrée" ou "Clé configurée"',
  async ({ page }) => {
    const section = page.locator(sectionClaudeCode());
    await expect(section.locator('.indicateurCleEnregistree')).toHaveCount(0);
  }
);

Given("qu'une API Key ClaudeCode a déjà été enregistrée", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY_CLAUDE_VALIDE }),
  });
  if (!res.ok) throw new Error(`set-claudecode seed failed: ${res.status}`);
});

Given("une API Key ClaudeCode a déjà été enregistrée", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY_CLAUDE_VALIDE }),
  });
  if (!res.ok) throw new Error(`set-claudecode seed failed: ${res.status}`);
});

// When 'je me rends sur la page Paramètres' défini dans parametrage-ia.steps.ts

Then(
  'la section Configuration ClaudeCode affiche un indicateur "Déjà enregistrée" ou "Clé configurée"',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const section = page.locator(sectionClaudeCode());
    await expect(section.getByText(/Déjà enregistrée|Clé configurée/)).toBeVisible();
  }
);

Then("la valeur de l'API Key n'est pas affichée en clair sur la page", async ({ page }) => {
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).not.toContain(API_KEY_CLAUDE_VALIDE);
});

When('je saisis une nouvelle valeur dans le champ API Key ClaudeCode', async ({ page }) => {
  await ouvrirBlocClaudeCodeSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-claudecode"]').fill('sk-ant-nouvelle-cle-456');
});

When(
  'que je clique sur le bouton Enregistrer de la section Configuration ClaudeCode',
  async ({ page }) => {
    await page.locator('[e2eid="e2eid-bouton-enregistrer-claudecode"]').click();
    await page.waitForLoadState('networkidle');
  }
);
When(
  'je clique sur le bouton Enregistrer de la section Configuration ClaudeCode',
  async ({ page }) => {
    await page.locator('[e2eid="e2eid-bouton-enregistrer-claudecode"]').click();
    await page.waitForLoadState('networkidle');
  }
);

Then('la nouvelle API Key est enregistrée', async () => {
  const res = await fetch(`${API_BASE}/api/claudecode`);
  expect(res.ok).toBe(true);
  const data = (await res.json()) as { hasApiKey?: boolean };
  expect(data.hasApiKey).toBe(true);
});

Then(
  "un indicateur \"Déjà enregistrée\" ou \"Clé configurée\" est affiché sans la valeur",
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const section = page.locator(sectionClaudeCode());
    await expect(section.getByText(/Déjà enregistrée|Clé configurée/)).toBeVisible();
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('sk-ant-nouvelle-cle-456');
  }
);

// --- CA2 : Stockage sécurisé ---
Given('que le champ API Key ClaudeCode contient une clé valide', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocClaudeCodeSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-claudecode"]').fill(API_KEY_CLAUDE_VALIDE);
});
Given('le champ API Key ClaudeCode contient une clé valide', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocClaudeCodeSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-claudecode"]').fill(API_KEY_CLAUDE_VALIDE);
});

When("j'enregistre la configuration ClaudeCode", async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-enregistrer-claudecode"]').click();
  await page.waitForLoadState('networkidle');
});

Then(
  'le fichier de paramétrage \\(parametres.json ou équivalent) contient une section ou propriété dédiée à ClaudeCode',
  async () => {
    const res = await fetch(`${API_BASE}/api/claudecode`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toHaveProperty('hasApiKey');
  }
);

Then(
  "la valeur de l'API Key n'est pas stockée en clair dans le fichier \\(chiffrement ou masquage)",
  async () => {
    const res = await fetch(`${API_BASE}/api/claudecode`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).not.toHaveProperty('apiKey');
    expect(data).toHaveProperty('hasApiKey');
  }
);

Given("que j'ai enregistré une API Key ClaudeCode", async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/test/set-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY_CLAUDE_VALIDE }),
  });
  if (!res.ok) throw new Error(`set-claudecode failed: ${res.status}`);
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocClaudeCodeSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-claudecode"]').fill(API_KEY_CLAUDE_VALIDE);
  await page.locator('[e2eid="e2eid-bouton-enregistrer-claudecode"]').click();
  await page.waitForLoadState('networkidle');
});
Given("j'ai enregistré une API Key ClaudeCode", async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/test/set-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY_CLAUDE_VALIDE }),
  });
  if (!res.ok) throw new Error(`set-claudecode failed: ${res.status}`);
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocClaudeCodeSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-claudecode"]').fill(API_KEY_CLAUDE_VALIDE);
  await page.locator('[e2eid="e2eid-bouton-enregistrer-claudecode"]').click();
  await page.waitForLoadState('networkidle');
});

Then('le champ API Key ClaudeCode est vide ou masqué', async ({ page }) => {
  await ouvrirBlocClaudeCodeSiFerme(page);
  const champ = page.locator('[e2eid="e2eid-champ-api-key-claudecode"]');
  await expect(champ).toHaveAttribute('type', 'password');
  const value = await champ.inputValue();
  expect(value).toBe('');
});

Then(
  "aucun élément de la page n'affiche la valeur de l'API Key en clair",
  async ({ page }) => {
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain(API_KEY_CLAUDE_VALIDE);
  }
);

// --- CA3 : Section dédiée ---
Then(
  'cette section comporte au moins un champ associé \\(API Key) et une possibilité d\'enregistrement',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    await expect(page.locator('[e2eid="e2eid-champ-api-key-claudecode"]')).toBeVisible();
    await expect(page.locator('[e2eid="e2eid-bouton-enregistrer-claudecode"]')).toBeVisible();
  }
);

Then('la section Configuration ClaudeCode comporte un bouton {string}', async ({ page }, label: string) => {
  await ouvrirBlocClaudeCodeSiFerme(page);
  const section = page.locator(sectionClaudeCode());
  const btn = section.getByRole('button', { name: label });
  await expect(btn).toBeVisible();
});

Then(
  'le bouton Enregistrer permet d\'enregistrer l\'API Key saisie',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const btn = page.locator('[e2eid="e2eid-bouton-enregistrer-claudecode"]');
    await expect(btn).toBeVisible();
    expect(await btn.getAttribute('type')).not.toBe('submit');
  }
);

Then(
  'cette section a un titre lisible, le champ API Key et l\'accès au tutoriel',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const section = page.locator(sectionClaudeCode());
    await expect(section.locator('summary')).toContainText('Configuration ClaudeCode');
    await expect(page.locator('[e2eid="e2eid-champ-api-key-claudecode"]')).toBeVisible();
    await expect(page.locator('#zone-tutoriel-claudecode')).toBeVisible();
  }
);

Then(
  "un bouton ou moyen d'enregistrement est présent dans la section",
  async ({ page }) => {
    const section = page.locator(sectionClaudeCode());
    await expect(section.locator('[e2eid="e2eid-bouton-enregistrer-claudecode"]')).toBeVisible();
  }
);

Then(
  'la page Paramètres comporte une section intitulée {string}',
  async ({ page }, title: string) => {
    const section = page.locator('details.blocParametrage').filter({ has: page.locator(`summary:has-text("${title}")`) });
    await expect(section.first()).toBeVisible();
    await expect(section.first()).toContainText(title);
  }
);

// --- US-2.4 Configuration ClaudeCode - Test : mocks offre-test et test-claudecode ---
Given("qu'aucune offre Airtable n'est disponible en base", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-offre-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hasOffre: false }),
  });
  if (!res.ok) throw new Error(`set-mock-offre-test failed: ${res.status}`);
});
Given("aucune offre Airtable n'est disponible en base", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-offre-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hasOffre: false }),
  });
  if (!res.ok) throw new Error(`set-mock-offre-test failed: ${res.status}`);
});

Given("qu'au moins une offre Airtable est disponible en base", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-offre-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hasOffre: true }),
  });
  if (!res.ok) throw new Error(`set-mock-offre-test failed: ${res.status}`);
});
Given('au moins une offre Airtable est disponible en base', async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-offre-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hasOffre: true }),
  });
  if (!res.ok) throw new Error(`set-mock-offre-test failed: ${res.status}`);
});

Given("qu'au moins une offre Airtable est disponible en base avec un texte connu", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-offre-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hasOffre: true, texte: 'Texte connu pour test BDD.' }),
  });
  if (!res.ok) throw new Error(`set-mock-offre-test failed: ${res.status}`);
});
Given('au moins une offre Airtable est disponible en base avec un texte connu', async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-offre-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hasOffre: true, texte: 'Texte connu pour test BDD.' }),
  });
  if (!res.ok) throw new Error(`set-mock-offre-test failed: ${res.status}`);
});

Given("que l'API ClaudeCode est mockée pour renvoyer une erreur avec un code connu", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, code: '401', message: 'Invalid API key' }),
  });
  if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
});
Given("l'API ClaudeCode est mockée pour renvoyer une erreur avec un code connu", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, code: '401', message: 'Invalid API key' }),
  });
  if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
});

Given("que l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse valide", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      texte: 'Poste : Développeur. Entreprise : Acme. Résumé : Offre intéressante pour un profil technique.',
    }),
  });
  if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
});
Given("l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse valide", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      texte: 'Poste : Développeur. Entreprise : Acme. Résumé : Offre intéressante pour un profil technique.',
    }),
  });
  if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
});

// --- US-2.4 Configuration ClaudeCode - Test : steps UI ---
Then(
  'la section Configuration ClaudeCode comporte un champ ou une zone intitulée "Texte d\'offre à tester"',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const section = page.locator(sectionClaudeCode());
    await expect(section).toContainText("Texte d'offre à tester");
    await expect(section.locator('[e2eid="e2eid-texte-offre-test"]')).toBeVisible();
  }
);

Then('ce champ est une zone de texte multiligne (textarea)', async ({ page }) => {
  await ouvrirBlocClaudeCodeSiFerme(page);
  const ta = page.locator('[e2eid="e2eid-texte-offre-test"]');
  await expect(ta).toBeVisible();
  await expect(await ta.evaluate((el) => (el as HTMLElement).tagName.toLowerCase())).toBe('textarea');
});
Then('ce champ est une zone de texte multiligne \\(textarea)', async ({ page }) => {
  await ouvrirBlocClaudeCodeSiFerme(page);
  const ta = page.locator('[e2eid="e2eid-texte-offre-test"]');
  await expect(ta).toBeVisible();
  await expect(await ta.evaluate((el) => (el as HTMLElement).tagName.toLowerCase())).toBe('textarea');
});

Then(
  'la section Configuration ClaudeCode n\'affiche pas le bouton "Récupérer le texte d\'une offre"',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const section = page.locator(sectionClaudeCode());
    await expect(section.getByRole('button', { name: "Récupérer le texte d'une offre" })).toHaveCount(0);
  }
);

Then(
  'la section Configuration ClaudeCode affiche un bouton "Récupérer le texte d\'une offre"',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const section = page.locator(sectionClaudeCode());
    await expect(section.getByRole('button', { name: "Récupérer le texte d'une offre" })).toBeVisible();
  }
);

When(
  'je clique sur le bouton "Récupérer le texte d\'une offre" de la section Configuration ClaudeCode',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/offre-test') && r.request().method() === 'GET',
      { timeout: 10000 }
    );
    await page.locator('[e2eid="e2eid-bouton-recuperer-texte-offre"]').click();
    await responsePromise;
  }
);

Then(
  'le champ "Texte d\'offre à tester" contient le texte d\'une offre récupérée en base',
  async ({ page }) => {
    const ta = page.locator('[e2eid="e2eid-texte-offre-test"]');
    await expect(ta).toHaveValue('Texte connu pour test BDD.', { timeout: 10000 });
  }
);

Given('que le champ "Texte d\'offre à tester" contient un texte', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocClaudeCodeSiFerme(page);
  await page.locator('[e2eid="e2eid-texte-offre-test"]').fill('Texte offre pour test API.');
});
Given('le champ {string} contient un texte', async ({ page }, fieldName: string) => {
  if (fieldName !== "Texte d'offre à tester") throw new Error(`Champ non supporté: ${fieldName}`);
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocClaudeCodeSiFerme(page);
  await page.locator('[e2eid="e2eid-texte-offre-test"]').fill('Texte offre pour test API.');
});

When(
  'je clique sur le bouton "Tester API" de la section Configuration ClaudeCode',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    await page.locator('[e2eid="e2eid-bouton-tester-api"]').click();
    await page.waitForLoadState('networkidle');
  }
);

Then(
  'un message ou une zone affiche le code erreur renvoyé par l\'API',
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    await expect(zone).toBeVisible();
    await expect(zone).toContainText('401');
    await expect(zone).toHaveAttribute('data-type', 'erreur');
  }
);

Then(
  "l'utilisateur peut identifier qu'il s'agit d'une erreur (et non du résultat de l'analyse)",
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    await expect(zone).toHaveAttribute('data-type', 'erreur');
    await expect(zone).toHaveClass(/zoneResultatTestClaudecode--erreur/);
  }
);
Then(
  "l'utilisateur peut identifier qu'il s'agit d'une erreur \\(et non du résultat de l'analyse)",
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    await expect(zone).toHaveAttribute('data-type', 'erreur');
    await expect(zone).toHaveClass(/zoneResultatTestClaudecode--erreur/);
  }
);

Then(
  'un message ou une zone affiche le résultat de l\'analyse de manière lisible',
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    await expect(zone).toBeVisible();
    await expect(zone).toContainText('Développeur');
    await expect(zone).toContainText('Acme');
    await expect(zone).toHaveAttribute('data-type', 'succes');
  }
);

Then("le résultat n'est pas affiché en JSON brut", async ({ page }) => {
  const zone = page.locator('#zone-resultat-test-claudecode');
  const content = await zone.textContent();
  expect(content).not.toMatch(/^\s*\{[\s\S]*\}\s*$/);
  await expect(zone).not.toContainText('"texte":');
});

Then(
  'ces éléments (champ et boutons) sont contenus dans la section Configuration ClaudeCode de la page Paramètres',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const section = page.locator(sectionClaudeCode());
    await expect(section.locator('[e2eid="e2eid-texte-offre-test"]')).toBeVisible();
    await expect(section.locator('[e2eid="e2eid-bouton-tester-api"]')).toBeVisible();
    await expect(section.getByRole('button', { name: 'Tester API' })).toBeVisible();
  }
);
Then(
  'ces éléments \\(champ et boutons) sont contenus dans la section Configuration ClaudeCode de la page Paramètres',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const section = page.locator(sectionClaudeCode());
    await expect(section.locator('[e2eid="e2eid-texte-offre-test"]')).toBeVisible();
    await expect(section.locator('[e2eid="e2eid-bouton-tester-api"]')).toBeVisible();
    await expect(section.getByRole('button', { name: 'Tester API' })).toBeVisible();
  }
);
