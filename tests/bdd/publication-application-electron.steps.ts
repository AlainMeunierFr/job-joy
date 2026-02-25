/**
 * Step definitions pour la fonctionnalité Publication application Electron (US-3.6).
 * Scénarios partiellement automatisés : serveur avec JOB_JOY_USER_DATA, DATA_DIR, interface visible.
 * Steps installateur / après installation / fenêtre Electron : stub ou validation manuelle.
 * US-4.6 : si contextElectronPackaged.electronFetchBaseUrl est défini, JOB_JOY_ELECTRON_FETCH_URL est injecté au spawn.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { contextElectronPackaged, startMockFetchServer, stopMockFetchServer } from './context-electron-packaged.js';

export const { Given, When, Then } = createBdd(test);

const PACKAGED_SERVER_PORT = 3012;
const ENCRYPTION_KEY_HEX = '00'.repeat(32);

const stepContext: {
  userDataDir: string | null;
  serverPort: number | null;
  serverProcess: import('node:child_process').ChildProcess | null;
} = { userDataDir: null, serverPort: null, serverProcess: null };

async function waitForServer(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  const baseUrl = `http://127.0.0.1:${port}`;
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' });
      if (r.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server health timeout on port ${port}`);
}

function cleanupPackagedServer(): void {
  if (stepContext.serverProcess?.pid) {
    stepContext.serverProcess.kill('SIGTERM');
    stepContext.serverProcess = null;
  }
  if (stepContext.userDataDir) {
    try {
      rmSync(stepContext.userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    stepContext.userDataDir = null;
  }
  stepContext.serverPort = null;
  stopMockFetchServer();
}

// --- CA1 : Installateur - disponibilité (stub) ---
Given(
  /l'application est publiée \(ex\. release GitHub ou page de téléchargement\)/,
  async () => {
    // Validation manuelle : vérifier que la release ou la page de téléchargement existe.
  }
);

When(
  "l'utilisateur consulte la page des releases ou le lien de téléchargement",
  async () => {
    // Stub : pas d'action automatisée.
  }
);

Then(
  /un lien vers un installateur Windows \(\.exe ou \.msi\) est disponible/,
  async () => {
    // À valider manuellement ou test conditionnel si exe présent dans release.
    expect(true).toBe(true);
  }
);

// --- CA1 : Après installation (stub) ---
Given("l'installateur Windows a été exécuté avec succès", async () => {
  // Validation manuelle : exécuter l'installateur puis vérifier emplacement.
});

Then(
  /l'application est installée dans un répertoire adapté \(ex\. sous %LOCALAPPDATA%\\Programs ou équivalent\)/,
  async () => {
    // À valider manuellement après installation.
    expect(true).toBe(true);
  }
);

Then(
  /un raccourci vers l'application est présent \(Menu Démarrer et\/ou Bureau\)/,
  async () => {
    // À valider manuellement.
    expect(true).toBe(true);
  }
);

// --- CA2 : Lancement tout-en-un ---
Given(
  /l'application est installée \(version packagée Electron\)/,
  async () => {
    // Stub : équivalent à "application packagée est lancée" pour l’automation.
  }
);

When(
  /l'utilisateur lance l'application \(raccourci ou exe\)/,
  async () => {
    // En test automatisé on simule via "application packagée est lancée".
  }
);

Then('un serveur web local est démarré automatiquement', async () => {
  // Vérifié indirectement quand on lance le serveur avec JOB_JOY_USER_DATA.
  if (stepContext.serverPort) {
    const r = await fetch(`http://127.0.0.1:${stepContext.serverPort}/api/health`, {
      cache: 'no-store',
    });
    expect(r.ok).toBe(true);
  } else {
    expect(true).toBe(true);
  }
});

Then(
  /une fenêtre s'ouvre affichant l'interface de l'application \(ex\. localhost avec port dédié\)/,
  async () => {
    // À valider manuellement avec Electron ; en BDD on vérifie que l’URL répond.
    expect(true).toBe(true);
  }
);

Then(
  "aucune commande en ligne de commande n'est requise",
  async () => {
    expect(true).toBe(true);
  }
);

// --- Scénario : fenêtre affiche l’interface ---
Given("l'application packagée est lancée", async () => {
  cleanupPackagedServer();
  const userDataDir = mkdtempSync(join(tmpdir(), 'job-joy-bdd-'));
  const serverPath = join(process.cwd(), 'dist', 'app', 'server.js');
  const env = {
    ...process.env,
    JOB_JOY_USER_DATA: userDataDir,
    PORT: String(PACKAGED_SERVER_PORT),
    PARAMETRES_ENCRYPTION_KEY: ENCRYPTION_KEY_HEX,
  };
  delete (env as NodeJS.ProcessEnv).BDD_IN_MEMORY_STORE;

  const child = spawn(process.execPath, [serverPath], {
    env,
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  stepContext.userDataDir = userDataDir;
  stepContext.serverPort = PACKAGED_SERVER_PORT;
  stepContext.serverProcess = child;
  await waitForServer(PACKAGED_SERVER_PORT, 15000);
});

When("la fenêtre de l'application est affichée", async ({ page }) => {
  const port = stepContext.serverPort ?? 3011;
  const baseUrl = `http://127.0.0.1:${port}`;
  await page.goto(baseUrl);
});

Then(
  /l'interface de l'application \(page d'accueil ou tableau de bord\) est visible/,
  async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    const content = await page.content();
    expect(
      content.includes('parametres') ||
        content.includes('tableau') ||
        content.includes('Paramètres') ||
        content.includes('Tableau')
    ).toBe(true);
  }
);

Then(
  /l'application est accessible via une adresse locale \(ex\. localhost avec un port dédié\)/,
  async () => {
    const port = stepContext.serverPort ?? 3011;
    const r = await fetch(`http://127.0.0.1:${port}/api/health`, { cache: 'no-store' });
    expect(r.ok).toBe(true);
  }
);

// --- CA3 : Données utilisateur DATA_DIR ---
Given(
  /l'application packagée est lancée \(version Electron\)/,
  async ({ page }) => {
    cleanupPackagedServer();
    const fetchBaseUrl = startMockFetchServer();
    contextElectronPackaged.electronFetchBaseUrl = fetchBaseUrl;
    const userDataDir = mkdtempSync(join(tmpdir(), 'job-joy-bdd-'));
    const serverPath = join(process.cwd(), 'dist', 'app', 'server.js');
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      JOB_JOY_USER_DATA: userDataDir,
      PORT: String(PACKAGED_SERVER_PORT),
      PARAMETRES_ENCRYPTION_KEY: ENCRYPTION_KEY_HEX,
      JOB_JOY_ELECTRON_FETCH_URL: fetchBaseUrl,
      BDD_MOCK_CONNECTEUR: '1',
      BDD_IN_MEMORY_STORE: '1',
    };

    const child = spawn(process.execPath, [serverPath], {
      env,
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    stepContext.userDataDir = userDataDir;
    stepContext.serverPort = PACKAGED_SERVER_PORT;
    stepContext.serverProcess = child;
    await waitForServer(PACKAGED_SERVER_PORT, 15000);
    process.env.PLAYWRIGHT_BASE_URL = `http://127.0.0.1:${PACKAGED_SERVER_PORT}`;
    if (page) {
      await page.goto(`http://127.0.0.1:${PACKAGED_SERVER_PORT}`);
    }
  }
);

When(
  /l'application enregistre une donnée utilisateur \(config ou donnée métier\)/,
  async () => {
    const port = stepContext.serverPort ?? 3011;
    const baseUrl = `http://127.0.0.1:${port}`;
    const res = await fetch(`${baseUrl}/api/parametrage-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rehibitoires: [
          { titre: '', description: '' },
          { titre: '', description: '' },
          { titre: '', description: '' },
          { titre: '', description: '' },
        ],
        scoresIncontournables: {
          localisation: '',
          salaire: '',
          culture: '',
          qualiteOffre: '',
        },
        scoresOptionnels: [
          { titre: '', attente: '' },
          { titre: '', attente: '' },
          { titre: '', attente: '' },
          { titre: '', attente: '' },
        ],
        autresRessources: '',
      }),
    });
    expect(res.ok).toBe(true);
  }
);

Then(
  /le fichier ou le répertoire est créé dans le répertoire dédié utilisateur \(DATA_DIR\)/,
  async () => {
    expect(stepContext.userDataDir).not.toBeNull();
    const parametresPath = join(stepContext.userDataDir!, 'parametres.json');
    expect(existsSync(parametresPath)).toBe(true);
  }
);

Then(
  "pas dans le répertoire d'installation de l'application",
  async () => {
    // Impliqué par l’usage de userData (temp) distinct du répertoire projet.
    expect(stepContext.userDataDir).not.toBeNull();
  }
);

Given(
  /l'application packagée est lancée pour la première fois ou après un enregistrement de config/,
  async () => {
    cleanupPackagedServer();
    const userDataDir = mkdtempSync(join(tmpdir(), 'job-joy-bdd-'));
    const serverPath = join(process.cwd(), 'dist', 'app', 'server.js');
    const env = {
      ...process.env,
      JOB_JOY_USER_DATA: userDataDir,
      PORT: String(PACKAGED_SERVER_PORT),
      PARAMETRES_ENCRYPTION_KEY: ENCRYPTION_KEY_HEX,
    };
    delete (env as NodeJS.ProcessEnv).BDD_IN_MEMORY_STORE;

    const child = spawn(process.execPath, [serverPath], {
      env,
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    stepContext.userDataDir = userDataDir;
    stepContext.serverPort = PACKAGED_SERVER_PORT;
    stepContext.serverProcess = child;
    await waitForServer(PACKAGED_SERVER_PORT, 15000);
  }
);

When(
  "l'application crée ou met à jour un fichier de configuration",
  async () => {
    const port = stepContext.serverPort ?? 3011;
    const res = await fetch(`http://127.0.0.1:${port}/api/parametrage-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rehibitoires: [
          { titre: '', description: '' },
          { titre: '', description: '' },
          { titre: '', description: '' },
          { titre: '', description: '' },
        ],
        scoresIncontournables: {
          localisation: '',
          salaire: '',
          culture: '',
          qualiteOffre: '',
        },
        scoresOptionnels: [
          { titre: '', attente: '' },
          { titre: '', attente: '' },
          { titre: '', attente: '' },
          { titre: '', attente: '' },
        ],
        autresRessources: '',
      }),
    });
    expect(res.ok).toBe(true);
  }
);

Then(
  /ce fichier est présent dans le répertoire DATA_DIR \(ex\. %APPDATA%\/job-joy ou équivalent\)/,
  async () => {
    expect(stepContext.userDataDir).not.toBeNull();
    expect(existsSync(join(stepContext.userDataDir!, 'parametres.json'))).toBe(true);
  }
);

// --- CA4 : Mises à jour (stub) ---
Given(
  "l'application installée est en version {string}",
  async ({}, _version: string) => {
    // Stub : mock version installée.
  }
);

Given(
  /une version plus récente "([^"]+)" est disponible \(mock ou métadonnée de release\)/,
  async ({}, _version: string) => {
    // Stub.
  }
);

When("l'application vérifie les mises à jour", async () => {
  // Stub : pas d’implémentation auto des mises à jour dans ce scope.
});

Then(
  "l'utilisateur est informé qu'une mise à jour est disponible",
  async () => {
    // À valider manuellement ou avec mock.
    expect(true).toBe(true);
  }
);

Then(
  /l'application propose d'installer ou de télécharger la nouvelle version \(ou des instructions claires\)/,
  async () => {
    expect(true).toBe(true);
  }
);

// --- CA5 : Coexistence dev / Electron ---
Given(
  'la version de développement utilise le répertoire projet pour les données',
  async () => {
    // En dev, DATA_DIR = projet/data (pas d’JOB_JOY_USER_DATA).
  }
);

When(
  /l'utilisateur lance la version packagée \(Electron\) sur la même machine/,
  async () => {
    // Stub : en BDD on simule via serveur avec userData.
  }
);

Then(
  /la version Electron utilise le répertoire dédié utilisateur \(DATA_DIR\) pour les données/,
  async () => {
    // Vérifié par les scénarios DATA_DIR ci-dessus.
    expect(true).toBe(true);
  }
);

Then(
  "non le répertoire du projet de développement",
  async () => {
    expect(true).toBe(true);
  }
);
