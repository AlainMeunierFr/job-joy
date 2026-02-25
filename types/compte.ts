/**
 * Types métier pour la configuration du compte email (US-1.1).
 * Même nom pour les propriétés JSON et les champs TypeScript.
 */

/** Type de compte / fournisseur de messagerie. */
export type ProviderCompte = 'imap' | 'microsoft' | 'gmail';

export interface ParametresCompte {
  /** Type de connexion : IMAP (générique), Microsoft (Graph OAuth), Gmail (à venir). */
  provider?: ProviderCompte;
  adresseEmail: string;
  motDePasse: string;
  cheminDossier: string;
  /** Dossier pour archiver les emails traités (ex. Traité, Offres traitées). */
  cheminDossierArchive?: string;
  /** Serveur IMAP (ex. imap.example.com). Requis pour provider IMAP. */
  imapHost?: string;
  /** Port IMAP (défaut 993). */
  imapPort?: number;
  /** Connexion sécurisée TLS (défaut true). */
  imapSecure?: boolean;
  /** Consentement à communiquer l'email pour identification / support / retours beta (US-3.15). */
  consentementIdentification?: boolean;
}

/** Vue legacy du compte (pour API test/compte-store). Réel stockage : data/parametres.json, mot de passe chiffré. */
export interface ComptePersiste {
  provider: ProviderCompte;
  adresseEmail: string;
  cheminDossier: string;
  cheminDossierArchive: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  /** Hachage du mot de passe (IMAP) ou placeholder pour Microsoft/Gmail. */
  motDePasseHash: string;
  /** Consentement identification (US-3.15). */
  consentementIdentification?: boolean;
}

/** Compte lu pour affichage (sans mot de passe). */
export interface CompteLu {
  provider: ProviderCompte;
  adresseEmail: string;
  cheminDossier: string;
  cheminDossierArchive: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  /** Consentement identification (US-3.15). */
  consentementIdentification?: boolean;
  /** Date-heure ISO du consentement déjà envoyé (US-3.15 CA6). Si présent, afficher rappel et ne pas afficher la case. */
  consentementEnvoyeLe?: string;
}

export type ResultatValidation =
  | { ok: true }
  | { ok: false; message: string };

/** Résultat du test de connexion (bouton test) : succès + nombre d'emails ou erreur. */
export type ResultatTestConnexion =
  | { ok: true; nbEmails: number }
  | { ok: false; message: string };

/** Options de connexion IMAP (saisies dans le formulaire, pas d'env). */
export interface OptionsImap {
  host: string;
  port: number;
  secure: boolean;
}

/** Port pour connecter au compte email et compter les emails à analyser. */
export interface ConnecteurEmail {
  connecterEtCompter(
    adresseEmail: string,
    motDePasse: string,
    cheminDossier: string
  ): Promise<ResultatTestConnexion>;
}

/** Paramètres de l'email d'identification utilisateur (US-3.15). */
export interface ParametresEmailIdentification {
  from: string;
  to: string;
  subject: string;
  body: string;
}

/** Résultat d'envoi d'email identification (non bloquant en cas d'échec). */
export type ResultatEnvoiEmailIdentification =
  | { ok: true; openUrl?: string }
  | { ok: false; message: string };

/** Port pour envoyer l'email d'identification (From=compte, To=alain@maep.fr, sujet/corps fixés). US-3.15. */
export interface EnvoyeurEmailIdentification {
  envoyer(params: ParametresEmailIdentification): Promise<ResultatEnvoiEmailIdentification>;
}

/** Résultat de enregistrerCompteEtNotifierSiConsentement : sauvegarde toujours réussie, envoi optionnel (échec non bloquant). */
export interface ResultatEnregistrementCompteAvecNotification {
  sauvegardeOk: true;
  /** Présent si un envoi a été tenté (consentement + pas encore envoyé). */
  envoiEmail?: ResultatEnvoiEmailIdentification;
}
