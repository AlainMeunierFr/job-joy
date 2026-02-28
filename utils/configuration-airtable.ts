/**
 * Port « exécuter configuration Airtable » (US-1.3).
 * Création base + tables via un driver injecté (mock en test, API réelle en prod).
 * En cas de succès, écrit apiKey et IDs dans data/parametres.json.
 * Préserve l’URL de la base si elle était déjà stockée (pour le bouton « Ouvrir Airtable » du tableau de bord).
 */
import { messageErreurReseau, MESSAGE_ERREUR_RESEAU } from './erreur-reseau.js';
import { lireAirTable, ecrireAirTable } from './parametres-airtable.js';

/** Délai avant 1 retry en cas d’erreur réseau (CA5 US-3.14). */
const RETRY_DELAY_MS = 1500;

export type ResultatConfigurationAirtable =
  | { ok: true; baseId: string; offresId: string }
  | { ok: false; message: string };

export interface AirtableConfigDriver {
  creerBaseEtTables(apiKey: string): Promise<{
    baseId: string;
    offresId: string;
  }>;
}

/**
 * Exécute le flux de configuration Airtable (validation apiKey, appel driver, écriture parametres).
 * N’écrit pas encore dans parametres.json (délégué au baby step 4).
 */
export async function executerConfigurationAirtable(
  apiKey: string,
  dataDir: string,
  driver: AirtableConfigDriver
): Promise<ResultatConfigurationAirtable> {
  if (!apiKey?.trim()) {
    return { ok: false, message: "L'API Key est vide ou absente." };
  }
  const key = apiKey.trim();
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { baseId, offresId } = await driver.creerBaseEtTables(key);
      const existing = lireAirTable(dataDir);
      const baseToStore =
        existing?.base?.trim().startsWith('http') ? existing.base!.trim() : baseId;
      ecrireAirTable(dataDir, { apiKey: key, base: baseToStore, offres: offresId });
      return { ok: true, baseId, offresId };
    } catch (e) {
      const message = messageErreurReseau(e);
      if (message === MESSAGE_ERREUR_RESEAU && attempt === 1) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      return { ok: false, message };
    }
  }
  return { ok: false, message: MESSAGE_ERREUR_RESEAU };
}

/**
 * Retourne le libellé pour affichage (BDD : « AirTable prêt » ou « Erreur avec AirTable » + message).
 */
export function libelleStatutConfigurationAirtable(r: ResultatConfigurationAirtable): string {
  if (r.ok) return 'AirTable prêt';
  return `Erreur avec AirTable : ${r.message}`;
}
