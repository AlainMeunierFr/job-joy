import type { OffreExtraite, ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { SourceNom } from './gouvernance-sources-emails.js';
import {
  extractCadreemploiOffresFromHtml,
  extractHelloworkOffresFromHtml,
  extractJobThatMakeSenseOffresFromHtml,
  extractLinkedinOffresFromHtml,
  extractWelcomeToTheJungleOffresFromHtml,
} from './extraction-offres-email.js';
import { createApecOfferFetchPlugin } from './apec-offer-fetch-plugin.js';
import { createCadreEmploiOfferFetchPlugin } from './cadreemploi-offer-fetch-plugin.js';
import { createHelloworkOfferFetchPlugin } from './hellowork-offer-fetch-plugin.js';
import { createJobThatMakeSenseOfferFetchPlugin } from './job-that-make-sense-offer-fetch-plugin.js';
import { createLinkedinOfferFetchPlugin } from './linkedin-offer-fetch-plugin.js';
import { createWelcomeToTheJungleOfferFetchPlugin } from './welcome-to-the-jungle-offer-fetch-plugin.js';

export interface SourceEmailAdapter {
  source: SourceNom;
  extraireOffresDepuisEmail(html: string): OffreExtraite[];
}

/** Source qui implémente la création (phase 1) depuis le dossier "liste html" (fichiers HTML sauvegardés). */
export interface SourceListeHtmlAdapter {
  source: SourceNom;
}

export interface SourceOfferFetchAdapter {
  source: SourceNom;
  stage2Implemented: boolean;
  recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre>;
}

/** @deprecated Utiliser SourceOfferFetchAdapter (alias conservé pour les fichiers *-offer-fetch-plugin.ts). */
export type SourceOfferFetchPlugin = SourceOfferFetchAdapter;

/**
 * Registry des sources avec 3 interfaces explicites :
 * - Création email (phase 1) : extraction d'offres depuis le HTML des emails.
 * - Création liste html (phase 1) : extraction d'offres depuis les fichiers HTML du dossier "liste html/<slug>".
 * - Enrichissement (phase 2) : récupération du contenu de la page d'offre depuis son URL.
 */
export interface SourceRegistry {
  /** Interface "création email" : extrait les offres depuis le HTML d'un email. */
  getEmailSource(sourceNom: SourceNom): SourceEmailAdapter | undefined;
  /** Interface "création liste html" : extrait les offres depuis le dossier liste html. */
  getListeHtmlSource(sourceNom: SourceNom): SourceListeHtmlAdapter | undefined;
  /** Interface "enrichissement" : récupère le contenu (poste, entreprise, etc.) depuis l'URL de l'offre. */
  getOfferFetchSource(sourceNom: SourceNom | string): SourceOfferFetchAdapter | undefined;
  getOfferFetchSourceByUrl(url: string): SourceOfferFetchAdapter | undefined;

  /** Phase 1 implémentée pour une source de type email ? */
  hasCreationEmail(sourceNom: SourceNom): boolean;
  /** Phase 1 implémentée pour une source de type liste html ? */
  hasCreationListeHtml(sourceNom: SourceNom): boolean;
  /** Phase 2 (enrichissement) implémentée pour cette source ? */
  hasEnrichissement(sourceNom: SourceNom): boolean;
}

const linkedinEmailSource: SourceEmailAdapter = {
  source: 'Linkedin',
  extraireOffresDepuisEmail: extractLinkedinOffresFromHtml,
};

const helloworkEmailSource: SourceEmailAdapter = {
  source: 'HelloWork',
  extraireOffresDepuisEmail: extractHelloworkOffresFromHtml,
};

const wttjEmailSource: SourceEmailAdapter = {
  source: 'Welcome to the Jungle',
  extraireOffresDepuisEmail: extractWelcomeToTheJungleOffresFromHtml,
};

const jtmsEmailSource: SourceEmailAdapter = {
  source: 'Job That Make Sense',
  extraireOffresDepuisEmail: extractJobThatMakeSenseOffresFromHtml,
};

const cadreemploiEmailSource: SourceEmailAdapter = {
  source: 'Cadre Emploi',
  extraireOffresDepuisEmail: extractCadreemploiOffresFromHtml,
};

/** Source liste html : création (phase 1) depuis dossier "liste html/<slug>". US-6.1 */
const apecListeHtmlSource: SourceListeHtmlAdapter = { source: 'APEC' };

/** Entrée pour la liste des sources affichée dans Avant propos (tableau email / source / création / enrichissement). */
export interface LigneListeSource {
  email: string;
  source: string;
  creation: boolean;
  enrichissement: boolean;
}

/** Retourne la liste des sources avec création et/ou enrichissement pour injection dans AvantPropos.html. */
export function getListeSourcesPourAvantPropos(): LigneListeSource[] {
  const registry = createSourceRegistry();
  const sourcesAvecEmail: { source: SourceNom; email: string }[] = [
    { source: 'Linkedin', email: 'notifications@linkedin.com' },
    { source: 'HelloWork', email: 'notification@emails.hellowork.com' },
    { source: 'Welcome to the Jungle', email: 'alerts@welcometothejungle.com' },
    { source: 'Job That Make Sense', email: 'jobs@makesense.org' },
    { source: 'Cadre Emploi', email: 'offres@alertes.cadremploi.fr' },
  ];
  return sourcesAvecEmail.map(({ source: sourceNom, email }) => ({
    email,
    source: sourceNom,
    creation: !!registry.getEmailSource(sourceNom),
    enrichissement: !!registry.getOfferFetchSource(sourceNom)?.stage2Implemented,
  }));
}

export function createSourceRegistry(): SourceRegistry {
  const offerFetchSources: SourceOfferFetchAdapter[] = [
    createLinkedinOfferFetchPlugin(),
    createHelloworkOfferFetchPlugin(),
    createWelcomeToTheJungleOfferFetchPlugin(),
    createJobThatMakeSenseOfferFetchPlugin(),
    createCadreEmploiOfferFetchPlugin(),
    createApecOfferFetchPlugin(),
  ];

  return {
    getEmailSource(sourceNom) {
      const p = typeof sourceNom === 'string' ? sourceNom.trim() : '';
      if (p === 'HelloWork') return helloworkEmailSource;
      if (p === 'Linkedin' || p.toLowerCase() === 'linkedin') return linkedinEmailSource;
      if (p === 'Welcome to the Jungle') return wttjEmailSource;
      if (p === 'Job That Make Sense') return jtmsEmailSource;
      if (p === 'Cadre Emploi') return cadreemploiEmailSource;
      return undefined;
    },
    getListeHtmlSource(sourceNom) {
      const p = typeof sourceNom === 'string' ? sourceNom.trim() : '';
      if (p === 'APEC') return apecListeHtmlSource;
      return undefined;
    },
    getOfferFetchSource(sourceNom) {
      const p = typeof sourceNom === 'string' ? sourceNom.trim() : '';
      const sourceNorm =
        p.toLowerCase() === 'linkedin' ? 'Linkedin' : (p as SourceNom);
      return offerFetchSources.find((x) => x.source === sourceNorm);
    },
    getOfferFetchSourceByUrl(url) {
      const u = (url ?? '').toLowerCase();
      if (u.includes('linkedin.com')) return offerFetchSources.find((s) => s.source === 'Linkedin');
      if (u.includes('hellowork.com')) return offerFetchSources.find((s) => s.source === 'HelloWork');
      if (u.includes('welcometothejungle.com')) return offerFetchSources.find((s) => s.source === 'Welcome to the Jungle');
      if (u.includes('jobs.makesense.org') || u.includes('customeriomail.com/e/c/')) {
        return offerFetchSources.find((s) => s.source === 'Job That Make Sense');
      }
      if (u.includes('cadremploi.fr')) return offerFetchSources.find((s) => s.source === 'Cadre Emploi');
      if (u.includes('apec.fr')) return offerFetchSources.find((s) => s.source === 'APEC');
      return undefined;
    },
    hasCreationEmail(sourceNom) {
      return !!this.getEmailSource(sourceNom);
    },
    hasCreationListeHtml(sourceNom) {
      return !!this.getListeHtmlSource(sourceNom);
    },
    hasEnrichissement(sourceNom) {
      return !!this.getOfferFetchSource(sourceNom)?.stage2Implemented;
    },
  };
}
