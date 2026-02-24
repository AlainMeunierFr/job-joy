/**
 * Tests TDD pour la relève des offres LinkedIn (US-1.4 CA1, CA2).
 * Baby step : source absente => raison source_absente ; source inactive => source_inactive ;
 * source active + 0 emails => 0 créées ; source active + 1 email extractible => creerOffres appelé.
 */
import type { SourceLinkedInResult } from '../types/offres-releve.js';
import { executerReleveOffresLinkedIn } from './relève-offres-linkedin.js';

const STATUT_A_COMPLETER = 'A compléter';

describe('executerReleveOffresLinkedIn (CA1)', () => {
  it('retourne source_absente quand la source LinkedIn est absente', async () => {
    const driver = {
      getSourceLinkedIn: async (): Promise<SourceLinkedInResult> => ({ found: false }),
      creerOffres: async () => ({ nbCreees: 0, nbDejaPresentes: 0 }),
    };
    const lecteur = {
      lireEmails: async () => ({ ok: true as const, emails: [] }),
    };
    const r = await executerReleveOffresLinkedIn({
      adresseEmail: 'u@d.fr',
      motDePasse: 'p',
      cheminDossier: 'INBOX',
      driver,
      lecteurEmails: lecteur,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.raison).toBe('source_absente');
      expect(r.message).toMatch(/absent|indisponibilité|LinkedIn/i);
    }
  });

  it('retourne source_inactive quand la source LinkedIn existe mais activerCreation est false', async () => {
    const driver = {
      getSourceLinkedIn: async (): Promise<SourceLinkedInResult> => ({
        found: true,
        activerCreation: false,
        emailExpéditeur: 'jobs@linkedin.com',
        sourceId: 'recX',
      }),
      creerOffres: async () => ({ nbCreees: 0, nbDejaPresentes: 0 }),
    };
    const lecteur = {
      lireEmails: async () => ({ ok: true as const, emails: [] }),
    };
    const r = await executerReleveOffresLinkedIn({
      adresseEmail: 'u@d.fr',
      motDePasse: 'p',
      cheminDossier: 'INBOX',
      driver,
      lecteurEmails: lecteur,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.raison).toBe('source_inactive');
      expect(r.message).toMatch(/inactive|LinkedIn/i);
    }
  });

  it('poursuit et crée 0 offres quand la source est active mais aucun email éligible', async () => {
    const driver = {
      getSourceLinkedIn: async (): Promise<SourceLinkedInResult> => ({
        found: true,
        activerCreation: true,
        emailExpéditeur: 'jobs@linkedin.com',
        sourceId: 'recLinkedIn',
      }),
      creerOffres: jest.fn(),
    };
    const lecteur = {
      lireEmails: async () => ({ ok: true as const, emails: [] }),
    };
    const r = await executerReleveOffresLinkedIn({
      adresseEmail: 'u@d.fr',
      motDePasse: 'p',
      cheminDossier: 'INBOX',
      driver,
      lecteurEmails: lecteur,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nbOffresCreees).toBe(0);
    expect(driver.creerOffres).not.toHaveBeenCalled();
  });

  it('appelle creerOffres avec les offres extraites quand la source est active et un email contient une offre', async () => {
    const driver = {
      getSourceLinkedIn: async (): Promise<SourceLinkedInResult> => ({
        found: true,
        activerCreation: true,
        emailExpéditeur: 'jobs-noreply@linkedin.com',
        sourceId: 'recLinkedIn',
      }),
      creerOffres: jest.fn().mockResolvedValue({ nbCreees: 1, nbDejaPresentes: 0 }),
    };
    const htmlAvecUneOffre =
      'voir jobs/view/12345/ ici jobcard_body <a href="#">Dev React</a><p>Acme · Paris</p>';
    const lecteur = {
      lireEmails: async () => ({
        ok: true as const,
        emails: [{ html: htmlAvecUneOffre }],
      }),
    };
    const r = await executerReleveOffresLinkedIn({
      adresseEmail: 'u@d.fr',
      motDePasse: 'p',
      cheminDossier: 'INBOX',
      driver,
      lecteurEmails: lecteur,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nbOffresCreees).toBe(1);
    expect(driver.creerOffres).toHaveBeenCalledTimes(1);
    const [offres, sourceId] = (driver.creerOffres as jest.Mock).mock.calls[0];
    expect(sourceId).toBe('recLinkedIn');
    expect(offres).toHaveLength(1);
    expect(offres[0]).toMatchObject({
      idOffre: '12345',
      url: 'https://www.linkedin.com/jobs/view/12345/',
      statut: STATUT_A_COMPLETER,
    });
    expect(offres[0].dateAjout).toBeDefined();
    expect(offres[0].poste).toBeDefined();
  });

  it('retourne erreur_lecture_emails quand le lecteur renvoie une erreur', async () => {
    const driver = {
      getSourceLinkedIn: async (): Promise<SourceLinkedInResult> => ({
        found: true,
        activerCreation: true,
        emailExpéditeur: 'j@l.com',
        sourceId: 'recX',
      }),
      creerOffres: async () => ({ nbCreees: 0, nbDejaPresentes: 0 }),
    };
    const lecteur = {
      lireEmails: async () => ({ ok: false as const, message: 'Connexion IMAP refusée' }),
    };
    const r = await executerReleveOffresLinkedIn({
      adresseEmail: 'u@d.fr',
      motDePasse: 'p',
      cheminDossier: 'INBOX',
      driver,
      lecteurEmails: lecteur,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.raison).toBe('erreur_lecture_emails');
      expect(r.message).toContain('Connexion IMAP refusée');
    }
  });
});
