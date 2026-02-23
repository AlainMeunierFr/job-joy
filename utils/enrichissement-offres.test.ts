/**
 * Tests TDD pour l'enrichissement des offres (US-1.4 CA3).
 * Récupération du texte depuis l'URL, mise à jour des champs et du statut.
 */
import {
  executerEnrichissementOffres,
  STATUT_A_COMPLETER,
  STATUT_A_ANALYSER,
  STATUT_EXPIRE,
  STATUT_IGNORE,
} from './enrichissement-offres.js';
import { createCadreEmploiOfferFetchPlugin } from './cadreemploi-offer-fetch-plugin.js';
import { createJobThatMakeSenseOfferFetchPlugin } from './job-that-make-sense-offer-fetch-plugin.js';

jest.mock('./cadreemploi-page-fetcher.js', () => ({
  fetchCadreEmploiPage: jest.fn().mockResolvedValue({ error: 'Playwright indisponible (test)' }),
}));
import { createWelcomeToTheJungleOfferFetchPlugin } from './welcome-to-the-jungle-offer-fetch-plugin.js';

describe('executerEnrichissementOffres', () => {
  it('retourne ok avec nbEnrichies 0 et nbEchecs 0 quand il n’y a aucune offre à récupérer', async () => {
    const driver = {
      getOffresARecuperer: async () => [],
      updateOffre: async () => {},
    };
    const fetcher = {
      recupererContenuOffre: async () => ({ ok: false as const, message: 'N/A' }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbEnrichies).toBe(0);
      expect(r.nbEchecs).toBe(0);
    }
  });

  it('met à jour l’offre, renseigne le texte et passe le statut quand les données sont suffisantes', async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        { id: 'rec1', url: 'https://www.linkedin.com/jobs/view/1/', statut: STATUT_A_COMPLETER },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({
        ok: true as const,
        champs: {
          texteOffre: 'Description du poste',
          poste: 'Développeur',
          entreprise: 'Acme',
          ville: 'Paris',
        },
      }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbEnrichies).toBe(1);
      expect(r.nbEchecs).toBe(0);
    }
    expect(updateOffre).toHaveBeenCalledWith('rec1', {
      "Texte de l'offre": 'Description du poste',
      Poste: 'Développeur',
      Entreprise: 'Acme',
      Ville: 'Paris',
      Statut: STATUT_A_ANALYSER,
    });
  });

  it("renseigne le champ \"Texte de l'offre\" même si les données restent insuffisantes pour la transition", async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        { id: 'recTexteSeul', url: 'https://www.linkedin.com/jobs/view/4/', statut: STATUT_A_COMPLETER },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({
        ok: true as const,
        champs: { texteOffre: 'Résumé court tronqué' },
      }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbEnrichies).toBe(1);
      expect(r.nbEchecs).toBe(0);
    }
    expect(updateOffre).toHaveBeenCalledWith('recTexteSeul', {
      "Texte de l'offre": 'Résumé court tronqué',
    });
  });

  it('passe le statut à "À analyser" quand les données enrichies sont suffisantes', async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        { id: 'recSuffisant', url: 'https://www.hellowork.com/fr-fr/emplois/99.html', statut: STATUT_A_COMPLETER },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({
        ok: true as const,
        champs: {
          texteOffre: 'Description complète',
          poste: 'Développeur TypeScript',
        },
      }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbEnrichies).toBe(1);
      expect(r.nbEchecs).toBe(0);
    }
    expect(updateOffre).toHaveBeenCalledWith('recSuffisant', {
      "Texte de l'offre": 'Description complète',
      Poste: 'Développeur TypeScript',
      Statut: STATUT_A_ANALYSER,
    });
  });

  it('passe le statut à "À analyser" si le texte est enrichi et que les métadonnées sont déjà présentes depuis étape 1', async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        {
          id: 'recMetaEtape1',
          url: 'https://www.hellowork.com/fr-fr/emplois/123.html',
          statut: STATUT_A_COMPLETER,
          poste: 'Product Owner',
          ville: 'Nantes',
        },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({
        ok: true as const,
        champs: {
          texteOffre: 'Description détaillée récupérée en étape 2',
        },
      }),
    };

    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbEnrichies).toBe(1);
      expect(r.nbEchecs).toBe(0);
    }
    expect(updateOffre).toHaveBeenCalledWith('recMetaEtape1', {
      "Texte de l'offre": 'Description détaillée récupérée en étape 2',
      Statut: STATUT_A_ANALYSER,
    });
  });

  it('ne met pas à jour le statut et consigne l’échec quand le fetcher échoue', async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        { id: 'rec2', url: 'https://www.linkedin.com/jobs/view/2/', statut: STATUT_A_COMPLETER },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({
        ok: false as const,
        message: 'Authentification requise ou contrainte anti-crawler',
      }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbEnrichies).toBe(0);
      expect(r.nbEchecs).toBe(1);
      expect(r.messages.some((m) => m.includes('rec2') || m.includes('échec') || m.includes('anti-crawler'))).toBe(
        true
      );
    }
    expect(updateOffre).toHaveBeenCalledWith('rec2', { Statut: STATUT_IGNORE });
  });

  it('passe le statut à Expiré quand le fetcher indique une offre expirée (ex. HelloWork 404/410)', async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        { id: 'recExpire', url: 'https://www.hellowork.com/fr-fr/emplois/999.html', statut: STATUT_A_COMPLETER },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({ ok: false as const, message: 'HTTP 404' }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbEnrichies).toBe(0);
      expect(r.nbEchecs).toBe(1);
    }
    expect(updateOffre).toHaveBeenCalledWith('recExpire', { Statut: STATUT_EXPIRE });
  });

  it('passe le statut à Expiré quand le fetcher retourne AgentIaJsonOffre introuvable (HelloWork)', async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        { id: 'recHw', url: 'https://www.hellowork.com/fr-fr/emplois/123.html', statut: STATUT_A_COMPLETER },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({ ok: false as const, message: 'AgentIaJsonOffre introuvable.' }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nbEchecs).toBe(1);
    expect(updateOffre).toHaveBeenCalledWith('recHw', { Statut: STATUT_EXPIRE });
  });

  it('passe le statut à Ignoré quand le contenu est vide ou non exploitable (sort du pool)', async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        { id: 'rec3', url: 'https://www.linkedin.com/jobs/view/3/', statut: STATUT_A_COMPLETER },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({
        ok: true as const,
        champs: {},
      }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nbEnrichies).toBe(0);
      expect(r.nbEchecs).toBe(1);
      expect(r.messages.length).toBeGreaterThan(0);
    }
    expect(updateOffre).toHaveBeenCalledWith('rec3', { Statut: STATUT_IGNORE });
  });

  it('passe le statut à Ignoré quand le fetcher échoue sans indiquer expiré (anti-crawler, timeout)', async () => {
    const updateOffre = jest.fn().mockResolvedValue(undefined);
    const driver = {
      getOffresARecuperer: async () => [
        { id: 'recFail', url: 'https://example.com/job/1', statut: STATUT_A_COMPLETER },
      ],
      updateOffre,
    };
    const fetcher = {
      recupererContenuOffre: async () => ({
        ok: false as const,
        message: 'URL inaccessible (anti-crawler) HTTP 403',
      }),
    };
    const r = await executerEnrichissementOffres({ driver, fetcher });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nbEchecs).toBe(1);
    expect(updateOffre).toHaveBeenCalledWith('recFail', { Statut: STATUT_IGNORE });
  });

  it('US-1.10 étape 2 worker WTTJ: renseigne "Texte de l\'offre" et passe à "À analyser" si données suffisantes', async () => {
    const plugin = createWelcomeToTheJungleOfferFetchPlugin();
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <html><head>
          <script type="application/ld+json">
            {"@type":"JobPosting","title":"Product Manager","description":"<p>Texte de l'offre WTTJ</p>","hiringOrganization":{"name":"Acme"}}
          </script>
        </head></html>
      `,
    });
    try {
      const updateOffre = jest.fn().mockResolvedValue(undefined);
      const driver = {
        getOffresARecuperer: async () => [
          {
            id: 'recWttj1',
            url: 'https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris',
            statut: STATUT_A_COMPLETER,
          },
        ],
        updateOffre,
      };
      const r = await executerEnrichissementOffres({ driver, fetcher: plugin });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nbEnrichies).toBe(1);
        expect(r.nbEchecs).toBe(0);
      }
      expect(updateOffre).toHaveBeenCalledWith('recWttj1', {
        "Texte de l'offre": "Texte de l'offre WTTJ",
        Poste: 'Product Manager',
        Entreprise: 'Acme',
        Statut: STATUT_A_ANALYSER,
      });
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it("US-1.10 étape 2 worker WTTJ: URL inaccessible/anti-crawler -> pas de transition + motif traçable", async () => {
    const plugin = createWelcomeToTheJungleOfferFetchPlugin();
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    try {
      const updateOffre = jest.fn().mockResolvedValue(undefined);
      const driver = {
        getOffresARecuperer: async () => [
          {
            id: 'recWttj2',
            url: 'https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris',
            statut: STATUT_A_COMPLETER,
          },
        ],
        updateOffre,
      };
      const r = await executerEnrichissementOffres({ driver, fetcher: plugin });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nbEnrichies).toBe(0);
        expect(r.nbEchecs).toBe(1);
        expect(r.messages.some((m) => /anti-crawler|inaccessible|échec/i.test(m))).toBe(true);
      }
      expect(updateOffre).toHaveBeenCalledWith('recWttj2', { Statut: STATUT_IGNORE });
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('US-1.11 étape 2 worker JTMS: données suffisantes -> texte + transition "À analyser"', async () => {
    const plugin = createJobThatMakeSenseOfferFetchPlugin();
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<script type="application/ld+json">{"@type":"JobPosting","title":"Product Manager","description":"<p>Texte JTMS</p>","hiringOrganization":{"name":"Acme"}}</script>',
    });
    try {
      const updateOffre = jest.fn().mockResolvedValue(undefined);
      const driver = {
        getOffresARecuperer: async () => [
          { id: 'recJtms1', url: 'https://jobs.makesense.org/jobs/abc123', statut: STATUT_A_COMPLETER },
        ],
        updateOffre,
      };
      const r = await executerEnrichissementOffres({ driver, fetcher: plugin });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.nbEnrichies).toBe(1);
      expect(updateOffre).toHaveBeenCalledWith('recJtms1', {
        "Texte de l'offre": 'Texte JTMS',
        Poste: 'Product Manager',
        Entreprise: 'Acme',
        Statut: STATUT_A_ANALYSER,
      });
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('US-1.12 étape 2 worker Cadre Emploi: URL inaccessible/anti-crawler -> passage à Ignoré (sort du pool)', async () => {
    const plugin = createCadreEmploiOfferFetchPlugin();
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    try {
      const updateOffre = jest.fn().mockResolvedValue(undefined);
      const driver = {
        getOffresARecuperer: async () => [
          {
            id: 'recCe1',
            url: 'https://www.cadremploi.fr/emploi/detail_offre?offreId=1',
            statut: STATUT_A_COMPLETER,
          },
        ],
        updateOffre,
      };
      const r = await executerEnrichissementOffres({ driver, fetcher: plugin });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.nbEnrichies).toBe(0);
        expect(r.nbEchecs).toBe(1);
      }
      expect(updateOffre).toHaveBeenCalledWith('recCe1', { Statut: STATUT_IGNORE });
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
