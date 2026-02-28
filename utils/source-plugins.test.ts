import { createSourceRegistry } from './source-plugins.js';

describe('source registry', () => {
  it('retourne la source email HelloWork pour source=HelloWork', () => {
    const registry = createSourceRegistry();
    const source = registry.getEmailSource('HelloWork');
    expect(source).toBeDefined();
    expect(source?.source).toBe('HelloWork');
  });

  it('retourne la source email LinkedIn pour source=Linkedin', () => {
    const registry = createSourceRegistry();
    const source = registry.getEmailSource('Linkedin');
    expect(source).toBeDefined();
    expect(source?.source).toBe('Linkedin');
  });

  it('retourne undefined pour source email Inconnu', () => {
    const registry = createSourceRegistry();
    expect(registry.getEmailSource('Inconnu')).toBeUndefined();
  });

  it('retourne la source liste html APEC pour source=APEC', () => {
    const registry = createSourceRegistry();
    const source = registry.getListeHtmlSource('APEC');
    expect(source).toBeDefined();
    expect(source?.source).toBe('APEC');
  });

  it('retourne undefined pour source liste html Inconnu et Cadre Emploi', () => {
    const registry = createSourceRegistry();
    expect(registry.getListeHtmlSource('Inconnu')).toBeUndefined();
    expect(registry.getListeHtmlSource('Cadre Emploi')).toBeUndefined();
  });

  it('retourne la source email WTTJ pour source=Welcome to the Jungle', () => {
    const registry = createSourceRegistry();
    const source = registry.getEmailSource('Welcome to the Jungle');
    expect(source).toBeDefined();
    expect(source?.source).toBe('Welcome to the Jungle');
  });

  it('retourne la source email JTMS pour source=Job That Make Sense', () => {
    const registry = createSourceRegistry();
    const source = registry.getEmailSource('Job That Make Sense');
    expect(source).toBeDefined();
    expect(source?.source).toBe('Job That Make Sense');
  });

  it('retourne la source email Cadre Emploi pour source=Cadre Emploi', () => {
    const registry = createSourceRegistry();
    const source = registry.getEmailSource('Cadre Emploi');
    expect(source).toBeDefined();
    expect(source?.source).toBe('Cadre Emploi');
  });

  it('résout la source fetch LinkedIn via URL', () => {
    const registry = createSourceRegistry();
    const source = registry.getOfferFetchSourceByUrl('https://www.linkedin.com/jobs/view/123/');
    expect(source?.source).toBe('Linkedin');
  });

  it('résout la source fetch LinkedIn par source (casse normalisée)', () => {
    const registry = createSourceRegistry();
    expect(registry.getOfferFetchSource('Linkedin')?.stage2Implemented).toBe(true);
    expect(registry.getOfferFetchSource('LinkedIn')?.stage2Implemented).toBe(true);
    expect(registry.getOfferFetchSource('LINKEDIN')?.stage2Implemented).toBe(true);
  });

  it('résout la source fetch HelloWork via URL (étape 2 implémentée)', () => {
    const registry = createSourceRegistry();
    const source = registry.getOfferFetchSourceByUrl('https://www.hellowork.com/fr-fr/emplois/123.html');
    expect(source?.source).toBe('HelloWork');
    expect(source?.stage2Implemented).toBe(true);
  });

  it('résout la source fetch WTTJ via URL (étape 2 implémentée)', () => {
    const registry = createSourceRegistry();
    const source = registry.getOfferFetchSourceByUrl(
      'https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris'
    );
    expect(source?.source).toBe('Welcome to the Jungle');
    expect(source?.stage2Implemented).toBe(true);
  });

  it('résout la source fetch JTMS via URL', () => {
    const registry = createSourceRegistry();
    const source = registry.getOfferFetchSourceByUrl(
      'https://jobs.makesense.org/fr/jobs/FaUYM2eD6MXcpSHqCtUS'
    );
    expect(source?.source).toBe('Job That Make Sense');
    expect(source?.stage2Implemented).toBe(true);
  });

  it('résout la source fetch Cadre Emploi via URL', () => {
    const registry = createSourceRegistry();
    const source = registry.getOfferFetchSourceByUrl(
      'https://www.cadremploi.fr/emploi/detail_offre?offreId=123456'
    );
    expect(source?.source).toBe('Cadre Emploi');
    expect(source?.stage2Implemented).toBe(true);
  });
});
