/**
 * Tests US-1.7 : tableau de synthèse des offres.
 */
import {
  construireTableauSynthese,
  produireTableauSynthese,
  type TableauSyntheseRepository,
} from './tableau-synthese-offres.js';

describe('tableau-synthese-offres (US-1.7)', () => {
  it('agrégation vide : aucune offre => aucune ligne retournée', () => {
    const sources = [
      { emailExpéditeur: 'jobs@linkedin.com', algo: 'Linkedin' as const, actif: true },
    ];
    const offres: Array<{ emailExpéditeur: string; statut: string }> = [];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toEqual([]);
  });

  it('1 offre / 1 source : ligne avec colonnes source + colonnes statuts complètes (0 sauf statut concerné)', () => {
    const sources = [
      { emailExpéditeur: 'jobs@linkedin.com', algo: 'Linkedin' as const, actif: true },
    ];
    const offres = [{ emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' }];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      emailExpéditeur: 'jobs@linkedin.com',
      algoEtape1: 'Linkedin',
      algoEtape2: 'Linkedin',
      actif: true,
    });
    expect(result[0].statuts).toEqual({
      'Annonce à récupérer': 0,
      'À traiter': 0,
      'Traité': 0,
      'Ignoré': 0,
      'À analyser': 1,
    });
  });

  it('plusieurs offres même source : incrément correct des compteurs par statut', () => {
    const sources = [
      { emailExpéditeur: 'jobs@linkedin.com', algo: 'Linkedin' as const, actif: true },
    ];
    const offres = [
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'Annonce à récupérer' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'Annonce à récupérer' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' },
    ];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(1);
    expect(result[0].statuts['Annonce à récupérer']).toBe(2);
    expect(result[0].statuts['À analyser']).toBe(1);
    expect(result[0].statuts['À traiter']).toBe(0);
  });

  it('plusieurs sources : une ligne par expéditeur avec matrice complète des statuts', () => {
    const sources = [
      { emailExpéditeur: 'jobs@linkedin.com', algo: 'Linkedin' as const, actif: true },
      { emailExpéditeur: 'notification@emails.hellowork.com', algo: 'HelloWork' as const, actif: true },
    ];
    const offres = [
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'Annonce à récupérer' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'Annonce à récupérer' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' },
      { emailExpéditeur: 'notification@emails.hellowork.com', statut: 'Annonce à récupérer' },
    ];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(2);

    const linkedin = result.find((r) => r.emailExpéditeur === 'jobs@linkedin.com');
    expect(linkedin).toBeDefined();
    expect(linkedin?.algoEtape1).toBe('Linkedin');
    expect(linkedin?.statuts['Annonce à récupérer']).toBe(2);
    expect(linkedin?.statuts['À analyser']).toBe(1);

    const hellowork = result.find((r) => r.emailExpéditeur === 'notification@emails.hellowork.com');
    expect(hellowork).toBeDefined();
    expect(hellowork?.algoEtape1).toBe('HelloWork');
    expect(hellowork?.statuts['Annonce à récupérer']).toBe(1);
  });

  it('filtrage : une source sans offre n\'apparaît pas', () => {
    const sources = [
      { emailExpéditeur: 'avec-offres@test.com', algo: 'HelloWork' as const, actif: true },
      { emailExpéditeur: 'sans-offres@test.com', algo: 'Inconnu' as const, actif: false },
    ];
    const offres = [
      { emailExpéditeur: 'avec-offres@test.com', statut: 'À traiter' },
    ];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(1);
    expect(result[0].emailExpéditeur).toBe('avec-offres@test.com');
    expect(result.find((r) => r.emailExpéditeur === 'sans-offres@test.com')).toBeUndefined();
  });

  it('tri : ordre des lignes par algo étape 2 puis algo étape 1', () => {
    const sources = [
      { emailExpéditeur: 'a@test.com', algo: 'HelloWork' as const, actif: true },
      { emailExpéditeur: 'b@test.com', algo: 'Linkedin' as const, actif: true },
      { emailExpéditeur: 'c@test.com', algo: 'Inconnu' as const, actif: true },
    ];
    const offres = [
      { emailExpéditeur: 'c@test.com', statut: 'À traiter' },
      { emailExpéditeur: 'a@test.com', statut: 'À traiter' },
      { emailExpéditeur: 'b@test.com', statut: 'À traiter' },
    ];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(3);
    expect(result[0].emailExpéditeur).toBe('a@test.com');
    expect(result[1].emailExpéditeur).toBe('b@test.com');
    expect(result[2].emailExpéditeur).toBe('c@test.com');
  });
});

describe('produireTableauSynthese (intégration utils)', () => {
  it('produit le tableau prêt pour le dashboard via repository mock', async () => {
    const repo: TableauSyntheseRepository = {
      async listerSources() {
        return [
          { emailExpéditeur: 'jobs@linkedin.com', algo: 'Linkedin', actif: true },
          { emailExpéditeur: 'notification@emails.hellowork.com', algo: 'HelloWork', actif: true },
        ];
      },
      async listerOffres() {
        return [
          { emailExpéditeur: 'jobs@linkedin.com', statut: 'Annonce à récupérer' },
          { emailExpéditeur: 'jobs@linkedin.com', statut: 'Annonce à récupérer' },
          { emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' },
          { emailExpéditeur: 'notification@emails.hellowork.com', statut: 'Annonce à récupérer' },
        ];
      },
    };
    const tableau = await produireTableauSynthese(repo);
    expect(tableau).toHaveLength(2);
    const linkedin = tableau.find((r) => r.emailExpéditeur === 'jobs@linkedin.com');
    expect(linkedin?.statuts['Annonce à récupérer']).toBe(2);
    expect(linkedin?.statuts['À analyser']).toBe(1);
    const hellowork = tableau.find((r) => r.emailExpéditeur === 'notification@emails.hellowork.com');
    expect(hellowork?.statuts['Annonce à récupérer']).toBe(1);
    expect(tableau[0].emailExpéditeur).toBe('notification@emails.hellowork.com');
    expect(tableau[1].emailExpéditeur).toBe('jobs@linkedin.com');
  });

  it('tri place les algo inconnus à la fin', async () => {
    const repo: TableauSyntheseRepository = {
      async listerSources() {
        return [
          { emailExpéditeur: 'x@test.com', algo: 'Autre' as never, actif: true },
          { emailExpéditeur: 'a@test.com', algo: 'HelloWork', actif: true },
        ];
      },
      async listerOffres() {
        return [
          { emailExpéditeur: 'x@test.com', statut: 'À traiter' },
          { emailExpéditeur: 'a@test.com', statut: 'À traiter' },
        ];
      },
    };
    const tableau = await produireTableauSynthese(repo);
    expect(tableau[0].emailExpéditeur).toBe('a@test.com');
    expect(tableau[1].emailExpéditeur).toBe('x@test.com');
  });
});
