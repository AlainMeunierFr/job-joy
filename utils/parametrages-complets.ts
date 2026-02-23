/**
 * Évaluation des paramétrages complets (US-1.6).
 * Complet = connexion email OK et Airtable OK.
 * S'appuie sur lireCompte et lireAirTable (pas de duplication de lecture).
 */
import { lireCompte } from './compte-io.js';
import { lireAirTable } from './parametres-airtable.js';

export interface ResultatParametragesComplets {
  complet: boolean;
  manque: string[];
}

/**
 * Vérifie si les paramétrages sont complets (compte email + Airtable).
 * Retourne { complet, manque } pour affichage / redirection côté front.
 */
export function evaluerParametragesComplets(dataDir: string): ResultatParametragesComplets {
  const manque: string[] = [];
  const compte = lireCompte(dataDir);
  const compteOk = Boolean(
    compte &&
      (compte.adresseEmail ?? '').trim() &&
      (compte.cheminDossier ?? '').trim() &&
      ((compte.provider ?? 'imap') !== 'imap' || (compte.imapHost ?? '').trim().length > 0)
  );
  if (!compteOk) manque.push('connexion email');

  const airtable = lireAirTable(dataDir);
  const airtableOk = Boolean(
    airtable &&
      (airtable.apiKey ?? '').trim() &&
      (airtable.base ?? '').trim() &&
      (airtable.sources ?? '').trim() &&
      (airtable.offres ?? '').trim()
  );
  if (!airtableOk) manque.push('Airtable');

  return {
    complet: manque.length === 0,
    manque,
  };
}
