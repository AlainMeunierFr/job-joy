/**
 * Step definitions pour la fonctionnalité Redirection paramètres config incomplète (US-1.6).
 * Réutilise l'instance test de configuration-compte-email.steps.
 * Données en RAM via /api/test/reset-compte et /api/test/set-airtable.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
const CHEMIN_VALIDE = 'INBOX/Offres';
const AIRTABLE_OK = {
  apiKey: 'patTestKeyValide123',
  base: 'appXyz123',
  sources: 'tblSourcesId',
  offres: 'tblOffresId',
};

// --- État connexion email ---
Given('que la connexion email n\'est pas OK', async () => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
});
Given('la connexion email n\'est pas OK', async () => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
});
Given('que la connexion email est OK', async () => {
  const res = await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'test@example.com',
      motDePasse: 'test',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
  if (!res.ok) throw new Error(`Seed compte failed: ${res.status}`);
});
Given('la connexion email est OK', async () => {
  const res = await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'test@example.com',
      motDePasse: 'test',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
  if (!res.ok) throw new Error(`Seed compte failed: ${res.status}`);
});
Given('que {string}', async ({ page }, etat: string) => {
  const e = (etat || '').trim();
  if (e.includes('connexion email') && e.includes('pas OK')) {
    await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  } else if (e.includes('connexion email') && e.includes('OK')) {
    await fetch(`${API_BASE}/api/compte`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adresseEmail: 'test@example.com',
        motDePasse: 'test',
        cheminDossier: CHEMIN_VALIDE,
        imapHost: 'imap.example.com',
        imapPort: 993,
        imapSecure: true,
      }),
    });
  }
  if (e.includes('Airtable') && e.includes('pas OK')) {
    await fetch(`${API_BASE}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {});
  } else if (e.includes('Airtable') && e.includes('OK')) {
    await fetch(`${API_BASE}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(AIRTABLE_OK),
    });
  }
});

// --- État Airtable ---
Given('que Airtable est OK', async () => {
  const res = await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AIRTABLE_OK),
  });
  if (!res.ok) throw new Error(`Seed airtable failed: ${res.status}`);
});
Given('que Airtable n\'est pas OK', async () => {
  await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => {});
});
Given('que la configuration Airtable est OK', async () => {
  const res = await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AIRTABLE_OK),
  });
  if (!res.ok) throw new Error(`Seed airtable failed: ${res.status}`);
});
Given('la configuration Airtable est OK', async () => {
  const res = await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AIRTABLE_OK),
  });
  if (!res.ok) throw new Error(`Seed airtable failed: ${res.status}`);
});

Given('et que la connexion email n\'est pas OK', async () => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
});
Given('et que la connexion email est OK', async () => {
  await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'test@example.com',
      motDePasse: 'test',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
});
Given('et que Airtable est OK', async () => {
  await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AIRTABLE_OK),
  });
});
Given('et que Airtable n\'est pas OK', async () => {
  await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => {});
});
Given('et que la configuration Airtable est OK', async () => {
  await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(AIRTABLE_OK),
  });
});

// --- Arrivée sur l'application ---
When('j\'arrive sur l\'application', async ({ page }) => {
  await page.goto('/');
});
When('je suis sur l\'application \\(page Paramètres ou après redirection\\)', async ({ page }) => {
  await page.goto('/parametres');
});

// --- Redirection ---
Then('je suis redirigé vers la page Paramètres', async ({ page }) => {
  await expect(page).toHaveURL(/\/parametres(\?|$)/, { timeout: 5000 });
});
Then('je ne suis pas redirigé vers la page Paramètres', async ({ page }) => {
  await expect(page).not.toHaveURL(/\/parametres(\?|$)/);
});
Then('je suis redirigé vers le tableau de bord', async ({ page }) => {
  await expect(page).toHaveURL(/\/tableau-de-bord(\?|$)/, { timeout: 5000 });
});

// --- Menu Tableau de bord ---
When('je clique sur le menu "Tableau de bord"', async ({ page }) => {
  await page.getByRole('link', { name: 'Tableau de bord' }).click();
  await page.waitForURL(/\/(parametres|tableau-de-bord)(\?|$)/, { timeout: 5000 });
});
Then('le menu "Tableau de bord" est masqué', async ({ page }) => {
  const lien = page.getByRole('link', { name: 'Tableau de bord' });
  await expect(lien).toBeHidden();
});
Then('le menu "Tableau de bord" n\'est pas visible ou pas cliquable', async ({ page }) => {
  const lien = page.getByRole('link', { name: 'Tableau de bord' });
  await expect(lien).toBeHidden();
});
Then('le menu "Tableau de bord" est visible', async ({ page }) => {
  const lien = page.getByRole('link', { name: 'Tableau de bord' });
  await expect(lien).toBeVisible();
});
Then('le menu "Tableau de bord" est accessible', async ({ page }) => {
  const lien = page.getByRole('link', { name: 'Tableau de bord' });
  await expect(lien).toBeVisible();
  await expect(lien).toHaveAttribute('href', '/tableau-de-bord');
});

// --- Contexte redirection déjà faite ---
Given('que je suis redirigé vers la page Paramètres à l\'arrivée sur l\'application', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/parametres(\?|$)/, { timeout: 5000 });
});
Given('je suis redirigé vers la page Paramètres à l\'arrivée sur l\'application', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/parametres(\?|$)/, { timeout: 5000 });
});

// --- Page Paramètres : Enregistrer, message d'erreur ---
Given('que je suis sur la page Paramètres', async ({ page }) => {
  await page.goto('/parametres');
});
Given('je suis sur la page Paramètres', async ({ page }) => {
  await page.goto('/parametres');
});
Given('que la configuration est incomplète', async () => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => {});
});
Given('la configuration est incomplète', async () => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  await fetch(`${API_BASE}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => {});
});
Given('que la connexion email n\'est pas encore OK', async () => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
});
Given('la connexion email n\'est pas encore OK', async () => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
});
Given('que j\'ai saisi des valeurs dans les champs', async ({ page }) => {
  await page.goto('/parametres');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(CHEMIN_VALIDE);
  await page.locator('[e2eid="e2eid-champ-imap-host"]').fill('imap.example.com');
});
Given('j\'ai saisi des valeurs dans les champs', async ({ page }) => {
  await page.goto('/parametres');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(CHEMIN_VALIDE);
  await page.locator('[e2eid="e2eid-champ-imap-host"]').fill('imap.example.com');
});

When('je clique sur le bouton Enregistrer', async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-enregistrer"]').click();
  await page.waitForURL(/\/(parametres|tableau-de-bord)(\?|$)/, { timeout: 10000 });
});

Then('les données saisies sont sauvegardées', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/compte`);
  const data = (await res.json()) as { cheminDossier?: string };
  expect(data.cheminDossier).toBe(CHEMIN_VALIDE);
});
Then('je reste sur la page Paramètres ou un message confirme l\'enregistrement partiel', async ({ page }) => {
  const onParametres = page.url().includes('/parametres');
  const hasFeedback = await page.locator('#feedback-enregistrement').isVisible();
  expect(onParametres || hasFeedback).toBe(true);
});
Then('un message d\'erreur est affiché', async ({ page }) => {
  const feedback = page.locator('#feedback-enregistrement');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('data-type', 'erreur');
});
Then('le message indique ce qu\'il reste à terminer \\(connexion email et/ou Airtable\\)', async ({ page }) => {
  const text = await page.locator('#feedback-enregistrement').textContent();
  expect(text).toMatch(/il reste à terminer|reste à terminer/i);
  expect(text).toMatch(/connexion email|airtable/i);
});
Then('le message indique ce qu\'il reste à terminer \\(connexion email et\\/ou Airtable\\)', async ({ page }) => {
  const text = await page.locator('#feedback-enregistrement').textContent();
  expect(text).toMatch(/il reste à terminer|reste à terminer/i);
  expect(text).toMatch(/connexion email|airtable/i);
});
Then('le message indique {string}', async ({ page }, element: string) => {
  const text = await page.locator('#feedback-enregistrement').textContent();
  const lower = (text ?? '').toLowerCase();
  if (element.includes('connexion email') || element.includes('compte email')) {
    expect(lower).toMatch(/connexion email|compte email|reste à terminer/);
  } else if (element.includes('Airtable')) {
    expect(lower).toMatch(/airtable|reste à terminer/);
  } else if (element.includes('connexion email et') && element.includes('Airtable')) {
    expect(lower).toMatch(/connexion email|airtable|reste à terminer/);
  } else {
    expect(text).toContain(element);
  }
});

// --- Configuration complète : pas d'erreur, redirection ---
Then('aucun message d\'erreur n\'est affiché', async ({ page }) => {
  const feedback = page.locator('#feedback-enregistrement');
  const type = await feedback.getAttribute('data-type');
  const text = await feedback.textContent();
  expect(type).not.toBe('erreur');
  expect(text ?? '').not.toMatch(/il reste à terminer/i);
});
Then('un message de succès ou une confirmation est affiché', async ({ page }) => {
  const feedback = page.locator('#feedback-enregistrement');
  const text = await feedback.textContent() ?? '';
  const hasSuccess = text.includes('Paramètres enregistrés') || text.includes('enregistré') || page.url().includes('tableau-de-bord');
  expect(hasSuccess).toBe(true);
});
Then('la page affichée est le tableau de bord', async ({ page }) => {
  await expect(page).toHaveURL(/\/tableau-de-bord(\?|$)/);
  await expect(page.locator('h1')).toContainText('Tableau de bord');
});
Then('je peux accéder au tableau de bord \\(page d\'accueil ou tableau de bord affiché\\)', async ({ page }) => {
  const url = page.url();
  const onRoot = url.endsWith('/') || url.endsWith('/tableau-de-bord');
  const hasTitle = await page.locator('h1').filter({ hasText: 'Tableau de bord' }).isVisible();
  expect(onRoot || hasTitle).toBe(true);
});

// --- Données conservées ---
Given('que j\'ai enregistré des paramètres partiels \\(par exemple uniquement le compte email\\)', async () => {
  await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'partiel@example.com',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
});
Given('j\'ai enregistré des paramètres partiels \\(par exemple uniquement le compte email\\)', async () => {
  await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'partiel@example.com',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
});
When('je me rends à nouveau sur la page Paramètres', async ({ page }) => {
  await page.goto('/parametres');
});
Then('les valeurs précédemment enregistrées sont affichées', async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-champ-chemin-dossier"]')).toHaveValue(CHEMIN_VALIDE);
  await expect(page.locator('[e2eid="e2eid-champ-imap-host"]')).toHaveValue('imap.example.com');
});
Then('aucune donnée enregistrée n\'a été perdue', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/compte`);
  const data = (await res.json()) as { adresseEmail?: string; cheminDossier?: string };
  expect(data.cheminDossier).toBe(CHEMIN_VALIDE);
});

// --- Élément manquant (plan du scénario) ---
Given('et que {string}', async ({ page }, element: string) => {
  const e = (element || '').trim();
  if (e.includes('connexion email') && e.includes('pas OK')) {
    await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  } else if (e.includes('Airtable') && e.includes('pas OK')) {
    await fetch(`${API_BASE}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {});
  } else if (e.includes('connexion email et Airtable') && e.includes('pas OK')) {
    await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
    await fetch(`${API_BASE}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch(() => {});
  }
});
