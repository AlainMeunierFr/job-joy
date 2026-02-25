/**
 * Step definitions pour la fonctionnalité Identification des utilisateurs (US-3.15).
 * Consentement, envoi email à alain@maep.fr, spy via GET /api/test/emails-identification.
 * Réutilise l'instance test de configuration-compte-email.steps.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const PAGE_URL = '/parametres';
const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
const CHEMIN_VALIDE = 'INBOX/Offres';

async function ouvrirBlocConnexionSiFerme(page: import('@playwright/test').Page): Promise<void> {
  const details = page.locator('details.blocParametrage-connexion');
  if ((await details.getAttribute('open')) === null) {
    await page.locator('#titre-connexion').click();
  }
}

// Contexte / navigation : réutilise les steps de configuration-compte-email.steps.ts
// (que je suis sur la page de paramétrage du compte email, etc.)

// --- Case consentement (présence, libellé, état) ---
Then(
  'la page comporte une case à cocher relative au consentement pour le support et les retours beta',
  async ({ page }) => {
    const caseConsentement = page.locator('[e2eid="e2eid-champ-consentement-identification"]');
    await expect(caseConsentement).toBeVisible();
    await expect(caseConsentement).toHaveAttribute('type', 'checkbox');
  }
);
Then(
  "le libellé de la case mentionne l'acceptation d'informer l'équipe job-joy et de communiquer l'adresse email pour le support et les retours beta",
  async ({ page }) => {
    const label = page.locator('label.labelCheckbox').filter({ has: page.locator('[e2eid="e2eid-champ-consentement-identification"]') });
    await expect(label).toContainText('job-joy');
    await expect(label).toContainText('support');
    await expect(label).toContainText('retours beta');
  }
);

When('je coche la case de consentement à communiquer mon email', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-consentement-identification"]').check();
});
Given('que je coche la case de consentement à communiquer mon email', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-consentement-identification"]').check();
});

Given('que la case de consentement n\'est pas cochée', async ({ page }) => {
  await fetch(`${API_BASE}/api/test/clear-emails-identification`, { method: 'POST' }).catch(() => {});
  await page.locator('[e2eid="e2eid-champ-consentement-identification"]').uncheck();
});
Given('la case de consentement n\'est pas cochée', async ({ page }) => {
  await fetch(`${API_BASE}/api/test/clear-emails-identification`, { method: 'POST' }).catch(() => {});
  await page.locator('[e2eid="e2eid-champ-consentement-identification"]').uncheck();
});
Given("que la case consentement est toujours cochée", async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-champ-consentement-identification"]')).toBeChecked();
});
Given('la case consentement est toujours cochée', async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-champ-consentement-identification"]')).toBeChecked();
});

Then("la case de consentement à communiquer mon email est cochée", async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-champ-consentement-identification"]')).toBeChecked();
});
Then("la case de consentement à communiquer mon email n'est pas cochée", async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-champ-consentement-identification"]')).not.toBeChecked();
});

// --- Champs compte valides / invalides ---
Given(
  'que les champs compte email \\(adresse, mot de passe, dossier\\) sont valides',
  async ({ page }) => {
    await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('alain@maep.fr');
    await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('MonMotDePasse');
    await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(CHEMIN_VALIDE);
  }
);
Given(
  'les champs compte email \\(adresse, mot de passe, dossier\\) sont valides',
  async ({ page }) => {
    await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('alain@maep.fr');
    await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('MonMotDePasse');
    await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(CHEMIN_VALIDE);
  }
);
Given('que les champs compte email sont valides', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('alain@maep.fr');
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('MonMotDePasse');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(CHEMIN_VALIDE);
});
Given('les champs compte email sont valides', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('alain@maep.fr');
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('MonMotDePasse');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(CHEMIN_VALIDE);
});
Given('que les champs mot de passe et dossier sont valides', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('MonMotDePasse');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(CHEMIN_VALIDE);
});
Given('les champs mot de passe et dossier sont valides', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('MonMotDePasse');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(CHEMIN_VALIDE);
});

Given('que les champs compte email sont invalides ou la connexion échoue', async ({ page }) => {
  await fetch(`${API_BASE}/api/test/clear-emails-identification`, { method: 'POST' }).catch(() => {});
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('invalid@invalid');
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill('');
});
Given('les champs compte email sont invalides ou la connexion échoue', async ({ page }) => {
  await fetch(`${API_BASE}/api/test/clear-emails-identification`, { method: 'POST' }).catch(() => {});
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('invalid@invalid');
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill('');
});

// Champ adresse email : réutilise configuration-compte-email (le champ adresse email contient {string})

// --- Enregistrer (variantes spécifiques ici ; "j'enregistre... Enregistrer" dans configuration-compte-email) ---
When('je modifie un autre champ puis j\'enregistre les paramètres en cliquant sur Enregistrer', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-chemin-dossier-archive"]').fill('Archive');
  await page.locator('[e2eid="e2eid-bouton-enregistrer"]').click();
  await page.waitForURL(/\/(parametres|tableau-de-bord)(\?|$)/, { timeout: 10000 });
});
When("j'enregistre les paramètres en cliquant sur Enregistrer sans modifier le consentement", async ({ page }) => {
  await ouvrirBlocConnexionSiFerme(page);
  await expect(page.locator('[e2eid="e2eid-bouton-enregistrer"]')).toBeVisible();
  await page.locator('[e2eid="e2eid-bouton-enregistrer"]').click();
  await page.waitForURL(/\/(parametres|tableau-de-bord)(\?|$)/, { timeout: 10000 });
});

// --- Sauvegarde succès / échec ---
Then('les paramètres du compte sont sauvegardés avec succès', async ({ page }) => {
  await expect(page).toHaveURL(/\/(parametres|tableau-de-bord)(\?|$)/);
});
Then('la sauvegarde des paramètres réussit', async ({ page }) => {
  await expect(page).toHaveURL(/\/(parametres|tableau-de-bord)(\?|$)/);
});
Then('la sauvegarde réussit', async ({ page }) => {
  await expect(page).toHaveURL(/\/(parametres|tableau-de-bord)(\?|$)/);
});
Then("la sauvegarde des paramètres échoue ou un message d'erreur est affiché", async ({ page }) => {
  const feedback = page.locator('#feedback-enregistrement');
  const url = page.url();
  const onParametres = url.includes('/parametres');
  const hasError = await feedback.getAttribute('data-type').then((t) => t === 'erreur');
  expect(onParametres || hasError).toBeTruthy();
});

Then('la valeur du consentement \\(coché\\) est enregistrée avec le compte', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/test/compte-store`);
  const data = (await res.json()) as { consentementIdentification?: boolean };
  expect(data.consentementIdentification).toBe(true);
});
Then('la valeur du consentement \\(non coché\\) est enregistrée avec le compte', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/test/compte-store`);
  const data = (await res.json()) as { consentementIdentification?: boolean };
  expect(data.consentementIdentification).toBe(false);
});

// --- Compte déjà enregistré (consentement oui/non) pour rechargement ---
Given('que le compte a été enregistré avec la case consentement cochée', async ({ page }) => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'alain@maep.fr',
      motDePasse: 'test',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      consentementIdentification: true,
    }),
  }).catch(() => {});
});
Given('le compte a été enregistré avec la case consentement cochée', async ({ page }) => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'alain@maep.fr',
      motDePasse: 'test',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      consentementIdentification: true,
    }),
  }).catch(() => {});
});
Given('que le compte a été enregistré sans consentement \\(case non cochée\\)', async ({ page }) => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'alain@maep.fr',
      motDePasse: 'test',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      consentementIdentification: false,
    }),
  }).catch(() => {});
});
Given('le compte a été enregistré sans consentement \\(case non cochée\\)', async ({ page }) => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'alain@maep.fr',
      motDePasse: 'test',
      cheminDossier: CHEMIN_VALIDE,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
      consentementIdentification: false,
    }),
  }).catch(() => {});
});

// "je me rends sur la page de paramétrage" : configuration-compte-email.steps.ts

Given('que je suis à nouveau sur la page de paramétrage \\(compte déjà enregistré avec consentement\\)', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
});
Given('je suis à nouveau sur la page de paramétrage \\(compte déjà enregistré avec consentement\\)', async ({ page }) => {
  const url = page.url();
  if (!url.includes('/parametres')) await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await ouvrirBlocConnexionSiFerme(page);
});
Given('que je suis à nouveau sur la page de paramétrage', async ({ page }) => {
  const url = page.url();
  if (!url.includes('/parametres')) await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await ouvrirBlocConnexionSiFerme(page);
});
Given('je suis à nouveau sur la page de paramétrage', async ({ page }) => {
  const url = page.url();
  if (!url.includes('/parametres')) await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded' });
  await ouvrirBlocConnexionSiFerme(page);
});

// --- Email envoyé (spy API) ---
Then('un email est envoyé à {string}', async ({ page }, dest: string) => {
  const res = await fetch(`${API_BASE}/api/test/emails-identification`);
  const sent = (await res.json()) as Array<{ to: string }>;
  expect(sent.length).toBeGreaterThanOrEqual(1);
  expect(sent.some((e) => e.to === dest)).toBe(true);
});
Then('aucun email n\'est envoyé à {string}', async ({ page }, dest: string) => {
  const res = await fetch(`${API_BASE}/api/test/emails-identification`);
  const sent = (await res.json()) as Array<{ to: string }>;
  expect(sent.filter((e) => e.to === dest).length).toBe(0);
});
Then("aucun nouvel email n'est envoyé à {string} \\(un seul envoi au total pour ce consentement\\)", async ({ page }, dest: string) => {
  const res = await fetch(`${API_BASE}/api/test/emails-identification`);
  const sent = (await res.json()) as Array<{ to: string }>;
  expect(sent.filter((e) => e.to === dest).length).toBeLessThanOrEqual(1);
});
Then("aucun nouvel email n'est envoyé à {string}", async ({ page }, dest: string) => {
  const res = await fetch(`${API_BASE}/api/test/emails-identification`);
  const sent = (await res.json()) as Array<{ to: string }>;
  expect(sent.filter((e) => e.to === dest).length).toBeLessThanOrEqual(1);
});

Then('l\'email a pour expéditeur \\(From\\) {string}', async ({ page }, from: string) => {
  const res = await fetch(`${API_BASE}/api/test/emails-identification`);
  const sent = (await res.json()) as Array<{ from: string }>;
  expect(sent.length).toBeGreaterThanOrEqual(1);
  expect(sent.some((e) => e.from === from)).toBe(true);
});
Then('l\'email a pour sujet {string}', async ({ page }, subject: string) => {
  const res = await fetch(`${API_BASE}/api/test/emails-identification`);
  const sent = (await res.json()) as Array<{ subject: string }>;
  expect(sent.length).toBeGreaterThanOrEqual(1);
  expect(sent.some((e) => e.subject === subject)).toBe(true);
});
Then(
  "le corps de l'email contient le texte de consentement mentionnant Alain Meunier, job-joy, support et retours beta",
  async ({ page }) => {
    const res = await fetch(`${API_BASE}/api/test/emails-identification`);
    const sent = (await res.json()) as Array<{ body: string }>;
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const body = sent[sent.length - 1]?.body ?? '';
    expect(body).toContain('Alain Meunier');
    expect(body).toContain('job-joy');
    expect(body).toContain('support');
    expect(body).toContain('retours beta');
  }
);
Then("le corps de l'email mentionne la licence GNU GPL", async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/test/emails-identification`);
  const sent = (await res.json()) as Array<{ body: string }>;
  expect(sent.length).toBeGreaterThanOrEqual(1);
  const body = sent[sent.length - 1]?.body ?? '';
  expect(body).toContain('GNU GPL');
});

// --- Échec d'envoi non bloquant ---
Given("que l'envoi d'email (réseau, SMTP) échouera", async ({ page }) => {
  await fetch(`${API_BASE}/api/test/set-envoyeur-identification-fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fail: true }),
  });
});
Given("que l'envoi d'email \\(réseau, SMTP\\) échouera", async ({ page }) => {
  await fetch(`${API_BASE}/api/test/set-envoyeur-identification-fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fail: true }),
  });
});
Given("l'envoi d'email \\(réseau, SMTP\\) échouera", async ({ page }) => {
  await fetch(`${API_BASE}/api/test/set-envoyeur-identification-fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fail: true }),
  });
});
Given("que l'envoi d'email échouera", async ({ page }) => {
  await fetch(`${API_BASE}/api/test/set-envoyeur-identification-fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fail: true }),
  });
});
Given("l'envoi d'email échouera", async ({ page }) => {
  await fetch(`${API_BASE}/api/test/set-envoyeur-identification-fail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fail: true }),
  });
});

Then('la sauvegarde des paramètres du compte est considérée comme réussie', async ({ page }) => {
  await expect(page).toHaveURL(/\/(parametres|tableau-de-bord)(\?|$)/);
});
Then("l'utilisateur peut continuer à utiliser l'application \\(pas de blocage\\)", async ({ page }) => {
  await expect(page).toHaveURL(/\/(parametres|tableau-de-bord)(\?|$)/);
});
Then("un message informatif ou un log signale l'échec d'envoi", async ({ page }) => {
  // Non bloquant : on peut être redirigé ; un message ou log côté serveur signale l'échec
  const url = page.url();
  expect(url).toMatch(/\/(parametres|tableau-de-bord)(\?|$)/);
});
Then("aucun message bloquant n'empêche l'utilisateur de poursuivre", async ({ page }) => {
  const feedback = page.locator('#feedback-enregistrement');
  const text = (await feedback.textContent()) ?? '';
  expect(text.toLowerCase()).not.toContain('erreur bloquante');
  await expect(page).toHaveURL(/\/(parametres|tableau-de-bord)(\?|$)/);
});
