/**
 * Structure du fichier data/parametres.json.
 * Organisation alignée sur le formulaire ; extensible (autres sections plus tard).
 */

import type { ProviderCompte } from './compte.js';

/** Section "Connexion boîte email" du formulaire. */
export interface ConnexionBoiteEmail {
  /** Mode de connexion : IMAP, Microsoft, Gmail. */
  mode: ProviderCompte;
  /** Dossier à analyser (ex. INBOX, Offres). */
  dossierAAnalyser: string;
  /** Dossier pour archiver les emails traités (ex. Traité, Offres traitées). */
  dossierArchive: string;
  /** Paramètres IMAP (host, port, TLS, email, mot de passe chiffré). */
  imap: ImapParams;
  /** Paramètres Microsoft (email + tokens OAuth). */
  microsoft: MicrosoftParams;
  /** Paramètres Gmail (à venir). */
  gmail: GmailParams;
}

export interface ImapParams {
  host: string;
  port: number;
  secure: boolean;
  adresseEmail: string;
  /** Mot de passe chiffré (AES-256-GCM), jamais en clair. Format : aes256gcm:iv:ciphertext:authTag. */
  motDePasseChiffre: string;
}

export interface MicrosoftParams {
  adresseEmail: string;
  refreshToken?: string;
  clientId?: string;
  tenantId?: string;
  /** Epoch ms : date d'obtention du refresh token (durée de vie ~90 j). */
  tokenObtainedAt?: number;
}

export interface GmailParams {
  adresseEmail?: string;
  /** À venir. */
}

/** Section AirTable dans parametres.json (bases Free : créer la base à la main, coller l’URL). */
export interface AirTable {
  /** Clé API en clair (en mémoire uniquement, après déchiffrement). Ne pas écrire en JSON. */
  apiKey?: string;
  /** Clé API chiffrée (AES-256-GCM) pour persistance. */
  apiKeyChiffre?: string;
  /** URL complète de la base Airtable ou ID (appXXX). Base de production ; conservée pour « Ouvrir Airtable ». */
  base?: string;
  /** Base dédiée au test du schéma (création tables pour nouveaux utilisateurs). Utilisée uniquement par les tests d’intégration, jamais par la CLI ni l’app. */
  baseTest?: string;
  /** ID de la table Sources. */
  sources?: string;
  /** ID de la table Offres. */
  offres?: string;
}

/** Fichier parametres.json (racine). */
export interface ParametresPersistes {
  connexionBoiteEmail: ConnexionBoiteEmail;
  /** Section configuration Airtable (optionnelle). */
  airtable?: AirTable;
}
