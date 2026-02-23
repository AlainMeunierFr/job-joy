/**
 * Connecteur email via Microsoft Graph API (OAuth).
 * Utilise un access token au lieu d'un mot de passe ; respecte le port ConnecteurEmail.
 */
import { Client } from '@microsoft/microsoft-graph-client';
import type { ConnecteurEmail, ResultatTestConnexion } from '../types/compte.js';

/** Noms de dossiers bien connus Graph (minuscules) pour résolution directe. */
const WELL_KNOWN_FOLDERS = new Set([
  'inbox',
  'drafts',
  'sentitems',
  'outbox',
  'deleteditems',
  'junkemail',
  'archive',
  'msgfolderroot',
]);

/**
 * Cherche un dossier enfant par displayName (insensible à la casse).
 */
async function findChildFolder(
  client: Client,
  parentApiPath: string,
  childName: string
): Promise<{ ok: true; folderId: string } | { ok: false; message: string }> {
  try {
    const res = await client.api(`${parentApiPath}/childFolders`).top(200).get();
    const folders = (res?.value ?? []) as Array<{ id: string; displayName?: string }>;
    const found = folders.find(
      (f) => (f.displayName ?? '').toLowerCase() === childName.toLowerCase()
    );
    if (found) {
      return { ok: true, folderId: found.id };
    }
    const available = folders.map((f) => f.displayName).filter(Boolean).join(', ');
    return {
      ok: false,
      message: `Sous-dossier « ${childName} » non trouvé. Sous-dossiers disponibles : ${available || '(aucun)'}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Impossible de lister les sous-dossiers : ${msg}` };
  }
}

/**
 * Retourne l'identifiant du dossier à utiliser pour l'API.
 * Supporte les chemins imbriqués séparés par '/' : ex. "INBOX/A scanner/A traiter".
 */
async function resolveFolderId(
  client: Client,
  cheminDossier: string
): Promise<{ ok: true; folderId: string } | { ok: false; message: string }> {
  const trimmed = cheminDossier.trim();
  if (!trimmed) {
    return { ok: false, message: "le champ 'dossier' est requis" };
  }

  const segments = trimmed.split('/').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) {
    return { ok: false, message: "le champ 'dossier' est requis" };
  }

  const firstLower = segments[0].toLowerCase();
  let currentFolderId: string;
  let currentApiPath: string;

  if (WELL_KNOWN_FOLDERS.has(firstLower)) {
    currentFolderId = firstLower;
    currentApiPath = `/me/mailFolders/${firstLower}`;
  } else {
    try {
      const res = await client.api('/me/mailFolders').top(200).get();
      const folders = (res?.value ?? []) as Array<{ id: string; displayName?: string }>;
      const found = folders.find(
        (f) => (f.displayName ?? '').toLowerCase() === firstLower
      );
      if (!found) {
        const available = folders.map((f) => f.displayName).filter(Boolean).join(', ');
        return {
          ok: false,
          message: `Dossier « ${segments[0]} » non trouvé. Dossiers disponibles : ${available || '(aucun)'}`,
        };
      }
      currentFolderId = found.id;
      currentApiPath = `/me/mailFolders/${found.id}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Impossible de lister les dossiers : ${msg}` };
    }
  }

  for (let i = 1; i < segments.length; i++) {
    const child = await findChildFolder(client, currentApiPath, segments[i]);
    if (!child.ok) {
      return child;
    }
    currentFolderId = child.folderId;
    currentApiPath = `/me/mailFolders/${child.folderId}`;
  }

  return { ok: true, folderId: currentFolderId };
}

/**
 * Connecteur Microsoft Graph : utilise un fournisseur de token.
 * Le mot de passe passé à connecterEtCompter est ignoré ; le token est fourni par getAccessToken.
 */
export function getConnecteurEmailGraph(getAccessToken: () => Promise<string>): ConnecteurEmail {
  return {
    async connecterEtCompter(
      _adresseEmail: string,
      _motDePasse: string,
      cheminDossier: string
    ): Promise<ResultatTestConnexion> {
      let token: string;
      try {
        token = await getAccessToken();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const messagePourUtilisateur =
          /Aucun token|cli:auth|npm run|refresh.*expiré/i.test(msg)
            ? 'Connectez-vous d\u2019abord avec Microsoft en cliquant sur \u00ab Se connecter \u00bb ci-dessus.'
            : `Token non disponible : ${msg}`;
        return { ok: false, message: messagePourUtilisateur };
      }
      if (!token?.trim()) {
        return {
          ok: false,
          message:
            'Connectez-vous d\u2019abord avec Microsoft en cliquant sur \u00ab Se connecter \u00bb ci-dessus.',
        };
      }

      const client = Client.init({
        authProvider: (done) => {
          Promise.resolve(getAccessToken())
            .then((t) => done(null, t))
            .catch((e) => done(e, null));
        },
      });

      const resolved = await resolveFolderId(client, cheminDossier);
      if (!resolved.ok) {
        return { ok: false, message: resolved.message };
      }

      try {
        const folder = (await client
          .api(`/me/mailFolders/${resolved.folderId}`)
          .select('totalItemCount')
          .get()) as { totalItemCount?: number } | undefined;
        const nbEmails = typeof folder?.totalItemCount === 'number' ? folder.totalItemCount : 0;
        return { ok: true, nbEmails };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, message: `Erreur Graph : ${msg}` };
      }
    },
  };
}
