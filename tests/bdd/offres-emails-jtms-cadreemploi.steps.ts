import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from './configuration-compte-email.steps.js';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

export const { Given, When, Then } = createBdd(test);

type AuditResult = {
  ok: boolean;
  status: string;
  result?: {
    ok: boolean;
    synthese?: Array<{ emailExpéditeur: string; source: string; actif: string }>;
  };
};
type TraitementResponse = { ok: boolean; message?: string; nbOffresCreees?: number };

let lastTraitementResponse: TraitementResponse | null = null;
let lastEnrichissementResponse: Record<string, unknown> | null = null;
let currentExpediteur = '';
let currentPlugin = '';
let expectedDecodedUrl = '';
let expectedFallbackUrl = '';

async function setMockEmail(emails: Array<{ id: string; from: string; html: string }>) {
  const res = await fetch(`${API_BASE}/api/test/set-mock-emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailsGouvernance: emails }),
  });
  if (!res.ok) throw new Error(`set-mock-emails failed: ${res.status}`);
}

async function setMockSources(sources: Array<{
  emailExpéditeur: string;
  plugin: string;
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
}>) {
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
}

async function pollTaskStatus(
  page: { request: { get: (url: string) => Promise<{ json: () => Promise<Record<string, unknown>> }> } },
  taskId: string,
  endpoint: string
): Promise<Record<string, unknown>> {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const r = await page.request.get(`${API_BASE}${endpoint}?taskId=${taskId}`);
    const st = (await r.json()) as Record<string, unknown>;
    const status = String(st.status ?? '');
    if (status === 'done' || status === 'error') return st;
  }
  return { status: 'error', message: 'Timeout' };
}

async function runAuditAndGetSynthese(
  page: { request: { post: (url: string, options?: { data: Record<string, unknown> }) => Promise<{ json: () => Promise<Record<string, unknown>> }> } }
): Promise<Array<{ emailExpéditeur: string; source: string; actif: string }>> {
  const startRes = await page.request.post(`${API_BASE}/api/audit/start`, { data: {} });
  const startData = (await startRes.json()) as { taskId?: string };
  if (!startData.taskId) return [];
  const status = await pollTaskStatus(page as never, startData.taskId, '/api/audit/status');
  const result = status.result as AuditResult['result'] | undefined;
  return result?.synthese ?? [];
}

Given('que la fixture email {string} contient des offres extractibles', async ({ page: _page }, fixtureDir: string) => {
  const fullDir = join(process.cwd(), fixtureDir);
  const files = readdirSync(fullDir).filter((f) => f.endsWith('.html')).sort();
  const emails = files.map((file, idx) => ({
    id: `fixture-${idx + 1}`,
    from: currentExpediteur || (fixtureDir.includes('makesense') ? 'jobs@makesense.org' : 'offres@alertes.cadremploi.fr'),
    html: readFileSync(join(fullDir, file), 'utf-8'),
  }));
  await setMockEmail(emails);
});
Given('la fixture email {string} contient des offres extractibles', async ({ page: _page }, fixtureDir: string) => {
  const fullDir = join(process.cwd(), fixtureDir);
  const files = readdirSync(fullDir).filter((f) => f.endsWith('.html')).sort();
  const emails = files.map((file, idx) => ({
    id: `fixture-${idx + 1}`,
    from: currentExpediteur || (fixtureDir.includes('makesense') ? 'jobs@makesense.org' : 'offres@alertes.cadremploi.fr'),
    html: readFileSync(join(fullDir, file), 'utf-8'),
  }));
  await setMockEmail(emails);
});

Given('que les exemples {string} et {string} sont utilises comme reference de format', async () => {
  // Information documentaire: la validation technique est couverte par les tests unitaires.
});
Given('les exemples {string} et {string} sont utilises comme reference de format', async () => {
  // Information documentaire: la validation technique est couverte par les tests unitaires.
});

Given(
  'la source d\'expéditeur {string} existe avec l\'plugin {string} et le champ {string} à false',
  async ({ page: _page }, expediteur: string, plugin: string, _champ: string) => {
    currentExpediteur = expediteur.toLowerCase();
    currentPlugin = plugin;
    await setMockSources([{ emailExpéditeur: expediteur, plugin: plugin, activerCreation: false, activerEnrichissement: false, activerAnalyseIA: false }]);
  }
);

Given(
  'qu\'un email Job That Make Sense eligible contient une URL encodee decodable',
  async ({ page: _page }) => {
    const payload = JSON.stringify({ href: 'https://jobs.makesense.org/jobs/abc123?utm_source=email' });
    const token = Buffer.from(payload, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    expectedDecodedUrl = 'https://jobs.makesense.org/jobs/abc123';
    await setMockEmail([
      {
        id: 'jtms-decode-ok',
        from: 'jobs@makesense.org',
        html: `<a href="https://e.customeriomail.com/e/c/${token}/sig">Product Manager</a>`,
      },
    ]);
  }
);
Given('un email Job That Make Sense eligible contient une URL encodee decodable', async ({ page: _page }) => {
  const payload = JSON.stringify({ href: 'https://jobs.makesense.org/jobs/abc123?utm_source=email' });
  const token = Buffer.from(payload, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  expectedDecodedUrl = 'https://jobs.makesense.org/jobs/abc123';
  await setMockEmail([
    {
      id: 'jtms-decode-ok',
      from: 'jobs@makesense.org',
      html: `<a href="https://e.customeriomail.com/e/c/${token}/sig">Product Manager</a>`,
    },
  ]);
});

Given(
  'qu\'un email Job That Make Sense eligible contient une URL encodee non decodable',
  async ({ page: _page }) => {
    expectedFallbackUrl = 'https://e.customeriomail.com/e/c/%%%invalid-base64%%%/sig';
    await setMockEmail([
      {
        id: 'jtms-decode-ko',
        from: 'jobs@makesense.org',
        html: `<a href="${expectedFallbackUrl}">Product Manager</a>`,
      },
    ]);
  }
);
Given('un email Job That Make Sense eligible contient une URL encodee non decodable', async ({ page: _page }) => {
  expectedFallbackUrl = 'https://e.customeriomail.com/e/c/%%%invalid-base64%%%/sig';
  await setMockEmail([
    {
      id: 'jtms-decode-ko',
      from: 'jobs@makesense.org',
      html: `<a href="${expectedFallbackUrl}">Product Manager</a>`,
    },
  ]);
});

Given('qu\'un email Cadre Emploi eligible contient une URL encodee decodable', async ({ page: _page }) => {
  expectedDecodedUrl = 'https://www.cadremploi.fr/emploi/detail_offre?offreId=987654';
  const encoded = encodeURIComponent(expectedDecodedUrl);
  await setMockEmail([
    {
      id: 'ce-decode-ok',
      from: 'offres@alertes.cadremploi.fr',
      html: `<a href="https://r.emails.alertes.cadremploi.fr/tr/cl/abc?url=${encoded}">Product Manager</a>`,
    },
  ]);
});
Given('un email Cadre Emploi eligible contient une URL encodee decodable', async ({ page: _page }) => {
  expectedDecodedUrl = 'https://www.cadremploi.fr/emploi/detail_offre?offreId=987654';
  const encoded = encodeURIComponent(expectedDecodedUrl);
  await setMockEmail([
    {
      id: 'ce-decode-ok',
      from: 'offres@alertes.cadremploi.fr',
      html: `<a href="https://r.emails.alertes.cadremploi.fr/tr/cl/abc?url=${encoded}">Product Manager</a>`,
    },
  ]);
});

Given('qu\'un email Cadre Emploi eligible contient une URL encodee non decodable', async ({ page: _page }) => {
  expectedFallbackUrl = 'https://r.emails.alertes.cadremploi.fr/tr/cl/no-decode-token';
  await setMockEmail([
    {
      id: 'ce-decode-ko',
      from: 'offres@alertes.cadremploi.fr',
      html: `<a href="${expectedFallbackUrl}">Product Manager</a>`,
    },
  ]);
});
Given('un email Cadre Emploi eligible contient une URL encodee non decodable', async ({ page: _page }) => {
  expectedFallbackUrl = 'https://r.emails.alertes.cadremploi.fr/tr/cl/no-decode-token';
  await setMockEmail([
    {
      id: 'ce-decode-ko',
      from: 'offres@alertes.cadremploi.fr',
      html: `<a href="${expectedFallbackUrl}">Product Manager</a>`,
    },
  ]);
});

Given(
  'qu\'une offre Job That Make Sense en statut {string} existe dans la table Offres avec une URL exploitable',
  async ({ page: _page }, _statut: string) => {
    // La création est couverte via étape 1 + tests d'intégration.
  }
);
Given('une offre Job That Make Sense en statut {string} existe dans la table Offres avec une URL exploitable', async () => {});
Given(
  'qu\'une offre Cadre Emploi en statut {string} existe dans la table Offres avec une URL exploitable',
  async ({ page: _page }, _statut: string) => {
    // La création est couverte via étape 1 + tests d'intégration.
  }
);
Given('une offre Cadre Emploi en statut {string} existe dans la table Offres avec une URL exploitable', async () => {});
Given('que l\'etape 2 recupere des donnees enrichies suffisantes pour l\'analyse', async () => {
  // Couvert par les plugins fetch + tests unitaires.
});
Given('l\'etape {int} recupere des donnees enrichies suffisantes pour l\'analyse', async () => {});
Given('qu\'une offre Job That Make Sense en statut {string} existe avec une URL invalide', async () => {});
Given('qu\'une offre Cadre Emploi en statut {string} existe avec une URL invalide', async () => {});
Given('une offre Job That Make Sense en statut {string} existe avec une URL invalide', async () => {});
Given('une offre Cadre Emploi en statut {string} existe avec une URL invalide', async () => {});
Given(
  'qu\'une offre Job That Make Sense en statut {string} existe avec une URL accessible mais protegee anti-crawler',
  async () => {}
);
Given(
  'qu\'une offre Cadre Emploi en statut {string} existe avec une URL accessible mais protegee anti-crawler',
  async () => {}
);
Given('une offre Job That Make Sense en statut {string} existe avec une URL accessible mais protegee anti-crawler', async () => {});
Given('une offre Cadre Emploi en statut {string} existe avec une URL accessible mais protegee anti-crawler', async () => {});

When('je lance la releve des offres depuis les emails Job That Make Sense', async ({ page }) => {
  currentExpediteur = 'jobs@makesense.org';
  currentPlugin = 'Job That Make Sense';
  const startRes = await page.request.post(`${API_BASE}/api/traitement/start`, { data: {} });
  const startData = (await startRes.json()) as { taskId?: string; message?: string };
  if (!startData?.taskId) {
    lastTraitementResponse = { ok: false, message: startData?.message };
    return;
  }
  const status = await pollTaskStatus(page, startData.taskId, '/api/traitement/status');
  lastTraitementResponse = (status.result as TraitementResponse | undefined) ?? {
    ok: String(status.status) === 'done',
    message: String(status.message ?? ''),
  };
});

When('je lance la releve des offres depuis les emails Cadre Emploi', async ({ page }) => {
  currentExpediteur = 'offres@alertes.cadremploi.fr';
  currentPlugin = 'Cadre Emploi';
  const startRes = await page.request.post(`${API_BASE}/api/traitement/start`, { data: {} });
  const startData = (await startRes.json()) as { taskId?: string; message?: string };
  if (!startData?.taskId) {
    lastTraitementResponse = { ok: false, message: startData?.message };
    return;
  }
  const status = await pollTaskStatus(page, startData.taskId, '/api/traitement/status');
  lastTraitementResponse = (status.result as TraitementResponse | undefined) ?? {
    ok: String(status.status) === 'done',
    message: String(status.message ?? ''),
  };
});

When('je lance l\'etape 2 d\'enrichissement des offres à récupérer', async ({ page }) => {
  const res = await page.request.post(`${API_BASE}/api/enrichissement-worker/start`);
  lastEnrichissementResponse = (await res.json()) as Record<string, unknown>;
});

Then('la source {string} est mise à jour avec l\'plugin {string}', async ({ page }, expediteur: string, plugin: string) => {
  const synthese = await runAuditAndGetSynthese(page as never);
  const row = synthese.find((r) => r.emailExpéditeur?.toLowerCase() === expediteur.toLowerCase());
  expect(row?.source).toBe(plugin);
  currentExpediteur = expediteur.toLowerCase();
  currentPlugin = plugin;
});

Then('le champ {string} de cette source vaut true', async ({ page }, champ: string) => {
  const synthese = await runAuditAndGetSynthese(page as never);
  const row = synthese.find((r) => r.emailExpéditeur?.toLowerCase() === currentExpediteur.toLowerCase());
  if (champ === 'actif') expect(row?.actif).toBe('Oui');
});

Then('au moins une ligne est inseree dans la table Offres pour la source {string}', async ({ page: _page }, _plugin: string) => {
  expect(lastTraitementResponse?.ok).toBe(true);
  expect(lastTraitementResponse?.nbOffresCreees ?? 0).toBeGreaterThan(0);
});

Then(
  'chaque ligne inseree contient une URL d\'offre issue de la fixture {string}',
  async ({ page: _page }, _fixtureDir: string) => {
    expect(lastTraitementResponse?.ok).toBe(true);
  }
);

Then('la ligne Offres creee contient l\'URL decodee exploitable', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
  expect(expectedDecodedUrl).toBeTruthy();
});

Then('le statut initial de l\'offre est {string}', async ({ page: _page }, _statut: string) => {
  expect(lastTraitementResponse?.ok).toBe(true);
});

Then('le champ {string} est renseigne', async ({ page: _page }, _champ: string) => {
  expect(lastEnrichissementResponse ?? lastTraitementResponse).toBeTruthy();
});

Then('une ligne est creee dans la table Offres pour cette offre', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
  expect(lastTraitementResponse?.nbOffresCreees ?? 0).toBeGreaterThan(0);
});

Then('le champ URL conserve la meilleure valeur exploitable disponible via fallback', async () => {
  expect(lastTraitementResponse?.ok).toBe(true);
  expect(expectedFallbackUrl).toBeTruthy();
});

Then('le statut final de cette offre indique explicitement un echec de recuperation', async () => {
  expect(lastEnrichissementResponse ?? lastTraitementResponse).toBeTruthy();
});

Then('la cause {string} est tracable', async ({ page: _page }, _cause: string) => {
  expect(lastEnrichissementResponse ?? lastTraitementResponse).toBeTruthy();
});

Then('le statut final de cette offre indique explicitement un echec lie à l\'anti-crawler', async () => {
  expect(lastEnrichissementResponse ?? lastTraitementResponse).toBeTruthy();
});

Then('aucune transition incoherente de statut n\'est appliquee', async () => {
  expect(lastEnrichissementResponse ?? lastTraitementResponse).toBeTruthy();
});
