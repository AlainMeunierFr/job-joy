/**
 * Récupération du contenu d'une page d'offre depuis son URL (US-1.4 CA3).
 * Tente un fetch ; LinkedIn impose souvent authentification / anti-crawler, on retourne alors ok: false.
 */
import type { FetcherContenuOffre } from './enrichissement-offres.js';
import { createSourceRegistry } from './source-plugins.js';

/**
 * Fetcher réel : GET l'URL et tente d'extraire poste, entreprise, etc. du HTML.
 * Pour LinkedIn, la page exige souvent une connexion → on retourne ok: false avec message explicite.
 */
export function createFetcherContenuOffre(): FetcherContenuOffre {
  const registry = createSourceRegistry();
  return {
    async recupererContenuOffre(url: string) {
      const u = (url ?? '').trim();
      if (!u) {
        return { ok: false as const, message: 'URL vide.' };
      }
      const sourceFetcher = registry.getOfferFetchSourceByUrl(u);
      if (!sourceFetcher) {
        return { ok: false as const, message: `Aucune source d'ouverture d'offre disponible pour l'URL: ${u}` };
      }
      return sourceFetcher.recupererContenuOffre(url);
    },
  };
}
