import type { ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { SourceOfferFetchPlugin } from './source-plugins.js';
import { fetchLinkedinJobPage } from './linkedin-page-fetcher.js';

/**
 * Plugin LinkedIn : étape 2 "Lire offre" implémentée via Playwright (mode invité).
 * Récupère le texte "À propos de l'offre" et "À propos de l'entreprise" depuis l'URL.
 */
export function createLinkedinOfferFetchPlugin(): SourceOfferFetchPlugin {
  return {
    plugin: 'Linkedin',
    stage2Implemented: true,
    async recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre> {
      const u = (url ?? '').trim();
      if (!u) {
        return { ok: false, message: 'URL vide.' };
      }

      const result = await fetchLinkedinJobPage(u);
      if ('error' in result) {
        return { ok: false, message: result.error };
      }

      const { offerText, companyText } = result;
      const parts: string[] = [];
      if (offerText) {
        parts.push('### À propos de l’offre d’emploi\n\n' + offerText);
      }
      if (companyText) {
        parts.push('### À propos de l’entreprise\n\n' + companyText);
      }
      const texteOffre = parts.join('\n\n');
      if (!texteOffre.trim()) {
        return {
          ok: false,
          message: 'Aucun texte d’annonce extrait depuis cette URL.',
        };
      }

      return {
        ok: true,
        champs: { texteOffre },
      };
    },
  };
}
