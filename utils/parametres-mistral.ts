/**
 * Lecture / écriture de la section Mistral dans data/parametres.json (US-8.1).
 * API Key stockée chiffrée (apiKeyChiffre), jamais en clair dans le fichier.
 */
import type { Mistral, MistralLu } from '../types/parametres.js';
import {
  lireParametres,
  ecrireParametres,
  getDefaultParametres,
  chiffrerMotDePasse,
  dechiffrerMotDePasse,
} from './parametres-io.js';

/**
 * Retourne la section mistral avec apiKey déchiffrée (pour usage serveur). Ne pas exposer apiKey au client.
 * hasApiKey permet à l'app de savoir si une clé est configurée sans en exposer la valeur.
 */
export function lireMistral(dataDir: string): MistralLu | null {
  const p = lireParametres(dataDir);
  const raw = p?.mistral;
  if (!raw) return null;
  const apiKeyChiffre = raw.apiKeyChiffre;
  let apiKey = '';
  if (apiKeyChiffre) {
    apiKey = dechiffrerMotDePasse(apiKeyChiffre);
  }
  const hasApiKey = Boolean(apiKeyChiffre);
  return {
    ...raw,
    apiKey: apiKey || undefined,
    hasApiKey,
  };
}

/**
 * Met à jour la section mistral (fusion partielle). Si updates.apiKey est fourni, il est chiffré avant stockage.
 * Ne jamais écrire apiKey en clair dans le fichier.
 */
export function ecrireMistral(dataDir: string, updates: Partial<Mistral>): void {
  const p = lireParametres(dataDir) ?? getDefaultParametres();
  const existing = p.mistral ?? {};
  let apiKeyChiffre = existing.apiKeyChiffre;
  if (updates.apiKey !== undefined && updates.apiKey !== null && String(updates.apiKey).trim() !== '') {
    apiKeyChiffre = chiffrerMotDePasse(String(updates.apiKey).trim());
  }
  p.mistral = {
    apiKeyChiffre: apiKeyChiffre ?? '',
  };
  ecrireParametres(dataDir, p);
}
