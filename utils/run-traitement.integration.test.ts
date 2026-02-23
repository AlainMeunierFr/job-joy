import { runTraitement } from '../scripts/run-traitement.js';

describe('runTraitement - intégration gouvernance US-1.6', () => {
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

  it('crée les sources absentes en Inconnu et ne traite/deplace pas ces emails', async () => {
    const creations: Array<{ emailExpéditeur: string; algo: string; actif: boolean }> = [];
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const deplacer = jest.fn().mockResolvedValue({ ok: true });
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn().mockImplementation(async (source) => {
        creations.push({
          emailExpéditeur: source.emailExpéditeur,
          algo: source.algo,
          actif: source.actif,
        });
        return { sourceId: `rec_${source.emailExpéditeur}`, ...source };
      }),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'noreply@nouvelle-source.test', html: '<html>no offer</html>' }],
      }),
      deplacerEmailsVersDossier: deplacer,
    };
    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    expect(creations).toEqual([{ emailExpéditeur: 'noreply@nouvelle-source.test', algo: 'Inconnu', actif: false }]);
    expect(createOffres).not.toHaveBeenCalled();
    expect(deplacer).not.toHaveBeenCalled();
  });

  it('source Actif + parseur dispo: traite puis déplace vers Traité', async () => {
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const deplacer = jest.fn().mockResolvedValue({ ok: true });
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recLinkedin',
          emailExpéditeur: 'jobs@linkedin.com',
          algo: 'Linkedin',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [
          {
            id: 'm1',
            from: 'jobs@linkedin.com',
            receivedAtIso: '2026-02-22T10:15:00.000Z',
            html: 'jobs/view/12345/ jobcard_body <a href="#">Dev</a><p>Acme · Paris</p>',
          },
        ],
      }),
      deplacerEmailsVersDossier: deplacer,
    };
    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    expect(createOffres).toHaveBeenCalledTimes(1);
    const [offres] = createOffres.mock.calls[0];
    expect(offres[0]).toMatchObject({
      idOffre: '12345',
      ville: 'Paris',
      dateOffre: '2026-02-22T10:15:00.000Z',
    });
    expect(offres[0].département).toBeUndefined();
    expect(deplacer).toHaveBeenCalledWith('test@example.com', 'x', ['m1'], 'Traite');
  });

  it('algo=Inconnu & actif=true: archive sans traitement', async () => {
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const deplacer = jest.fn().mockResolvedValue({ ok: true });
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recUnknown',
          emailExpéditeur: 'alertes@unknown-source.test',
          algo: 'Inconnu',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'alertes@unknown-source.test', html: '<html>x</html>' }],
      }),
      deplacerEmailsVersDossier: deplacer,
    };
    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
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
    expect(deplacer).toHaveBeenCalledWith('test@example.com', 'x', ['m1'], 'Traite');
  });

  it('conserve le callback onProgress pour le thermomètre', async () => {
    const progress: string[] = [];
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: jest.fn().mockResolvedValue({ nbCreees: 0, nbDejaPresentes: 0 }),
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recLinkedin',
          emailExpéditeur: 'jobs@linkedin.com',
          algo: 'Linkedin',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'jobs@linkedin.com', html: '<html>no offer</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };
    await runTraitement('/tmp/data', {
      onProgress: (m) => progress.push(m),
      onEmailLu: () => {},
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(progress).toContain('Emails LinkedIn trouvés : 1');
    expect(progress).toContain('1/1');
  });

  it('source absente linkedin (from avec nom): crée Linkedin/actif par défaut', async () => {
    const creations: Array<{ emailExpéditeur: string; algo: string; actif: boolean }> = [];
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: jest.fn().mockResolvedValue({ nbCreees: 0, nbDejaPresentes: 0 }),
      listerSources: jest.fn().mockResolvedValue([]),
      creerSource: jest.fn().mockImplementation(async (source) => {
        creations.push({
          emailExpéditeur: source.emailExpéditeur,
          algo: source.algo,
          actif: source.actif,
        });
        return { sourceId: `rec_${source.emailExpéditeur}`, ...source };
      }),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'LinkedIn Jobs <jobs-listings@linkedin.com>', html: '<html>no offer</html>' }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };
    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    expect(creations).toEqual([{ emailExpéditeur: 'jobs-listings@linkedin.com', algo: 'Linkedin', actif: true }]);
  });

  it('US-1.8 HelloWork: source active + email exploitable => crée une offre en "Annonce à récupérer"', async () => {
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const deplacer = jest.fn().mockResolvedValue({ ok: true });
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recHelloWork',
          emailExpéditeur: 'notification@emails.hellowork.com',
          algo: 'HelloWork',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const decodedUrl = 'https://www.hellowork.com/fr-fr/emplois/123456.html';
    const token = Buffer.from(decodedUrl, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const html = `
      <table>
        <tr>
          <td class="bg-dark-cards">
            <a class="font-mob-16" href="https://emails.hellowork.com/clic/a/b/c/d/e/${token}/f">Voir</a>
            <td class="dark-style-color">Acme</td>
            <td style="background-color:#F6F6F6;">Nantes - 44</td>
          </td>
        </tr>
      </table>
    `;
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [
          {
            id: 'm1',
            from: 'Notification@Emails.HelloWork.com',
            receivedAtIso: '2026-02-22T09:00:00.000Z',
            html,
          },
        ],
      }),
      deplacerEmailsVersDossier: deplacer,
    };

    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    expect(createOffres).toHaveBeenCalledTimes(1);
    const [offres, sourceId] = createOffres.mock.calls[0];
    expect(sourceId).toBe('recHelloWork');
    expect(offres[0]).toMatchObject({
      idOffre: '123456',
      url: decodedUrl,
      statut: 'Annonce à récupérer',
      dateOffre: '2026-02-22T09:00:00.000Z',
      ville: 'Nantes',
      département: '44',
    });
  });

  it("US-1.8 HelloWork: si décodage URL KO, l'offre est créée avec l'URL encodée", async () => {
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recHelloWork',
          emailExpéditeur: 'notification@emails.hellowork.com',
          algo: 'HelloWork',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const encodedUrl = 'https://emails.hellowork.com/clic/a/b/c/d/e/%%%invalid-base64%%%/f';
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'm1', from: 'notification@emails.hellowork.com', html: encodedUrl }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    const [offres] = createOffres.mock.calls[0];
    expect(offres[0]).toMatchObject({
      idOffre: expect.stringMatching(/^hellowork-[a-f0-9]{16}$/),
      url: encodedUrl,
      statut: 'Annonce à récupérer',
    });
  });

  it('US-1.10 WTTJ étape 1: insertion minimum requis avec statut "Annonce à récupérer"', async () => {
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recWttj',
          emailExpéditeur: 'alerts@welcometothejungle.com',
          algo: 'Welcome to the Jungle',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const html = `
      <table class="job-item"><tr><td class="job-item-inner">
        <td style="text-transform:uppercase"><a href="https://x">Acme</a></td>
        <td style="font-size:20px"><a href="https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris">Product Manager</a></td>
        <td style="font-size:14px"><a href="https://x">CDI - Paris</a></td>
      </td></tr></table>
    `;
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'w1', from: 'Alerts@WelcomeToTheJungle.com', html }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    expect(createOffres).toHaveBeenCalledTimes(1);
    const [offres, sourceId] = createOffres.mock.calls[0];
    expect(sourceId).toBe('recWttj');
    expect(offres[0]).toMatchObject({
      statut: 'Annonce à récupérer',
      poste: 'Product Manager',
      entreprise: 'Acme',
      ville: 'Paris',
      url: 'https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris',
    });
    expect(offres[0].idOffre).toContain('product-manager');
    expect(offres[0].dateAjout).toBeDefined();
  });

  it('US-1.10 WTTJ: pas de doublon sur une même offre (id stable)', async () => {
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recWttj',
          emailExpéditeur: 'alerts@welcometothejungle.com',
          algo: 'Welcome to the Jungle',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const html = `
      <table class="job-item"><tr><td class="job-item-inner">
        <td style="text-transform:uppercase"><a href="https://x">Acme</a></td>
        <td style="font-size:20px"><a href="https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris">Product Manager</a></td>
        <td style="font-size:14px"><a href="https://x">CDI - Paris</a></td>
      </td></tr></table>
      <table class="job-item"><tr><td class="job-item-inner">
        <td style="text-transform:uppercase"><a href="https://x">Acme</a></td>
        <td style="font-size:20px"><a href="https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris">Product Manager</a></td>
        <td style="font-size:14px"><a href="https://x">CDI - Paris</a></td>
      </td></tr></table>
    `;
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'w1', from: 'alerts@welcometothejungle.com', html }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: {
        compte,
        airtable,
        motDePasse: 'x',
        driverReleve: driverReleve as never,
        lecteurEmails: lecteurEmails as never,
      },
    });

    expect(result.ok).toBe(true);
    const [offres] = createOffres.mock.calls[0];
    expect(offres).toHaveLength(1);
  });

  it('US-1.11 JTMS: source active + fixture exploitable => insertion "Annonce à récupérer"', async () => {
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recJtms',
          emailExpéditeur: 'jobs@makesense.org',
          algo: 'Job That Make Sense',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const payload = JSON.stringify({ href: 'https://jobs.makesense.org/jobs/abc123?utm_source=email' });
    const token = Buffer.from(payload, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const html = `<a href="https://e.customeriomail.com/e/c/${token}/sig">Product Manager</a><div>Acme</div>`;
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'j1', from: 'Jobs@MakeSense.Org', receivedAtIso: '2026-02-22T09:00:00.000Z', html }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: { compte, airtable, motDePasse: 'x', driverReleve: driverReleve as never, lecteurEmails: lecteurEmails as never },
    });

    expect(result.ok).toBe(true);
    const [offres, sourceId] = createOffres.mock.calls[0];
    expect(sourceId).toBe('recJtms');
    expect(offres[0]).toMatchObject({
      idOffre: 'abc123',
      url: 'https://jobs.makesense.org/jobs/abc123',
      statut: 'Annonce à récupérer',
      dateOffre: '2026-02-22T09:00:00.000Z',
    });
  });

  it('US-1.12 cadreemploi: source active + URL fallback tracking => insertion "Annonce à récupérer"', async () => {
    const createOffres = jest.fn().mockImplementation((offres: unknown[]) => Promise.resolve({ nbCreees: Array.isArray(offres) ? offres.length : 0, nbDejaPresentes: 0 }));
    const driverReleve = {
      getSourceLinkedIn: jest.fn(),
      creerOffres: createOffres,
      listerSources: jest.fn().mockResolvedValue([
        {
          sourceId: 'recCadreemploi',
          emailExpéditeur: 'offres@alertes.cadremploi.fr',
          algo: 'cadreemploi',
          actif: true,
        },
      ]),
      creerSource: jest.fn(),
      mettreAJourSource: jest.fn().mockResolvedValue(undefined),
    };
    const html =
      '<a href="https://r.emails.alertes.cadremploi.fr/tr/cl/no-decode-token">Directeur tech et produit H/F</a>';
    const lecteurEmails = {
      lireEmails: jest.fn(),
      lireEmailsGouvernance: jest.fn().mockResolvedValue({
        ok: true,
        emails: [{ id: 'c1', from: 'Offres@Alertes.Cadremploi.Fr', html }],
      }),
      deplacerEmailsVersDossier: jest.fn().mockResolvedValue({ ok: true }),
    };

    const result = await runTraitement('/tmp/data', {
      onEmailLu: () => {},
      deps: { compte, airtable, motDePasse: 'x', driverReleve: driverReleve as never, lecteurEmails: lecteurEmails as never },
    });

    expect(result.ok).toBe(true);
    const [offres, sourceId] = createOffres.mock.calls[0];
    expect(sourceId).toBe('recCadreemploi');
    expect(offres[0]).toMatchObject({
      idOffre: expect.stringMatching(/^cadreemploi-[a-f0-9]{16}$/),
      statut: 'Annonce à récupérer',
    });
  });
});
