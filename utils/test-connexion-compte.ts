/**
 * Exécution du test de connexion au compte email (US-1.1).
 * Délègue au connecteur (port) pour la connexion réelle et le comptage.
 */
import type { ConnecteurEmail, ResultatTestConnexion } from '../types/compte.js';

/**
 * Lance le test de connexion avec les identifiants et le dossier.
 * Retourne le nombre d'emails à analyser en cas de succès.
 */
export async function executerTestConnexion(
  adresseEmail: string,
  motDePasse: string,
  cheminDossier: string,
  connecteur: ConnecteurEmail
): Promise<ResultatTestConnexion> {
  return connecteur.connecterEtCompter(
    adresseEmail,
    motDePasse,
    cheminDossier
  );
}
