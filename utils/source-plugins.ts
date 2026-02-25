import type { OffreExtraite, ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { PluginSource } from './gouvernance-sources-emails.js';
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
  plugin: PluginSource;
  extraireOffresDepuisEmail(html: string): OffreExtraite[];
}

export interface SourceOfferFetchPlugin {
  plugin: PluginSource;
  stage2Implemented: boolean;
  recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre>;
}

export interface SourcePluginsRegistry {
  getEmailPlugin(plugin: PluginSource): SourceEmailPlugin | undefined;
  getOfferFetchPlugin(plugin: PluginSource | string): SourceOfferFetchPlugin | undefined;
  getOfferFetchPluginByUrl(url: string): SourceOfferFetchPlugin | undefined;
}

const linkedinEmailPlugin: SourceEmailPlugin = {
  plugin: 'Linkedin',
  extraireOffresDepuisEmail: extractLinkedinOffresFromHtml,
};

const helloworkEmailPlugin: SourceEmailPlugin = {
  plugin: 'HelloWork',
  extraireOffresDepuisEmail: extractHelloworkOffresFromHtml,
};

const wttjEmailPlugin: SourceEmailPlugin = {
  plugin: 'Welcome to the Jungle',
  extraireOffresDepuisEmail: extractWelcomeToTheJungleOffresFromHtml,
};

const jtmsEmailPlugin: SourceEmailPlugin = {
  plugin: 'Job That Make Sense',
  extraireOffresDepuisEmail: extractJobThatMakeSenseOffresFromHtml,
};

const cadreemploiEmailPlugin: SourceEmailPlugin = {
  plugin: 'Cadre Emploi',
  extraireOffresDepuisEmail: extractCadreemploiOffresFromHtml,
};

/** Entrée pour la liste des plugins affichée dans Avant propos (tableau email / plugin / création / enrichissement). */
export interface LigneListePlugin {
  email: string;
  plugin: string;
  creation: boolean;
  enrichissement: boolean;
}

/** Retourne la liste des plugins avec création et/ou enrichissement pour injection dans AvantPropos.html. */
export function getListePluginsPourAvantPropos(): LigneListePlugin[] {
  const registry = createSourcePluginsRegistry();
  const pluginsAvecSource: { plugin: PluginSource; email: string }[] = [
    { plugin: 'Linkedin', email: 'notifications@linkedin.com' },
    { plugin: 'HelloWork', email: 'notification@emails.hellowork.com' },
    { plugin: 'Welcome to the Jungle', email: 'alerts@welcometothejungle.com' },
    { plugin: 'Job That Make Sense', email: 'jobs@makesense.org' },
    { plugin: 'Cadre Emploi', email: 'offres@alertes.cadremploi.fr' },
  ];
  return pluginsAvecSource.map(({ plugin, email }) => ({
    email,
    plugin,
    creation: !!registry.getEmailPlugin(plugin),
    enrichissement: !!registry.getOfferFetchPlugin(plugin)?.stage2Implemented,
  }));
}

export function createSourcePluginsRegistry(): SourcePluginsRegistry {
  const offerFetchPlugins: SourceOfferFetchPlugin[] = [
    createLinkedinOfferFetchPlugin(),
    createHelloworkOfferFetchPlugin(),
    createWelcomeToTheJungleOfferFetchPlugin(),
    createJobThatMakeSenseOfferFetchPlugin(),
    createCadreEmploiOfferFetchPlugin(),
  ];

  return {
    getEmailPlugin(plugin) {
      const p = typeof plugin === 'string' ? plugin.trim() : '';
      if (p === 'HelloWork') return helloworkEmailPlugin;
      if (p === 'Linkedin' || p.toLowerCase() === 'linkedin') return linkedinEmailPlugin;
      if (p === 'Welcome to the Jungle') return wttjEmailPlugin;
      if (p === 'Job That Make Sense') return jtmsEmailPlugin;
      if (p === 'Cadre Emploi') return cadreemploiEmailPlugin;
      return undefined;
    },
    getOfferFetchPlugin(plugin) {
      const pluginNorm =
        typeof plugin === 'string' && plugin.toLowerCase() === 'linkedin' ? 'Linkedin' : plugin;
      return offerFetchPlugins.find((p) => p.plugin === pluginNorm);
    },
    getOfferFetchPluginByUrl(url) {
      const u = (url ?? '').toLowerCase();
      if (u.includes('linkedin.com')) {
        return offerFetchPlugins.find((p) => p.plugin === 'Linkedin');
      }
      if (u.includes('hellowork.com')) {
        return offerFetchPlugins.find((p) => p.plugin === 'HelloWork');
      }
      if (u.includes('welcometothejungle.com')) {
        return offerFetchPlugins.find((p) => p.plugin === 'Welcome to the Jungle');
      }
      if (u.includes('jobs.makesense.org') || u.includes('customeriomail.com/e/c/')) {
        return offerFetchPlugins.find((p) => p.plugin === 'Job That Make Sense');
      }
      if (u.includes('cadremploi.fr')) {
        return offerFetchPlugins.find((p) => p.plugin === 'Cadre Emploi');
      }
      return undefined;
    },
  };
}
