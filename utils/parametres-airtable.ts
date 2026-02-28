/**
 * Lecture / écriture de la section AirTable dans data/parametres.json (US-1.3).
 * API Key stockée chiffrée (apiKeyChiffre), jamais en clair dans le fichier.
 */
import type { AirTable } from '../types/parametres.js';
import { lireParametres, ecrireParametres, getDefaultParametres, chiffrerMotDePasse, dechiffrerMotDePasse } from './parametres-io.js';

/**
 * Retourne la section airtable avec apiKey déchiffrée (pour usage serveur). Ne pas exposer apiKey au client.
 * Migre automatiquement un ancien fichier contenant apiKey en clair vers apiKeyChiffre.
 */
export function lireAirTable(dataDir: string): AirTable | null {
  let p = lireParametres(dataDir);
  const raw = p?.airtable;
  if (!raw) return null;
  const rawWithLegacy = raw as { apiKeyChiffre?: string; apiKey?: string; base?: string; baseTest?: string; sources?: string; offres?: string };
  let apiKeyChiffre = rawWithLegacy.apiKeyChiffre;
  const apiKeyEnClair = rawWithLegacy.apiKey?.trim();
  if (apiKeyEnClair && !apiKeyChiffre) {
    try {
      apiKeyChiffre = chiffrerMotDePasse(apiKeyEnClair);
      if (p) {
        p = { ...p, airtable: { apiKeyChiffre, base: raw.base, baseTest: raw.baseTest, sources: raw.sources, offres: raw.offres } };
        ecrireParametres(dataDir, p);
      }
    } catch {
      /* PARAMETRES_ENCRYPTION_KEY non défini (ex. CLI sans .env) : on utilise apiKey en clair pour cette lecture, pas de migration */
    }
  }
  let apiKey: string;
  if (apiKeyChiffre) {
    try {
      apiKey = dechiffrerMotDePasse(apiKeyChiffre);
    } catch (e) {
      console.warn(
        '[parametres-airtable] Déchiffrement apiKey Airtable impossible. Vérifiez que PARAMETRES_ENCRYPTION_KEY (ex. dans .env) est défini et identique à celui utilisé à l’enregistrement.',
        e instanceof Error ? e.message : e
      );
      apiKey = apiKeyEnClair ?? '';
    }
  } else {
    apiKey = apiKeyEnClair ?? '';
  }
  return {
    ...raw,
    apiKey: apiKey || undefined,
  };
}

/**
 * Met à jour la section airtable (fusion partielle). Si updates.apiKey est fourni, il est chiffré avant stockage.
 * Ne jamais écrire apiKey en clair dans le fichier.
 */
export function ecrireAirTable(dataDir: string, updates: Partial<AirTable>): void {
  const p = lireParametres(dataDir) ?? getDefaultParametres();
  const existing = p.airtable ?? {};
  let apiKeyChiffre = existing.apiKeyChiffre;
  if (updates.apiKey !== undefined && updates.apiKey !== null && String(updates.apiKey).trim() !== '') {
    apiKeyChiffre = chiffrerMotDePasse(String(updates.apiKey).trim());
  } else if (existing.apiKey && !apiKeyChiffre) {
    apiKeyChiffre = chiffrerMotDePasse(String(existing.apiKey).trim());
  }
  p.airtable = {
    apiKeyChiffre: apiKeyChiffre ?? '',
    base: updates.base ?? existing.base,
    baseTest: updates.baseTest ?? existing.baseTest,
    sources: updates.sources ?? existing.sources,
    offres: updates.offres ?? existing.offres,
  };
  ecrireParametres(dataDir, p);
}
