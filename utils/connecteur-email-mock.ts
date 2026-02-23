/**
 * Connecteur email MOCK — faux, pour tests uniquement (BDD, Jest).
 * En vraie vie utiliser le connecteur IMAP (connecteur-email-imap.ts).
 */
import type { ConnecteurEmail, ResultatTestConnexion } from '../types/compte.js';

const MOCK_DOSSIER_VALIDE = 'INBOX/Offres';

/** Actif si BDD_MOCK_CONNECTEUR=1 ou NODE_ENV=test (Jest, CLI). */
function mockActif(): boolean {
  return process.env.BDD_MOCK_CONNECTEUR === '1' || process.env.NODE_ENV === 'test';
}

/**
 * Connecteur mock : succès pour alain@maep.fr + MonMotDePasse + INBOX/Offres ;
 * sinon message d'erreur identifiants ou dossier.
 */
export function getConnecteurEmailMock(): ConnecteurEmail {
  return {
    async connecterEtCompter(
      adresseEmail: string,
      motDePasse: string,
      cheminDossier: string
    ): Promise<ResultatTestConnexion> {
      if (!mockActif()) {
        return { ok: false, message: 'Connexion réelle non disponible (utiliser le mock en test)' };
      }
      if (adresseEmail !== 'alain@maep.fr' || motDePasse !== 'MonMotDePasse') {
        return { ok: false, message: "erreur sur 'adresse email' ou le 'mot de passe'" };
      }
      const dossier = (cheminDossier ?? '').trim();
      if (!dossier) {
        return { ok: false, message: 'préciser le chemin vers le dossier à analyser' };
      }
      if (dossier !== MOCK_DOSSIER_VALIDE) {
        return { ok: false, message: "le chemin vers le dossier à analyser n'existe pas" };
      }
      return { ok: true, nbEmails: 0 };
    },
  };
}
