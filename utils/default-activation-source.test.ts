/**
 * Tests US-3.1 : valeurs par défaut des 3 checkboxes à la création d'une source.
 */
import { createSourceRegistry } from './source-plugins.js';
import { getDefaultActivationForSource } from './default-activation-source.js';

describe('getDefaultActivationForSource', () => {
  const registry = createSourceRegistry();

  it('Linkedin : activerCreation true (parseur email), activerEnrichissement true (stage2), activerAnalyseIA true', () => {
    const r = getDefaultActivationForSource('Linkedin', registry);
    expect(r.activerCreation).toBe(true);
    expect(r.activerEnrichissement).toBe(true);
    expect(r.activerAnalyseIA).toBe(true);
  });

  it('HelloWork : les 3 true', () => {
    const r = getDefaultActivationForSource('HelloWork', registry);
    expect(r.activerCreation).toBe(true);
    expect(r.activerEnrichissement).toBe(true);
    expect(r.activerAnalyseIA).toBe(true);
  });

  it('Inconnu : activerCreation false, activerEnrichissement false, activerAnalyseIA true', () => {
    const r = getDefaultActivationForSource('Inconnu', registry);
    expect(r.activerCreation).toBe(false);
    expect(r.activerEnrichissement).toBe(false);
    expect(r.activerAnalyseIA).toBe(true);
  });

  it('avec registry mock sans stage2 : activerEnrichissement false', () => {
    const mockRegistry = {
      getEmailSource: () => ({}),
      getOfferFetchSource: () => ({ stage2Implemented: false }),
    };
    const r = getDefaultActivationForSource('Linkedin', mockRegistry);
    expect(r.activerCreation).toBe(true);
    expect(r.activerEnrichissement).toBe(false);
    expect(r.activerAnalyseIA).toBe(true);
  });
});
