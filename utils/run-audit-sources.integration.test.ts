import { runAuditSources } from '../scripts/run-audit-sources.js';

describe('runAuditSources - audit seul des sources', () => {
  const compte = {
    provider: 'microsoft' as const,
    adresseEmail: 'test@example.com',
    cheminDossier: 'inbox',
    cheminDossierArchive: 'Traite',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
  };
  const airtable = {
    apiKey: 'patTest',
    base: 'appBase',
    sources: 'tblSources',
    offres: 'tblOffres',
  };

  it('construit la synthese brute par emailExpéditeur + enrichissement source existante + sous-totaux (CA2: uniquement sources déjà en base)', async () => {
    const deplacer = jest.fn().mockResolvedValue({ ok: true });
    const createOffres = jest.fn();
    const driverReleve = {
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'src_linkedin',
          emailExpéditeur: ' Jobs@Linkedin.com ',
          source: 'Linkedin',
          type: 'email',
          activerCreation: true,
          activerEnrichissement: true,
          activerAnalyseIA: true,
        },
      ]),
      creerSource: jest.fn().mockImplementation(async (source) => ({
        sourceId: `rec_${source.emailExpéditeur}`,
        ...source,
      })),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [
          { id: 'm1', from: 'jobs@linkedin.com', html: '<html>1</html>' },
          { id: 'm2', from: 'jobs@linkedin.com', html: '<html>2</html>' },
          { id: 'm3', from: 'alerte@emails.hellowork.com', html: '<html>3</html>' },
          { id: 'm4', from: 'Alerte@emails.hellowork.com ', html: '<html>4</html>' },
        ],
      }),
      deplacerEmailsVersDossier: deplacer,
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    // CA2 US-6.2 : on ne crée jamais de source pour un expéditeur trouvé dans la boîte ; synthèse uniquement pour sources déjà en base.
    expect(result).toEqual({
      ok: true,
      nbEmailsScannes: 4,
      nbSourcesCreees: 0,
      nbSourcesExistantes: 1,
      synthese: [
        {
          emailExpéditeur: 'jobs@linkedin.com',
          source: 'Linkedin',
          actif: 'Oui',
          nbEmails: 2,
        },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 2,
        emailsÀAnalyser: 2,
      },
    });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
    expect(deplacer).not.toHaveBeenCalled();
    expect(createOffres).not.toHaveBeenCalled();
  });

  it('source existante: ne crée rien et ne déplace rien', async () => {
    const deplacer = jest.fn().mockResolvedValue({ ok: true });
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'rec_existing',
          emailExpéditeur: 'alertes@unknown-source.test',
          source: 'Inconnu',
          type: 'email',
          activerCreation: false,
          activerEnrichissement: false,
          activerAnalyseIA: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'alertes@unknown-source.test', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: deplacer,
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result).toEqual({
      ok: true,
      nbEmailsScannes: 1,
      nbSourcesCreees: 0,
      nbSourcesExistantes: 1,
      synthese: [
        {
          emailExpéditeur: 'alertes@unknown-source.test',
          source: 'Inconnu',
          actif: 'Non',
          nbEmails: 1,
        },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 0,
        emailsÀAnalyser: 0,
      },
    });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
    expect(deplacer).not.toHaveBeenCalled();
  });

  it('CA2 US-6.2: source absente (expéditeur inconnu) ne crée pas de source et n’apparaît pas dans la synthèse', async () => {
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn().mockImplementation(async (source) => ({
        sourceId: `rec_${source.emailExpéditeur}`,
        ...source,
      })),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'hr@example.org', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result).toEqual({
      ok: true,
      nbEmailsScannes: 1,
      nbSourcesCreees: 0,
      nbSourcesExistantes: 0,
      synthese: [],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 0,
        emailsÀAnalyser: 0,
      },
    });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('CA2 US-6.2: plusieurs expéditeurs inconnus ne créent aucune source et n’apparaissent pas dans la synthèse', async () => {
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [
          { id: 'm1', from: 'nouveau@domaine-inconnu.test', html: '<html>1</html>' },
          { id: 'm2', from: 'autre@domaine-inconnu.test', html: '<html>2</html>' },
        ],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };
    const result = await runAuditSources('/tmp/data', {
      deps: { compte, airtable, motDePasse: 'x', driverReleve: driverReleve as never, lecteurEmails: lecteurEmails as never },
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.synthese).toHaveLength(0);
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it("audit strictement séparé: n'appelle ni traitement, ni enrichissement, ni déplacement (expéditeurs inconnus ignorés)", async () => {
    const deplacer = jest.fn().mockResolvedValue({ ok: true });
    const createOffres = jest.fn();
    const mettreAJourSource = jest.fn();
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn().mockImplementation(async (source) => ({
        sourceId: `rec_${source.emailExpéditeur}`,
        ...source,
      })),
      mettreAJourSource,
      creerOffres: createOffres,
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'jobs@linkedin.com', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: deplacer,
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.synthese).toHaveLength(0);
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
    expect(createOffres).not.toHaveBeenCalled();
    expect(mettreAJourSource).not.toHaveBeenCalled();
    expect(deplacer).not.toHaveBeenCalled();
  });

  it('source absente avec email linkedin: CA2 ne crée pas de source (uniquement synthèse pour sources déjà en base)', async () => {
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn().mockImplementation(async (source) => ({
        sourceId: `rec_${source.emailExpéditeur}`,
        ...source,
      })),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'jobs-noreply@linkedin.com', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result).toEqual({
      ok: true,
      nbEmailsScannes: 1,
      nbSourcesCreees: 0,
      nbSourcesExistantes: 0,
      synthese: [],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 0,
        emailsÀAnalyser: 0,
      },
    });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('normalise "from" avec nom + email (expéditeur inconnu ignoré en CA2, pas de création)', async () => {
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn().mockImplementation(async (source) => ({
        sourceId: `rec_${source.emailExpéditeur}`,
        ...source,
      })),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'LinkedIn Jobs <jobs-listings@linkedin.com>', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.synthese).toHaveLength(0);
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('US-1.10: source absente WTTJ -> CA2 ne crée pas de source (expéditeur ignoré)', async () => {
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn().mockImplementation(async (source) => ({
        sourceId: `rec_${source.emailExpéditeur}`,
        ...source,
      })),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'Alerts@WelcomeToTheJungle.com', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result).toEqual({
      ok: true,
      nbEmailsScannes: 1,
      nbSourcesCreees: 0,
      nbSourcesExistantes: 0,
      synthese: [],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 0,
        emailsÀAnalyser: 0,
      },
    });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('US-1.10: source WTTJ préexistante incohérente -> corrigée en source WTTJ uniquement (actif inchangé)', async () => {
    const mettreAJourSource = jest.fn().mockResolvedValue(undefined);
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'rec_wttj',
          emailExpéditeur: 'alerts@welcometothejungle.com',
          source: 'Inconnu',
          type: 'email',
          activerCreation: false,
          activerEnrichissement: false,
          activerAnalyseIA: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource,
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'alerts@welcometothejungle.com', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result).toEqual({
      ok: true,
      nbEmailsScannes: 1,
      nbSourcesCreees: 0,
      nbSourcesExistantes: 1,
      synthese: [
        {
          emailExpéditeur: 'alerts@welcometothejungle.com',
          source: 'Welcome to the Jungle',
          actif: 'Non',
          nbEmails: 1,
        },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 0,
        emailsÀAnalyser: 0,
      },
    });
    expect(mettreAJourSource).toHaveBeenCalledWith('rec_wttj', { source: 'Welcome to the Jungle' });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('US-1.10: source WTTJ préexistante est corrigée (source uniquement) même sans email WTTJ dans le dossier', async () => {
    const mettreAJourSource = jest.fn().mockResolvedValue(undefined);
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'rec_wttj',
          emailExpéditeur: 'alerts@welcometothejungle.com',
          source: 'Inconnu',
          type: 'email',
          activerCreation: false,
          activerEnrichissement: false,
          activerAnalyseIA: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource,
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runAuditSources('/tmp/data', {
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    expect(mettreAJourSource).toHaveBeenCalledWith('rec_wttj', { source: 'Welcome to the Jungle' });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('US-1.11: source absente JTMS -> CA2 ne crée pas de source (expéditeur ignoré)', async () => {
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn().mockImplementation(async (source) => ({
        sourceId: `rec_${source.emailExpéditeur}`,
        ...source,
      })),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'Jobs@MakeSense.Org', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };
    const result = await runAuditSources('/tmp/data', {
      deps: { compte, airtable, motDePasse: 'x', driverReleve: driverReleve as never, lecteurEmails: lecteurEmails as never },
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.synthese).toHaveLength(0);
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('US-1.12: source préexistante Cadre Emploi incohérente -> corrigée source uniquement (actif inchangé)', async () => {
    const mettreAJourSource = jest.fn().mockResolvedValue(undefined);
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'rec_ce',
          emailExpéditeur: 'offres@alertes.cadremploi.fr',
          source: 'Inconnu',
          type: 'email',
          activerCreation: false,
          activerEnrichissement: false,
          activerAnalyseIA: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource,
    };
    const lecteurEmails = {
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'offres@alertes.cadremploi.fr', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };
    const result = await runAuditSources('/tmp/data', {
      deps: { compte, airtable, motDePasse: 'x', driverReleve: driverReleve as never, lecteurEmails: lecteurEmails as never },
    });
    expect(result.ok).toBe(true);
    expect(mettreAJourSource).toHaveBeenCalledWith('rec_ce', { source: 'Cadre Emploi' });
  });
});
