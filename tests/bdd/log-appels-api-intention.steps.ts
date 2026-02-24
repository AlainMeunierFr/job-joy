/**
 * Step definitions pour la fonctionnalité Log appels API avec intention (US-3.4).
 * Réutilise le test et les steps de contexte (configuration Airtable, tableau de bord) depuis d'autres fichiers.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

const stepContext: {
  lastDateISO?: string;
  consommationResponse?: Record<string, unknown> & { parIntention?: Record<string, Record<string, number>> };
} = {};

async function clearLogForDate(dateISO: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/clear-log-appel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateISO }),
  });
  if (!res.ok) throw new Error(`clear-log-appel: ${res.status}`);
}

async function registerLogAppel(
  api: string,
  succes: boolean,
  dateISO: string,
  options?: { intention?: string; codeErreur?: string }
): Promise<void> {
  const body: Record<string, unknown> = { api, succes, dateISO };
  if (options?.intention !== undefined) body.intention = options.intention;
  if (options?.codeErreur !== undefined) body.codeErreur = options.codeErreur;
  const res = await fetch(`${API_BASE}/api/test/log-appel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`log-appel: ${res.status}`);
}

// --- Enregistrement avec intention ---
When(
  'un appel API {string} est enregistré avec succès pour la date {string} avec l\'intention {string}',
  async ({}, api: string, dateISO: string, intention: string) => {
    stepContext.lastDateISO = dateISO;
    await registerLogAppel(api, true, dateISO, { intention });
  }
);

When(
  'un appel API {string} est enregistré avec succès pour la date {string} sans intention',
  async ({}, api: string, dateISO: string) => {
    stepContext.lastDateISO = dateISO;
    await registerLogAppel(api, true, dateISO);
  }
);

// --- Vérifications champ intention dans le log ---
Then(
  'ce fichier contient au moins un enregistrement avec le champ intention {string}',
  async ({}, intention: string) => {
    const dateISO = stepContext.lastDateISO;
    expect(dateISO).toBeDefined();
    const res = await fetch(`${API_BASE}/api/test/log-appel?dateISO=${encodeURIComponent(dateISO!)}`);
    expect(res.ok).toBe(true);
    const entries = (await res.json()) as Array<Record<string, unknown>>;
    const found = Array.isArray(entries) && entries.some((e) => e && String(e.intention) === intention);
    expect(found).toBe(true);
  }
);

Then(
  'cet enregistrement ne contient pas de champ intention ou a une intention vide',
  async ({}) => {
    const dateISO = stepContext.lastDateISO;
    expect(dateISO).toBeDefined();
    const res = await fetch(`${API_BASE}/api/test/log-appel?dateISO=${encodeURIComponent(dateISO!)}`);
    expect(res.ok).toBe(true);
    const entries = (await res.json()) as Array<Record<string, unknown>>;
    const withApi = Array.isArray(entries) ? entries.filter((e) => e && e.api) : [];
    expect(withApi.length).toBeGreaterThanOrEqual(1);
    const withoutIntention = withApi.every(
      (e) => e.intention === undefined || e.intention === null || String(e.intention).trim() === ''
    );
    expect(withoutIntention).toBe(true);
  }
);

// --- Contexte : logs avec intentions données ---
async function givenLogsWithIntentions(
  dateISO: string,
  n1: number,
  intention1: string,
  n2: number,
  intention2: string
): Promise<void> {
  await clearLogForDate(dateISO);
  for (let i = 0; i < n1; i++) await registerLogAppel('Claude', true, dateISO, { intention: intention1 });
  for (let i = 0; i < n2; i++) await registerLogAppel('Airtable', true, dateISO, { intention: intention2 });
  stepContext.lastDateISO = dateISO;
}

Given(
  'que des logs d\'appels existent pour la date {string} avec {int} appels d\'intention {string} et {int} appel d\'intention {string}',
  async ({}, dateISO: string, n1: number, intention1: string, n2: number, intention2: string) => {
    await givenLogsWithIntentions(dateISO, n1, intention1, n2, intention2);
  }
);

Given(
  'des logs d\'appels existent pour la date {string} avec {int} appels d\'intention {string} et {int} appel d\'intention {string}',
  async ({}, dateISO: string, n1: number, intention1: string, n2: number, intention2: string) => {
    await givenLogsWithIntentions(dateISO, n1, intention1, n2, intention2);
  }
);

async function givenLogsOneWithIntentionOneWithout(dateISO: string, intention: string): Promise<void> {
  await clearLogForDate(dateISO);
  await registerLogAppel('Claude', true, dateISO, { intention });
  await registerLogAppel('Airtable', true, dateISO);
  stepContext.lastDateISO = dateISO;
}

Given(
  'que des logs d\'appels existent pour la date {string} avec une entrée avec intention {string} et une entrée sans intention',
  async ({}, dateISO: string, intention: string) => {
    await givenLogsOneWithIntentionOneWithout(dateISO, intention);
  }
);

Given(
  'des logs d\'appels existent pour la date {string} avec une entrée avec intention {string} et une entrée sans intention',
  async ({}, dateISO: string, intention: string) => {
    await givenLogsOneWithIntentionOneWithout(dateISO, intention);
  }
);

async function givenLogFileWithoutIntention(dateISO: string): Promise<void> {
  await clearLogForDate(dateISO);
  await registerLogAppel('Claude', true, dateISO);
  stepContext.lastDateISO = dateISO;
}

Given(
  'qu\'un fichier de log existe pour la date {string} contenant des enregistrements sans champ intention',
  async ({}, dateISO: string) => {
    await givenLogFileWithoutIntention(dateISO);
  }
);

Given(
  'un fichier de log existe pour la date {string} contenant des enregistrements sans champ intention',
  async ({}, dateISO: string) => {
    await givenLogFileWithoutIntention(dateISO);
  }
);

// --- Appel GET /api/consommation-api ---
When('j\'appelle l\'API GET \\/api\\/consommation-api', async ({}) => {
  const res = await fetch(`${API_BASE}/api/consommation-api`, { cache: 'no-store' });
  expect(res.ok).toBe(true);
  stepContext.consommationResponse = (await res.json()) as Record<string, unknown> & {
    parIntention?: Record<string, Record<string, number>>;
  };
});

// --- Vérifications réponse consommation ---
Then(
  'la réponse contient pour la date {string} les totaux par intention',
  async ({}, dateISO: string) => {
    const data = stepContext.consommationResponse;
    expect(data).toBeDefined();
    expect(data!.parIntention).toBeDefined();
    expect(data!.parIntention![dateISO]).toBeDefined();
    expect(typeof data!.parIntention![dateISO]).toBe('object');
    stepContext.lastDateISO = dateISO;
  }
);

Then('le total pour l\'intention {string} vaut {int}', async ({}, intention: string, value: number) => {
  const data = stepContext.consommationResponse;
  const dateISO = stepContext.lastDateISO;
  expect(data?.parIntention).toBeDefined();
  expect(dateISO).toBeDefined();
  const parIntention = data!.parIntention![dateISO!];
  expect(parIntention).toBeDefined();
  expect(parIntention[intention]).toBe(value);
});

Then(
  'la réponse contient des données d\'agrégation pour la date {string}',
  async ({}, dateISO: string) => {
    const data = stepContext.consommationResponse;
    expect(data).toBeDefined();
    const hasParApi = data![dateISO] !== undefined;
    const hasParIntention = data!.parIntention?.[dateISO] !== undefined;
    expect(hasParApi || hasParIntention).toBe(true);
  }
);

Then('les entrées sans intention ne contribuent pas aux totaux par intention', async ({}) => {
  const data = stepContext.consommationResponse;
  const dateISO = stepContext.lastDateISO;
  expect(data?.parIntention).toBeDefined();
  expect(dateISO).toBeDefined();
  const parIntention = data!.parIntention![dateISO!];
  expect(parIntention).toBeDefined();
  const emptyKey = parIntention[''] ?? parIntention['(sans intention)'];
  expect(emptyKey === undefined || emptyKey === 0).toBe(true);
});
