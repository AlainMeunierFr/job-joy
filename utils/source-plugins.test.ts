import { createSourcePluginsRegistry } from './source-plugins.js';

describe('source plugins registry', () => {
  it('retourne le plugin email HelloWork pour algo=HelloWork', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('HelloWork');
    expect(plugin).toBeDefined();
    expect(plugin?.algo).toBe('HelloWork');
  });

  it('retourne le plugin email LinkedIn pour algo=Linkedin', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('Linkedin');
    expect(plugin).toBeDefined();
    expect(plugin?.algo).toBe('Linkedin');
  });

  it('retourne undefined pour plugin email Inconnu', () => {
    const registry = createSourcePluginsRegistry();
    expect(registry.getEmailPlugin('Inconnu')).toBeUndefined();
  });

  it('retourne le plugin email WTTJ pour algo=Welcome to the Jungle', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('Welcome to the Jungle');
    expect(plugin).toBeDefined();
    expect(plugin?.algo).toBe('Welcome to the Jungle');
  });

  it('retourne le plugin email JTMS pour algo=Job That Make Sense', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('Job That Make Sense');
    expect(plugin).toBeDefined();
    expect(plugin?.algo).toBe('Job That Make Sense');
  });

  it('retourne le plugin email cadreemploi pour algo=cadreemploi', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('cadreemploi');
    expect(plugin).toBeDefined();
    expect(plugin?.algo).toBe('cadreemploi');
  });

  it('résout le plugin fetch LinkedIn via URL', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl('https://www.linkedin.com/jobs/view/123/');
    expect(plugin?.algo).toBe('Linkedin');
  });

  it('résout le plugin fetch LinkedIn par algo (casse normalisée)', () => {
    const registry = createSourcePluginsRegistry();
    expect(registry.getOfferFetchPluginByAlgo('Linkedin')?.stage2Implemented).toBe(true);
    expect(registry.getOfferFetchPluginByAlgo('LinkedIn')?.stage2Implemented).toBe(true);
    expect(registry.getOfferFetchPluginByAlgo('LINKEDIN')?.stage2Implemented).toBe(true);
  });

  it('résout le plugin fetch HelloWork via URL (étape 2 implémentée)', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl('https://www.hellowork.com/fr-fr/emplois/123.html');
    expect(plugin?.algo).toBe('HelloWork');
    expect(plugin?.stage2Implemented).toBe(true);
  });

  it('résout le plugin fetch WTTJ via URL (étape 2 implémentée)', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl(
      'https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris'
    );
    expect(plugin?.algo).toBe('Welcome to the Jungle');
    expect(plugin?.stage2Implemented).toBe(true);
  });

  it('résout le plugin fetch JTMS via URL', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl(
      'https://jobs.makesense.org/fr/jobs/FaUYM2eD6MXcpSHqCtUS'
    );
    expect(plugin?.algo).toBe('Job That Make Sense');
    expect(plugin?.stage2Implemented).toBe(true);
  });

  it('résout le plugin fetch cadreemploi via URL', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl(
      'https://www.cadremploi.fr/emploi/detail_offre?offreId=123456'
    );
    expect(plugin?.algo).toBe('cadreemploi');
    expect(plugin?.stage2Implemented).toBe(true);
  });
});
