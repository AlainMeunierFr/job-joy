/**
 * Serveur : menu (US-1.2), pages Tableau de bord / Paramètres, API compte (US-1.1).
 * Composition : le connecteur email (port) est créé ici et injecté dans les handlers.
 */
import '../utils/load-env-local.js';
import { randomBytes } from 'node:crypto';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPageParametres } from './page-html.js';
import { getPageTableauDeBord } from './layout-html.js';
import type { AlgoSource } from '../utils/gouvernance-sources-emails.js';
import {
  handleGetCompte,
  handleGetAirtable,
  handlePostCompte,
  handlePostTestConnexion,
  handlePostConfigurationAirtable,
  handlePostTraitement,
  handlePostTraitementStart,
  handleGetTraitementStatus,
  handlePostAuditStart,
  handleGetAuditStatus,
  handleGetEnrichissementWorkerStatus,
  handlePostEnrichissementWorkerStart,
  handlePostEnrichissementWorkerStop,
  handleGetTableauSyntheseOffres,
  setBddMockEmailsGouvernance,
  setBddMockSources,
  setBddMockTableauSynthese,
} from './api-handlers.js';
import { ecrireCompte, lireCompte, resetCompteStoreForTest, getCompteStoreForTest } from '../utils/compte-io.js';
import { ecrireAirTable } from '../utils/parametres-airtable.js';
import { evaluerParametragesComplets } from '../utils/parametrages-complets.js';
import { appliquerCallbackMicrosoft, lireParametres } from '../utils/parametres-io.js';
import { getConnecteurEmail } from '../utils/connecteur-email-factory.js';
import {
  microsoftTokenDisponible,
  getAuthorizeUrl,
  exchangeCodeForTokens,
  fetchUserEmailFromGraph,
  generatePkce,
  getConfigAuthMicrosoft,
  clearMicrosoftTokenCache,
} from '../utils/auth-microsoft.js';
import { getUrlOuvertureBase } from '../utils/airtable-url.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
/** Chemin canonique absolu du dossier data (un seul fichier parametres.json pour toute l'app). */
const DATA_DIR = resolve(join(PROJECT_ROOT, 'data'));
const PORT = Number(process.env.PORT) || 3001;

const MS_OAUTH_STATE = 'ms_oauth_state';
const MS_OAUTH_VERIFIER = 'ms_oauth_verifier';
const COOKIE_OPTIONS = 'Path=/; HttpOnly; SameSite=Lax; Max-Age=600';
const FLASH_COOKIE = 'parametres_flash';
const FLASH_CONFIG_COOKIE = 'parametres_config_flash';
const FLASH_MAX_AGE = 60;

type FlashMicrosoft = { type: 'microsoft'; status: 'ok' } | { type: 'microsoft'; status: 'error'; message: string };
const flashStore = new Map<string, FlashMicrosoft>();
const flashConfigStore = new Map<string, string[]>();

function setFlashAndRedirect(
  res: ServerResponse,
  clearCookies: string[],
  flash: FlashMicrosoft
): void {
  const id = randomId();
  flashStore.set(id, flash);
  const cookieFlash = `${FLASH_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${FLASH_MAX_AGE}`;
  res.writeHead(302, {
    Location: '/parametres',
    'Set-Cookie': [...clearCookies, cookieFlash],
    'Cache-Control': 'no-store',
  });
  res.end();
}

function consumeFlash(cookieHeader: string | undefined): FlashMicrosoft | null {
  const cookies = parseCookies(cookieHeader);
  const id = cookies[FLASH_COOKIE];
  if (!id) return null;
  const flash = flashStore.get(id) ?? null;
  flashStore.delete(id);
  return flash;
}

function clearFlashCookieHeader(): string {
  return `${FLASH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function consumeFlashConfig(cookieHeader: string | undefined): string[] | null {
  const cookies = parseCookies(cookieHeader);
  const id = cookies[FLASH_CONFIG_COOKIE];
  if (!id) return null;
  const manque = flashConfigStore.get(id) ?? null;
  flashConfigStore.delete(id);
  return manque;
}

function clearFlashConfigCookieHeader(): string {
  return `${FLASH_CONFIG_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function getBaseUrl(req: IncomingMessage): string {
  const host = req.headers.host || `127.0.0.1:${PORT}`;
  return `http://${host}`;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = decodeURIComponent(part.slice(0, eq).trim());
    const value = decodeURIComponent(part.slice(eq + 1).trim());
    out[key] = value;
  }
  return out;
}

function randomId(): string {
  return randomBytes(16).toString('base64url');
}

function notFound(res: ServerResponse): void {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

function parseBody(req: IncomingMessage): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function parseFormUrlEncoded(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split('&')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = decodeURIComponent(part.slice(0, eq).replace(/\+/g, ' '));
    const value = decodeURIComponent(part.slice(eq + 1).replace(/\+/g, ' '));
    out[key] = value;
  }
  return out;
}

const server = createServer(async (req, res) => {
  const url = req.url ?? '/';
  const pathname = url.split('?')[0];

  if (req.method === 'GET' && pathname === '/') {
    const { complet } = evaluerParametragesComplets(DATA_DIR);
    const target = complet ? '/tableau-de-bord' : '/parametres';
    res.writeHead(302, { Location: target, 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  if (req.method === 'GET' && (pathname === '/parametres' || pathname === '/parametrage-compte-email')) {
    const flash = consumeFlash(req.headers.cookie);
    const flashConfig = consumeFlashConfig(req.headers.cookie);
    const headers: Record<string, string | string[]> = {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    };
    const clearCookies: string[] = [];
    if (flash) clearCookies.push(clearFlashCookieHeader());
    if (flashConfig) clearCookies.push(clearFlashConfigCookieHeader());
    if (clearCookies.length) headers['Set-Cookie'] = clearCookies;
    const { complet } = evaluerParametragesComplets(DATA_DIR);
    res.writeHead(200, headers);
    const parametres = lireParametres(DATA_DIR);
    const tokenObtainedAt = parametres?.connexionBoiteEmail?.microsoft?.tokenObtainedAt;
    res.end(
      await getPageParametres(DATA_DIR, {
        microsoftAvailable: microsoftTokenDisponible(),
        flash: flash ?? undefined,
        baseUrl: getBaseUrl(req),
        tokenObtainedAt,
        configComplète: complet,
        flashConfigManque: flashConfig ?? undefined,
      })
    );
    return;
  }

  if (req.method === 'GET' && pathname === '/tableau-de-bord') {
    const { complet } = evaluerParametragesComplets(DATA_DIR);
    if (!complet) {
      res.writeHead(302, { Location: '/parametres', 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
    const parametres = lireParametres(DATA_DIR);
    const airtableBaseUrl = getUrlOuvertureBase(parametres?.airtable?.base ?? '');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(getPageTableauDeBord({ airtableBaseUrl }));
    return;
  }

  if (req.method === 'POST' && (pathname === '/parametres' || pathname === '/' || pathname === '/parametrage-compte-email')) {
    const raw = await new Promise<string>((resolve, reject) => {
      let b = '';
      req.on('data', (c: Buffer) => { b += c; });
      req.on('end', () => resolve(b));
      req.on('error', reject);
    });
    const data = raw ? parseFormUrlEncoded(raw) : {};
    const provider = (String(data.provider ?? 'imap').trim().toLowerCase() || 'imap') as 'imap' | 'microsoft' | 'gmail';
    const existingCompte = lireCompte(DATA_DIR);
    let adresseEmail = String(data.adresseEmail ?? '').trim();
    if (provider === 'microsoft' && !adresseEmail) {
      adresseEmail = (existingCompte?.adresseEmail ?? '').trim();
    }
    const motDePasse = String(data.motDePasse ?? '').trim();
    const cheminDossier = String(data.cheminDossier ?? '').trim();
    const cheminDossierArchiveRaw = String(data.cheminDossierArchive ?? '').trim();
    const cheminDossierArchive =
      cheminDossierArchiveRaw !== ''
        ? cheminDossierArchiveRaw
        : (existingCompte?.cheminDossierArchive ?? '').trim();
    const imapHost = String(data.imapHost ?? '').trim();
    const imapPort = Number(data.imapPort) || 993;
    const imapSecure = data.imapSecure !== '0' && data.imapSecure !== 'false';
    const airtableApiKey = String(data.airtableApiKey ?? '').trim();
    const airtableBase = String(data.airtableBase ?? '').trim();
    try {
      ecrireCompte(DATA_DIR, { provider, adresseEmail, motDePasse, cheminDossier, cheminDossierArchive, imapHost, imapPort, imapSecure });
      const airtableUpdates: { base?: string; apiKey?: string } = { base: airtableBase || undefined };
      if (airtableApiKey) airtableUpdates.apiKey = airtableApiKey;
      ecrireAirTable(DATA_DIR, airtableUpdates);
    } catch {
      // redirection même en cas d'erreur pour réafficher la page
    }
    const { complet, manque } = evaluerParametragesComplets(DATA_DIR);
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
    if (!complet) {
      const flashConfigId = randomId();
      flashConfigStore.set(flashConfigId, manque);
      headers['Set-Cookie'] = `${FLASH_CONFIG_COOKIE}=${flashConfigId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${FLASH_MAX_AGE}`;
    }
    res.writeHead(303, { ...headers, Location: '/tableau-de-bord' });
    res.end();
    return;
  }

  if (req.method === 'GET' && pathname === '/styles/site.css') {
    try {
      const css = await readFile(join(__dirname, 'site.css'), 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(css);
    } catch {
      notFound(res);
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/auth/microsoft') {
    const config = getConfigAuthMicrosoft();
    if (!config.clientId) {
      setFlashAndRedirect(res, [], { type: 'microsoft', status: 'error', message: 'AZURE_CLIENT_ID' });
      return;
    }
    if (!config.tenantId || config.tenantId === 'common') {
      setFlashAndRedirect(res, [], { type: 'microsoft', status: 'error', message: 'AZURE_TENANT_ID' });
      return;
    }
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;
    const state = randomId();
    const { codeVerifier, codeChallenge } = generatePkce();
    let url: string;
    try {
      url = getAuthorizeUrl(redirectUri, state, codeChallenge);
    } catch (err) {
      setFlashAndRedirect(res, [], { type: 'microsoft', status: 'error', message: 'AZURE_TENANT_ID' });
      return;
    }
    res.writeHead(302, {
      Location: url,
      'Set-Cookie': [
        `${MS_OAUTH_STATE}=${encodeURIComponent(state)}; ${COOKIE_OPTIONS}`,
        `${MS_OAUTH_VERIFIER}=${encodeURIComponent(codeVerifier)}; ${COOKIE_OPTIONS}`,
      ],
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && pathname === '/api/auth/microsoft/callback') {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;
    const u = new URL(req.url ?? '/', baseUrl);
    const code = u.searchParams.get('code');
    const state = u.searchParams.get('state');
    const error = u.searchParams.get('error');
    const cookies = parseCookies(req.headers.cookie);
    const clearCookies = [
      `${MS_OAUTH_STATE}=; Path=/; HttpOnly; Max-Age=0`,
      `${MS_OAUTH_VERIFIER}=; Path=/; HttpOnly; Max-Age=0`,
    ];
    if (error) {
      setFlashAndRedirect(res, clearCookies, { type: 'microsoft', status: 'error', message: error });
      return;
    }
    if (!code || !state || state !== cookies[MS_OAUTH_STATE]) {
      setFlashAndRedirect(res, clearCookies, { type: 'microsoft', status: 'error', message: 'invalid_callback' });
      return;
    }
    const codeVerifier = cookies[MS_OAUTH_VERIFIER];
    if (!codeVerifier) {
      setFlashAndRedirect(res, clearCookies, { type: 'microsoft', status: 'error', message: 'no_verifier' });
      return;
    }
    try {
      const config = getConfigAuthMicrosoft();
      const tokens = await exchangeCodeForTokens(code, redirectUri, codeVerifier);
      const existing = lireCompte(DATA_DIR);
      const emailFromGraph = await fetchUserEmailFromGraph(tokens.accessToken).catch(() => null);
      appliquerCallbackMicrosoft(DATA_DIR, {
        adresseEmail: emailFromGraph ?? existing?.adresseEmail ?? '',
        refreshToken: tokens.refreshToken,
        clientId: config.clientId,
        tenantId: config.tenantId,
        tokenObtainedAt: Date.now(),
      });
      clearMicrosoftTokenCache();
      setFlashAndRedirect(res, clearCookies, { type: 'microsoft', status: 'ok' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFlashAndRedirect(res, clearCookies, { type: 'microsoft', status: 'error', message: msg.slice(0, 200) });
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/compte') {
    handleGetCompte(DATA_DIR, res);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/airtable') {
    handleGetAirtable(DATA_DIR, res);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/tableau-synthese-offres') {
    try {
      await handleGetTableauSyntheseOffres(DATA_DIR, res);
    } catch (err) {
      console.error('GET /api/tableau-synthese-offres error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/test-connexion') {
    try {
      const body = await parseBody(req);
      await handlePostTestConnexion(getConnecteurEmail, body, res);
    } catch (err) {
      console.error('POST /api/test-connexion error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/compte') {
    try {
      const body = await parseBody(req);
      handlePostCompte(DATA_DIR, body, res);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: 'Invalid body' }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/configuration-airtable') {
    try {
      const body = (await parseBody(req)) as Record<string, unknown>;
      await handlePostConfigurationAirtable(DATA_DIR, body, res);
    } catch (err) {
      console.error('POST /api/configuration-airtable error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, status: 'Erreur avec AirTable : requête invalide' }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/traitement') {
    try {
      await handlePostTraitement(DATA_DIR, res);
    } catch (err) {
      console.error('POST /api/traitement error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/traitement/start') {
    try {
      handlePostTraitementStart(DATA_DIR, res);
    } catch (err) {
      console.error('POST /api/traitement/start error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/traitement/status') {
    try {
      const u = new URL(req.url ?? '/', getBaseUrl(req));
      const taskId = (u.searchParams.get('taskId') ?? '').trim();
      if (!taskId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: 'taskId requis' }));
      } else {
        handleGetTraitementStatus(taskId, res);
      }
    } catch (err) {
      console.error('GET /api/traitement/status error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/audit/start') {
    try {
      handlePostAuditStart(DATA_DIR, res);
    } catch (err) {
      console.error('POST /api/audit/start error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/audit/status') {
    try {
      const u = new URL(req.url ?? '/', getBaseUrl(req));
      const taskId = (u.searchParams.get('taskId') ?? '').trim();
      if (!taskId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: 'taskId requis' }));
      } else {
        handleGetAuditStatus(taskId, res);
      }
    } catch (err) {
      console.error('GET /api/audit/status error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/enrichissement-worker/status') {
    try {
      handleGetEnrichissementWorkerStatus(DATA_DIR, res);
    } catch (err) {
      console.error('GET /api/enrichissement-worker/status error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/enrichissement-worker/start') {
    try {
      handlePostEnrichissementWorkerStart(DATA_DIR, res);
    } catch (err) {
      console.error('POST /api/enrichissement-worker/start error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/enrichissement-worker/stop') {
    try {
      handlePostEnrichissementWorkerStop(res);
    } catch (err) {
      console.error('POST /api/enrichissement-worker/stop error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (process.env.BDD_IN_MEMORY_STORE === '1') {
    if (req.method === 'POST' && pathname === '/api/test/reset-compte') {
      resetCompteStoreForTest();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/test/compte-store') {
      const compte = getCompteStoreForTest();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(compte ?? {}));
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-airtable') {
      try {
        const body = (await parseBody(req)) as Record<string, unknown>;
        const apiKey = String(body.apiKey ?? '').trim();
        const base = typeof body.base === 'string' ? body.base.trim() : undefined;
        const sources = typeof body.sources === 'string' ? body.sources.trim() : undefined;
        const offres = typeof body.offres === 'string' ? body.offres.trim() : undefined;
        ecrireAirTable(DATA_DIR, { apiKey, base, sources, offres });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-mock-emails') {
      try {
        const body = (await parseBody(req)) as {
          emailsGouvernance?: Array<{ id: string; from: string; html: string; receivedAtIso?: string }>;
        };
        const emails = Array.isArray(body?.emailsGouvernance) ? body.emailsGouvernance : null;
        setBddMockEmailsGouvernance(emails);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-mock-sources') {
      try {
        const body = (await parseBody(req)) as {
          sources?: Array<{ emailExpéditeur: string; algo: string; actif: boolean }>;
        };
        const raw = Array.isArray(body?.sources) ? body.sources : [];
        const sources: Array<{ emailExpéditeur: string; algo: AlgoSource; actif: boolean }> = raw.map((s) => ({
          ...s,
          algo: s.algo as AlgoSource,
        }));
        setBddMockSources(sources);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-mock-tableau-synthese') {
      try {
        const body = (await parseBody(req)) as { lignes?: unknown };
        const lignes = Array.isArray(body?.lignes) ? body.lignes : null;
        setBddMockTableauSynthese(lignes);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
  }

  notFound(res);
});

function shutdown(signal: string): void {
  console.log(`\n[${signal}] Arrêt du serveur…`);
  server.close(() => {
    console.log('Serveur fermé.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERREUR] Le port ${PORT} est déjà utilisé. Arrêtez l'autre processus (ex: taskkill /PID <pid> /F après netstat -ano | findstr :${PORT}) ou changez le port.\n`);
    process.exit(1);
  }
  throw err;
});
server.listen(
  { port: PORT, host: '127.0.0.1', reuseAddress: true },
  () => {
    console.log(`Server listening on http://127.0.0.1:${PORT}`);
    console.log(`Paramètres (parametres.json): ${join(DATA_DIR, 'parametres.json')}`);
  }
);
