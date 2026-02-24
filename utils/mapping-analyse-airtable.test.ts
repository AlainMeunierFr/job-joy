/**
 * Tests unitaires pour jsonToChampsOffreAirtable (US-3.2).
 */
import { jsonToChampsOffreAirtable, MAX_LONGUEUR_JUSTIFICATION_AIRTABLE } from './mapping-analyse-airtable.js';

describe('jsonToChampsOffreAirtable (US-3.2)', () => {
  it('copie Réhibitoire1..4 (string = justification) vers CritèreRéhibitoire1..4 texte Airtable (US-2.1)', () => {
    const json: Record<string, unknown> = {
      Poste: 'Dev',
      Entreprise: 'Acme',
      Ville: 'Paris',
      Département: '75',
      Date_offre: '2025-01-01',
      Salaire: '45k',
      Résumé_IA: 'Résumé.',
      Réhibitoire1: 'Télétravail non mentionné.',
      Réhibitoire2: 'Salaire non indiqué.',
      ScoreLocalisation: 10,
      ScoreSalaire: 10,
      ScoreCulture: 10,
      ScoreQualitéOffre: 10,
    };
    const champs = jsonToChampsOffreAirtable(json, 'Résumé.');
    expect(champs.CritèreRéhibitoire1).toBe('Télétravail non mentionné.');
    expect(champs.CritèreRéhibitoire2).toBe('Salaire non indiqué.');
    expect(champs.CritèreRéhibitoire3).toBe('');
  });

  it('tronque une justification à 500 caractères si plus longue', () => {
    const long = 'x'.repeat(600);
    const json: Record<string, unknown> = {
      Poste: '',
      Entreprise: '',
      Ville: '',
      Département: '',
      Date_offre: '',
      Salaire: '',
      Résumé_IA: '',
      Réhibitoire1: long,
      ScoreLocalisation: 10,
      ScoreSalaire: 10,
      ScoreCulture: 10,
      ScoreQualitéOffre: 10,
    };
    const champs = jsonToChampsOffreAirtable(json, 'Résumé.');
    expect(champs.CritèreRéhibitoire1).toHaveLength(MAX_LONGUEUR_JUSTIFICATION_AIRTABLE);
    expect(champs.CritèreRéhibitoire1).toBe('x'.repeat(MAX_LONGUEUR_JUSTIFICATION_AIRTABLE));
  });

  it('ignore Réhibitoire non-string (traité comme chaîne vide)', () => {
    const json: Record<string, unknown> = {
      Poste: '',
      Entreprise: '',
      Ville: '',
      Département: '',
      Date_offre: '',
      Salaire: '',
      Résumé_IA: '',
      Réhibitoire1: 123 as unknown as string,
      ScoreLocalisation: 10,
      ScoreSalaire: 10,
      ScoreCulture: 10,
      ScoreQualitéOffre: 10,
    };
    const champs = jsonToChampsOffreAirtable(json, 'Résumé.');
    expect(champs.CritèreRéhibitoire1).toBe('');
  });
});
