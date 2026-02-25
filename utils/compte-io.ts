/**
 * Façade lecture / écriture "compte" pour compatibilité API et formulaire.
 * Délègue à parametres-io (data/parametres.json, structure connexionBoiteEmail).
 * Le mot de passe IMAP est stocké chiffré (AES-256-GCM) dans parametres.
 */
import type {
  CompteLu,
  EnvoyeurEmailIdentification,
  ParametresCompte,
  ProviderCompte,
  ResultatEnregistrementCompteAvecNotification,
} from '../types/compte.js';
import {
  lireParametres,
  ecrireParametresFromForm,
  getCompteLuFromParametres,
  resetParametresStoreForTest,
  getParametresStoreForTest,
  lireEmailIdentificationDejaEnvoye,
  marquerEmailIdentificationEnvoye,
} from './parametres-io.js';
import { envoyerEmailIdentification } from './envoi-email-identification.js';

const PROVIDER_DEFAULT: ProviderCompte = 'imap';

/**
 * Lit le compte pour affichage (sans mot de passe).
 * Source : data/parametres.json → connexionBoiteEmail.
 */
export function lireCompte(dataDir: string): CompteLu | null {
  const p = lireParametres(dataDir);
  return getCompteLuFromParametres(p);
}

/**
 * Écrit le compte à partir des paramètres formulaire.
 * Le mot de passe est chiffré avant stockage (parametres-io).
 */
export function ecrireCompte(dataDir: string, parametres: ParametresCompte): void {
  ecrireParametresFromForm(dataDir, parametres);
}

/**
 * Enregistre le compte puis envoie l'email d'identification si consentement et pas encore envoyé (US-3.15).
 * Échec d'envoi non bloquant : la sauvegarde est toujours considérée réussie.
 */
export async function enregistrerCompteEtNotifierSiConsentement(
  dataDir: string,
  parametres: ParametresCompte,
  port: EnvoyeurEmailIdentification
): Promise<ResultatEnregistrementCompteAvecNotification> {
  ecrireParametresFromForm(dataDir, parametres);
  if (parametres.consentementIdentification !== true) {
    return { sauvegardeOk: true };
  }
  if (lireEmailIdentificationDejaEnvoye(dataDir)) {
    return { sauvegardeOk: true };
  }
  const adresse = getCompteLuFromParametres(lireParametres(dataDir))?.adresseEmail ?? '';
  if (!adresse.trim()) {
    return { sauvegardeOk: true };
  }
  const envoiResult = await envoyerEmailIdentification(adresse, port);
  if (envoiResult.ok === true) {
    marquerEmailIdentificationEnvoye(dataDir);
  }
  return { sauvegardeOk: true, envoiEmail: envoiResult };
}

/**
 * Réinitialise le store RAM (mode BDD). Utilisé par les tests.
 */
export function resetCompteStoreForTest(): void {
  resetParametresStoreForTest();
}

/**
 * Retourne le store brut pour assertions BDD (format legacy ComptePersiste).
 * En mode BDD uniquement. motDePasseHash = motDePasseChiffre (imap) pour les tests.
 */
export function getCompteStoreForTest(): {
  provider: ProviderCompte;
  adresseEmail: string;
  cheminDossier: string;
  cheminDossierArchive: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  motDePasseHash: string;
  consentementIdentification?: boolean;
} | null {
  const p = getParametresStoreForTest();
  if (!p?.connexionBoiteEmail) return null;
  const c = p.connexionBoiteEmail;
  const mode = (c.mode ?? PROVIDER_DEFAULT) as ProviderCompte;
  let adresseEmail = '';
  let imapHost = '';
  let imapPort = 993;
  let imapSecure = true;
  let motDePasseHash = '';
  if (mode === 'imap') {
    adresseEmail = c.imap?.adresseEmail ?? '';
    imapHost = c.imap?.host ?? '';
    imapPort = c.imap?.port ?? 993;
    imapSecure = c.imap?.secure !== false;
    motDePasseHash = c.imap?.motDePasseChiffre ?? '';
  } else if (mode === 'microsoft') {
    adresseEmail = c.microsoft?.adresseEmail ?? '';
  } else {
    adresseEmail = c.gmail?.adresseEmail ?? '';
  }
  const cLegacy = c as typeof c & { dossier?: string };
  const dossierAAnalyser = cLegacy.dossierAAnalyser ?? cLegacy.dossier ?? '';
  return {
    provider: mode,
    adresseEmail,
    cheminDossier: dossierAAnalyser,
    cheminDossierArchive: c.dossierArchive ?? '',
    imapHost,
    imapPort,
    imapSecure,
    motDePasseHash,
    consentementIdentification: c.consentementIdentification === true,
  };
}
