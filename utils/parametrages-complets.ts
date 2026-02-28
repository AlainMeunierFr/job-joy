/**
 * Évaluation des paramétrages complets (US-1.6).
 * Complet = connexion email OK, Airtable OK et API IA (Mistral) OK.
 * S'appuie sur lireCompte, lireAirTable et lireMistral (pas de duplication de lecture).
 */
import { lireCompte } from './compte-io.js';
import { lireAirTable } from './parametres-airtable.js';
import { lireMistral } from './parametres-mistral.js';

export interface ResultatParametragesComplets {
  complet: boolean;
  manque: string[];
}

/**
 * Vérifie si les paramétrages sont complets (compte email + Airtable + API IA).
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
      (airtable.offres ?? '').trim()
  );
  if (!airtableOk) manque.push('Airtable');

  const mistral = lireMistral(dataDir);
  const apiIaOk = Boolean(mistral?.hasApiKey);
  if (!apiIaOk) manque.push('API IA');

  if (manque.length > 0) {
    console.warn(
      '[parametrages-complets] Config considérée incomplète:',
      { dataDir, manque, compteOk, airtableOk, apiIaOk },
      airtable && !(airtable.apiKey ?? '').trim()
        ? '(Airtable présent mais apiKey vide — vérifier PARAMETRES_ENCRYPTION_KEY si la clé est chiffrée)'
        : ''
    );
  }

  return {
    complet: manque.length === 0,
    manque,
  };
}
