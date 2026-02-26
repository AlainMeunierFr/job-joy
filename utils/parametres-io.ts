/**
 * Lecture / écriture de data/parametres.json.
 * Structure : connexionBoiteEmail (mode, dossierAAnalyser, dossierArchive, imap, microsoft, gmail).
 * Mot de passe IMAP stocké chiffré (AES-256-GCM), clé via PARAMETRES_ENCRYPTION_KEY.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ParametresPersistes,
  ConnexionBoiteEmail,
  ImapParams,
  MicrosoftParams,
  GmailParams,
  ParametrageIA,
  FormuleDuScoreTotal,
} from '../types/parametres.js';
import { mergeFormuleDuScoreTotal } from './formule-score-total.js';
import type { CompteLu, ParametresCompte, ProviderCompte } from '../types/compte.js';

const FILENAME = 'parametres.json';
const OLD_FILENAME = 'compte.json';
const BDD_IN_MEMORY = process.env.BDD_IN_MEMORY_STORE === '1';
const PROVIDER_DEFAULT: ProviderCompte = 'imap';

const ENCRYPTION_ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const KEY_LEN = 32;

/** Store en RAM pour les tests BDD. */
let storeRam: ParametresPersistes | null = null;

function getEncryptionKey(): Buffer {
  const raw = process.env.PARAMETRES_ENCRYPTION_KEY;
  if (BDD_IN_MEMORY && !raw) {
    return Buffer.alloc(KEY_LEN, 'test-key-bdd-32-bytes!!!!!!!!');
  }
  if (!raw || raw.length < 32) {
    throw new Error(
      'PARAMETRES_ENCRYPTION_KEY requis (32 octets en hex ou base64) pour chiffrer le mot de passe. Génération : openssl rand -hex 32'
    );
  }
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length >= 64) {
    return Buffer.from(raw.slice(0, 64), 'hex');
  }
  return Buffer.from(raw, 'base64').slice(0, KEY_LEN);
}

/**
 * Chiffre le mot de passe (AES-256-GCM).
 * Format stocké : aes256gcm:base64(iv):base64(ciphertext):base64(authTag)
 */
export function chiffrerMotDePasse(plain: string): string {
  if (!plain) return '';
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ENCRYPTION_ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(Buffer.from(plain, 'utf-8')),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    'aes256gcm',
    iv.toString('base64'),
    enc.toString('base64'),
    authTag.toString('base64'),
  ].join(':');
}

/**
 * Déchiffre le mot de passe.
 */
export function dechiffrerMotDePasse(encrypted: string): string {
  if (!encrypted || !encrypted.startsWith('aes256gcm:')) return '';
  const parts = encrypted.split(':');
  if (parts.length !== 4) return '';
  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');
    const authTag = Buffer.from(parts[3], 'base64');
    const decipher = createDecipheriv(ENCRYPTION_ALGO, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
  } catch {
    return '';
  }
}

export function defaultConnexionBoiteEmail(): ConnexionBoiteEmail {
  return {
    mode: 'imap',
    dossierAAnalyser: '',
    dossierArchive: '',
    imap: {
      host: '',
      port: 993,
      secure: true,
      adresseEmail: '',
      motDePasseChiffre: '',
    },
    microsoft: { adresseEmail: '' },
    gmail: {},
  };
}

export function getDefaultParametres(): ParametresPersistes {
  return { connexionBoiteEmail: defaultConnexionBoiteEmail(), motDePasseCadreEmploi: '' };
}

/**
 * Applique le retour OAuth Microsoft en une seule écriture atomique.
 * Met à jour mode, microsoft (adresseEmail + tokens), préserve dossierAAnalyser/dossierArchive/imap/gmail.
 */
export function appliquerCallbackMicrosoft(
  dataDir: string,
  payload: { adresseEmail: string; refreshToken?: string; clientId?: string; tenantId?: string; tokenObtainedAt?: number }
): void {
  const p = lireParametres(dataDir) ?? getDefaultParametres();
  const c = p.connexionBoiteEmail;
  p.connexionBoiteEmail = {
    ...c,
    mode: 'microsoft',
    microsoft: {
      adresseEmail: (payload.adresseEmail ?? c.microsoft?.adresseEmail ?? '').trim(),
      refreshToken: payload.refreshToken ?? c.microsoft?.refreshToken,
      clientId: payload.clientId ?? c.microsoft?.clientId,
      tenantId: payload.tenantId ?? c.microsoft?.tenantId,
      tokenObtainedAt: payload.tokenObtainedAt ?? Date.now(),
    },
  };
  ecrireParametres(dataDir, p);
}

/** Migre l'ancien compte.json vers la structure parametres. Le mot de passe était haché (irréversible) : on ne peut pas le récupérer, on laisse vide. */
function migrerDepuisCompte(dataDir: string): ParametresPersistes | null {
  const oldPath = join(dataDir, OLD_FILENAME);
  if (!existsSync(oldPath)) return null;
  const raw = readFileSync(oldPath, 'utf-8');
  const data = JSON.parse(raw) as {
    provider?: string;
    adresseEmail?: string;
    cheminDossier?: string;
    cheminDossierArchive?: string;
    imapHost?: string;
    imapPort?: number;
    imapSecure?: boolean;
    motDePasseHash?: string;
  };
  const mode = (data.provider === 'microsoft' || data.provider === 'gmail' ? data.provider : 'imap') as ProviderCompte;
  const connexion: ConnexionBoiteEmail = {
    mode,
    dossierAAnalyser: String(data.cheminDossier ?? '').trim(),
    dossierArchive: String(data.cheminDossierArchive ?? '').trim(),
    imap: {
      host: String(data.imapHost ?? '').trim(),
      port: Number(data.imapPort) || 993,
      secure: data.imapSecure !== false,
      adresseEmail: String(data.adresseEmail ?? '').trim(),
      motDePasseChiffre: '', // ancien hash non réversible : l'utilisateur devra ressaisir une fois
    },
    microsoft: { adresseEmail: String(data.adresseEmail ?? '').trim() },
    gmail: {},
  };
  const parametres: ParametresPersistes = { connexionBoiteEmail: connexion };
  ecrireParametres(dataDir, parametres);
  return parametres;
}

/**
 * Lit data/parametres.json. Si absent mais compte.json existe, migre puis retourne.
 * Si le fichier existe mais est invalide (JSON corrompu), log une erreur et retourne null pour éviter de faire planter le serveur.
 */
export function lireParametres(dataDir: string): ParametresPersistes | null {
  if (BDD_IN_MEMORY) {
    return storeRam;
  }
  const path = join(dataDir, FILENAME);
  if (!existsSync(path)) {
    return migrerDepuisCompte(dataDir);
  }
  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  } catch (e) {
    console.error(`[parametres] Impossible de lire ${path}:`, e);
    return null;
  }
  let data: ParametresPersistes;
  try {
    data = JSON.parse(raw) as ParametresPersistes;
  } catch (e) {
    console.error(
      `[parametres] Fichier ${path} invalide (JSON corrompu). Corrigez le JSON ou renommez/supprimez le fichier pour repartir des valeurs par défaut.`,
      e instanceof Error ? e.message : e
    );
    return null;
  }
  // Si connexionBoiteEmail manque (fichier édité à la main, section supprimée), fusionner avec les défauts
  // pour que parametrageIA, airtable, etc. restent chargés et affichés dans le formulaire.
  if (!data?.connexionBoiteEmail) {
    const def = getDefaultParametres();
    data = { ...def, ...data, connexionBoiteEmail: def.connexionBoiteEmail };
  }
  return data;
}

/**
 * Écrit data/parametres.json.
 */
export function ecrireParametres(dataDir: string, p: ParametresPersistes): void {
  if (BDD_IN_MEMORY) {
    storeRam = p;
    return;
  }
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, FILENAME), JSON.stringify(p, null, 2), 'utf-8');
}

/**
 * Retourne le compte pour affichage / API (sans mot de passe).
 */
export function getCompteLuFromParametres(p: ParametresPersistes | null): CompteLu | null {
  if (!p?.connexionBoiteEmail) return null;
  const c = p.connexionBoiteEmail;
  const mode = (c.mode ?? PROVIDER_DEFAULT) as ProviderCompte;
  let adresseEmail = '';
  let imapHost = '';
  let imapPort = 993;
  let imapSecure = true;
  if (mode === 'imap') {
    adresseEmail = c.imap?.adresseEmail ?? '';
    imapHost = c.imap?.host ?? '';
    imapPort = c.imap?.port ?? 993;
    imapSecure = c.imap?.secure !== false;
  } else if (mode === 'microsoft') {
    adresseEmail = c.microsoft?.adresseEmail ?? '';
  } else if (mode === 'gmail') {
    adresseEmail = c.gmail?.adresseEmail ?? '';
  }
  const connexionWithLegacy = c as ConnexionBoiteEmail & { dossier?: string };
  const dossierAAnalyser = connexionWithLegacy.dossierAAnalyser ?? connexionWithLegacy.dossier ?? '';
  const consentementEnvoyeLe =
    typeof c.consentementEnvoyeLe === 'string' && c.consentementEnvoyeLe.trim() !== ''
      ? c.consentementEnvoyeLe.trim()
      : undefined;
  const consentementIdentification =
    !!consentementEnvoyeLe || c.consentementIdentification === true || c.emailIdentificationDejaEnvoye === true;
  return {
    provider: mode,
    adresseEmail,
    cheminDossier: dossierAAnalyser,
    cheminDossierArchive: c.dossierArchive ?? '',
    imapHost,
    imapPort,
    imapSecure,
    consentementIdentification,
    consentementEnvoyeLe,
  };
}

/**
 * Retourne le mot de passe IMAP déchiffré (pour connexion en tâche de fond). Null si non IMAP ou non défini.
 */
export function getMotDePasseImapDecrypt(dataDir: string): string | null {
  const p = lireParametres(dataDir);
  if (!p?.connexionBoiteEmail || p.connexionBoiteEmail.mode !== 'imap') return null;
  const enc = p.connexionBoiteEmail.imap?.motDePasseChiffre ?? '';
  if (!enc) return null;
  const plain = dechiffrerMotDePasse(enc);
  return plain || null;
}

/**
 * Met à jour la section connexion boîte email à partir des paramètres formulaire.
 * Chiffre le mot de passe si fourni.
 */
export function ecrireParametresFromForm(
  dataDir: string,
  form: ParametresCompte
): void {
  const existing = lireParametres(dataDir);
  const c: ConnexionBoiteEmail = existing?.connexionBoiteEmail ?? defaultConnexionBoiteEmail();
  const mode = (form.provider ?? c.mode ?? PROVIDER_DEFAULT) as ProviderCompte;

  const rawEmail = String(form.adresseEmail ?? '').trim();
  const isMaskedOrEmpty = !rawEmail || rawEmail.includes('***');
  const existingEmail = c.imap?.adresseEmail ?? c.microsoft?.adresseEmail ?? c.gmail?.adresseEmail ?? '';
  const connexionWithLegacy = c as ConnexionBoiteEmail & { dossier?: string };
  const existingDossierAAnalyser = connexionWithLegacy.dossierAAnalyser ?? connexionWithLegacy.dossier ?? '';
  const dossierArchiveFromForm = String(form.cheminDossierArchive ?? '').trim();
  const dossierArchive =
    dossierArchiveFromForm !== '' ? dossierArchiveFromForm : (c.dossierArchive ?? '').trim();
  const consentementDejaEnvoye =
    (typeof c.consentementEnvoyeLe === 'string' && c.consentementEnvoyeLe.trim() !== '') ||
    c.emailIdentificationDejaEnvoye === true;
  const connexion: ConnexionBoiteEmail = {
    ...c,
    mode,
    dossierAAnalyser: String(form.cheminDossier ?? existingDossierAAnalyser ?? '').trim(),
    dossierArchive,
    consentementEnvoyeLe: c.consentementEnvoyeLe,
    consentementIdentification: undefined,
    emailIdentificationDejaEnvoye: undefined,
    imap: {
      host: String(form.imapHost ?? c.imap?.host ?? '').trim(),
      port: Number(form.imapPort ?? c.imap?.port) || 993,
      secure: form.imapSecure !== false && c.imap?.secure !== false,
      adresseEmail: !isMaskedOrEmpty ? rawEmail : existingEmail,
      motDePasseChiffre:
        form.motDePasse != null && form.motDePasse !== ''
          ? chiffrerMotDePasse(form.motDePasse)
          : (c.imap?.motDePasseChiffre ?? ''),
    },
    microsoft: {
      adresseEmail: !isMaskedOrEmpty ? rawEmail : existingEmail,
      ...(c.microsoft?.refreshToken && { refreshToken: c.microsoft.refreshToken }),
      ...(c.microsoft?.clientId && { clientId: c.microsoft.clientId }),
      ...(c.microsoft?.tenantId && { tenantId: c.microsoft.tenantId }),
      ...(c.microsoft?.tokenObtainedAt && { tokenObtainedAt: c.microsoft.tokenObtainedAt }),
    },
    gmail: { ...c.gmail },
  };

  const toWrite: ParametresPersistes = {
    ...(existing ?? {}),
    connexionBoiteEmail: connexion,
  };
  ecrireParametres(dataDir, toWrite);
}

/**
 * Met à jour uniquement la section parametrageIA dans parametres.json (US-2.1).
 */
export function ecrireParametrageIA(dataDir: string, data: ParametrageIA): void {
  const p = lireParametres(dataDir) ?? getDefaultParametres();
  p.parametrageIA = data;
  ecrireParametres(dataDir, p);
}

/**
 * Lit la partie modifiable du prompt IA depuis parametres.json (US-2.3).
 * Si rien n'est stocké (section promptIA absente), retourne une chaîne vide.
 */
export function lirePartieModifiablePrompt(dataDir: string): string {
  const p = lireParametres(dataDir);
  const value = p?.promptIA;
  return typeof value === 'string' ? value : '';
}

/**
 * Enregistre la partie modifiable du prompt IA dans parametres.json (US-2.3).
 */
export function ecrirePartieModifiablePrompt(dataDir: string, texte: string): void {
  const p = lireParametres(dataDir) ?? getDefaultParametres();
  p.promptIA = texte;
  ecrireParametres(dataDir, p);
}

/**
 * Lit formuleDuScoreTotal depuis parametres.json et fusionne avec les défauts (US-2.7).
 */
export function lireFormuleDuScoreTotalOuDefaut(dataDir: string): FormuleDuScoreTotal {
  const p = lireParametres(dataDir);
  return mergeFormuleDuScoreTotal(p?.formuleDuScoreTotal);
}

/**
 * Enregistre formuleDuScoreTotal dans parametres.json (US-2.7).
 */
export function ecrireFormuleDuScoreTotal(dataDir: string, data: FormuleDuScoreTotal): void {
  const p = lireParametres(dataDir) ?? getDefaultParametres();
  p.formuleDuScoreTotal = data;
  ecrireParametres(dataDir, p);
}

/**
 * Indique si l'email d'identification a déjà été envoyé (US-3.15). Considère consentementEnvoyeLe ou emailIdentificationDejaEnvoye (compat).
 */
export function lireEmailIdentificationDejaEnvoye(dataDir: string): boolean {
  const p = lireParametres(dataDir);
  const c = p?.connexionBoiteEmail;
  if (!c) return false;
  if (typeof c.consentementEnvoyeLe === 'string' && c.consentementEnvoyeLe.trim() !== '') return true;
  return c.emailIdentificationDejaEnvoye === true;
}

/**
 * Retourne la date-heure ISO d'envoi du consentement si présente, sinon null (US-3.15 CA6).
 */
export function lireConsentementEnvoyeLe(dataDir: string): string | null {
  const p = lireParametres(dataDir);
  const v = p?.connexionBoiteEmail?.consentementEnvoyeLe;
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/**
 * Marque le consentement comme envoyé à l'instant. Source de vérité unique : consentementEnvoyeLe (US-3.15).
 * Si consentementEnvoyeLe est vide/null/absent = pas donné ; s'il contient une date = donné.
 */
export function marquerEmailIdentificationEnvoye(dataDir: string): void {
  const p = lireParametres(dataDir) ?? getDefaultParametres();
  if (!p.connexionBoiteEmail) return;
  const iso = new Date().toISOString();
  const c = p.connexionBoiteEmail;
  p.connexionBoiteEmail = {
    ...c,
    consentementEnvoyeLe: iso,
    // Ne plus écrire les champs redondants ; lecture reste compatible (lireEmailIdentificationDejaEnvoye lit consentementEnvoyeLe).
    emailIdentificationDejaEnvoye: undefined,
    consentementIdentification: undefined,
  };
  ecrireParametres(dataDir, p);
}

export function resetParametresStoreForTest(): void {
  if (BDD_IN_MEMORY) storeRam = null;
}

export function getParametresStoreForTest(): ParametresPersistes | null {
  return BDD_IN_MEMORY ? storeRam : null;
}
