/**
 * Lecteur d'emails MOCK pour tests BDD / Jest (US-1.4).
 * Retourne une liste d'emails configurable (HTML) sans connexion réelle.
 */
import type { LecteurEmails } from './relève-offres-linkedin.js';

export interface LecteurEmailsMockOptions {
  /** Si défini, retourne cette erreur au lieu des emails. */
  erreur?: string;
  /** Liste des contenus HTML à retourner pour chaque "email". */
  emails?: Array<{ html: string; receivedAtIso?: string }>;
  /** Emails complets pour le mode gouvernance (id/from/html/date). */
  emailsGouvernance?: Array<{ id: string; from: string; html: string; receivedAtIso?: string }>;
}

export interface LecteurEmailsGouvernance {
  lireEmailsGouvernance(
    adresseEmail: string,
    motDePasse: string,
    cheminDossier: string
  ): Promise<
    | { ok: true; emails: Array<{ id: string; from: string; html: string; receivedAtIso?: string }> }
    | { ok: false; message: string }
  >;
  deplacerEmailsVersDossier(
    adresseEmail: string,
    motDePasse: string,
    ids: string[],
    cheminDossierArchive: string
  ): Promise<{ ok: true } | { ok: false; message: string }>;
}

/**
 * Crée un lecteur mock qui retourne les emails fournis (ou une erreur).
 * Utilisé en BDD avec BDD_MOCK_CONNECTEUR=1 ou dans les tests unitaires.
 */
export function createLecteurEmailsMock(
  options: LecteurEmailsMockOptions = {}
): LecteurEmails & LecteurEmailsGouvernance {
  const { erreur, emails = [], emailsGouvernance = [] } = options;
  return {
    async lireEmails(): Promise<
      | { ok: true; emails: Array<{ html: string; receivedAtIso?: string }> }
      | { ok: false; message: string }
    > {
      if (erreur) {
        return { ok: false, message: erreur };
      }
      return { ok: true, emails: [...emails] };
    },
    async lireEmailsGouvernance(
      _adresseEmail: string,
      _motDePasse: string,
      _cheminDossier: string
    ): Promise<
      | { ok: true; emails: Array<{ id: string; from: string; html: string; receivedAtIso?: string }> }
      | { ok: false; message: string }
    > {
      if (erreur) return { ok: false, message: erreur };
      return { ok: true, emails: [...emailsGouvernance] };
    },
    async deplacerEmailsVersDossier(
      _adresseEmail: string,
      _motDePasse: string,
      _ids: string[],
      _cheminDossierArchive: string
    ): Promise<{ ok: true } | { ok: false; message: string }> {
      if (erreur) return { ok: false, message: erreur };
      return { ok: true };
    },
  };
}
