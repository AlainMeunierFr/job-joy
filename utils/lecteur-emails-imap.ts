/**
 * Lecteur d'emails IMAP pour la relève LinkedIn (US-1.4).
 * Lit les emails du dossier dont l'expéditeur contient la valeur donnée et retourne le HTML de chaque message.
 */
import { ImapFlow } from 'imapflow';
import type { LecteurEmails } from './relève-offres-linkedin.js';
import type { OptionsImap } from '../types/compte.js';
import type { LecteurEmailsGouvernance } from './lecteur-emails-mock.js';

function findHtmlPart(
  node: { type?: string; subtype?: string; childNodes?: unknown[] },
  path = '1'
): string | null {
  if (node.type === 'text' && node.subtype === 'html') {
    return path;
  }
  const children = node.childNodes;
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const childPath = path === '1' ? `${i + 1}` : `${path}.${i + 1}`;
      const found = findHtmlPart(children[i] as Parameters<typeof findHtmlPart>[0], childPath);
      if (found) return found;
    }
  }
  return null;
}

function fromContains(envelope: { from?: Array<{ address?: string }> }, expéditeurContient: string): boolean {
  const contient = (expéditeurContient ?? '').trim().toLowerCase();
  if (!contient) return false;
  const from = envelope?.from ?? [];
  for (const f of from) {
    const addr = (f?.address ?? '').toLowerCase();
    if (addr.includes(contient)) return true;
  }
  return false;
}

/**
 * Crée un lecteur d'emails qui utilise IMAP (même options que le connecteur test de connexion).
 */
export function createLecteurEmailsImap(options: OptionsImap): LecteurEmails & LecteurEmailsGouvernance {
  const host = (options.host ?? '').trim();
  const port = Number(options.port) || 993;
  const secure = options.secure !== false;

  return {
    async lireEmails(
      adresseEmail: string,
      motDePasse: string,
      cheminDossier: string,
      expéditeurContient: string,
      cheminDossierArchive?: string
    ): Promise<
      | { ok: true; emails: Array<{ html: string; receivedAtIso?: string }> }
      | { ok: false; message: string }
    > {
      if (!host) {
        return { ok: false, message: "le champ 'serveur IMAP' est requis" };
      }
      const client = new ImapFlow({
        host,
        port,
        secure,
        auth: { user: adresseEmail, pass: motDePasse },
      });
      try {
        await client.connect();
        const lock = await client.getMailboxLock(cheminDossier.trim());
        try {
          const mb = client.mailbox;
          const total =
            mb && typeof mb === 'object' && 'exists' in mb && typeof (mb as { exists: number }).exists === 'number'
              ? (mb as { exists: number }).exists
              : 0;
          if (total === 0) {
            return { ok: true, emails: [] };
          }
          const range = `1:${total}`;
          const messages = await client.fetchAll(range, {
            envelope: true,
            bodyStructure: true,
          });
          const matching: Array<{ uid: number; bodyStructure: unknown; receivedAtIso?: string }> = [];
          for (const msg of messages) {
            if (fromContains(msg.envelope ?? {}, expéditeurContient)) {
              const receivedAtIso =
                msg.envelope?.date instanceof Date ? msg.envelope.date.toISOString() : undefined;
              matching.push({ uid: msg.uid, bodyStructure: msg.bodyStructure, receivedAtIso });
            }
          }
          const emails: Array<{ html: string; receivedAtIso?: string }> = [];
          for (const { uid, bodyStructure, receivedAtIso } of matching) {
            const htmlPart =
              bodyStructure && findHtmlPart(bodyStructure as { type?: string; subtype?: string; childNodes?: unknown[] });
            if (typeof htmlPart === 'string') {
              const { content } = await client.download(uid, htmlPart, { uid: true });
              const chunks: Buffer[] = [];
              for await (const chunk of content) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              const html = Buffer.concat(chunks).toString('utf-8');
              emails.push({ html, receivedAtIso });
            } else {
              emails.push({ html: '', receivedAtIso });
            }
          }
          const dossierArchive = (cheminDossierArchive ?? '').trim();
          if (dossierArchive && matching.length > 0) {
            const uids = matching.map((m) => m.uid);
            await client.messageMove(uids, dossierArchive, { uid: true });
          }
          return { ok: true, emails };
        } finally {
          lock.release();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, message };
      } finally {
        await client.logout().catch(() => {});
      }
    },
    async lireEmailsGouvernance(
      adresseEmail: string,
      motDePasse: string,
      cheminDossier: string
    ): Promise<
      | { ok: true; emails: Array<{ id: string; from: string; html: string; receivedAtIso?: string }> }
      | { ok: false; message: string }
    > {
      const client = new ImapFlow({
        host,
        port,
        secure,
        auth: { user: adresseEmail, pass: motDePasse },
      });
      try {
        await client.connect();
        const lock = await client.getMailboxLock(cheminDossier.trim());
        try {
          const mb = client.mailbox;
          const total =
            mb && typeof mb === 'object' && 'exists' in mb && typeof (mb as { exists: number }).exists === 'number'
              ? (mb as { exists: number }).exists
              : 0;
          if (total === 0) return { ok: true, emails: [] };
          const range = `1:${total}`;
          const messages = await client.fetchAll(range, {
            envelope: true,
            bodyStructure: true,
          });
          const out: Array<{ id: string; from: string; html: string; receivedAtIso?: string }> = [];
          for (const msg of messages) {
            const from = msg.envelope?.from?.[0]?.address ?? '';
            const receivedAtIso =
              msg.envelope?.date instanceof Date ? msg.envelope.date.toISOString() : undefined;
            const htmlPart =
              msg.bodyStructure &&
              findHtmlPart(msg.bodyStructure as { type?: string; subtype?: string; childNodes?: unknown[] });
            let html = '';
            if (typeof htmlPart === 'string') {
              const { content } = await client.download(msg.uid, htmlPart, { uid: true });
              const chunks: Buffer[] = [];
              for await (const chunk of content) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
              }
              html = Buffer.concat(chunks).toString('utf-8');
            }
            out.push({ id: String(msg.uid), from, html, receivedAtIso });
          }
          return { ok: true, emails: out };
        } finally {
          lock.release();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, message };
      } finally {
        await client.logout().catch(() => {});
      }
    },
    async deplacerEmailsVersDossier(
      adresseEmail: string,
      motDePasse: string,
      ids: string[],
      cheminDossierArchive: string
    ): Promise<{ ok: true } | { ok: false; message: string }> {
      const dossierArchive = (cheminDossierArchive ?? '').trim();
      if (!dossierArchive || ids.length === 0) return { ok: true };
      const uids = ids.map((id) => Number(id)).filter((n) => Number.isFinite(n) && n > 0);
      if (uids.length === 0) return { ok: true };
      const client = new ImapFlow({
        host,
        port,
        secure,
        auth: { user: adresseEmail, pass: motDePasse },
      });
      try {
        await client.connect();
        await client.messageMove(uids, dossierArchive, { uid: true });
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, message };
      } finally {
        await client.logout().catch(() => {});
      }
    },
  };
}
