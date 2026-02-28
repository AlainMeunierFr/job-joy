/**
 * Tests US-1.7 : tableau de synthèse des offres.
 * US-1.13 : totaux (colonne et ligne).
 */
import { STATUTS_OFFRES_AIRTABLE, STATUTS_OFFRES_AVEC_AUTRE } from './statuts-offres-airtable.js';
import {
  construireTableauSynthese,
  calculerTotauxTableauSynthese,
  produireTableauSynthese,
  mergeCacheDansLignes,
  enrichirCacheAImporterListeHtml,
  type TableauSyntheseRepository,
  type LigneTableauSynthese,
} from './tableau-synthese-offres.js';

describe('tableau-synthese-offres (US-1.7)', () => {
  it('agrégation vide : aucune offre => aucune ligne retournée', () => {
    const sources = [
      {
        emailExpéditeur: 'jobs@linkedin.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ];
    const offres: Array<{ emailExpéditeur: string; statut: string }> = [];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toEqual([]);
  });

  it('1 offre / 1 source : ligne avec colonnes source + colonnes statuts complètes (0 sauf statut concerné)', () => {
    const sources = [
      {
        emailExpéditeur: 'jobs@linkedin.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ];
    const offres = [{ emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' }];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      emailExpéditeur: 'jobs@linkedin.com',
      sourceEtape1: 'Linkedin',
      sourceEtape2: 'Linkedin',
      activerCreation: true,
      activerEnrichissement: true,
      activerAnalyseIA: true,
    });
    expect(result[0].statuts).toEqual({
      'A compléter': 0,
      'À analyser': 1,
      'À traiter': 0,
      Candidaté: 0,
      Refusé: 0,
      Traité: 0,
      Ignoré: 0,
      Expiré: 0,
    });
  });

  it('plusieurs offres même source : incrément correct des compteurs par statut', () => {
    const sources = [
      {
        emailExpéditeur: 'jobs@linkedin.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ];
    const offres = [
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'A compléter' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'A compléter' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' },
    ];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(1);
    expect(result[0].statuts['A compléter']).toBe(2);
    expect(result[0].statuts['À analyser']).toBe(1);
    expect(result[0].statuts['À traiter']).toBe(0);
  });

  it('plusieurs sources : une ligne par expéditeur avec matrice complète des statuts', () => {
    const sources = [
      {
        emailExpéditeur: 'jobs@linkedin.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
      {
        emailExpéditeur: 'notification@emails.hellowork.com',
        source: 'HelloWork' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ];
    const offres = [
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'A compléter' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'A compléter' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' },
      { emailExpéditeur: 'notification@emails.hellowork.com', statut: 'A compléter' },
    ];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(2);

    const linkedin = result.find((r) => r.emailExpéditeur === 'jobs@linkedin.com');
    expect(linkedin).toBeDefined();
    expect(linkedin?.sourceEtape1).toBe('Linkedin');
    expect(linkedin?.statuts['A compléter']).toBe(2);
    expect(linkedin?.statuts['À analyser']).toBe(1);

    const hellowork = result.find((r) => r.emailExpéditeur === 'notification@emails.hellowork.com');
    expect(hellowork).toBeDefined();
    expect(hellowork?.sourceEtape1).toBe('HelloWork');
    expect(hellowork?.statuts['A compléter']).toBe(1);
  });

  it('filtrage : une source sans offre n\'apparaît pas', () => {
    const sources = [
      {
        emailExpéditeur: 'avec-offres@test.com',
        source: 'HelloWork' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
      {
        emailExpéditeur: 'sans-offres@test.com',
        source: 'Inconnu' as const,
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ];
    const offres = [
      { emailExpéditeur: 'avec-offres@test.com', statut: 'À traiter' },
    ];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(1);
    expect(result[0].emailExpéditeur).toBe('avec-offres@test.com');
    expect(result.find((r) => r.emailExpéditeur === 'sans-offres@test.com')).toBeUndefined();
  });

  it('statut hors énum : compté dans Autre quand statutsOrdre inclut Autre', () => {
    const sources = [
      {
        emailExpéditeur: 'x@test.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ];
    const offres = [
      { emailExpéditeur: 'x@test.com', statut: 'Custom statut' },
      { emailExpéditeur: 'x@test.com', statut: 'À traiter' },
    ];
    const result = construireTableauSynthese({ sources, offres, statutsOrdre: STATUTS_OFFRES_AVEC_AUTRE });
    expect(result).toHaveLength(1);
    expect(result[0].statuts['À traiter']).toBe(1);
    expect(result[0].statuts['Autre']).toBe(1);
  });

  it('une ligne construite a aImporter à 0 et peut être enrichie avec aImporter (US-3.3)', () => {
    const sources = [
      {
        emailExpéditeur: 'x@test.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ];
    const offres = [{ emailExpéditeur: 'x@test.com', statut: 'À analyser' }];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(1);
    expect(result[0].aImporter).toBe(0);
    const enrichie = { ...result[0], aImporter: 5 };
    expect(enrichie.aImporter).toBe(5);
  });

  it('tri : ordre des lignes par plugin étape 2 puis plugin étape 1', () => {
    const sources = [
      {
        emailExpéditeur: 'a@test.com',
        source: 'HelloWork' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
      {
        emailExpéditeur: 'b@test.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
      {
        emailExpéditeur: 'c@test.com',
        source: 'Inconnu' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
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

  it('tri : même plugin étape 2 et 1, ordre par email expéditeur', () => {
    const sources = [
      {
        emailExpéditeur: 'z@test.com',
        source: 'HelloWork' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
      {
        emailExpéditeur: 'a@test.com',
        source: 'HelloWork' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ];
    const offres = [
      { emailExpéditeur: 'z@test.com', statut: 'À traiter' },
      { emailExpéditeur: 'a@test.com', statut: 'À traiter' },
    ];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(2);
    expect(result[0].emailExpéditeur).toBe('a@test.com');
    expect(result[1].emailExpéditeur).toBe('z@test.com');
  });
});

describe('produireTableauSynthese (intégration utils)', () => {
  it('produit le tableau prêt pour le dashboard via repository mock', async () => {
    const repo: TableauSyntheseRepository = {
      async listerSources() {
        return [
          {
            emailExpéditeur: 'jobs@linkedin.com',
            source: 'Linkedin',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
          },
          {
            emailExpéditeur: 'notification@emails.hellowork.com',
            source: 'HelloWork',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
          },
        ];
      },
      async listerOffres() {
        return [
          { emailExpéditeur: 'jobs@linkedin.com', statut: 'A compléter' },
          { emailExpéditeur: 'jobs@linkedin.com', statut: 'A compléter' },
          { emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' },
          { emailExpéditeur: 'notification@emails.hellowork.com', statut: 'A compléter' },
        ];
      },
    };
    const tableau = await produireTableauSynthese(repo);
    expect(tableau).toHaveLength(2);
    const linkedin = tableau.find((r) => r.emailExpéditeur === 'jobs@linkedin.com');
    expect(linkedin?.statuts['A compléter']).toBe(2);
    expect(linkedin?.statuts['À analyser']).toBe(1);
    const hellowork = tableau.find((r) => r.emailExpéditeur === 'notification@emails.hellowork.com');
    expect(hellowork?.statuts['A compléter']).toBe(1);
    expect(tableau[0].emailExpéditeur).toBe('notification@emails.hellowork.com');
    expect(tableau[1].emailExpéditeur).toBe('jobs@linkedin.com');
  });

  it('tri place les sources inconnues à la fin', async () => {
    const repo: TableauSyntheseRepository = {
      async listerSources() {
        return [
          {
            emailExpéditeur: 'x@test.com',
            source: 'Inconnu',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
          },
          {
            emailExpéditeur: 'a@test.com',
            source: 'HelloWork',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
          },
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

describe('calculerTotauxTableauSynthese (US-1.13)', () => {
  const statutsOrdre = ['A compléter', 'À traiter', 'Traité', 'Ignoré', 'À analyser'];

  it('0 ligne : totalParLigne vide, totalParColonne à 0, totalGeneral 0', () => {
    const lignes: Array<{ statuts: Record<string, number> }> = [];
    const totaux = calculerTotauxTableauSynthese(lignes, statutsOrdre);
    expect(totaux.totalParLigne).toEqual([]);
    expect(totaux.totalParColonne).toEqual({
      'A compléter': 0,
      'À traiter': 0,
      Traité: 0,
      Ignoré: 0,
      'À analyser': 0,
    });
    expect(totaux.totalGeneral).toBe(0);
  });

  it('1 ligne : totalParLigne = [somme ligne], totalParColonne et totalGeneral cohérents', () => {
    const lignes: Array<{ statuts: Record<string, number> }> = [
      {
        statuts: {
          'A compléter': 2,
          'À traiter': 1,
          Traité: 0,
          Ignoré: 0,
          'À analyser': 1,
        },
      },
    ];
    const totaux = calculerTotauxTableauSynthese(lignes, statutsOrdre);
    expect(totaux.totalParLigne).toEqual([4]);
    expect(totaux.totalParColonne).toEqual({
      'A compléter': 2,
      'À traiter': 1,
      Traité: 0,
      Ignoré: 0,
      'À analyser': 1,
    });
    expect(totaux.totalGeneral).toBe(4);
  });

  it('2 lignes avec statuts variés : totaux par ligne, par colonne et général', () => {
    const lignes: Array<{ statuts: Record<string, number> }> = [
      {
        statuts: {
          'A compléter': 2,
          'À traiter': 1,
          Traité: 0,
          Ignoré: 0,
          'À analyser': 1,
        },
      },
      {
        statuts: {
          'A compléter': 1,
          'À traiter': 0,
          Traité: 0,
          Ignoré: 0,
          'À analyser': 0,
        },
      },
    ];
    const totaux = calculerTotauxTableauSynthese(lignes, statutsOrdre);
    expect(totaux.totalParLigne).toEqual([4, 1]);
    expect(totaux.totalParColonne).toEqual({
      'A compléter': 3,
      'À traiter': 1,
      Traité: 0,
      Ignoré: 0,
      'À analyser': 1,
    });
    expect(totaux.totalGeneral).toBe(5);
  });

  it('avec lignes de construireTableauSynthese : totaux cohérents et totalGeneral = somme totalParColonne', () => {
    const sources = [
      {
        emailExpéditeur: 'jobs@linkedin.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
      {
        emailExpéditeur: 'notification@emails.hellowork.com',
        source: 'HelloWork' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
    ];
    const offres = [
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'A compléter' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'A compléter' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'À traiter' },
      { emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' },
      { emailExpéditeur: 'notification@emails.hellowork.com', statut: 'A compléter' },
    ];
    const lignes = construireTableauSynthese({ sources, offres, statutsOrdre: [...STATUTS_OFFRES_AIRTABLE] });
    const totaux = calculerTotauxTableauSynthese(lignes, STATUTS_OFFRES_AIRTABLE);
    expect(totaux.totalParLigne).toHaveLength(2);
    expect(totaux.totalParLigne).toContain(4);
    expect(totaux.totalParLigne).toContain(1);
    const sommeColonnes = Object.values(totaux.totalParColonne).reduce((a, b) => a + b, 0);
    expect(totaux.totalGeneral).toBe(sommeColonnes);
    expect(totaux.totalGeneral).toBe(5);
  });
});

describe('mergeCacheDansLignes (US-3.3)', () => {
  it('2 lignes (emails distincts), cache avec une entrée pour le premier : première ligne aImporter 3, seconde 0', () => {
    const lignes: LigneTableauSynthese[] = [
      {
        emailExpéditeur: 'a@x.com',
        sourceEtape1: 'HelloWork',
        sourceEtape2: 'HelloWork',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
        statuts: { 'À analyser': 1 },
        aImporter: 0,
      },
      {
        emailExpéditeur: 'b@y.com',
        sourceEtape1: 'Linkedin',
        sourceEtape2: 'Linkedin',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
        statuts: { 'À traiter': 1 },
        aImporter: 0,
      },
    ];
    const cache = { 'a@x.com': 3 };
    const result = mergeCacheDansLignes(lignes, cache);
    expect(result).toHaveLength(2);
    expect(result[0].aImporter).toBe(3);
    expect(result[1].aImporter).toBe(0);
  });

  it('normalisation email : cache avec clé minuscule, ligne avec email mixte → aImporter trouvé', () => {
    const lignes: LigneTableauSynthese[] = [
      {
        emailExpéditeur: 'A@X.COM',
        sourceEtape1: 'HelloWork',
        sourceEtape2: 'HelloWork',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
        statuts: {},
        aImporter: 0,
      },
    ];
    const result = mergeCacheDansLignes(lignes, { 'a@x.com': 4 });
    expect(result[0].aImporter).toBe(4);
  });

  it('cache vide : toutes les lignes ont aImporter 0', () => {
    const lignes: LigneTableauSynthese[] = [
      {
        emailExpéditeur: 'a@x.com',
        sourceEtape1: 'HelloWork',
        sourceEtape2: 'HelloWork',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
        statuts: {},
        aImporter: 0,
      },
    ];
    const result = mergeCacheDansLignes(lignes, {});
    expect(result).toHaveLength(1);
    expect(result[0].aImporter).toBe(0);
  });
});

describe('sources liste html et aImporter (US-6.1)', () => {
  it('construireTableauSynthese inclut les sources liste html (adresse relative) sans offres', () => {
    const sources = [
      {
        emailExpéditeur: 'jobs@linkedin.com',
        source: 'Linkedin' as const,
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      },
      {
        emailExpéditeur: 'liste html/apec',
        source: 'Inconnu' as const,
        activerCreation: true,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      },
    ];
    const offres = [{ emailExpéditeur: 'jobs@linkedin.com', statut: 'À analyser' }];
    const result = construireTableauSynthese({ sources, offres });
    expect(result).toHaveLength(2);
    const ligneEmail = result.find((r) => r.emailExpéditeur === 'jobs@linkedin.com');
    const ligneListeHtml = result.find((r) => r.emailExpéditeur === 'liste html/apec');
    expect(ligneEmail).toBeDefined();
    expect(ligneListeHtml).toBeDefined();
    expect(ligneListeHtml?.statuts['À analyser']).toBe(0);
    expect(ligneListeHtml?.aImporter).toBe(0);
  });

  it('enrichirCacheAImporterListeHtml + mergeCacheDansLignes : ligne liste html a le bon aImporter', async () => {
    const sources = [
      { emailExpéditeur: 'liste html/apec' },
      { emailExpéditeur: 'x@test.com' },
    ];
    const cacheAudit = { 'x@test.com': 2 };
    const compterFichiers = jest.fn().mockResolvedValue(3);
    const cacheEnrichi = await enrichirCacheAImporterListeHtml(
      cacheAudit,
      sources,
      compterFichiers
    );
    expect(cacheEnrichi['x@test.com']).toBe(2);
    expect(cacheEnrichi['liste html/apec']).toBe(3);
    expect(compterFichiers).toHaveBeenCalledWith('liste html/apec');
    expect(compterFichiers).not.toHaveBeenCalledWith('x@test.com');

    const lignes: LigneTableauSynthese[] = [
      {
        emailExpéditeur: 'liste html/apec',
        sourceEtape1: 'Inconnu',
        sourceEtape2: 'Inconnu',
        activerCreation: true,
        activerEnrichissement: false,
        activerAnalyseIA: true,
        statuts: {},
        aImporter: 0,
      },
    ];
    const merged = mergeCacheDansLignes(lignes, cacheEnrichi);
    expect(merged[0].aImporter).toBe(3);
  });
});
