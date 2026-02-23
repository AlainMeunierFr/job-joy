import { createSourcePluginsRegistry } from './source-plugins.js';

describe('source plugins registry', () => {
  it('retourne le plugin email HelloWork pour plugin=HelloWork', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('HelloWork');
    expect(plugin).toBeDefined();
    expect(plugin?.plugin).toBe('HelloWork');
  });

  it('retourne le plugin email LinkedIn pour plugin=Linkedin', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('Linkedin');
    expect(plugin).toBeDefined();
    expect(plugin?.plugin).toBe('Linkedin');
  });

  it('retourne undefined pour plugin email Inconnu', () => {
    const registry = createSourcePluginsRegistry();
    expect(registry.getEmailPlugin('Inconnu')).toBeUndefined();
  });

  it('retourne le plugin email WTTJ pour plugin=Welcome to the Jungle', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('Welcome to the Jungle');
    expect(plugin).toBeDefined();
    expect(plugin?.plugin).toBe('Welcome to the Jungle');
  });

  it('retourne le plugin email JTMS pour plugin=Job That Make Sense', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('Job That Make Sense');
    expect(plugin).toBeDefined();
    expect(plugin?.plugin).toBe('Job That Make Sense');
  });

  it('retourne le plugin email Cadre Emploi pour plugin=Cadre Emploi', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getEmailPlugin('Cadre Emploi');
    expect(plugin).toBeDefined();
    expect(plugin?.plugin).toBe('Cadre Emploi');
  });

  it('résout le plugin fetch LinkedIn via URL', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl('https://www.linkedin.com/jobs/view/123/');
    expect(plugin?.plugin).toBe('Linkedin');
  });

  it('résout le plugin fetch LinkedIn par plugin (casse normalisée)', () => {
    const registry = createSourcePluginsRegistry();
    expect(registry.getOfferFetchPlugin('Linkedin')?.stage2Implemented).toBe(true);
    expect(registry.getOfferFetchPlugin('LinkedIn')?.stage2Implemented).toBe(true);
    expect(registry.getOfferFetchPlugin('LINKEDIN')?.stage2Implemented).toBe(true);
  });

  it('résout le plugin fetch HelloWork via URL (étape 2 implémentée)', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl('https://www.hellowork.com/fr-fr/emplois/123.html');
    expect(plugin?.plugin).toBe('HelloWork');
    expect(plugin?.stage2Implemented).toBe(true);
  });

  it('résout le plugin fetch WTTJ via URL (étape 2 implémentée)', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl(
      'https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris'
    );
    expect(plugin?.plugin).toBe('Welcome to the Jungle');
    expect(plugin?.stage2Implemented).toBe(true);
  });

  it('résout le plugin fetch JTMS via URL', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl(
      'https://jobs.makesense.org/fr/jobs/FaUYM2eD6MXcpSHqCtUS'
    );
    expect(plugin?.plugin).toBe('Job That Make Sense');
    expect(plugin?.stage2Implemented).toBe(true);
  });

  it('résout le plugin fetch Cadre Emploi via URL', () => {
    const registry = createSourcePluginsRegistry();
    const plugin = registry.getOfferFetchPluginByUrl(
      'https://www.cadremploi.fr/emploi/detail_offre?offreId=123456'
    );
    expect(plugin?.plugin).toBe('Cadre Emploi');
    expect(plugin?.stage2Implemented).toBe(true);
  });
});
