/**
 * Tests US-1.7 : statuts d'offres Airtable (ordre exact).
 */
import { STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';

describe('statuts-offres-airtable (US-1.7)', () => {
  it('expose la liste des statuts d\'offres dans l\'ordre exact de l\'énum Airtable', () => {
    const attendu = [
      'A compléter',
      'À analyser',
      'À traiter',
      'Candidaté',
      'Refusé',
      'Traité',
      'Ignoré',
      'Expiré',
    ];
    expect(STATUTS_OFFRES_AIRTABLE).toEqual(attendu);
  });
});
