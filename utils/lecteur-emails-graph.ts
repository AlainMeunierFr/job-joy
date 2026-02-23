/**
 * Lecteur d'emails Microsoft Graph pour la relève LinkedIn (US-1.4).
 * Lit les emails d'un dossier Exchange Online et déplace les messages traités vers un dossier d'archive.
 */
import { Client } from '@microsoft/microsoft-graph-client';
import type { LecteurEmails } from './relève-offres-linkedin.js';
import type { LecteurEmailsGouvernance } from './lecteur-emails-mock.js';

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

async function findChildFolder(
  client: Client,
  parentApiPath: string,
  childName: string
): Promise<{ ok: true; folderId: string } | { ok: false; message: string }> {
  try {
    const res = await client.api(`${parentApiPath}/childFolders`).top(200).get();
    const folders = (res?.value ?? []) as Array<{ id: string; displayName?: string }>;
    const found = folders.find((f) => (f.displayName ?? '').toLowerCase() === childName.toLowerCase());
    if (!found) {
      const available = folders.map((f) => f.displayName).filter(Boolean).join(', ');
      return {
        ok: false,
        message: `Sous-dossier « ${childName} » non trouvé. Sous-dossiers disponibles : ${available || '(aucun)'}`,
      };
    }
    return { ok: true, folderId: found.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Impossible de lister les sous-dossiers : ${msg}` };
  }
}

async function resolveFolderId(
  client: Client,
  cheminDossier: string
): Promise<{ ok: true; folderId: string } | { ok: false; message: string }> {
  const trimmed = cheminDossier.trim();
  if (!trimmed) {
    return { ok: false, message: "le champ 'dossier à analyser' est requis" };
  }
  const segments = trimmed.split('/').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) {
    return { ok: false, message: "le champ 'dossier à analyser' est requis" };
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
      const found = folders.find((f) => (f.displayName ?? '').toLowerCase() === firstLower);
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
    if (!child.ok) return child;
    currentFolderId = child.folderId;
    currentApiPath = `/me/mailFolders/${child.folderId}`;
  }
  return { ok: true, folderId: currentFolderId };
}

function fromContains(
  from: { emailAddress?: { address?: string } } | undefined,
  expediteurContient: string
): boolean {
  const contient = (expediteurContient ?? '').trim().toLowerCase();
  if (!contient) return false;
  const addr = (from?.emailAddress?.address ?? '').toLowerCase();
  if (!addr) return false;
  return addr.includes(contient);
}

/**
 * Crée un lecteur d'emails Graph (Microsoft).
 * Le token est fourni par getAccessToken (refresh auto via auth-microsoft).
 */
export function createLecteurEmailsGraph(
  getAccessToken: () => Promise<string>
): LecteurEmails & LecteurEmailsGouvernance {
  async function getClient(): Promise<{ ok: true; client: Client } | { ok: false; message: string }> {
    let token: string;
    try {
      token = await getAccessToken();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Token Microsoft indisponible : ${msg}` };
    }
    if (!token?.trim()) {
      return { ok: false, message: 'Token Microsoft vide.' };
    }
    const client = Client.init({
      authProvider: (done) => done(null, token),
    });
    return { ok: true, client };
  }

  return {
    async lireEmails(
      _adresseEmail: string,
      _motDePasse: string,
      cheminDossier: string,
      expéditeurContient: string,
      cheminDossierArchive?: string
    ) {
      const clientRes = await getClient();
      if (!clientRes.ok) return { ok: false as const, message: clientRes.message };
      const client = clientRes.client;

      const source = await resolveFolderId(client, cheminDossier);
      if (!source.ok) return { ok: false as const, message: source.message };

      let messages: Array<{
        id: string;
        from?: { emailAddress?: { address?: string } };
        receivedDateTime?: string;
        body?: { contentType?: string; content?: string };
        uniqueBody?: { contentType?: string; content?: string };
        bodyPreview?: string;
      }> = [];
      try {
        let res = await client
          .api(`/me/mailFolders/${source.folderId}/messages`)
          .top(200)
          .select('id,from,receivedDateTime,body,uniqueBody,bodyPreview')
          .header('Prefer', 'outlook.body-content-type="html"')
          .orderby('receivedDateTime desc')
          .get();
        messages.push(...((res?.value ?? []) as typeof messages));

        let nextLink = typeof res?.['@odata.nextLink'] === 'string' ? res['@odata.nextLink'] : '';
        while (nextLink) {
          res = await client
            .api(nextLink)
            .header('Prefer', 'outlook.body-content-type="html"')
            .get();
          messages.push(...((res?.value ?? []) as typeof messages));
          nextLink = typeof res?.['@odata.nextLink'] === 'string' ? res['@odata.nextLink'] : '';
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false as const, message: `Erreur Graph lecture messages : ${msg}` };
      }

      const matching = messages.filter((m) => fromContains(m.from, expéditeurContient));
      const emails = matching.map((m) => {
        const html =
          m.body?.content ??
          m.uniqueBody?.content ??
          m.bodyPreview ??
          '';
        return { html, receivedAtIso: m.receivedDateTime };
      });

      const dossierArchive = (cheminDossierArchive ?? '').trim();
      if (dossierArchive && matching.length > 0) {
        const archive = await resolveFolderId(client, dossierArchive);
        if (!archive.ok) return { ok: false as const, message: archive.message };
        try {
          for (const m of matching) {
            await client.api(`/me/messages/${m.id}/move`).post({ destinationId: archive.folderId });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return { ok: false as const, message: `Erreur Graph déplacement messages : ${msg}` };
        }
      }

      return { ok: true as const, emails };
    },
    async lireEmailsGouvernance(
      _adresseEmail: string,
      _motDePasse: string,
      cheminDossier: string
    ): Promise<
      | { ok: true; emails: Array<{ id: string; from: string; html: string; receivedAtIso?: string }> }
      | { ok: false; message: string }
    > {
      const clientRes = await getClient();
      if (!clientRes.ok) return { ok: false, message: clientRes.message };
      const client = clientRes.client;
      const source = await resolveFolderId(client, cheminDossier);
      if (!source.ok) return { ok: false, message: source.message };

      let messages: Array<{
        id: string;
        from?: { emailAddress?: { address?: string } };
        receivedDateTime?: string;
        body?: { content?: string };
        uniqueBody?: { content?: string };
        bodyPreview?: string;
      }> = [];
      try {
        let res = await client
          .api(`/me/mailFolders/${source.folderId}/messages`)
          .top(200)
          .select('id,from,receivedDateTime,body,uniqueBody,bodyPreview')
          .header('Prefer', 'outlook.body-content-type="html"')
          .orderby('receivedDateTime desc')
          .get();
        messages.push(...((res?.value ?? []) as typeof messages));
        let nextLink = typeof res?.['@odata.nextLink'] === 'string' ? res['@odata.nextLink'] : '';
        while (nextLink) {
          res = await client.api(nextLink).header('Prefer', 'outlook.body-content-type="html"').get();
          messages.push(...((res?.value ?? []) as typeof messages));
          nextLink = typeof res?.['@odata.nextLink'] === 'string' ? res['@odata.nextLink'] : '';
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, message: `Erreur Graph lecture messages : ${msg}` };
      }

      return {
        ok: true,
        emails: messages.map((m) => ({
          id: m.id,
          from: m.from?.emailAddress?.address ?? '',
          html: m.body?.content ?? m.uniqueBody?.content ?? m.bodyPreview ?? '',
          receivedAtIso: m.receivedDateTime,
        })),
      };
    },
    async deplacerEmailsVersDossier(
      _adresseEmail: string,
      _motDePasse: string,
      ids: string[],
      cheminDossierArchive: string
    ): Promise<{ ok: true } | { ok: false; message: string }> {
      const dossierArchive = (cheminDossierArchive ?? '').trim();
      if (!dossierArchive || ids.length === 0) return { ok: true };
      const clientRes = await getClient();
      if (!clientRes.ok) return { ok: false, message: clientRes.message };
      const client = clientRes.client;
      const archive = await resolveFolderId(client, dossierArchive);
      if (!archive.ok) return { ok: false, message: archive.message };
      try {
        for (const id of ids) {
          await client.api(`/me/messages/${id}/move`).post({ destinationId: archive.folderId });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, message: `Erreur Graph déplacement messages : ${msg}` };
      }
      return { ok: true };
    },
  };
}

