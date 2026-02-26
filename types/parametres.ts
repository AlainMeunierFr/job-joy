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
  /** Source de vérité unique : si vide/null/absent = consentement pas donné ; si contient une date = donné (US-3.15). */
  consentementEnvoyeLe?: string;
  /** Dérivé à la lecture pour compatibilité ; ne plus écrire. */
  consentementIdentification?: boolean;
  /** Conservé pour compatibilité lecture uniquement ; ne plus écrire. */
  emailIdentificationDejaEnvoye?: boolean;
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

/** Section ClaudeCode dans parametres.json (API Key pour ClaudeCode, jamais persistée en clair). */
export interface ClaudeCode {
  /** Clé API en clair (en mémoire uniquement, après déchiffrement). Ne pas écrire en JSON. */
  apiKey?: string;
  /** Clé API chiffrée (AES-256-GCM) pour persistance. */
  apiKeyChiffre?: string;
}

/** Résultat de lecture ClaudeCode (avec indicateur hasApiKey pour savoir si une clé est configurée sans l'exposer). */
export interface ClaudeCodeLu extends ClaudeCode {
  /** True si une clé est enregistrée (apiKeyChiffre présente), sans exposer la valeur. */
  hasApiKey: boolean;
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

/** Une paire (titre saisissable, description) pour un critère rédhibitoire. */
export interface Rehibitoire {
  titre: string;
  description: string;
}

/** Une paire (titre saisissable, attente) pour un score optionnel. */
export interface ScoreOptionnel {
  titre: string;
  attente: string;
}

/** Scores incontournables : 4 zones texte, titres fixes. */
export interface ScoresIncontournables {
  localisation: string;
  salaire: string;
  culture: string;
  qualiteOffre: string;
}

/** US-2.7 : Objet formule du score total (8 coefficients + formule math.js). */
export interface FormuleDuScoreTotal {
  coefScoreLocalisation: number;
  coefScoreSalaire: number;
  coefScoreCulture: number;
  coefScoreQualiteOffre: number;
  coefScoreOptionnel1: number;
  coefScoreOptionnel2: number;
  coefScoreOptionnel3: number;
  coefScoreOptionnel4: number;
  formule: string;
}

/** Section Paramétrage IA dans parametres.json (rédhibitoires, scores, autres ressources). */
export interface ParametrageIA {
  /** Jusqu'à 4 paires (titre, description) pour critères rédhibitoires. */
  rehibitoires: Rehibitoire[];
  /** 4 zones texte : localisation, salaire, culture, qualiteOffre. */
  scoresIncontournables: ScoresIncontournables;
  /** Jusqu'à 4 paires (titre, attente) pour scores optionnels. */
  scoresOptionnels: ScoreOptionnel[];
  /** Zone texte : chemin répertoire ou autres ressources. */
  autresRessources: string;
}

/** Fichier parametres.json (racine). */
export interface ParametresPersistes {
  connexionBoiteEmail: ConnexionBoiteEmail;
  /** Section configuration Airtable (optionnelle). */
  airtable?: AirTable;
  /** Section Paramétrage IA (optionnelle). */
  parametrageIA?: ParametrageIA;
  /** Section ClaudeCode (optionnelle). */
  claudecode?: ClaudeCode;
  /** Partie modifiable du prompt IA (éditable par l'utilisateur, ex. promptIA dans JSON). */
  promptIA?: string;
  /** US-2.7 : Formule du score total (coefficients + expression math.js). */
  formuleDuScoreTotal?: FormuleDuScoreTotal;
  /** Mot de passe Cadremploi (POC : en clair). Login = adresse email de la BAL. */
  motDePasseCadreEmploi?: string;
}
