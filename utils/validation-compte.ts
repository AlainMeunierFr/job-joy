/**
 * Validation des paramètres du compte email (US-1.1).
 */
import type { ResultatValidation } from '../types/compte.js';

export interface OptionsValidationCompte {
  /** Optionnel, pour tests uniquement. En production l'existence du dossier est vérifiée par le connecteur (BAL). */
  pathExists?: (path: string) => boolean;
  /** Si fourni, appelé après champs et dossier ok ; retourne erreur identifiants si connexion refusée. */
  verifierConnexion?: (
    adresseEmail: string,
    motDePasse: string,
    cheminDossier: string
  ) => ResultatValidation;
}

/**
 * Valide adresse email, mot de passe, chemin dossier et paramètres IMAP (côté métier).
 * Ordre des contrôles : champs vides d'abord, puis dossier, serveur IMAP, puis identifiants (connexion).
 */
export function validerParametresCompte(
  adresseEmail: string,
  motDePasse: string,
  cheminDossier: string,
  options?: OptionsValidationCompte & { imapHost?: string }
): ResultatValidation {
  const adresse = (adresseEmail ?? '').trim();
  const mdp = (motDePasse ?? '').trim();
  const dossier = (cheminDossier ?? '').trim();
  if (!adresse) {
    return { ok: false, message: "le champ 'adresse email' est requis" };
  }
  if (!mdp) {
    return { ok: false, message: "le champ 'mot de passe' est requis" };
  }
  if (!dossier) {
    return { ok: false, message: 'préciser le chemin vers le dossier à analyser' };
  }
  if (options?.imapHost !== undefined && !(options.imapHost ?? '').trim()) {
    return { ok: false, message: "le champ 'serveur IMAP' est requis" };
  }
  // Existence du dossier : en production vérifiée par le connecteur (BAL), pas par le disque.
  const pathExists = options?.pathExists;
  if (pathExists && !pathExists(dossier)) {
    return {
      ok: false,
      message: "le chemin vers le dossier à analyser n'existe pas",
    };
  }
  const verifierConnexion = options?.verifierConnexion;
  if (verifierConnexion) {
    return verifierConnexion(adresse, mdp, dossier);
  }
  return { ok: true };
}
