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

  it('construit la synthese brute par emailExpéditeur + enrichissement source existante + sous-totaux', async () => {
    const deplacer = jest.fn().mockResolvedValue({ ok: true });
    const createOffres = jest.fn();
    const driverReleve = {
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'src_linkedin',
          emailExpéditeur: ' Jobs@Linkedin.com ',
          algo: 'Linkedin',
          actif: true,
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

    expect(result).toEqual({
      ok: true,
      nbEmailsScannes: 4,
      nbSourcesCreees: 1,
      nbSourcesExistantes: 1,
      synthese: [
        {
          emailExpéditeur: 'jobs@linkedin.com',
          algo: 'Linkedin',
          actif: 'Oui',
          nbEmails: 2,
        },
        {
          emailExpéditeur: 'alerte@emails.hellowork.com',
          algo: 'Inconnu',
          actif: 'Non',
          nbEmails: 2,
        },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 2,
        emailsÀAnalyser: 2,
      },
    });
    expect(driverReleve.creerSource).toHaveBeenCalledWith({
      emailExpéditeur: 'alerte@emails.hellowork.com',
      algo: 'Inconnu',
      actif: false,
    });
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
          algo: 'Inconnu',
          actif: false,
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
          algo: 'Inconnu',
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

  it('source absente non-linkedin: crée en Inconnu/inactif', async () => {
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
      nbSourcesCreees: 1,
      nbSourcesExistantes: 0,
      synthese: [
        {
          emailExpéditeur: 'hr@example.org',
          algo: 'Inconnu',
          actif: 'Non',
          nbEmails: 1,
        },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 0,
        emailsÀAnalyser: 0,
      },
    });
    expect(driverReleve.creerSource).toHaveBeenCalledWith({
      emailExpéditeur: 'hr@example.org',
      algo: 'Inconnu',
      actif: false,
    });
  });

  it("audit strictement séparé: n'appelle ni traitement, ni enrichissement, ni déplacement", async () => {
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
    expect(createOffres).not.toHaveBeenCalled();
    expect(mettreAJourSource).not.toHaveBeenCalled();
    expect(deplacer).not.toHaveBeenCalled();
  });

  it('source absente avec email linkedin: crée en Linkedin/actif par défaut', async () => {
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
      nbSourcesCreees: 1,
      nbSourcesExistantes: 0,
      synthese: [
        {
          emailExpéditeur: 'jobs-noreply@linkedin.com',
          algo: 'Linkedin',
          actif: 'Oui',
          nbEmails: 1,
        },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 1,
        emailsÀAnalyser: 1,
      },
    });
    expect(driverReleve.creerSource).toHaveBeenCalledWith({
      emailExpéditeur: 'jobs-noreply@linkedin.com',
      algo: 'Linkedin',
      actif: true,
    });
  });

  it('normalise "from" avec nom + email et détecte Linkedin', async () => {
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
    expect(driverReleve.creerSource).toHaveBeenCalledWith({
      emailExpéditeur: 'jobs-listings@linkedin.com',
      algo: 'Linkedin',
      actif: true,
    });
  });

  it('US-1.10: source absente WTTJ -> crée avec algo "Welcome to the Jungle" et actif=true', async () => {
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
      nbSourcesCreees: 1,
      nbSourcesExistantes: 0,
      synthese: [
        {
          emailExpéditeur: 'alerts@welcometothejungle.com',
          algo: 'Welcome to the Jungle',
          actif: 'Oui',
          nbEmails: 1,
        },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 1,
        emailsÀAnalyser: 1,
      },
    });
    expect(driverReleve.creerSource).toHaveBeenCalledWith({
      emailExpéditeur: 'alerts@welcometothejungle.com',
      algo: 'Welcome to the Jungle',
      actif: true,
    });
  });

  it('US-1.10: source WTTJ préexistante incohérente -> corrigée en algo WTTJ + actif=true', async () => {
    const mettreAJourSource = jest.fn().mockResolvedValue(undefined);
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'rec_wttj',
          emailExpéditeur: 'alerts@welcometothejungle.com',
          algo: 'Inconnu',
          actif: false,
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
          algo: 'Welcome to the Jungle',
          actif: 'Oui',
          nbEmails: 1,
        },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 1,
        emailsÀAnalyser: 1,
      },
    });
    expect(mettreAJourSource).toHaveBeenCalledWith('rec_wttj', {
      algo: 'Welcome to the Jungle',
      actif: true,
    });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('US-1.10: source WTTJ préexistante est corrigée même sans email WTTJ dans le dossier', async () => {
    const mettreAJourSource = jest.fn().mockResolvedValue(undefined);
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'rec_wttj',
          emailExpéditeur: 'alerts@welcometothejungle.com',
          algo: 'Inconnu',
          actif: false,
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
    expect(mettreAJourSource).toHaveBeenCalledWith('rec_wttj', {
      algo: 'Welcome to the Jungle',
      actif: true,
    });
    expect(driverReleve.creerSource).not.toHaveBeenCalled();
  });

  it('US-1.11: source absente JTMS -> crée algo "Job That Make Sense" actif=true', async () => {
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
    expect(driverReleve.creerSource).toHaveBeenCalledWith({
      emailExpéditeur: 'jobs@makesense.org',
      algo: 'Job That Make Sense',
      actif: true,
    });
  });

  it('US-1.12: source préexistante cadreemploi incohérente -> corrigée algo+actif', async () => {
    const mettreAJourSource = jest.fn().mockResolvedValue(undefined);
    const driverReleve = {
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'rec_ce',
          emailExpéditeur: 'offres@alertes.cadremploi.fr',
          algo: 'Inconnu',
          actif: false,
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
    expect(mettreAJourSource).toHaveBeenCalledWith('rec_ce', {
      algo: 'cadreemploi',
      actif: true,
    });
  });
});
