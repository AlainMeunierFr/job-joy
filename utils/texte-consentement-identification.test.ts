/**
 * Tests TDD pour le texte du consentement identification (US-3.15).
 * Source unique : Alain Meunier, job-joy, support, retours beta, GNU GPL.
 */
import { getTexteConsentementIdentification } from './texte-consentement-identification.js';

describe('getTexteConsentementIdentification', () => {
  it('retourne un texte non vide', () => {
    const texte = getTexteConsentementIdentification();
    expect(typeof texte).toBe('string');
    expect(texte.length).toBeGreaterThan(0);
  });

  it('contient Alain Meunier, job-joy, support et retours beta', () => {
    const texte = getTexteConsentementIdentification();
    expect(texte).toContain('Alain Meunier');
    expect(texte).toContain('job-joy');
    expect(texte).toContain('support');
    expect(texte).toContain('retours beta');
  });

  it('mentionne la licence GNU GPL', () => {
    const texte = getTexteConsentementIdentification();
    expect(texte).toContain('GNU GPL');
  });
});
