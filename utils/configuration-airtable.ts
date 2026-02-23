/**
 * Port « exécuter configuration Airtable » (US-1.3).
 * Création base + tables via un driver injecté (mock en test, API réelle en prod).
 * En cas de succès, écrit apiKey et IDs dans data/parametres.json.
 * Préserve l’URL de la base si elle était déjà stockée (pour le bouton « Ouvrir Airtable » du tableau de bord).
 */
import { lireAirTable, ecrireAirTable } from './parametres-airtable.js';

export type ResultatConfigurationAirtable =
  | { ok: true; baseId: string; sourcesId: string; offresId: string }
  | { ok: false; message: string };

export interface AirtableConfigDriver {
  creerBaseEtTables(apiKey: string): Promise<{
    baseId: string;
    sourcesId: string;
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
  try {
    const { baseId, sourcesId, offresId } = await driver.creerBaseEtTables(key);
    const existing = lireAirTable(dataDir);
    const baseToStore =
      existing?.base?.trim().startsWith('http') ? existing.base!.trim() : baseId;
    ecrireAirTable(dataDir, { apiKey: key, base: baseToStore, sources: sourcesId, offres: offresId });
    return { ok: true, baseId, sourcesId, offresId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}

/**
 * Retourne le libellé pour affichage (BDD : « AirTable prêt » ou « Erreur avec AirTable » + message).
 */
export function libelleStatutConfigurationAirtable(r: ResultatConfigurationAirtable): string {
  if (r.ok) return 'AirTable prêt';
  return `Erreur avec AirTable : ${r.message}`;
}
