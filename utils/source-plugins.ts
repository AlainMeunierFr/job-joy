import type { OffreExtraite, ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { AlgoSource } from './gouvernance-sources-emails.js';
import {
  extractCadreemploiOffresFromHtml,
  extractHelloworkOffresFromHtml,
  extractJobThatMakeSenseOffresFromHtml,
  extractLinkedinOffresFromHtml,
  extractWelcomeToTheJungleOffresFromHtml,
} from './extraction-offres-email.js';
import { createCadreEmploiOfferFetchPlugin } from './cadreemploi-offer-fetch-plugin.js';
import { createHelloworkOfferFetchPlugin } from './hellowork-offer-fetch-plugin.js';
import { createJobThatMakeSenseOfferFetchPlugin } from './job-that-make-sense-offer-fetch-plugin.js';
import { createLinkedinOfferFetchPlugin } from './linkedin-offer-fetch-plugin.js';
import { createWelcomeToTheJungleOfferFetchPlugin } from './welcome-to-the-jungle-offer-fetch-plugin.js';

export interface SourceEmailPlugin {
  algo: AlgoSource;
  extraireOffresDepuisEmail(html: string): OffreExtraite[];
}

export interface SourceOfferFetchPlugin {
  algo: AlgoSource;
  stage2Implemented: boolean;
  recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre>;
}

export interface SourcePluginsRegistry {
  getEmailPlugin(algo: AlgoSource): SourceEmailPlugin | undefined;
  getOfferFetchPluginByAlgo(algo: AlgoSource | string): SourceOfferFetchPlugin | undefined;
  getOfferFetchPluginByUrl(url: string): SourceOfferFetchPlugin | undefined;
}

const linkedinEmailPlugin: SourceEmailPlugin = {
  algo: 'Linkedin',
  extraireOffresDepuisEmail: extractLinkedinOffresFromHtml,
};

const helloworkEmailPlugin: SourceEmailPlugin = {
  algo: 'HelloWork',
  extraireOffresDepuisEmail: extractHelloworkOffresFromHtml,
};

const wttjEmailPlugin: SourceEmailPlugin = {
  algo: 'Welcome to the Jungle',
  extraireOffresDepuisEmail: extractWelcomeToTheJungleOffresFromHtml,
};

const jtmsEmailPlugin: SourceEmailPlugin = {
  algo: 'Job That Make Sense',
  extraireOffresDepuisEmail: extractJobThatMakeSenseOffresFromHtml,
};

const cadreemploiEmailPlugin: SourceEmailPlugin = {
  algo: 'cadreemploi',
  extraireOffresDepuisEmail: extractCadreemploiOffresFromHtml,
};

export function createSourcePluginsRegistry(): SourcePluginsRegistry {
  const offerFetchPlugins: SourceOfferFetchPlugin[] = [
    createLinkedinOfferFetchPlugin(),
    createHelloworkOfferFetchPlugin(),
    createWelcomeToTheJungleOfferFetchPlugin(),
    createJobThatMakeSenseOfferFetchPlugin(),
    createCadreEmploiOfferFetchPlugin(),
  ];

  return {
    getEmailPlugin(algo) {
      const a = typeof algo === 'string' ? algo.trim() : '';
      if (a === 'HelloWork') return helloworkEmailPlugin;
      if (a === 'Linkedin' || a.toLowerCase() === 'linkedin') return linkedinEmailPlugin;
      if (a === 'Welcome to the Jungle') return wttjEmailPlugin;
      if (a === 'Job That Make Sense') return jtmsEmailPlugin;
      if (a === 'cadreemploi') return cadreemploiEmailPlugin;
      return undefined;
    },
    getOfferFetchPluginByAlgo(algo) {
      const algoNorm =
        typeof algo === 'string' && algo.toLowerCase() === 'linkedin' ? 'Linkedin' : algo;
      return offerFetchPlugins.find((p) => p.algo === algoNorm);
    },
    getOfferFetchPluginByUrl(url) {
      const u = (url ?? '').toLowerCase();
      if (u.includes('linkedin.com')) {
        return offerFetchPlugins.find((p) => p.algo === 'Linkedin');
      }
      if (u.includes('hellowork.com')) {
        return offerFetchPlugins.find((p) => p.algo === 'HelloWork');
      }
      if (u.includes('welcometothejungle.com')) {
        return offerFetchPlugins.find((p) => p.algo === 'Welcome to the Jungle');
      }
      if (u.includes('jobs.makesense.org') || u.includes('customeriomail.com/e/c/')) {
        return offerFetchPlugins.find((p) => p.algo === 'Job That Make Sense');
      }
      if (u.includes('cadremploi.fr')) {
        return offerFetchPlugins.find((p) => p.algo === 'cadreemploi');
      }
      return undefined;
    },
  };
}
