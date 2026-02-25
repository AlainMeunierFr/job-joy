/**
 * Contexte partagé entre publication-application-electron.steps.ts et prerequis-enrichissement-electron.steps.ts (US-4.6).
 * Permet de lancer le serveur "packagé" avec JOB_JOY_ELECTRON_FETCH_URL quand un mock de fetch Electron est utilisé.
 */
import { createServer, type Server } from 'node:http';

export const contextElectronPackaged: {
  electronFetchBaseUrl: string | null;
} = {
  electronFetchBaseUrl: null,
};

const MOCK_FETCH_PORT = 29999;
let mockFetchServer: Server | null = null;

const LINKEDIN_MOCK_HTML = `
<!DOCTYPE html>
<html><body>
<div class="description__text"><div class="show-more-less-html__markup">
Offre test BDD. Poste: Développeur. Entreprise: Acme. À propos de l'entreprise: Nous sommes une équipe.
</div></div>
</body></html>
`;

const CADRE_EMPLOI_MOCK_HTML = `
<!DOCTYPE html>
<html><body><main class="offer-content"><div class="offer-body">Contenu offre Cadre emploi test.</div></main></body></html>
`;

export function startMockFetchServer(): string {
  if (mockFetchServer) {
    return `http://127.0.0.1:${MOCK_FETCH_PORT}`;
  }
  mockFetchServer = createServer((req, res) => {
    const u = req.url ?? '';
    const match = u.match(/\?url=(.+)$/);
    const decodedUrl = match ? decodeURIComponent(match[1]) : '';
    const isCadreEmploi = decodedUrl.includes('cadremploi.');
    const html = isCadreEmploi ? CADRE_EMPLOI_MOCK_HTML : LINKEDIN_MOCK_HTML;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  mockFetchServer.listen(MOCK_FETCH_PORT, '127.0.0.1');
  return `http://127.0.0.1:${MOCK_FETCH_PORT}`;
}

export function stopMockFetchServer(): void {
  if (mockFetchServer) {
    mockFetchServer.close();
    mockFetchServer = null;
  }
  contextElectronPackaged.electronFetchBaseUrl = null;
}
