/**
 * Connecteur email réel (IMAP) — connexion en vraie vie à la boîte mail.
 * Utilise les paramètres IMAP saisis dans le formulaire (pas d'env).
 */
import { ImapFlow } from 'imapflow';
import type { ConnecteurEmail, ResultatTestConnexion, OptionsImap } from '../types/compte.js';
import { messageErreurReseau, MESSAGE_ERREUR_RESEAU } from './erreur-reseau.js';

/**
 * Rend les erreurs IMAP compréhensibles (ex. Office 365 Basic Auth bloqué, erreur réseau).
 */
function messageErreurImap(err: unknown): string {
  const messageReseau = messageErreurReseau(err);
  if (messageReseau === MESSAGE_ERREUR_RESEAU) return messageReseau;

  const raw = err instanceof Error ? err.message : String(err);
  const str = (err && typeof err === 'object' && 'response' in err ? String((err as { response?: string }).response) : '') + raw;
  if (/BasicAuthBlocked|LOGONDENIED-BASICAUTHBLOCKED|authentification.*refusée/i.test(str)) {
    return (
      "Connexion refusée : l'authentification par mot de passe (Basic Auth) est bloquée par le serveur. " +
      "Pour Office 365 : utiliser un mot de passe d'application (portail Microsoft) ou demander à l'admin d'autoriser l'accès IMAP."
    );
  }
  if (/AuthenticationFailed|AUTHENTICATE failed|Invalid credentials/i.test(str)) {
    return "Identifiants refusés (adresse email ou mot de passe incorrect, ou mot de passe d'application requis).";
  }
  return raw || 'Erreur de connexion IMAP';
}

/**
 * Connecteur IMAP réel : options passées par l'appelant (formulaire / compte).
 */
export function getConnecteurEmailImap(options: OptionsImap): ConnecteurEmail {
  const host = (options.host ?? '').trim();
  const port = Number(options.port) || 993;
  const secure = options.secure !== false;
  return {
    async connecterEtCompter(
      adresseEmail: string,
      motDePasse: string,
      cheminDossier: string
    ): Promise<ResultatTestConnexion> {
      if (!host) {
        return {
          ok: false,
          message: "le champ 'serveur IMAP' est requis",
        };
      }
      const client = new ImapFlow({
        host,
        port,
        secure,
        auth: {
          user: adresseEmail,
          pass: motDePasse,
        },
      });
      try {
        await client.connect();
        const lock = await client.getMailboxLock(cheminDossier.trim());
        try {
          const mailbox = client.mailbox;
          const nbEmails =
            mailbox && typeof mailbox === 'object' && typeof (mailbox as { exists?: number }).exists === 'number'
              ? (mailbox as { exists: number }).exists
              : 0;
          return { ok: true, nbEmails };
        } finally {
          lock.release();
        }
      } catch (err) {
        const message = messageErreurImap(err);
        return { ok: false, message };
      } finally {
        await client.logout().catch(() => {});
      }
    },
  };
}
