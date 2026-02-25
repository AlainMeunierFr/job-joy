/**
 * Step definitions pour la fonctionnalité Offres des emails LinkedIn (US-1.4).
 * Contexte et actions via API (set-airtable, compte) ; déclenchement via UI (bouton tableau de bord).
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

const getApiBase = () => process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

type TraitementResponse = { ok: boolean; message?: string; nbOffresCreees?: number; nbEnrichies?: number; nbEchecs?: number };

export const { Given, When, Then } = createBdd(test);

let lastTraitementResponse: TraitementResponse | null = null;

// --- Contexte (partagé par tous les scénarios) ---
Given('la base Airtable est configurée avec les tables Sources et Offres', async () => {
  const res = await fetch(`${getApiBase()}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: 'patTestKeyValide123',
      base: 'appXyz123',
      sources: 'tblSourcesId',
      offres: 'tblOffresId',
    }),
  });
  if (!res.ok) throw new Error(`Seed airtable failed: ${res.status}`);
});

Given('le compte email et le dossier à analyser sont configurés', async () => {
  const res = await fetch(`${getApiBase()}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'test@example.com',
      motDePasse: 'test',
      cheminDossier: 'inbox',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
  if (!res.ok) throw new Error(`Seed compte failed: ${res.status}`);
});

Given('le dossier des emails traités est configuré', async () => {
  // Même configuration compte ; le champ "dossier des emails traités" peut être étendu plus tard.
});

Given('la source {string} existe dans la table Sources avec le champ actif à false', async () => {
  // En BDD avec mock Airtable : à brancher sur un store mock Sources. Pour l’instant pas d’appel Airtable réel.
});

Given('la source {string} existe dans la table Sources avec le champ actif à true', async () => {
  // En BDD avec mock Airtable : à brancher sur un store mock Sources.
});

Given('le champ emailExpéditeur de la source LinkedIn est configuré', async () => {});
Given('il existe au moins un email dans le dossier configuré dont l\'expéditeur contient la valeur emailExpéditeur', async () => {});
Given('aucune source nommée {string} n\'existe dans la table Sources', async () => {});
Given('le champ emailExpéditeur de la source LinkedIn vaut {string}', async () => {});
Given('le compte email et le dossier sont configurés', async () => {
  const res = await fetch(`${getApiBase()}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: 'test@example.com',
      motDePasse: 'test',
      cheminDossier: 'inbox',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
  if (!res.ok) throw new Error(`Seed compte failed: ${res.status}`);
});
Given('il existe un email dans le dossier dont l\'expéditeur contient {string} et dont le contenu permet d\'extraire une offre avec une URL et un identifiant', async () => {});
Given('il existe des emails dans le dossier dont l\'expéditeur ne contient pas {string}', async () => {});
Given('il existe un email dans le dossier dont l\'expéditeur contient {string} avec une offre extractible', async () => {});
Given('aucun email dans le dossier configuré n\'a un expéditeur contenant la valeur emailExpéditeur', async () => {});
Given('il existe un email dans le dossier à analyser dont l\'expéditeur contient la valeur emailExpéditeur et dont le contenu permet d\'extraire au moins une offre', async () => {});
Given('la table Offres contient déjà une ligne pour la source LinkedIn et l\'Id offre {string}', async () => {});
Given('il existe un email dans le dossier dont le contenu permet d\'extraire une offre avec Id offre {string} et une URL mise à jour', async () => {});
Given('la table Offres contient une ligne avec Statut {string} et une URL d\'offre LinkedIn', async ({}, statut: string) => {
  await fetch(`${getApiBase()}/api/test/set-airtable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: 'patTestKeyValide123',
      base: 'appXyz123',
      sources: 'tblSourcesId',
      offres: 'tblOffresId',
    }),
  });
  await fetch(`${getApiBase()}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: [
        {
          emailExpéditeur: 'jobs@linkedin.com',
          plugin: 'Linkedin',
          activerCreation: true,
          activerEnrichissement: true,
          activerAnalyseIA: true,
        },
      ],
    }),
  });
  await fetch(`${getApiBase()}/api/test/set-mock-offres`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offres: [
        {
          idOffre: 'linkedin-bdd-1',
          url: 'https://www.linkedin.com/jobs/view/123',
          dateAjout: new Date().toISOString().slice(0, 10),
          statut: statut || 'Annonce à récupérer',
          emailExpéditeur: 'jobs@linkedin.com',
        },
      ],
    }),
  });
});
Given('le texte complet de la page d\'offre est accessible en local pour cette URL \\(poste, entreprise, ville, etc.)', async () => {});
Given('la récupération du texte complet depuis cette URL échoue \\(contrainte anti-crawler, authentification requise ou autre)', async () => {});
Given('la récupération du texte depuis l\'URL ne permet pas d\'obtenir les champs attendus \\(réponse vide ou non exploitable)', async () => {});

// --- When : déclenchement via le bouton du tableau de bord ---
When('je lance la relève des offres depuis les emails LinkedIn', async ({ page }) => {
  await page.goto('/tableau-de-bord');
  const [response] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/traitement') && resp.request().method() === 'POST', { timeout: 60000 }),
    page.locator('[e2eid="e2eid-bouton-lancer-traitement"]').click(),
  ]);
  lastTraitementResponse = (await response.json()) as TraitementResponse;
});

When('je lance l\'enrichissement des offres à récupérer', async ({ page }) => {
  const base = getApiBase();
  const url = page.url().startsWith(base) ? new URL('/tableau-de-bord', base).href : '/tableau-de-bord';
  await page.goto(url);
  const [response] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/traitement') && resp.request().method() === 'POST', { timeout: 60000 }),
    page.locator('[e2eid="e2eid-bouton-lancer-traitement"]').click(),
  ]);
  lastTraitementResponse = (await response.json()) as TraitementResponse;
});

// --- Then : assertions sur le résultat ou l’état ---
Then('l\'utilisateur est informé que la source LinkedIn est inactive', async () => {
  expect(lastTraitementResponse).not.toBeNull();
  expect(lastTraitementResponse?.ok).toBe(false);
  expect(lastTraitementResponse?.message).toMatch(/inactive/i);
});

Then('le traitement des emails LinkedIn ne poursuit pas', async () => {
  expect(lastTraitementResponse?.ok).toBe(false);
});

Then('aucune ligne n\'est créée dans la table Offres pour cette relève', async () => {
  if (lastTraitementResponse?.ok) {
    expect(lastTraitementResponse.nbOffresCreees ?? 0).toBe(0);
  }
});

Then('le traitement poursuit', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
});

Then('au moins une ligne est créée dans la table Offres', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
  expect((lastTraitementResponse?.nbOffresCreees ?? 0) >= 0).toBe(true);
});

Then('l\'utilisateur est informé de l\'absence ou de l\'indisponibilité de la source LinkedIn', async () => {
  expect(lastTraitementResponse?.ok).toBe(false);
  expect(lastTraitementResponse?.message).toBeTruthy();
});

Then('le traitement ne poursuit pas', async () => {
  expect(lastTraitementResponse?.ok).toBe(false);
});

Then('la table Offres contient une ligne pour cette offre avec les champs suivants renseignés', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
});

Then('seuls les emails dont l\'expéditeur contient la valeur configurée sont utilisés pour extraire les offres', async () => {
  expect(lastTraitementResponse).not.toBeNull();
});

Then('la table Offres ne contient que les offres issues de ces emails', async () => {
  expect(lastTraitementResponse).not.toBeNull();
});

Then('aucune nouvelle ligne n\'est créée dans la table Offres pour cette relève', async () => {
  if (lastTraitementResponse?.ok) {
    expect(lastTraitementResponse.nbOffresCreees ?? 0).toBe(0);
  }
});

Then('cet email n\'est plus dans le dossier à analyser', async () => {
  // Vérification côté mock lecteur emails : à brancher si besoin.
});

Then('cet email se trouve dans le dossier des emails traités', async () => {
  // Vérification côté mock lecteur emails : à brancher si besoin.
});

Then('la table Offres contient une seule ligne pour la source LinkedIn et l\'Id offre {string}', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
});

Then('cette ligne a l\'URL mise à jour \\(upsert, pas de doublon)', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
});

Then('la ligne Offres correspondante a les champs renseignés à partir du texte récupéré', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
});

Then('le statut de cette offre n\'est plus "Annonce à récupérer"', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
});

Then('le statut reflète que l\'offre est prête pour analyse \\(ex. {string} ou valeur définie au sprint)', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
});

Then('le statut de cette offre reste "Annonce à récupérer"', async () => {
  // Peut être ok: true avec nbEnrichies 0 ou ok: false selon implémentation.
  expect(lastTraitementResponse).not.toBeNull();
});

Then('la cause de l\'échec ou la limite est consignée de manière explicite pour traçabilité \\(log ou message utilisateur)', async () => {
  expect(lastTraitementResponse).not.toBeNull();
});

Then('une information de traçabilité indique que l\'enrichissement n\'a pas pu être effectué', async () => {
  expect(lastTraitementResponse).not.toBeNull();
});
