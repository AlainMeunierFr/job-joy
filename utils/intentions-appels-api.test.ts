/**
 * Tests pour le dictionnaire des intentions (US-3.4).
 */
import {
  getDictionnaireIntentions,
  CODES_INTENTION_UTILISES,
  INTENTION_TABLEAU_SYNTHESE,
  INTENTION_OFFRE_TEST,
  INTENTION_TEST_MISTRAL,
  INTENTION_ANALYSE_IA_LOT,
  INTENTION_CONFIG_AIRTABLE,
} from './intentions-appels-api.js';

describe('intentions-appels-api (US-3.4)', () => {
  describe('dictionnaire', () => {
    it('contient au moins une entrée par code utilisé dans le code', () => {
      const dict = getDictionnaireIntentions();
      const codes = new Set(dict.map((e) => e.code));
      for (const code of CODES_INTENTION_UTILISES) {
        expect(codes.has(code)).toBe(true);
      }
    });

    it('chaque entrée a intention, methode et api (Airtable ou Mistral)', () => {
      const dict = getDictionnaireIntentions();
      expect(dict.length).toBeGreaterThanOrEqual(1);
      for (const e of dict) {
        expect(typeof e.intention).toBe('string');
        expect(e.intention.length).toBeGreaterThan(0);
        expect(typeof e.methode).toBe('string');
        expect(e.methode.length).toBeGreaterThan(0);
        expect(['Airtable', 'Mistral']).toContain(e.api);
      }
    });

    it('contient les intentions tableau synthèse, offre test, test Mistral, analyse IA lot, config Airtable', () => {
      const dict = getDictionnaireIntentions();
      const codes = dict.map((e) => e.code);
      expect(codes).toContain(INTENTION_TABLEAU_SYNTHESE);
      expect(codes).toContain(INTENTION_OFFRE_TEST);
      expect(codes).toContain(INTENTION_TEST_MISTRAL);
      expect(codes).toContain(INTENTION_ANALYSE_IA_LOT);
      expect(codes).toContain(INTENTION_CONFIG_AIRTABLE);
    });
  });
});
