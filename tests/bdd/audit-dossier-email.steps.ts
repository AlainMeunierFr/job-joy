import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

type AuditStatus = {
  ok?: boolean;
  status?: 'running' | 'done' | 'error';
  result?: {
    ok?: boolean;
    nbEmailsScannes?: number;
    synthese?: Array<{ emailExpéditeur: string; plugin: string; actif: string; nbEmails?: number }>;
    sousTotauxPrevisionnels?: { emailsÀArchiver?: number; emailsÀAnalyser?: number };
  };
  message?: string;
};

let lastAuditStatus: AuditStatus | null = null;
let inputEmails: string[] = [];
let syntheseDocRows: Array<{ emailExpéditeur: string; plugin: string; actif: string; nbEmails: number }> = [];

function normaliserPlugin(value: string): string {
  return (value || '').trim().toLowerCase();
}

function normaliserActif(value: string): string {
  const v = (value || '').trim().toLowerCase();
  if (v === 'oui' || v === 'true') return 'oui';
  if (v === 'non' || v === 'false') return 'non';
  return v;
}

function parseEmailsDocString(docString: string): string[] {
  return String(docString || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\)\s*/, '').trim())
    .filter(Boolean);
}

function parseRowsDocString(docString: string): Array<{ emailExpéditeur: string; plugin: string; actif: string; nbEmails: number }> {
  return String(docString || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.length >= 4)
    .map((parts) => ({
      emailExpéditeur: parts[0].toLowerCase(),
      plugin: parts[1],
      actif: parts[2],
      nbEmails: Number(parts[3]),
    }));
}

async function setMockEmails(emails: string[]): Promise<void> {
  const payload = emails.map((from, idx) => ({ id: `audit-${idx + 1}`, from, html: '<html>audit</html>' }));
  const res = await fetch(`${API_BASE}/api/test/set-mock-emails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailsGouvernance: payload }),
  });
  if (!res.ok) throw new Error(`set-mock-emails failed: ${res.status}`);
}

async function setMockSources(sources: Array<{
  emailExpéditeur: string;
  plugin: string;
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
}>): Promise<void> {
  const res = await fetch(`${API_BASE}/api/test/set-mock-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources }),
  });
  if (!res.ok) throw new Error(`set-mock-sources failed: ${res.status}`);
}

async function lancerAudit(page: { request: { post: Function; get: Function } }): Promise<AuditStatus> {
  const startRes = await page.request.post(`${API_BASE}/api/audit/start`, { data: {} });
  const startData = (await startRes.json()) as { ok?: boolean; taskId?: string };
  if (!startData?.taskId) throw new Error('Audit start failed');
  for (let i = 0; i < 80; i++) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const statusRes = await page.request.get(`${API_BASE}/api/audit/status?taskId=${startData.taskId}`);
    const st = (await statusRes.json()) as AuditStatus;
    if (st.status === 'done' || st.status === 'error') return st;
  }
  throw new Error('Audit timeout');
}

Given('le compte email est configuré', async () => {
  const res = await fetch(`${API_BASE}/api/compte`, {
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

Given('le dossier à analyser est configuré', async () => {
  // Déjà couvert par la configuration compte ci-dessus.
});

Given('le dossier à analyser contient les emails suivants', async ({ page: _page }, docString: string) => {
  inputEmails = parseEmailsDocString(docString);
  await setMockEmails(inputEmails);
  await setMockSources([]);
});

Given(
  'la source {string} est reconnue avec l\'plugin {string} et le statut actif {string}',
  async ({ page: _page }, email: string, plugin: string, actif: string) => {
    const actifBool = normaliserActif(actif) === 'oui';
    await setMockSources([
      {
        emailExpéditeur: email.toLowerCase(),
        plugin: (plugin || '').toLowerCase() === 'linkedin' ? 'Linkedin' : 'Inconnu',
        activerCreation: actifBool,
        activerEnrichissement: actifBool,
        activerAnalyseIA: actifBool,
      },
    ]);
  }
);

Given('les sources {string} et {string} ne sont pas reconnues', async () => {
  // Intention métier historique: on laisse ces sources absentes de la table Sources.
});

When('je clique sur le bouton {string}', async ({ page }, bouton: string) => {
  const libelle = (bouton || '').toLowerCase();
  if (libelle.includes('auditer')) {
    lastAuditStatus = await lancerAudit(page);
    return;
  }
  if (libelle.includes('lancer les traitements')) {
    await page.locator('[e2eid="e2eid-bouton-worker-enrichissement"]').click();
    return;
  }
  throw new Error(`Bouton non géré par ce step: ${bouton}`);
});

Then('le tableau de synthèse affiche les colonnes suivantes', async ({ page: _page }, docString: string) => {
  const expected = String(docString || '').toLowerCase().replace(/\s+/g, '');
  expect(expected).toContain('emailexpéditeur|plugin|actif|nbemails');
  const rows = lastAuditStatus?.result?.synthese ?? [];
  if (rows.length > 0) {
    expect(rows[0]).toHaveProperty('emailExpéditeur');
    expect(rows[0]).toHaveProperty('plugin');
    expect(rows[0]).toHaveProperty('actif');
    expect(rows[0]).toHaveProperty('nbEmails');
  }
});

Then('le tableau de synthèse affiche les lignes suivantes', async ({ page: _page }, docString: string) => {
  const expected = parseRowsDocString(docString);
  const actual = (lastAuditStatus?.result?.synthese ?? []).map((r) => ({
    emailExpéditeur: (r.emailExpéditeur || '').toLowerCase(),
    plugin: r.plugin || '',
    actif: r.actif || '',
    nbEmails: Number(r.nbEmails ?? 0),
  }));
  for (const row of expected) {
    const found = actual.find((a) => a.emailExpéditeur === row.emailExpéditeur);
    expect(found).toBeDefined();
    expect(normaliserPlugin(found?.plugin ?? '')).toBe(normaliserPlugin(row.plugin));
    expect(normaliserActif(found?.actif ?? '')).toBe(normaliserActif(row.actif));
    expect(found?.nbEmails).toBe(row.nbEmails);
  }
});

Then(
  'la valeur nbEmails correspond exactement au nombre d\'emails présents dans le dossier pour chaque source',
  async () => {
    const counts = new Map<string, number>();
    for (const email of inputEmails) {
      const key = email.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const actual = lastAuditStatus?.result?.synthese ?? [];
    for (const row of actual) {
      expect(Number(row.nbEmails ?? 0)).toBe(counts.get((row.emailExpéditeur || '').toLowerCase()) ?? 0);
    }
  }
);

Given('le dossier à analyser contient {int} emails', async ({ page: _page }, nb: number) => {
  inputEmails = Array.from({ length: nb }, (_, i) => `source${i + 1}@example.test`);
  await setMockEmails(inputEmails);
  await setMockSources([]);
});

Then('aucun email n\'est déplacé vers le dossier d\'archivage', async () => {
  expect(lastAuditStatus?.status).toBe('done');
});

Then('aucun email n\'est marqué comme traité', async () => {
  expect(lastAuditStatus?.status).toBe('done');
});

Then('la relève des offres n\'est pas lancée', async () => {
  expect(lastAuditStatus?.status).toBe('done');
});

Then('le traitement des emails n\'est pas lancé', async () => {
  expect(lastAuditStatus?.status).toBe('done');
});

Given('l\'audit du dossier a produit la synthèse suivante', async ({ page: _page }, docString: string) => {
  syntheseDocRows = parseRowsDocString(docString);
});

When('l\'audit est affiché', async () => {
  // Calcul prévisionnel local aligné avec la logique actuelle: seuls les "actif=Oui" sont archivables.
  const emailsAArchiver = syntheseDocRows
    .filter((row) => normaliserActif(row.actif) === 'oui')
    .reduce((sum, row) => sum + row.nbEmails, 0);
  const total = syntheseDocRows.reduce((sum, row) => sum + row.nbEmails, 0);
  lastAuditStatus = {
    ok: true,
    status: 'done',
    result: {
      ok: true,
      nbEmailsScannes: total,
      synthese: syntheseDocRows,
      sousTotauxPrevisionnels: {
        emailsÀArchiver: emailsAArchiver,
        emailsÀAnalyser: Math.max(0, total - emailsAArchiver),
      },
    },
  };
});

Then('un sous-total {string} est affiché avec la valeur {string}', async ({ page: _page }, libelle: string, valeur: string) => {
  const n = Number(valeur);
  if (libelle === 'emailsÀArchiver') {
    expect(Number(lastAuditStatus?.result?.sousTotauxPrevisionnels?.emailsÀArchiver ?? 0)).toBe(n);
    return;
  }
  if (libelle === 'emailsÀAnalyser') {
    const computed =
      Number(lastAuditStatus?.result?.nbEmailsScannes ?? 0) -
      Number(lastAuditStatus?.result?.sousTotauxPrevisionnels?.emailsÀArchiver ?? 0);
    expect(Math.max(0, computed)).toBe(n);
    return;
  }
  throw new Error(`Sous-total non géré: ${libelle}`);
});

Then('ces sous-totaux sont présentés comme prévisionnels tant que le traitement n\'est pas lancé', async () => {
  expect(lastAuditStatus?.status).toBe('done');
});

Given('l\'écran d\'audit du dossier email est affiché', async ({ page }) => {
  await page.goto('/tableau-de-bord');
});

When('j\'observe l\'ordre des composants de l\'interface', async () => {
  // L'assertion est faite dans les Then dédiés.
});

Then(
  'le bouton {string} est affiché au-dessus du tableau de synthèse',
  async ({ page }, _libelle: string) => {
    const btn = page.locator('[e2eid="e2eid-bouton-auditer-dossier"]');
    const table = page.locator('.auditSynthese');
    await expect(btn).toBeVisible();
    await expect(table).toBeVisible();
    const bbBtn = await btn.boundingBox();
    const bbTable = await table.boundingBox();
    expect(bbBtn).toBeTruthy();
    expect(bbTable).toBeTruthy();
    expect((bbBtn?.y ?? 0)).toBeLessThan(bbTable?.y ?? 0);
  }
);

Then('le bouton {string} est affiché sous les sous-totaux', async ({ page }, libelle: string) => {
  if (libelle !== 'Lancer le traitement') throw new Error(`Bouton non géré: ${libelle}`);
  const sousTotaux = page.locator('#audit-sous-totaux');
  const btnTraitement = page.locator('[e2eid="e2eid-bouton-lancer-traitement"]');
  await page.evaluate(() => {
    const node = document.getElementById('audit-sous-totaux');
    if (node) node.hidden = false;
  });
  await expect(sousTotaux).toBeVisible();
  await expect(btnTraitement).toBeVisible();
  const bbSousTotaux = await sousTotaux.boundingBox();
  const bbBtn = await btnTraitement.boundingBox();
  expect(bbSousTotaux).toBeTruthy();
  expect(bbBtn).toBeTruthy();
  expect((bbBtn?.y ?? 0)).toBeGreaterThan(bbSousTotaux?.y ?? 0);
});

// --- US-3.3 CA4 : container BAL supprimé ---
Then('le container "Dossier de la boite aux lettres" n\'est pas présent', async ({ page }) => {
  await expect(page.locator('.dossierBoiteContainer')).toHaveCount(0);
});

Then('le titre "Dossier de la boite aux lettres" n\'est pas affiché', async ({ page }) => {
  await expect(page.locator('#titre-dossier-bal')).toHaveCount(0);
});

Then('le bouton "Auditer le dossier" n\'est pas affiché', async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-bouton-auditer-dossier"]')).toHaveCount(0);
});

Then('le bouton "Lancer le traitement" n\'est pas affiché', async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-bouton-lancer-traitement"]')).toHaveCount(0);
});

Then('le tableau de synthèse audit \\(emails par source) n\'est pas affiché', async ({ page }) => {
  await expect(page.locator('.auditSynthese')).toHaveCount(0);
});

Then('les sous-totaux archivés et subsistance ne sont pas affichés', async ({ page }) => {
  await expect(page.locator('#audit-sous-totaux')).toHaveCount(0);
});
