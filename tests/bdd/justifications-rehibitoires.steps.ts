/**
 * Step definitions pour la fonctionnalité Justifications des arbitrages réhibitoires (US-3.2).
 * Réutilise les steps de configuration-claudecode (page Paramètres, Tester API, etc.).
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
const PAGE_PARAMETRES = '/parametres';

/** Dernière réponse POST /api/test-claudecode (scénario 1). */
let lastTestClaudecodeResponse: Record<string, unknown> | null = null;

function ouvrirBlocClaudeCodeSiFerme(page: import('@playwright/test').Page): Promise<void> {
  const details = page.locator('details.blocParametrage-claudecode');
  return details.getAttribute('open').then((open) => {
    if (open === null) {
      return page.locator('#titre-claudecode').click();
    }
  });
}

const sectionClaudeCode = () =>
  'details.blocParametrage-claudecode, [data-layout="configuration-claudecode"]';

// --- Contexte : paramétrage IA ---
Given('que le paramétrage IA définit au moins un critère rédhibitoire', async () => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [
        { titre: 'Télétravail', description: 'Rejeter si pas de télétravail.' },
        { titre: '', description: '' },
        { titre: '', description: '' },
        { titre: '', description: '' },
      ],
      scoresIncontournables: { localisation: 'x', salaire: 'x', culture: 'x', qualiteOffre: 'x' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
  if (!res.ok) throw new Error(`parametrage-ia failed: ${res.status}`);
});

Given('le paramétrage IA définit au moins un critère rédhibitoire', async () => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [
        { titre: 'Télétravail', description: 'Rejeter si pas de télétravail.' },
        { titre: '', description: '' },
        { titre: '', description: '' },
        { titre: '', description: '' },
      ],
      scoresIncontournables: { localisation: 'x', salaire: 'x', culture: 'x', qualiteOffre: 'x' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
  if (!res.ok) throw new Error(`parametrage-ia failed: ${res.status}`);
});

Given('que le paramétrage IA définit quatre critères rédhibitoires', async () => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [
        { titre: 'R1', description: 'Critère 1' },
        { titre: 'R2', description: 'Critère 2' },
        { titre: 'R3', description: 'Critère 3' },
        { titre: 'R4', description: 'Critère 4' },
      ],
      scoresIncontournables: { localisation: 'x', salaire: 'x', culture: 'x', qualiteOffre: 'x' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
  if (!res.ok) throw new Error(`parametrage-ia failed: ${res.status}`);
});

Given('le paramétrage IA définit quatre critères rédhibitoires', async () => {
  const res = await fetch(`${API_BASE}/api/parametrage-ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rehibitoires: [
        { titre: 'R1', description: 'Critère 1' },
        { titre: 'R2', description: 'Critère 2' },
        { titre: 'R3', description: 'Critère 3' },
        { titre: 'R4', description: 'Critère 4' },
      ],
      scoresIncontournables: { localisation: 'x', salaire: 'x', culture: 'x', qualiteOffre: 'x' },
      scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
      autresRessources: '',
    }),
  });
  if (!res.ok) throw new Error(`parametrage-ia failed: ${res.status}`);
});

// --- Mock API avec justifications (US-3.2) ---
Given(
  "que l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse contenant des justifications pour les réhibitoires configurés",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        texte: 'Résumé offre test.',
        jsonValidation: {
          valid: true,
          json: {
            Réhibitoire1: 'Télétravail non mentionné.',
            Réhibitoire2: 'Salaire indiqué, critère respecté.',
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
  }
);

Given(
  "l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse contenant des justifications pour les réhibitoires configurés",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        texte: 'Résumé offre test.',
        jsonValidation: {
          valid: true,
          json: {
            Réhibitoire1: 'Télétravail non mentionné.',
            Réhibitoire2: 'Salaire indiqué, critère respecté.',
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
  }
);

Given(
  "que l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse contenant une justification avec du texte explicatif",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        texte: 'Résumé.',
        jsonValidation: {
          valid: true,
          json: {
            Réhibitoire1: 'Le texte explicatif de la justification sans balise HTML.',
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
  }
);

Given(
  "l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse contenant une justification avec du texte explicatif",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        texte: 'Résumé.',
        jsonValidation: {
          valid: true,
          json: {
            Réhibitoire1: 'Le texte explicatif de la justification sans balise HTML.',
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
  }
);

Given(
  "que l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse avec des justifications distinctes pour Réhibitoire1, Réhibitoire2, Réhibitoire3 et Réhibitoire4",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        texte: 'Résumé.',
        jsonValidation: {
          valid: true,
          json: {
            Réhibitoire1: 'Justification pour le critère 1.',
            Réhibitoire2: 'Justification pour le critère 2.',
            Réhibitoire3: 'Justification pour le critère 3.',
            Réhibitoire4: 'Justification pour le critère 4.',
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
  }
);

Given(
  "l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse avec des justifications distinctes pour Réhibitoire1, Réhibitoire2, Réhibitoire3 et Réhibitoire4",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-mock-test-claudecode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        texte: 'Résumé.',
        jsonValidation: {
          valid: true,
          json: {
            Réhibitoire1: 'Justification pour le critère 1.',
            Réhibitoire2: 'Justification pour le critère 2.',
            Réhibitoire3: 'Justification pour le critère 3.',
            Réhibitoire4: 'Justification pour le critère 4.',
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`set-mock-test-claudecode failed: ${res.status}`);
  }
);

// --- CA4 : Appel API (scénario 1) ---
When(
  /^j'appelle l'API de test d'analyse ClaudeCode \(POST \/api\/test-claudecode\)$/,
  async () => {
    const apiRes = await fetch(`${API_BASE}/api/test-claudecode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texteOffre: 'Texte offre pour test API.' }),
    });
    lastTestClaudecodeResponse = (await apiRes.json()) as Record<string, unknown>;
  }
);

Then(
  'la réponse contient les champs Réhibitoire1 à RéhibitoireN \\(string justification) pour chaque réhibitoire configuré',
  async () => {
    expect(lastTestClaudecodeResponse).toBeDefined();
    const jv = lastTestClaudecodeResponse?.jsonValidation as { valid?: boolean; json?: Record<string, unknown> } | undefined;
    expect(jv?.valid).toBe(true);
    const json = jv?.json;
    expect(json).toBeDefined();
    expect(typeof json?.Réhibitoire1).toBe('string');
  }
);

Then(
  'chaque justification est une chaîne de caractères \\(texte court)',
  async () => {
    const jv = lastTestClaudecodeResponse?.jsonValidation as { json?: Record<string, unknown> } | undefined;
    const json = jv?.json;
    expect(json).toBeDefined();
    if (typeof json?.Réhibitoire1 === 'string') {
      expect(json.Réhibitoire1.length).toBeLessThanOrEqual(500);
    }
  }
);

// --- Scénario 2 : offre analysée en base, exposition API ---
Given(
  "qu'une offre analysée existe en base avec des justifications renseignées pour au moins un réhibitoire",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lignes: [
          {
            emailExpéditeur: 'test@example.com',
            pluginEtape1: 'Inconnu',
            pluginEtape2: 'Inconnu',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
            statuts: { 'À analyser': 1 },
            JustificationRéhibitoire1: 'Justif enregistrée 1',
            JustificationRéhibitoire2: 'Justif enregistrée 2',
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`set-mock-tableau-synthese failed: ${res.status}`);
  }
);

Given(
  "une offre analysée existe en base avec des justifications renseignées pour au moins un réhibitoire",
  async () => {
    const res = await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lignes: [
          {
            emailExpéditeur: 'test@example.com',
            pluginEtape1: 'Inconnu',
            pluginEtape2: 'Inconnu',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
            statuts: { 'À analyser': 1 },
            JustificationRéhibitoire1: 'Justif enregistrée 1',
            JustificationRéhibitoire2: 'Justif enregistrée 2',
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`set-mock-tableau-synthese failed: ${res.status}`);
  }
);

let lastOffreApiResponse: Record<string, unknown> | null = null;

When(
  "je récupère les données de cette offre via l'API \\(détail offre, liste ou synthèse)",
  async () => {
    const apiRes = await fetch(`${API_BASE}/api/tableau-synthese-offres`);
    lastOffreApiResponse = (await apiRes.json()) as Record<string, unknown>;
  }
);

Then(
  'la réponse inclut les champs de justification \\(JustificationRéhibitoire1 à JustificationRéhibitoire4) pour les réhibitoires configurés',
  async () => {
    expect(lastOffreApiResponse).toBeDefined();
    const lignes = lastOffreApiResponse?.lignes as Array<Record<string, unknown>> | undefined;
    expect(Array.isArray(lignes)).toBe(true);
    expect(lignes?.length).toBeGreaterThan(0);
    const first = lignes?.[0];
    expect(first).toBeDefined();
    expect(first?.JustificationRéhibitoire1 !== undefined || first?.JustificationRéhibitoire2 !== undefined).toBe(true);
  }
);

Then(
  'les valeurs de justification correspondent à celles enregistrées pour cette offre',
  async () => {
    const lignes = lastOffreApiResponse?.lignes as Array<Record<string, unknown>> | undefined;
    const first = lignes?.[0];
    expect(first?.JustificationRéhibitoire1).toBe('Justif enregistrée 1');
    expect(first?.JustificationRéhibitoire2).toBe('Justif enregistrée 2');
  }
);

// --- CA5 : UI — zone résultat et justifications ---
Then(
  'la zone de résultat du test ClaudeCode affiche le résultat de l\'analyse',
  async ({ page }) => {
    await ouvrirBlocClaudeCodeSiFerme(page);
    const zone = page.locator('#zone-resultat-test-claudecode');
    await expect(zone).toBeVisible();
    await expect(zone).toHaveAttribute('data-type', 'succes');
    await expect(zone).toContainText('JSON valide');
  }
);

Then(
  "pour chaque critère rédhibitoire affiché \\(Réhibitoire1 à N), la justification associée est affichée à côté ou en dessous du booléen",
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    const sectionRehib = zone.locator('[data-layout="zone-resultat-rehibitoires"]');
    await expect(sectionRehib).toBeVisible();
    await expect(sectionRehib).toContainText('Réhibitoires');
    const blocs = sectionRehib.locator('[data-layout="bloc-resultat-rehibitoire"]');
    await expect(blocs.first()).toBeVisible();
    const firstJustif = sectionRehib.locator('.blocResultatRehibitoireJustification').first();
    await expect(firstJustif).toBeVisible();
    await expect(firstJustif).toContainText('Télétravail'); // ou texte selon scénario
  }
);

Then(
  'la zone de résultat du test ClaudeCode affiche les justifications en texte lisible',
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    await expect(zone.locator('.blocResultatRehibitoireJustification')).toBeVisible();
    const text = await zone.locator('.blocResultatRehibitoireJustification').first().textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  }
);

Then(
  "aucune balise HTML brute n'est visible dans le texte des justifications",
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    const justifs = zone.locator('.blocResultatRehibitoireJustification');
    const count = await justifs.count();
    for (let i = 0; i < count; i++) {
      const html = await justifs.nth(i).innerHTML();
      expect(html).not.toMatch(/<[a-z][\s\S]*>/i);
    }
  }
);

Then(
  'la zone de résultat affiche les critères rédhibitoires dans l\'ordre \\({int} puis {int} puis {int} puis {int})',
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    const sectionRehib = zone.locator('[data-layout="zone-resultat-rehibitoires"]');
    await expect(sectionRehib).toBeVisible();
    await expect(sectionRehib).toContainText('Réhibitoire 1');
    await expect(sectionRehib).toContainText('Réhibitoire 2');
    await expect(sectionRehib).toContainText('Réhibitoire 3');
    await expect(sectionRehib).toContainText('Réhibitoire 4');
    const blocs = sectionRehib.locator('[data-layout="bloc-resultat-rehibitoire"]');
    await expect(blocs).toHaveCount(4);
    await expect(blocs.nth(0)).toHaveAttribute('data-rehibitoire-index', '1');
    await expect(blocs.nth(1)).toHaveAttribute('data-rehibitoire-index', '2');
    await expect(blocs.nth(2)).toHaveAttribute('data-rehibitoire-index', '3');
    await expect(blocs.nth(3)).toHaveAttribute('data-rehibitoire-index', '4');
  }
);

Then(
  'chaque justification est affichée à côté du bon critère \\(justification {int} avec réhibitoire {int}, etc.)',
  async ({ page }) => {
    const zone = page.locator('#zone-resultat-test-claudecode');
    const sectionRehib = zone.locator('[data-layout="zone-resultat-rehibitoires"]');
    const blocs = sectionRehib.locator('[data-layout="bloc-resultat-rehibitoire"]');
    await expect(blocs).toHaveCount(4);
    await expect(blocs.nth(0)).toContainText('Justification pour le critère 1.');
    await expect(blocs.nth(1)).toContainText('Justification pour le critère 2.');
    await expect(blocs.nth(2)).toContainText('Justification pour le critère 3.');
    await expect(blocs.nth(3)).toContainText('Justification pour le critère 4.');
  }
);
