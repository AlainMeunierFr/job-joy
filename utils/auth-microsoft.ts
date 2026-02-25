/**
 * Authentification Microsoft (MSAL) pour Microsoft Graph.
 * - Flux navigateur : authorization code + PKCE (bouton "Se connecter avec Microsoft").
 * - Flux CLI : device code (npm run cli:auth-microsoft).
 * - Stockage du refresh token et régénération automatique de l'access token.
 */
import { createHash, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { lireParametres, ecrireParametres, getDefaultParametres } from './parametres-io.js';
import {
  PublicClientApplication,
  type Configuration,
  type AuthenticationResult,
  type DeviceCodeRequest,
} from '@azure/msal-node';
import { messageErreurReseau } from './erreur-reseau.js';

const SCOPES_MAIL = [
  'https://graph.microsoft.com/Mail.ReadWrite',
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/User.Read',
  'openid',
  'offline_access', // requis pour obtenir un refresh_token
];

const BDD_IN_MEMORY = process.env.BDD_IN_MEMORY_STORE === '1';

/** Données persistées pour le refresh (ne pas committer ce fichier). */
export interface MicrosoftTokensFile {
  refreshToken: string;
  clientId?: string;
  tenantId?: string;
}

/** Cache en mémoire pour éviter de refrapper le token à chaque requête. */
let cachedAccessToken: { token: string; expiresAt: number } | null = null;
const CACHE_MARGIN_MS = 5 * 60 * 1000; // considérer expiré 5 min avant la vraie date

function getDataDir(): string {
  return join(process.cwd(), 'data');
}

/**
 * Charge les tokens Microsoft depuis data/parametres.json (connexionBoiteEmail.microsoft).
 */
export function loadTokens(): MicrosoftTokensFile | null {
  const p = lireParametres(getDataDir());
  const m = p?.connexionBoiteEmail?.microsoft;
  if (!m?.refreshToken?.trim()) return null;
  return {
    refreshToken: m.refreshToken,
    clientId: m.clientId,
    tenantId: m.tenantId,
  };
}

/**
 * Enregistre le refresh token dans data/parametres.json (connexionBoiteEmail.microsoft).
 * @param dataDir optionnel : répertoire data (ex. DATA_DIR du serveur) pour garantir le même fichier.
 */
export function saveTokens(data: MicrosoftTokensFile, dataDir?: string): void {
  const dir = dataDir ?? getDataDir();
  let p = lireParametres(dir);
  if (!p) p = getDefaultParametres();
  p.connexionBoiteEmail.microsoft = {
    ...p.connexionBoiteEmail.microsoft,
    adresseEmail: p.connexionBoiteEmail.microsoft?.adresseEmail ?? '',
    refreshToken: data.refreshToken,
    clientId: data.clientId,
    tenantId: data.tenantId,
  };
  ecrireParametres(dir, p);
  cachedAccessToken = null;
}

/** Invalide le cache d'access token (après mise à jour des paramètres côté serveur). */
export function clearMicrosoftTokenCache(): void {
  cachedAccessToken = null;
}

/**
 * True si l'app peut obtenir un token Microsoft (refresh token enregistré).
 * Utilisé pour afficher ou masquer l'option "Microsoft" dans les paramètres.
 */
export function microsoftTokenDisponible(): boolean {
  const tokens = loadTokens();
  return !!(tokens?.refreshToken?.trim());
}

export interface ConfigAuthMicrosoft {
  clientId: string;
  tenantId: string;
  clientSecret?: string;
  scopes: string[];
}

/**
 * Lit la config MSAL depuis les variables d'environnement.
 * AZURE_CLIENT_ID (requis), AZURE_TENANT_ID (recommandé pour app mono-tenant, sinon AADSTS50194 avec /common).
 */
export function getConfigAuthMicrosoft(): ConfigAuthMicrosoft {
  const persisted = loadTokens();
  const clientId = (process.env.AZURE_CLIENT_ID ?? '').trim() || (persisted?.clientId ?? '').trim();
  const rawTenant = process.env.AZURE_TENANT_ID ?? persisted?.tenantId;
  const tenantId =
    rawTenant !== undefined && rawTenant !== null
      ? rawTenant.trim()
      : 'common';
  const clientSecret = (process.env.AZURE_CLIENT_SECRET ?? '').trim() || undefined;
  const scopes = [...SCOPES_MAIL];
  return { clientId, tenantId, clientSecret, scopes };
}

/**
 * Crée une application cliente publique MSAL (pour device code / POC).
 */
export function createPublicClient(config: ConfigAuthMicrosoft): PublicClientApplication {
  if (!config.clientId) {
    throw new Error('AZURE_CLIENT_ID est requis pour l’authentification Microsoft.');
  }
  const msalConfig: Configuration = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
    },
  };
  return new PublicClientApplication(msalConfig);
}

/**
 * Obtient un token via le flux "device code" : affiche un message (URL + code) et attend la connexion de l'utilisateur.
 */
export async function acquireTokenByDeviceCode(
  config: ConfigAuthMicrosoft,
  deviceCodeCallback: (message: string) => void
): Promise<AuthenticationResult> {
  const pca = createPublicClient(config);
  const request: DeviceCodeRequest = {
    scopes: config.scopes,
    deviceCodeCallback: (response) => {
      const message =
        response.message ??
        `Ouvrez ${response.verificationUri} et saisissez le code : ${response.userCode}`;
      deviceCodeCallback(message);
    },
  };
  const result = await pca.acquireTokenByDeviceCode(request);
  if (!result) {
    throw new Error('Échec de l’acquisition du token (réponse nulle).');
  }
  return result;
}

/**
 * Génère une paire PKCE (code_verifier, code_challenge) pour le flux authorization code.
 */
export function generatePkce(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

/**
 * Construit l'URL d'autorisation Microsoft (ouverture dans le navigateur).
 * L'utilisateur se connecte, consent, et est redirigé vers redirectUri avec ?code=...&state=...
 */
export function getAuthorizeUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const config = getConfigAuthMicrosoft();
  if (!config.clientId) {
    throw new Error('AZURE_CLIENT_ID est requis.');
  }
  if (!config.tenantId || config.tenantId.length === 0) {
    throw new Error(
      'AZURE_TENANT_ID est requis pour la connexion Microsoft (app Entra mono-tenant). ' +
        'Dans .env.local, définissez AZURE_TENANT_ID avec l’ID de l’annuaire (Entra > votre app > Vue d’ensemble > ID de l’annuaire). ' +
        'Redémarrez le serveur après modification de .env.local.'
    );
  }
  const tenantId = config.tenantId;
  const scope = config.scopes.join(' ');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Échange le code d'autorisation (reçu au callback) contre access_token et refresh_token.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const config = getConfigAuthMicrosoft();
  const tenantId = config.tenantId || 'common';
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret);
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Échange code échoué (${res.status}) : ${text}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error('Réponse sans access_token.');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 3600,
  };
}

/**
 * Récupère l'adresse email de l'utilisateur connecté via Microsoft Graph (/me).
 * Utilise mail ou userPrincipalName. Nécessite le scope User.Read.
 */
export async function fetchUserEmailFromGraph(accessToken: string): Promise<string | null> {
  const url = 'https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { mail?: string; userPrincipalName?: string };
  const email = (data.mail ?? data.userPrincipalName ?? '').trim();
  return email || null;
}

/**
 * Échange un refresh_token contre un nouvel access_token (endpoint OAuth2 Microsoft).
 */
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  tenantId: string,
  clientSecret?: string
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken,
  });
  if (clientSecret) {
    body.set('client_secret', clientSecret);
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh token échoué (${res.status}) : ${text}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  if (!data.access_token) {
    throw new Error('Réponse token sans access_token.');
  }
  return {
    accessToken: data.access_token,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 3600,
    refreshToken: data.refresh_token,
  };
}

/**
 * Retourne un access token valide : depuis le cache ou via refresh token.
 * À utiliser pour tous les appels Graph ; le token est régénéré automatiquement quand il expire.
 */
export async function getValidAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + CACHE_MARGIN_MS) {
    return cachedAccessToken.token;
  }
  cachedAccessToken = null;

  const tokens = loadTokens();
  const config = getConfigAuthMicrosoft();

  if (tokens?.refreshToken?.trim() && config.clientId) {
    try {
      const refreshed = await refreshAccessToken(
        tokens.refreshToken,
        config.clientId,
        config.tenantId || 'common',
        config.clientSecret
      );
      cachedAccessToken = {
        token: refreshed.accessToken,
        expiresAt: now + refreshed.expiresIn * 1000,
      };
      if (refreshed.refreshToken && !BDD_IN_MEMORY) {
        saveTokens({
          refreshToken: refreshed.refreshToken,
          clientId: config.clientId,
          tenantId: config.tenantId,
        });
      }
      return refreshed.accessToken;
    } catch (err) {
      const msg = messageErreurReseau(err);
      throw new Error(
        `Impossible de régénérer le token (refresh expiré ou invalide). Relancez : npm run cli:auth-microsoft. Détail : ${msg}`
      );
    }
  }

  throw new Error(
    'Aucun token Microsoft disponible. Lancez une fois : npm run cli:auth-microsoft (le refresh token sera enregistré pour les prochaines fois).'
  );
}
