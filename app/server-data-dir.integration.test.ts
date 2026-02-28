/**
 * US-3.6 : test d'intégration — avec JOB_JOY_USER_DATA le serveur écrit dans ce dossier.
 * Nécessite un build préalable (npm run build). Utilise un port dédié pour éviter les conflits.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PORT = 30998;
const SERVER_PATH = join(process.cwd(), 'dist', 'app', 'server.js');
const ENCRYPTION_KEY_HEX = '00'.repeat(32);

async function waitForServer(baseUrl: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' });
      if (r.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server health timeout');
}

describe('server DATA_DIR (US-3.6) - intégration', () => {
  let child: ChildProcess | null = null;
  let userDataDir: string;

  beforeAll(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'job-joy-data-dir-'));
  });

  afterAll(() => {
    if (child?.pid) {
      child.kill('SIGTERM');
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('avec JOB_JOY_USER_DATA le serveur écrit parametres.json dans ce dossier', async () => {
    const env = {
      ...process.env,
      JOB_JOY_USER_DATA: userDataDir,
      PORT: String(PORT),
      PARAMETRES_ENCRYPTION_KEY: ENCRYPTION_KEY_HEX,
    };
    delete (env as NodeJS.ProcessEnv).BDD_IN_MEMORY_STORE;

    child = spawn(process.execPath, [SERVER_PATH], {
      env,
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    const baseUrl = `http://127.0.0.1:${PORT}`;
    await waitForServer(baseUrl, 20000);

    const res = await fetch(`${baseUrl}/api/parametrage-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rehibitoires: [{ titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }],
        scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
        scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
        autresRessources: '',
      }),
    });
    expect(res.ok).toBe(true);

    expect(existsSync(join(userDataDir, 'parametres.json'))).toBe(true);
  }, 20000);
});
