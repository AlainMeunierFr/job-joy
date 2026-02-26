/**
 * Serveur : menu (US-1.2), pages Tableau de bord / Paramètres, API compte (US-1.1).
 * Composition : le connecteur email (port) est créé ici et injecté dans les handlers.
 */
import '../utils/load-env-local.js';
import { randomBytes } from 'node:crypto';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getVersionEtBuildTime } from '../utils/read-build-info.js';
import { getPageParametres, getPageAPropos } from './page-html.js';
import { getPageTableauDeBord } from './layout-html.js';
import type { PluginSource } from '../utils/gouvernance-sources-emails.js';
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
  handlePostRefreshSyntheseOffres,
  handleGetConsommationApi,
  setBddMockEmailsGouvernance,
  setBddMockSources,
  setBddMockOffres,
  setBddMockTableauSynthese,
  getBddMockOffresARecuperer,
  getBddMockOffresAAnalyser,
  handlePostSetMockCacheAudit,
  setBddMockOffreTest,
  setBddMockTestClaudecode,
  getOffreTestHasOffre,
  handleGetOffreTest,
  handlePostTestClaudecode,
  getEnvoyeurIdentificationPort,
  clearBddEmailsIdentificationEnvoyes,
  handleGetEmailsIdentification,
  setBddMockEnvoyeurIdentificationFail,
} from './api-handlers.js';
import {
  ecrireCompte,
  lireCompte,
  resetCompteStoreForTest,
  getCompteStoreForTest,
  enregistrerCompteEtNotifierSiConsentement,
} from '../utils/compte-io.js';
import { ecrireAirTable, lireAirTable } from '../utils/parametres-airtable.js';
import { ensureAirtableEnums } from '../utils/airtable-ensure-enums.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { evaluerParametragesComplets } from '../utils/parametrages-complets.js';
import {
  appliquerCallbackMicrosoft,
  ecrireParametrageIA,
  ecrirePartieModifiablePrompt,
  lireParametres,
  ecrireParametres,
  getDefaultParametres,
  lirePartieModifiablePrompt,
} from '../utils/parametres-io.js';
import {
  getPartieModifiablePromptDefaut,
  getPartieFixePromptIA,
} from '../utils/prompt-ia.js';
import { lireClaudeCode, ecrireClaudeCode } from '../utils/parametres-claudecode.js';
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
import { enregistrerAppel } from '../utils/log-appels-api.js';
import { getDataDir } from '../utils/data-dir.js';

process.on('uncaughtException', (err) => {
  console.error('\n[ERREUR] Exception non gérée au démarrage ou en cours d’exécution:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n[ERREUR] Rejet non géré:', reason);
  process.exit(1);
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
/** Répertoire des ressources projet (guides HTML, exemples) à la racine du projet. */
const RESOURCES_DIR = join(PROJECT_ROOT, 'ressources');
/** Répertoire docs (page téléchargement / À propos) pour GitHub et /docs/ */
const DOCS_DIR = join(PROJECT_ROOT, 'docs');
/**
 * DATA_DIR : en dev = projet/data (npm run dev), en version packagée Electron = userData (npm run start:electron).
 * Pour tester en mode "packagé" sans installer : lancer le serveur avec JOB_JOY_USER_DATA défini.
 */
const DATA_DIR = (() => {
  const dir =
    process.env.JOB_JOY_USER_DATA !== undefined && process.env.JOB_JOY_USER_DATA !== ''
      ? getDataDir({ isPackaged: true, userDataDir: process.env.JOB_JOY_USER_DATA })
      : getDataDir({ cwd: PROJECT_ROOT });
  mkdirSync(dir, { recursive: true });
  return dir;
})();
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
    const { complet, manque } = evaluerParametragesComplets(DATA_DIR);
    const target = complet ? '/tableau-de-bord' : '/parametres';
    const headers: Record<string, string> = {
      Location: target,
      'Cache-Control': 'no-store',
    };
    if (!complet) {
      const flashConfigId = randomId();
      flashConfigStore.set(flashConfigId, manque);
      headers['Set-Cookie'] = `${FLASH_CONFIG_COOKIE}=${flashConfigId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${FLASH_MAX_AGE}`;
    }
    res.writeHead(302, headers);
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
    const claudecode = lireClaudeCode(DATA_DIR);
    const promptIAModifiable = lirePartieModifiablePrompt(DATA_DIR);
    const promptIAPartieModifiable =
      promptIAModifiable !== '' ? promptIAModifiable : getPartieModifiablePromptDefaut();
    const offreTestHasOffre = await getOffreTestHasOffre(DATA_DIR);
    res.end(
      await getPageParametres(DATA_DIR, {
        microsoftAvailable: microsoftTokenDisponible(),
        flash: flash ?? undefined,
        baseUrl: getBaseUrl(req),
        tokenObtainedAt,
        configComplète: complet,
        flashConfigManque: flashConfig ?? undefined,
        parametrageIA: parametres?.parametrageIA ?? undefined,
        claudecodeHasApiKey: claudecode?.hasApiKey ?? false,
        promptIAPartieModifiable,
        promptIAPartieFixe: getPartieFixePromptIA(parametres?.parametrageIA ?? null),
        offreTestHasOffre,
        resourcesDir: RESOURCES_DIR,
        docsDir: DOCS_DIR,
      })
    );
    return;
  }

  if (req.method === 'GET' && pathname === '/tableau-de-bord') {
    const { complet, manque } = evaluerParametragesComplets(DATA_DIR);
    if (!complet) {
      const flashConfigId = randomId();
      flashConfigStore.set(flashConfigId, manque);
      res.writeHead(302, {
        Location: '/parametres',
        'Cache-Control': 'no-store',
        'Set-Cookie': `${FLASH_CONFIG_COOKIE}=${flashConfigId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${FLASH_MAX_AGE}`,
      });
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

  if (req.method === 'GET' && pathname === '/a-propos') {
    const { complet } = evaluerParametragesComplets(DATA_DIR);
    const { version, buildTime, preprod } = getVersionEtBuildTime(PROJECT_ROOT);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(
      getPageAPropos({
        version,
        buildTime,
        preprod,
        configComplète: complet,
        resourcesDir: RESOURCES_DIR,
      })
    );
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
    const consentementIdentification =
      data.consentementIdentification === '1' || data.consentementIdentification === 'true';
    try {
      await enregistrerCompteEtNotifierSiConsentement(DATA_DIR, {
        provider,
        adresseEmail,
        motDePasse,
        cheminDossier,
        cheminDossierArchive,
        imapHost,
        imapPort,
        imapSecure,
        consentementIdentification,
      }, getEnvoyeurIdentificationPort());
      const airtableUpdates: { base?: string; apiKey?: string } = { base: airtableBase || undefined };
      if (airtableApiKey) airtableUpdates.apiKey = airtableApiKey;
      ecrireAirTable(DATA_DIR, airtableUpdates);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(400, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify({ ok: false, message }));
      return;
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

  if (req.method === 'GET' && pathname === '/scripts/parametres.js') {
    const scriptPathDist = join(__dirname, 'scripts', 'parametres.js');
    const scriptPathSource = join(PROJECT_ROOT, 'app', 'scripts', 'parametres.js');
    let js: string;
    try {
      js = await readFile(scriptPathDist, 'utf-8');
    } catch {
      try {
        js = await readFile(scriptPathSource, 'utf-8');
      } catch {
        notFound(res);
        return;
      }
    }
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    res.end(js);
    return;
  }

  if (req.method === 'GET' && pathname === '/styles/site.css') {
    const isDev = process.env.NODE_ENV !== 'production';
    let css: string;
    if (isDev) {
      try {
        const [globals, contentStyles] = await Promise.all([
          readFile(join(PROJECT_ROOT, 'app', 'globals.css'), 'utf-8'),
          readFile(join(PROJECT_ROOT, 'app', 'content-styles.css'), 'utf-8'),
        ]);
        css = `${globals}\n\n${contentStyles}`;
      } catch {
        try {
          css = await readFile(join(__dirname, 'site.css'), 'utf-8');
        } catch {
          notFound(res);
          return;
        }
      }
    } else {
      try {
        css = await readFile(join(__dirname, 'site.css'), 'utf-8');
      } catch {
        notFound(res);
        return;
      }
    }
    res.writeHead(200, {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(css);
    return;
  }

  if (req.method === 'GET' && pathname.startsWith('/docs/')) {
    const name = pathname.slice('/docs/'.length).replace(/\/.*$/, '');
    if (name && !name.includes('..') && !name.includes('\\')) {
      const filePath = join(DOCS_DIR, name);
      try {
        const content = await readFile(filePath);
        const ext = name.split('.').pop()?.toLowerCase();
        const contentType =
          ext === 'html' ? 'text/html; charset=utf-8'
            : ext === 'png' ? 'image/png'
            : ext === 'svg' ? 'image/svg+xml'
            : 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        });
        res.end(content);
        return;
      } catch {
        /* fall through to 404 */
      }
    }
  }

  if (req.method === 'GET' && pathname.startsWith('/ressources/guides/')) {
    const name = pathname.slice('/ressources/guides/'.length).replace(/\/.*$/, '');
    if (name && !name.includes('..')) {
      const filePath = join(RESOURCES_DIR, 'guides', name);
      try {
        const content = await readFile(filePath);
        const ext = name.split('.').pop()?.toLowerCase();
        const contentType =
          ext === 'png'
            ? 'image/png'
            : ext === 'html'
              ? 'text/html; charset=utf-8'
              : ext === 'pptx'
                ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                : 'application/octet-stream';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        });
        res.end(content);
        return;
      } catch {
        /* fall through to 404 */
      }
    }
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
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/microsoft/callback`;
    const state = randomId();
    const { codeVerifier, codeChallenge } = generatePkce();
    let url: string;
    try {
      url = getAuthorizeUrl(redirectUri, state, codeChallenge);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setFlashAndRedirect(res, [], { type: 'microsoft', status: 'error', message: msg.slice(0, 120) });
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

  if (req.method === 'POST' && pathname === '/api/tableau-synthese-offres/refresh') {
    try {
      await handlePostRefreshSyntheseOffres(DATA_DIR, res);
    } catch (err) {
      console.error('POST /api/tableau-synthese-offres/refresh error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/consommation-api') {
    try {
      handleGetConsommationApi(DATA_DIR, res);
    } catch (err) {
      console.error('GET /api/consommation-api error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/offre-test') {
    try {
      await handleGetOffreTest(DATA_DIR, res);
    } catch (err) {
      console.error('GET /api/offre-test error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/test-connexion') {
    try {
      const body = await parseBody(req);
      await handlePostTestConnexion(getConnecteurEmail, body, res, {
        dataDir: DATA_DIR,
        portEnvoiConsentement: getEnvoyeurIdentificationPort(),
      });
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

  if (req.method === 'GET' && pathname === '/api/parametrage-ia') {
    try {
      const parametres = lireParametres(DATA_DIR);
      const ia = parametres?.parametrageIA ?? {
        rehibitoires: Array(4).fill(null).map(() => ({ titre: '', description: '' })),
        scoresIncontournables: { localisation: '', salaire: '', culture: '', qualiteOffre: '' },
        scoresOptionnels: Array(4).fill(null).map(() => ({ titre: '', attente: '' })),
        autresRessources: '',
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ia));
    } catch (err) {
      console.error('GET /api/parametrage-ia error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/parametrage-ia') {
    try {
      const body = (await parseBody(req)) as Record<string, unknown>;
      const rehibitoires = Array.isArray(body.rehibitoires)
        ? (body.rehibitoires as Array<{ titre?: string; description?: string }>).slice(0, 4).map((r) => ({
            titre: String(r?.titre ?? '').trim(),
            description: String(r?.description ?? '').trim(),
          }))
        : Array(4).fill(null).map(() => ({ titre: '', description: '' }));
      const scoresIncontournables = body.scoresIncontournables && typeof body.scoresIncontournables === 'object'
        ? {
            localisation: String((body.scoresIncontournables as Record<string, unknown>).localisation ?? '').trim(),
            salaire: String((body.scoresIncontournables as Record<string, unknown>).salaire ?? '').trim(),
            culture: String((body.scoresIncontournables as Record<string, unknown>).culture ?? '').trim(),
            qualiteOffre: String((body.scoresIncontournables as Record<string, unknown>).qualiteOffre ?? '').trim(),
          }
        : { localisation: '', salaire: '', culture: '', qualiteOffre: '' };
      const scoresOptionnels = Array.isArray(body.scoresOptionnels)
        ? (body.scoresOptionnels as Array<{ titre?: string; attente?: string }>).slice(0, 4).map((s) => ({
            titre: String(s?.titre ?? '').trim(),
            attente: String(s?.attente ?? '').trim(),
          }))
        : Array(4).fill(null).map(() => ({ titre: '', attente: '' }));
      const autresRessources = String(body.autresRessources ?? '').trim();
      ecrireParametrageIA(DATA_DIR, {
        rehibitoires,
        scoresIncontournables,
        scoresOptionnels,
        autresRessources,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('POST /api/parametrage-ia error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/claudecode') {
    try {
      const claudecode = lireClaudeCode(DATA_DIR);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hasApiKey: claudecode?.hasApiKey ?? false }));
    } catch (err) {
      console.error('GET /api/claudecode error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/claudecode') {
    try {
      const body = (await parseBody(req)) as { apiKey?: string };
      const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
      ecrireClaudeCode(DATA_DIR, apiKey ? { apiKey } : {});
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('POST /api/claudecode error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'GET' && pathname === '/api/prompt-ia') {
    try {
      const parametres = lireParametres(DATA_DIR);
      const stored = lirePartieModifiablePrompt(DATA_DIR);
      const partieModifiable =
        stored !== '' ? stored : getPartieModifiablePromptDefaut();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          partieModifiable,
          partieFixe: getPartieFixePromptIA(parametres?.parametrageIA ?? null),
          partieModifiableDefaut: getPartieModifiablePromptDefaut(),
        })
      );
    } catch (err) {
      console.error('GET /api/prompt-ia error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/prompt-ia') {
    try {
      const body = (await parseBody(req)) as { partieModifiable?: string };
      const texte = typeof body.partieModifiable === 'string' ? body.partieModifiable : '';
      ecrirePartieModifiablePrompt(DATA_DIR, texte);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      console.error('POST /api/prompt-ia error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
    }
    return;
  }

  if (req.method === 'POST' && pathname === '/api/test-claudecode') {
    try {
      const body = (await parseBody(req)) as Record<string, unknown>;
      await handlePostTestClaudecode(DATA_DIR, body, res);
    } catch (err) {
      console.error('POST /api/test-claudecode error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, message: String(err) }));
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
      handlePostEnrichissementWorkerStop(DATA_DIR, res);
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
      clearBddEmailsIdentificationEnvoyes();
      setBddMockEnvoyeurIdentificationFail(false);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === 'GET' && pathname === '/api/test/emails-identification') {
      handleGetEmailsIdentification(res);
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/clear-emails-identification') {
      clearBddEmailsIdentificationEnvoyes();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-envoyeur-identification-fail') {
      try {
        const body = (await parseBody(req)) as { fail?: boolean };
        setBddMockEnvoyeurIdentificationFail(body?.fail === true);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: 'parse error' }));
      }
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
          sources?: Array<{
            emailExpéditeur: string;
            plugin: string;
            type?: 'email' | 'liste html' | 'liste csv';
            activerCreation: boolean;
            activerEnrichissement: boolean;
            activerAnalyseIA: boolean;
          }>;
        };
        const raw = Array.isArray(body?.sources) ? body.sources : [];
        const sources = raw.map((s) => ({
          emailExpéditeur: s.emailExpéditeur,
          plugin: s.plugin as PluginSource,
          type: s.type,
          activerCreation: s.activerCreation,
          activerEnrichissement: s.activerEnrichissement,
          activerAnalyseIA: s.activerAnalyseIA,
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
    if (req.method === 'POST' && pathname === '/api/test/set-mock-offres') {
      try {
        const body = (await parseBody(req)) as {
          offres?: Array<{ idOffre: string; url: string; dateAjout: string; statut: string; emailExpéditeur: string }>;
        };
        const offres = Array.isArray(body?.offres) ? body.offres : [];
        setBddMockOffres(offres);
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
    if (req.method === 'GET' && pathname === '/api/test/offres-a-recupérer') {
      try {
        const offres = getBddMockOffresARecuperer();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ offres }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'GET' && pathname === '/api/test/offres-a-analyser') {
      try {
        const offres = getBddMockOffresAAnalyser();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ offres }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-mock-cache-audit') {
      try {
        const body = (await parseBody(req)) as Record<string, unknown>;
        handlePostSetMockCacheAudit(body, res);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-mock-offre-test') {
      try {
        const body = (await parseBody(req)) as { hasOffre?: boolean; texte?: string };
        const hasOffre = typeof body?.hasOffre === 'boolean' ? body.hasOffre : false;
        const texte = typeof body?.texte === 'string' ? body.texte : undefined;
        setBddMockOffreTest({ hasOffre, ...(texte !== undefined && { texte }) });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-mock-test-claudecode') {
      try {
        const body = (await parseBody(req)) as {
          ok?: boolean;
          texte?: string;
          code?: string;
          message?: string;
          jsonValidation?: { valid: true; json: Record<string, unknown>; conform?: boolean; validationErrors?: string[] };
        };
        if (body?.ok === true && typeof body.texte === 'string') {
          setBddMockTestClaudecode({
            ok: true,
            texte: body.texte,
            ...(body.jsonValidation && body.jsonValidation.valid === true && body.jsonValidation.json
              ? { jsonValidation: body.jsonValidation }
              : {}),
          });
        } else if (body?.ok === false && typeof body.code === 'string') {
          setBddMockTestClaudecode({
            ok: false,
            code: body.code,
            ...(typeof body.message === 'string' && { message: body.message }),
          });
        } else {
          setBddMockTestClaudecode(null);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/set-claudecode') {
      try {
        const body = (await parseBody(req)) as { apiKey?: string };
        const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
        if (apiKey) {
          ecrireClaudeCode(DATA_DIR, { apiKey });
        } else {
          const p = lireParametres(DATA_DIR) ?? getDefaultParametres();
          const pMut = p as unknown as Record<string, unknown>;
          delete pMut.claudecode;
          ecrireParametres(DATA_DIR, p);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/log-appel') {
      try {
        const body = (await parseBody(req)) as { api?: string; succes?: boolean; codeErreur?: string; dateISO?: string; intention?: string };
        const api = typeof body.api === 'string' ? body.api.trim() : 'Claude';
        const succes = body.succes === true || body.succes === false ? body.succes : true;
        const codeErreur = typeof body.codeErreur === 'string' ? body.codeErreur : undefined;
        const intention = typeof body.intention === 'string' ? body.intention.trim() || undefined : undefined;
        const dateISO = typeof body.dateISO === 'string' ? body.dateISO.trim() : undefined;
        if (!dateISO || dateISO.length !== 10) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, message: 'dateISO requis (AAAA-MM-JJ)' }));
          return;
        }
        enregistrerAppel(DATA_DIR, { api, succes, codeErreur, intention }, dateISO);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/clear-log-appel') {
      try {
        const body = (await parseBody(req)) as { dateISO?: string };
        const dateISO = typeof body.dateISO === 'string' ? body.dateISO.trim() : '';
        if (!dateISO || dateISO.length !== 10) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, message: 'dateISO requis' }));
          return;
        }
        const logDir = join(DATA_DIR, 'log-appels-api');
        const filePath = join(logDir, `${dateISO}.json`);
        if (existsSync(filePath)) unlinkSync(filePath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'POST' && pathname === '/api/test/clear-all-log-appels') {
      try {
        const logDir = join(DATA_DIR, 'log-appels-api');
        if (existsSync(logDir)) rmSync(logDir, { recursive: true });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'GET' && pathname === '/api/test/log-appel') {
      try {
        const u = new URL(req.url ?? '/', getBaseUrl(req));
        const dateISO = (u.searchParams.get('dateISO') ?? '').trim();
        if (!dateISO || dateISO.length !== 10) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, message: 'dateISO requis' }));
          return;
        }
        const filePath = join(DATA_DIR, 'log-appels-api', `${dateISO}.json`);
        if (!existsSync(filePath)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }
        const raw = readFileSync(filePath, 'utf-8');
        const entries = JSON.parse(raw);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(Array.isArray(entries) ? entries : []));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, message: String(err) }));
      }
      return;
    }
    if (req.method === 'GET' && pathname === '/api/test/list-log-appels') {
      try {
        const logDir = join(DATA_DIR, 'log-appels-api');
        if (!existsSync(logDir)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
          return;
        }
        const files = readdirSync(logDir).filter((f) => f.endsWith('.json'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(files));
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
    const parametresPath = join(DATA_DIR, 'parametres.json');
    console.log(`Paramètres (parametres.json): ${parametresPath}`);
    if (existsSync(parametresPath) && lireParametres(DATA_DIR) === null) {
      console.warn(
        '[parametres] Le fichier parametres.json existe mais n’a pas pu être chargé (JSON invalide ou structure incorrecte). Corrigez le fichier ou renommez-le pour repartir des valeurs par défaut.'
      );
    }
    // Énumérations Airtable en arrière-plan (ne bloque pas).
    (async () => {
      try {
        const airtable = lireAirTable(DATA_DIR);
        if (
          airtable?.apiKey?.trim() &&
          airtable?.base?.trim() &&
          airtable?.sources?.trim() &&
          airtable?.offres?.trim()
        ) {
          const baseId = normaliserBaseId(airtable.base.trim());
          const result = await ensureAirtableEnums(
            airtable.apiKey.trim(),
            baseId,
            airtable.sources.trim(),
            airtable.offres.trim()
          );
          if (!result.plugin || !result.statut) {
            console.warn('[Airtable] Énumérations: plugin=%s statut=%s', result.plugin, result.statut);
          }
        }
      } catch (e) {
        console.error('[Airtable] Vérification énumérations au démarrage:', e);
      }
    })();
  }
);
