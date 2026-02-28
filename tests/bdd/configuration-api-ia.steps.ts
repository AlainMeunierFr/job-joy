/**
 * Step definitions pour Configuration API IA (US-8.1) — features configuration-api-ia.feature et configuration-api-ia-test.feature.
 * Section "API IA", clé Mistral, tutoriel CréationCompteMistral.html.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const PAGE_PARAMETRES = '/parametres';
const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
const API_KEY_MISTRAL_VALIDE = 'sk-mistral-test-key-123';

const sectionApiIa = () =>
  'details.blocParametrage-api-ia, [data-layout="configuration-api-ia"]';

function ouvrirBlocApiIaSiFerme(page: import('@playwright/test').Page): Promise<void> {
  const details = page.locator('details.blocParametrage-api-ia');
  return details.getAttribute('open').then((open) => {
    if (open === null) {
      return page.locator('#titre-api-ia').click();
    }
  });
}

// --- Contexte ---
Given('que je suis sur la page Paramètres', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
});

// --- CA1 : Section API IA et tutoriel Mistral ---
Then('cette section comporte un lien ou un accès au tutoriel définissant comment obtenir une API Key Mistral et acheter des crédits \\(tokens)', async ({ page }) => {
  await ouvrirBlocApiIaSiFerme(page);
  const zone = page.locator('#zone-tutoriel-api-ia');
  await expect(zone).toBeVisible();
  const content = await zone.textContent();
  expect(content).toMatch(/API|clé|crédit|token|key|Mistral/i);
});

Then(
  'la section API IA affiche en HTML le contenu du tutoriel défini par le projet',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const zone = page.locator('#zone-tutoriel-api-ia');
    await expect(zone).toBeVisible();
    const html = await zone.innerHTML();
    expect(html.length).toBeGreaterThan(50);
    expect(html).toMatch(/<h[12]|Créer|compte|API|clé|Mistral/i);
  }
);

// --- CA2 : Champ API Key masqué ---
Then("la section API IA comporte un champ de saisie pour l'API Key", async ({ page }) => {
  await ouvrirBlocApiIaSiFerme(page);
  const champ = page.locator('[e2eid="e2eid-champ-api-key-ia"]');
  await expect(champ).toBeVisible();
});

Then(
  "ce champ est de type mot de passe ou équivalent \\(saisie masquée)",
  async ({ page }) => {
    const champ = page.locator('[e2eid="e2eid-champ-api-key-ia"]');
    await expect(champ).toHaveAttribute('type', 'password');
  }
);

Given("qu'aucune API Key Mistral n'est enregistrée", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: '' }),
  });
  if (!res.ok) throw new Error(`set-mistral clear failed: ${res.status}`);
});

Given("aucune API Key Mistral n'est enregistrée", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: '' }),
  });
  if (!res.ok) throw new Error(`set-mistral clear failed: ${res.status}`);
});

Then(
  'la section API IA comporte le champ API Key vide ou affichant un placeholder',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const champ = page.locator('[e2eid="e2eid-champ-api-key-ia"]');
    await expect(champ).toBeVisible();
    const value = await champ.inputValue();
    expect(value).toBe('');
  }
);

Then(
  'le champ API Key a un placeholder indiquant qu\'aucune clé n\'est enregistrée (ex. sk-…)',
  async ({ page }) => {
    const champ = page.locator('[e2eid="e2eid-champ-api-key-ia"]');
    const placeholder = await champ.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder).not.toBe('API Key correctement enregistrée');
  }
);

Then('le container API IA est ouvert par défaut', async ({ page }) => {
  const details = page.locator('details.blocParametrage-api-ia');
  await expect(details).toHaveAttribute('open', '');
});

Given("qu'une API Key Mistral a déjà été enregistrée", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY_MISTRAL_VALIDE }),
  });
  if (!res.ok) throw new Error(`set-mistral seed failed: ${res.status}`);
});

Given("une API Key Mistral a déjà été enregistrée", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY_MISTRAL_VALIDE }),
  });
  if (!res.ok) throw new Error(`set-mistral seed failed: ${res.status}`);
});

When('je me rends sur la page Paramètres', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
});

Then(
  'le champ API Key a le placeholder "API Key correctement enregistrée"',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const champ = page.locator('[e2eid="e2eid-champ-api-key-ia"]');
    await expect(champ).toHaveAttribute('placeholder', 'API Key correctement enregistrée');
  }
);

Then("la valeur de l'API Key n'est pas affichée en clair sur la page", async ({ page }) => {
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).not.toContain(API_KEY_MISTRAL_VALIDE);
});

Then('le container API IA est fermé par défaut', async ({ page }) => {
  const details = page.locator('details.blocParametrage-api-ia');
  await expect(details).not.toHaveAttribute('open', '');
});

When('je saisis une nouvelle valeur dans le champ API Key', async ({ page }) => {
  await ouvrirBlocApiIaSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-ia"]').fill('sk-mistral-nouvelle-cle-456');
});

When(
  'que je clique sur le bouton Enregistrer de la section API IA',
  async ({ page }) => {
    await page.locator('[e2eid="e2eid-bouton-enregistrer-ia"]').click();
    await page.waitForLoadState('networkidle');
  }
);
When('je clique sur le bouton Enregistrer de la section API IA', async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-enregistrer-ia"]').click();
  await page.waitForLoadState('networkidle');
});

Then('la nouvelle API Key est enregistrée', async () => {
  const res = await fetch(`${API_BASE}/api/mistral`);
  expect(res.ok).toBe(true);
  const data = (await res.json()) as { hasApiKey?: boolean };
  expect(data.hasApiKey).toBe(true);
});

Then(
  'le champ API Key a le placeholder "API Key correctement enregistrée" sans afficher la valeur',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const champ = page.locator('[e2eid="e2eid-champ-api-key-ia"]');
    await expect(champ).toHaveAttribute('placeholder', 'API Key correctement enregistrée');
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('sk-mistral-nouvelle-cle-456');
  }
);

// --- CA2 : Stockage sécurisé ---
Given("que le champ API Key contient une clé valide", async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocApiIaSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-ia"]').fill(API_KEY_MISTRAL_VALIDE);
});

When("j'enregistre la configuration API IA", async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-enregistrer-ia"]').click();
  await page.waitForLoadState('networkidle');
});

Then(
  'le fichier de paramétrage \\(parametres.json ou équivalent) contient une section ou propriété dédiée à l\'API IA',
  async () => {
    const res = await fetch(`${API_BASE}/api/mistral`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).toHaveProperty('hasApiKey');
  }
);

Then(
  "la valeur de l'API Key n'est pas stockée en clair dans le fichier \\(chiffrement ou masquage)",
  async () => {
    const res = await fetch(`${API_BASE}/api/mistral`);
    expect(res.ok).toBe(true);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data).not.toHaveProperty('apiKey');
    expect(data).toHaveProperty('hasApiKey');
  }
);

Given("que j'ai enregistré une API Key Mistral", async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/test/set-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY_MISTRAL_VALIDE }),
  });
  if (!res.ok) throw new Error(`set-mistral failed: ${res.status}`);
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocApiIaSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-ia"]').fill(API_KEY_MISTRAL_VALIDE);
  await page.locator('[e2eid="e2eid-bouton-enregistrer-ia"]').click();
  await page.waitForLoadState('networkidle');
});
Given("j'ai enregistré une API Key Mistral", async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/test/set-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: API_KEY_MISTRAL_VALIDE }),
  });
  if (!res.ok) throw new Error(`set-mistral failed: ${res.status}`);
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocApiIaSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-api-key-ia"]').fill(API_KEY_MISTRAL_VALIDE);
  await page.locator('[e2eid="e2eid-bouton-enregistrer-ia"]').click();
  await page.waitForLoadState('networkidle');
});

Then('le champ API Key est vide ou masqué', async ({ page }) => {
  await ouvrirBlocApiIaSiFerme(page);
  const champ = page.locator('[e2eid="e2eid-champ-api-key-ia"]');
  await expect(champ).toHaveAttribute('type', 'password');
  const value = await champ.inputValue();
  expect(value).toBe('');
});

Then(
  "aucun élément de la page n'affiche la valeur de l'API Key en clair",
  async ({ page }) => {
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain(API_KEY_MISTRAL_VALIDE);
  }
);

// --- CA3 : Section dédiée ---
Then(
  "cette section comporte au moins un champ associé \\(API Key) et une possibilité d'enregistrement",
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    await expect(page.locator('[e2eid="e2eid-champ-api-key-ia"]')).toBeVisible();
    await expect(page.locator('[e2eid="e2eid-bouton-enregistrer-ia"]')).toBeVisible();
  }
);

Then('la section API IA comporte un bouton {string}', async ({ page }, label: string) => {
  await ouvrirBlocApiIaSiFerme(page);
  const section = page.locator(sectionApiIa());
  const btn = section.getByRole('button', { name: label });
  await expect(btn).toBeVisible();
});

Then(
  "le bouton Enregistrer permet d'enregistrer l'API Key saisie",
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const btn = page.locator('[e2eid="e2eid-bouton-enregistrer-ia"]');
    await expect(btn).toBeVisible();
    expect(await btn.getAttribute('type')).not.toBe('submit');
  }
);

Then(
  "cette section a un titre lisible, le champ API Key et l'accès au tutoriel",
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const section = page.locator(sectionApiIa());
    await expect(section.locator('summary')).toContainText('API IA');
    await expect(page.locator('[e2eid="e2eid-champ-api-key-ia"]')).toBeVisible();
    await expect(page.locator('#zone-tutoriel-api-ia')).toBeVisible();
  }
);

Then(
  "un bouton ou moyen d'enregistrement est présent dans la section",
  async ({ page }) => {
    const section = page.locator(sectionApiIa());
    await expect(section.locator('[e2eid="e2eid-bouton-enregistrer-ia"]')).toBeVisible();
  }
);

// --- configuration-api-ia-test.feature : offre test, Tester API ---
Then(
  'la section API IA comporte un champ ou une zone intitulée "Texte d\'offre à tester"',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const section = page.locator(sectionApiIa());
    await expect(section).toContainText("Texte d'offre à tester");
    await expect(section.locator('[e2eid="e2eid-texte-offre-test"]')).toBeVisible();
  }
);

Then('ce champ est une zone de texte multiligne \\(textarea)', async ({ page }) => {
  await ouvrirBlocApiIaSiFerme(page);
  const ta = page.locator('[e2eid="e2eid-texte-offre-test"]');
  await expect(ta).toBeVisible();
  await expect(await ta.evaluate((el) => (el as HTMLElement).tagName.toLowerCase())).toBe('textarea');
});

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

Then(
  "la section API IA n'affiche pas le bouton récupérer offre pour test",
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const section = page.locator(sectionApiIa());
    await expect(section.locator('[e2eid="e2eid-bouton-recuperer-texte-offre"]')).toHaveCount(0);
  }
);

Then(
  'la section API IA affiche un bouton récupérer offre pour test',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const section = page.locator(sectionApiIa());
    await expect(section.locator('[e2eid="e2eid-bouton-recuperer-texte-offre"]')).toBeVisible();
  }
);

When(
  'je clique sur le bouton récupérer offre pour test de la section API IA',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
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

Given("que l'API Mistral est mockée pour renvoyer une erreur avec un code connu", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-test-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, code: '401', message: 'Invalid API key' }),
  });
  if (!res.ok) throw new Error(`set-mock-test-mistral failed: ${res.status}`);
});
Given("l'API Mistral est mockée pour renvoyer une erreur avec un code connu", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-test-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: false, code: '401', message: 'Invalid API key' }),
  });
  if (!res.ok) throw new Error(`set-mock-test-mistral failed: ${res.status}`);
});

Given("que l'API Mistral est mockée pour renvoyer un résultat d'analyse valide", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-test-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      texte: 'Poste : Développeur. Entreprise : Acme. Résumé : Offre intéressante pour un profil technique.',
    }),
  });
  if (!res.ok) throw new Error(`set-mock-test-mistral failed: ${res.status}`);
});
Given("l'API Mistral est mockée pour renvoyer un résultat d'analyse valide", async () => {
  const res = await fetch(`${API_BASE}/api/test/set-mock-test-mistral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      texte: 'Poste : Développeur. Entreprise : Acme. Résumé : Offre intéressante pour un profil technique.',
    }),
  });
  if (!res.ok) throw new Error(`set-mock-test-mistral failed: ${res.status}`);
});

Given('que le champ "Texte d\'offre à tester" contient un texte', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocApiIaSiFerme(page);
  await page.locator('[e2eid="e2eid-texte-offre-test"]').fill('Texte offre pour test API.');
});
Given('le champ "Texte d\'offre à tester" contient un texte', async ({ page }) => {
  await page.goto(PAGE_PARAMETRES);
  await ouvrirBlocApiIaSiFerme(page);
  await page.locator('[e2eid="e2eid-texte-offre-test"]').fill('Texte offre pour test API.');
});

When(
  'je clique sur le bouton "Tester API" de la section API IA',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    await page.locator('[e2eid="e2eid-bouton-tester-api"]').click();
    await page.waitForLoadState('networkidle');
  }
);

Then(
  "un message ou une zone affiche le code erreur renvoyé par l'API",
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-ia');
    await expect(zone).toBeVisible();
    await expect(zone).toContainText('401');
    await expect(zone).toHaveAttribute('data-type', 'erreur');
  }
);

Then(
  "l'utilisateur peut identifier qu'il s'agit d'une erreur \\(et non du résultat de l'analyse)",
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-ia');
    await expect(zone).toHaveAttribute('data-type', 'erreur');
    await expect(zone).toHaveClass(/zoneResultatTestApiIa--erreur/);
  }
);

Then(
  "un message ou une zone affiche le résultat de l'analyse de manière lisible",
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-ia');
    await expect(zone).toBeVisible();
    await expect(zone).toContainText('Développeur');
    await expect(zone).toContainText('Acme');
    await expect(zone).toHaveAttribute('data-type', 'succes');
  }
);

Then("le résultat n'est pas affiché en JSON brut", async ({ page }) => {
  const zone = page.locator('#zone-resultat-test-ia');
  const content = await zone.textContent();
  expect(content).not.toMatch(/^\s*\{[\s\S]*\}\s*$/);
  await expect(zone).not.toContainText('"texte":');
});

Then(
  'ces éléments \\(champ et boutons) sont contenus dans la section API IA de la page Paramètres',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const section = page.locator(sectionApiIa());
    await expect(section.locator('[e2eid="e2eid-texte-offre-test"]')).toBeVisible();
    await expect(section.locator('[e2eid="e2eid-bouton-tester-api"]')).toBeVisible();
    await expect(section.getByRole('button', { name: 'Tester API' })).toBeVisible();
  }
);

Then(
  'la section API IA comporte un bouton "Pour tester, récupérer les informations de l\'offre qui a le meilleur score"',
  async ({ page }) => {
    await ouvrirBlocApiIaSiFerme(page);
    const section = page.locator(sectionApiIa());
    await expect(section.locator('[e2eid="e2eid-bouton-recuperer-texte-offre"]')).toBeVisible();
  }
);
