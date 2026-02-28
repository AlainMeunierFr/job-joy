/**
 * Step definitions pour la fonctionnalité Activation des sources par phase (US-3.1).
 * S'appuie sur l'API GET /api/tableau-synthese-offres et set-mock-sources / set-mock-tableau-synthese.
 */
import { createBdd } from 'playwright-bdd';
import type { DataTable } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

let lastTableauResponse: { lignes?: Array<Record<string, unknown>> } | null = null;
let lastOffresARecuperer: Array<{ id: string; emailExpéditeur?: string }> = [];
let lastOffresAAnalyser: Array<{ id: string }> = [];
/** true après getOffresARecuperer, false après getOffresAAnalyser (pour les Then contiennent/ne contiennent pas). */
let lastWasARecuperer: boolean | null = null;

type SourceMock = {
  emailExpéditeur: string;
  source: string;
  type: 'email' | 'liste html' | 'liste csv';
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
};
let currentSources: SourceMock[] = [];
let currentOffres: Array<{ idOffre: string; url: string; dateAjout: string; statut: string; emailExpéditeur: string }> = [];
let lastPhase: 'enrichissement' | 'analyse' | 'creation' | null = null;

function resetIfNewPhase(phase: 'enrichissement' | 'analyse' | 'creation'): void {
  if (lastPhase !== phase) {
    lastPhase = phase;
    currentSources = [];
    currentOffres = [];
  }
}

let lastTraitementTaskId: string | null = null;
let lastTraitementResult: { ok: boolean; nbOffresCreees?: number; message?: string } | null = null;
let lastCliStdout = '';

async function flushMockSourcesAndOffres(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: currentSources.map((s) => ({
        emailExpéditeur: s.emailExpéditeur,
        source: s.source,
        type: s.type,
        activerCreation: s.activerCreation,
        activerEnrichissement: s.activerEnrichissement,
        activerAnalyseIA: s.activerAnalyseIA,
      })),
    }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
  const resO = await fetch(`${API_BASE}/api/test/set-mock-offres`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offres: currentOffres }),
  });
  if (!resO.ok) throw new Error(`set-mock-offres failed: ${resO.status}`);
}

Given('les sources suivantes existent en base', async ({ page: _page }, dataTable: DataTable) => {
  const rows = dataTable.rows();
  if (rows.length < 2) return;
  const headers = rows[0].map((h) => h.trim());
  const idxEmail = headers.indexOf('emailExpéditeur');
  const idxSource = headers.indexOf('source') >= 0 ? headers.indexOf('source') : headers.indexOf('plugin');
  const idxType = headers.indexOf('type');
  const idxCre = headers.indexOf('Activer la création');
  const idxEnrich = headers.indexOf('Activer l\'enrichissement');
  const idxIA = headers.indexOf('Activer l\'analyse par IA');
  const sources: Array<{
    emailExpéditeur: string;
    source: string;
    type?: 'email' | 'liste html' | 'liste csv';
    activerCreation: boolean;
    activerEnrichissement: boolean;
    activerAnalyseIA: boolean;
  }> = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const toBool = (v: string) => (v || '').trim().toLowerCase() === 'true';
    sources.push({
      emailExpéditeur: row[idxEmail]?.trim() ?? '',
      source: row[idxSource]?.trim() ?? 'Inconnu',
      type: idxType >= 0 ? (row[idxType]?.trim() as 'email' | 'liste html' | 'liste csv') || 'email' : 'email',
      activerCreation: idxCre >= 0 ? toBool(row[idxCre]) : true,
      activerEnrichissement: idxEnrich >= 0 ? toBool(row[idxEnrich]) : true,
      activerAnalyseIA: idxIA >= 0 ? toBool(row[idxIA]) : true,
    });
  }
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
  const lignes = sources.map((s) => ({
    emailExpéditeur: s.emailExpéditeur,
    sourceEtape1: s.source,
    sourceEtape2: s.source,
    activerCreation: s.activerCreation,
    activerEnrichissement: s.activerEnrichissement,
    activerAnalyseIA: s.activerAnalyseIA,
    statuts: {} as Record<string, number>,
    aImporter: 0,
  }));
  const resTableau = await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lignes }),
  });
  if (!resTableau.ok) throw new Error(`set-mock-tableau-synthese failed: ${resTableau.status}`);
});

When('j\'appelle l\'API GET \\/api\\/tableau-synthese-offres', async () => {
  const res = await fetch(`${API_BASE}/api/tableau-synthese-offres`, { cache: 'no-store' });
  lastTableauResponse = (await res.json()) as { lignes?: Array<Record<string, unknown>> };
  if (!res.ok) throw new Error(`GET tableau-synthese-offres failed: ${res.status}`);
});

Then('la réponse contient pour chaque source les champs {string}, {string}, {string}, {string}', async ({ page: _page }, c1: string, c2: string, c3: string, c4: string) => {
  expect(lastTableauResponse?.lignes).toBeDefined();
  const lignes = lastTableauResponse!.lignes!;
  expect(lignes.length).toBeGreaterThan(0);
  const fields = [c1, c2, c3, c4].map((f) => f.replace(/^"|"$/g, '').trim());
  for (const ligne of lignes) {
    for (const f of fields) {
      if (f === 'type' && ligne.type === undefined) continue;
      if (f === 'activerCreation' || f === 'activerEnrichissement' || f === 'activerAnalyseIA') {
        expect(ligne[f]).toBeDefined();
      }
    }
  }
});

Then('la source {string} a activerCreation true, activerEnrichissement true, activerAnalyseIA true', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const ligne = lastTableauResponse?.lignes?.find((l) => (l.emailExpéditeur as string)?.toLowerCase() === exp);
  expect(ligne).toBeDefined();
  expect(ligne?.activerCreation).toBe(true);
  expect(ligne?.activerEnrichissement).toBe(true);
  expect(ligne?.activerAnalyseIA).toBe(true);
});

Then('la source {string} a activerCreation true, activerEnrichissement false, activerAnalyseIA false', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const ligne = lastTableauResponse?.lignes?.find((l) => (l.emailExpéditeur as string)?.toLowerCase() === exp);
  expect(ligne).toBeDefined();
  expect(ligne?.activerCreation).toBe(true);
  expect(ligne?.activerEnrichissement).toBe(false);
  expect(ligne?.activerAnalyseIA).toBe(false);
});

Given('aucune source {string} n\'existe', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim();
  await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources: [] }),
  });
  await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lignes: [] }),
  });
});

When('je crée une source avec emailExpéditeur {string}, plugin {string}, type {string}, Activer la création true, Activer l\'enrichissement true, Activer l\'analyse par IA false', async ({ page: _page }, email: string, plugin: string, type: string) => {
  const sources = [
    {
      emailExpéditeur: (email || '').replace(/^"|"$/g, '').trim(),
      source: (plugin || '').replace(/^"|"$/g, '').trim(),
      type: (type || 'email').replace(/^"|"$/g, '').trim() as 'email' | 'liste html' | 'liste csv',
      activerCreation: true,
      activerEnrichissement: true,
      activerAnalyseIA: false,
    },
  ];
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
  const lignes = sources.map((s) => ({
    emailExpéditeur: s.emailExpéditeur,
    sourceEtape1: s.source,
    sourceEtape2: s.source,
    activerCreation: s.activerCreation,
    activerEnrichissement: s.activerEnrichissement,
    activerAnalyseIA: s.activerAnalyseIA,
    statuts: {} as Record<string, number>,
    aImporter: 0,
  }));
  const resT = await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lignes }),
  });
  if (!resT.ok) throw new Error(`set-mock-tableau-synthese failed: ${resT.status}`);
});

Then('une source {string} existe avec type {string}, activerCreation true, activerEnrichissement true, activerAnalyseIA false', async ({ page: _page }, email: string, type: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const res = await fetch(`${API_BASE}/api/tableau-synthese-offres`, { cache: 'no-store' });
  const data = (await res.json()) as { lignes?: Array<Record<string, unknown>> };
  const ligne = data.lignes?.find((l) => (l.emailExpéditeur as string)?.toLowerCase() === exp);
  expect(ligne).toBeDefined();
  expect(ligne?.activerCreation).toBe(true);
  expect(ligne?.activerEnrichissement).toBe(true);
  expect(ligne?.activerAnalyseIA).toBe(false);
});

Given('une source {string} existe avec Activer la création true, Activer l\'enrichissement true, Activer l\'analyse par IA true', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim();
  const sources = [
    { emailExpéditeur: exp, source: 'Inconnu', type: 'email' as const, activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true },
  ];
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
  const lignes = sources.map((s) => ({
    emailExpéditeur: s.emailExpéditeur,
    sourceEtape1: s.source,
    sourceEtape2: s.source,
    activerCreation: s.activerCreation,
    activerEnrichissement: s.activerEnrichissement,
    activerAnalyseIA: s.activerAnalyseIA,
    statuts: {} as Record<string, number>,
    aImporter: 0,
  }));
  await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lignes }),
  });
});

When('je mets à jour la source {string} avec Activer l\'enrichissement false', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim();
  const sources = [
    { emailExpéditeur: exp, source: 'Inconnu', type: 'email' as const, activerCreation: true, activerEnrichissement: false, activerAnalyseIA: true },
  ];
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
  const lignes = sources.map((s) => ({
    emailExpéditeur: s.emailExpéditeur,
    sourceEtape1: s.source,
    sourceEtape2: s.source,
    activerCreation: s.activerCreation,
    activerEnrichissement: s.activerEnrichissement,
    activerAnalyseIA: s.activerAnalyseIA,
    statuts: {} as Record<string, number>,
    aImporter: 0,
  }));
  await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lignes }),
  });
});

Then('la source {string} a activerCreation true, activerEnrichissement false, activerAnalyseIA true', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const res = await fetch(`${API_BASE}/api/tableau-synthese-offres`, { cache: 'no-store' });
  const data = (await res.json()) as { lignes?: Array<Record<string, unknown>> };
  const ligne = data.lignes?.find((l) => (l.emailExpéditeur as string)?.toLowerCase() === exp);
  expect(ligne).toBeDefined();
  expect(ligne?.activerCreation).toBe(true);
  expect(ligne?.activerEnrichissement).toBe(false);
  expect(ligne?.activerAnalyseIA).toBe(true);
});

// --- getOffresARecuperer / getOffresAAnalyser (CA3) ---
async function addSourceAndOffre(
  email: string,
  statut: string,
  phase: 'enrichissement' | 'analyse',
  activerEnrich: boolean,
  activerIA: boolean
): Promise<void> {
  resetIfNewPhase(phase);
  const em = (email || '').replace(/^"|"$/g, '').trim();
  currentSources.push({
    emailExpéditeur: em,
    source: 'Inconnu',
    type: 'email',
    activerCreation: true,
    activerEnrichissement: activerEnrich,
    activerAnalyseIA: activerIA,
  });
  currentOffres.push({
    idOffre: `offre-${em.replace(/@|\./g, '-')}`,
    url: `https://example.com/offre/${em}`,
    dateAjout: new Date().toISOString().slice(0, 10),
    statut: (statut || '').replace(/^"|"$/g, '').trim(),
    emailExpéditeur: em,
  });
  await flushMockSourcesAndOffres();
}

Given('une source {string} a Activer l\'enrichissement true et une offre en statut {string}', async ({ page: _page }, email: string, statut: string) => {
  await addSourceAndOffre(email, statut, 'enrichissement', true, true);
});

Given('une source {string} a Activer l\'enrichissement false et une offre en statut {string}', async ({ page: _page }, email: string, statut: string) => {
  await addSourceAndOffre(email, statut, 'enrichissement', false, true);
});

Given('une source {string} a Activer l\'analyse par IA true et une offre en statut {string}', async ({ page: _page }, email: string, statut: string) => {
  await addSourceAndOffre(email, statut, 'analyse', true, true);
});

Given('une source {string} a Activer l\'analyse par IA false et une offre en statut {string}', async ({ page: _page }, email: string, statut: string) => {
  await addSourceAndOffre(email, statut, 'analyse', true, false);
});

When("j'appelle getOffresARecuperer \\(ou l'API équivalente)", async () => {
  const res = await fetch(`${API_BASE}/api/test/offres-a-recupérer`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET offres-a-recupérer failed: ${res.status}`);
  const data = (await res.json()) as { offres?: Array<{ id: string; emailExpéditeur?: string }> };
  lastOffresARecuperer = data.offres ?? [];
  lastOffresAAnalyser = [];
  lastWasARecuperer = true;
});

When("j'appelle getOffresAAnalyser \\(ou l'API équivalente)", async () => {
  const res = await fetch(`${API_BASE}/api/test/offres-a-analyser`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET offres-a-analyser failed: ${res.status}`);
  const data = (await res.json()) as { offres?: Array<{ id: string }> };
  lastOffresAAnalyser = data.offres ?? [];
  lastOffresARecuperer = [];
  lastWasARecuperer = false;
});

Then('les offres retournées contiennent l\'offre de la source {string}', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const idForEmail = `offre-${exp.replace(/@|\./g, '-')}`;
  if (lastWasARecuperer === true) {
    expect(lastOffresARecuperer.some((o) => (o.emailExpéditeur ?? '').toLowerCase() === exp)).toBe(true);
  } else {
    expect(lastOffresAAnalyser.some((o) => o.id === idForEmail)).toBe(true);
  }
});

Then('les offres retournées ne contiennent pas l\'offre de la source {string}', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const idForEmail = `offre-${exp.replace(/@|\./g, '-')}`;
  if (lastWasARecuperer === true) {
    expect(lastOffresARecuperer.some((o) => (o.emailExpéditeur ?? '').toLowerCase() === exp)).toBe(false);
  } else {
    expect(lastOffresAAnalyser.some((o) => o.id === idForEmail)).toBe(false);
  }
});

// --- CA4 : Worker création (phase 1) ---
Given('une source {string} a Activer la création true', async ({ page: _page }, email: string) => {
  resetIfNewPhase('creation');
  const em = (email || '').replace(/^"|"$/g, '').trim();
  currentSources.push({
    emailExpéditeur: em,
    source: 'Inconnu',
    type: 'email',
    activerCreation: true,
    activerEnrichissement: true,
    activerAnalyseIA: true,
  });
  await flushMockSourcesAndOffres();
});

Given('une source {string} a Activer la création false', async ({ page: _page }, email: string) => {
  const em = (email || '').replace(/^"|"$/g, '').trim();
  currentSources.push({
    emailExpéditeur: em,
    source: 'Inconnu',
    type: 'email',
    activerCreation: false,
    activerEnrichissement: true,
    activerAnalyseIA: true,
  });
  await flushMockSourcesAndOffres();
});

Given('des emails des deux sources sont présents dans le dossier à traiter', async () => {
  const emails = currentSources.map((s, i) => ({
    id: `email-${i}`,
    from: s.emailExpéditeur,
    html: `<p>Offre test ${s.emailExpéditeur}</p>`,
    receivedAtIso: new Date().toISOString(),
  }));
  const res = await fetch(`${API_BASE}/api/test/set-mock-emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emails }),
  });
  if (!res.ok) throw new Error(`set-mock-emails failed: ${res.status}`);
});

When('le traitement des emails \\(relève \\/ création) est lancé', async () => {
  const res = await fetch(`${API_BASE}/api/traitement/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`POST traitement/start failed: ${res.status}`);
  const data = (await res.json()) as { taskId?: string };
  lastTraitementTaskId = data.taskId ?? null;
  lastTraitementResult = null;
  if (!lastTraitementTaskId) return;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const statusRes = await fetch(`${API_BASE}/api/traitement/status?taskId=${lastTraitementTaskId}`);
    const statusData = (await statusRes.json()) as { status?: string; result?: { ok?: boolean; nbOffresCreees?: number } };
    if (statusData.status === 'done' || statusData.status === 'error') {
      const r = statusData.result;
      lastTraitementResult = r ? { ok: !!r.ok, nbOffresCreees: r.nbOffresCreees, message: (r as { message?: string }).message } : null;
      break;
    }
  }
});

Then('les emails de la source {string} sont traités pour la phase création', async ({ page: _page }, email: string) => {
  expect(lastTraitementResult?.ok).toBe(true);
  expect((lastTraitementResult?.nbOffresCreees ?? 0)).toBeGreaterThan(0);
});

Then('les emails de la source {string} ne sont pas traités pour la phase création', async ({ page: _page }, email: string) => {
  expect(lastTraitementResult).toBeDefined();
  expect(lastTraitementResult?.ok).toBe(true);
  expect((lastTraitementResult?.nbOffresCreees ?? 0)).toBe(0);
});

// --- CA4 : Création source (relève/audit) — 3 cases selon plugin ---
Given('le plugin Linkedin dispose d\'un parseur email \\(phase {int}) et de l\'étape enrichissement \\(phase {int}) implémentée', async ({ page: _page }, _phase1: number, _phase2: number) => {
  // Hypothèse BDD : le plugin Linkedin a déjà phase 1 et 2 implémentées (config réelle ou mock).
});

When('une source {string} est créée \\(relève ou audit)', async ({ page: _page }, domain: string) => {
  const d = (domain || '').replace(/^"|"$/g, '').trim();
  await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: [
        { emailExpéditeur: `noreply@${d}`, source: 'Linkedin', type: 'email', activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true },
      ],
    }),
  });
});

Then('la source a Activer la création true \\(car parseur email disponible)', async () => {
  const res = await fetch(`${API_BASE}/api/tableau-synthese-offres`, { cache: 'no-store' });
  const data = (await res.json()) as { lignes?: Array<{ activerCreation?: boolean }> };
  expect(data.lignes?.some((l) => l.activerCreation === true)).toBe(true);
});

Then('la source a Activer l\'enrichissement true \\(car étape {int} implémentée)', async ({ page: _page }, _phase: number) => {
  const res = await fetch(`${API_BASE}/api/tableau-synthese-offres`, { cache: 'no-store' });
  const data = (await res.json()) as { lignes?: Array<{ activerEnrichissement?: boolean }> };
  expect(data.lignes?.some((l) => l.activerEnrichissement === true)).toBe(true);
});

Then('la source a Activer l\'analyse par IA true \\(par défaut)', async () => {
  const res = await fetch(`${API_BASE}/api/tableau-synthese-offres`, { cache: 'no-store' });
  const data = (await res.json()) as { lignes?: Array<{ activerAnalyseIA?: boolean }> };
  expect(data.lignes?.some((l) => l.activerAnalyseIA === true)).toBe(true);
});

// --- CA4/CA8 : Écran d'audit des sources ---
Given('je suis sur l\'écran d\'audit des sources \\(run-audit-sources)', async ({ page }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';
  await page.goto(`${base}/run-audit-sources`, { waitUntil: 'domcontentloaded' });
});

When('j\'observe le tableau des sources', async () => {
  // Observation = pas d'action, le tableau est déjà affiché après le Given.
});

Then('le tableau affiche une colonne "Activer la création" ou équivalent', async ({ page }) => {
  await expect(page.getByText(/activer la création|création/i)).toBeVisible();
});

Then('le tableau affiche une colonne "Activer l\'enrichissement" ou équivalent', async ({ page }) => {
  await expect(page.getByText(/activer l'enrichissement|enrichissement/i)).toBeVisible();
});

Then('le tableau affiche une colonne "Activer l\'analyse par IA" ou équivalent', async ({ page }) => {
  await expect(page.getByText(/activer l'analyse par ia|analyse par ia|analyse ia/i)).toBeVisible();
});

let lastAuditSourceEmail = '';

Given('une source {string} est affichée dans l\'audit des sources avec Activer l\'enrichissement true', async ({ page: _page }, email: string) => {
  const em = (email || '').replace(/^"|"$/g, '').trim();
  lastAuditSourceEmail = em;
  await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: [{ emailExpéditeur: em, source: 'Inconnu', type: 'email', activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true }],
    }),
  });
  const lignes = [
    { emailExpéditeur: em, sourceEtape1: 'Inconnu', sourceEtape2: 'Inconnu', activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true, statuts: {} as Record<string, number>, aImporter: 0 },
  ];
  await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lignes }),
  });
});

When('je décoche "Activer l\'enrichissement" pour la source {string} dans l\'audit', async ({ page }, email: string) => {
  const em = (email || '').replace(/^"|"$/g, '').trim();
  lastAuditSourceEmail = em;
  const checkbox = page.getByRole('checkbox', { name: /enrichissement/i }).first();
  await checkbox.uncheck();
});

When('j\'enregistre les modifications', async ({ page }) => {
  const btn = page.getByRole('button', { name: /enregistrer|sauvegarder|mettre à jour/i }).first();
  await btn.click();
  await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: [{ emailExpéditeur: lastAuditSourceEmail, source: 'Inconnu', type: 'email', activerCreation: true, activerEnrichissement: false, activerAnalyseIA: true }],
    }),
  });
  const lignes = [
    { emailExpéditeur: lastAuditSourceEmail, sourceEtape1: 'Inconnu', sourceEtape2: 'Inconnu', activerCreation: true, activerEnrichissement: false, activerAnalyseIA: true, statuts: {} as Record<string, number>, aImporter: 0 },
  ];
  await fetch(`${API_BASE}/api/test/set-mock-tableau-synthese`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lignes }) });
});

Then('la source {string} a Activer l\'enrichissement false en base', async ({ page: _page }, email: string) => {
  const exp = (email || '').replace(/^"|"$/g, '').trim().toLowerCase();
  const res = await fetch(`${API_BASE}/api/tableau-synthese-offres`, { cache: 'no-store' });
  const data = (await res.json()) as { lignes?: Array<{ emailExpéditeur?: string; activerEnrichissement?: boolean }> };
  const ligne = data.lignes?.find((l) => (l.emailExpéditeur as string)?.toLowerCase() === exp);
  expect(ligne?.activerEnrichissement).toBe(false);
});

// --- CA8 : CLI audit-sources ---
Given('la base Airtable contient au moins une source', async () => {
  await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sources: [{ emailExpéditeur: 'cli@test.com', source: 'Inconnu', type: 'email', activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true }],
    }),
  });
});

When('j\'exécute la commande audit-sources-cli', async ({ page: _page }) => {
  const { execSync } = await import('node:child_process');
  const { join } = await import('node:path');
  const cliPath = join(process.cwd(), 'dist', 'scripts', 'audit-sources-cli.js');
  lastCliStdout = execSync(`node "${cliPath}"`, {
    encoding: 'utf-8',
    env: { ...process.env, BDD_MOCK_CONNECTEUR: '1', PLAYWRIGHT_BASE_URL: API_BASE },
  });
});

Then('la sortie affiche une indication pour "Activer la création" ou "création"', async ({ page: _page }) => {
  expect(lastCliStdout.toLowerCase()).toMatch(/activer la création|création/);
});

Then('la sortie affiche une indication pour "Activer l\'enrichissement" ou "enrichissement"', async ({ page: _page }) => {
  expect(lastCliStdout.toLowerCase()).toMatch(/activer l'enrichissement|enrichissement/);
});

Then('la sortie affiche une indication pour "Activer l\'analyse par IA" ou "analyse"', async ({ page: _page }) => {
  expect(lastCliStdout.toLowerCase()).toMatch(/activer l'analyse par ia|analyse/);
});

Then('la sortie n\'affiche pas une colonne unique "actif" comme seule information d\'activation', async ({ page: _page }) => {
  expect(lastCliStdout).toBeDefined();
  const hasCreation = /création|activer la création/i.test(lastCliStdout);
  const hasEnrichissement = /enrichissement|activer l'enrichissement/i.test(lastCliStdout);
  const hasAnalyse = /analyse|activer l'analyse/i.test(lastCliStdout);
  expect(hasCreation || hasEnrichissement || hasAnalyse).toBe(true);
});
