/**
 * Tests TDD pour le texte du consentement identification (US-3.15).
 * Source unique : Alain Meunier, job-joy, support, retours beta, GNU GPL.
 */
import {
  getTexteConsentementIdentification,
  getTexteConsentementIdentificationAvecVersion,
} from './texte-consentement-identification.js';

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

describe('getTexteConsentementIdentificationAvecVersion', () => {
  it('sans options retourne le texte de base', () => {
    const texte = getTexteConsentementIdentificationAvecVersion();
    expect(texte).toBe(getTexteConsentementIdentification());
  });

  it('avec version et buildTime ajoute en fin version et date formatée', () => {
    const texte = getTexteConsentementIdentificationAvecVersion({
      version: '1.0.2',
      buildTime: '2025-02-21T14:30:00.000Z',
    });
    expect(texte).toContain(getTexteConsentementIdentification());
    expect(texte).toContain('---');
    expect(texte).toContain('Version 1.0.2');
    expect(texte).toContain('Publiée le :');
    expect(texte).toMatch(/février|21.*2025|14\s*:\s*30/);
  });
});
