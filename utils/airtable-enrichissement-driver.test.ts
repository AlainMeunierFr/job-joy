/**
 * Tests pour le driver Airtable enrichissement (US-1.4 CA3).
 */
import { createAirtableEnrichissementDriver } from './airtable-enrichissement-driver.js';

describe('createAirtableEnrichissementDriver', () => {
  const apiKey = 'patTest';
  const baseId = 'appBase';
  const offresId = 'tblOffres';

  it('getOffresARecuperer retourne un tableau vide quand aucune offre à récupérer', async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] }),
    });
    try {
      const driver = createAirtableEnrichissementDriver({ apiKey, baseId, offresId });
      const r = await driver.getOffresARecuperer();
      expect(r).toEqual([]);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('getOffresARecuperer retourne les offres avec id, url, statut', async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [
          {
            id: 'rec1',
            fields: {
              URL: 'https://linkedin.com/jobs/view/1/',
              Statut: 'A compléter',
              Poste: 'PO',
              Entreprise: 'Acme',
              Ville: 'Paris',
              Département: '75',
            },
          },
        ],
      }),
    });
    try {
      const driver = createAirtableEnrichissementDriver({ apiKey, baseId, offresId });
      const r = await driver.getOffresARecuperer();
      expect(r).toHaveLength(1);
      expect(r[0]).toMatchObject({
        id: 'rec1',
        url: 'https://linkedin.com/jobs/view/1/',
        statut: 'A compléter',
        poste: 'PO',
        entreprise: 'Acme',
        ville: 'Paris',
        département: '75',
      });
      expect(r[0].salaire).toBeUndefined();
      expect(r[0].dateOffre).toBeUndefined();
      expect(r[0].emailExpéditeur).toBeUndefined();
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('updateOffre envoie un PATCH avec les champs', async () => {
    let capturedBody: unknown = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
      capturedBody = opts?.body ? JSON.parse(opts.body as string) : null;
      return Promise.resolve({ ok: true });
    });
    try {
      const driver = createAirtableEnrichissementDriver({ apiKey, baseId, offresId });
      await driver.updateOffre('rec1', {
        'Texte de l\'offre': 'Desc',
        Poste: 'Dev',
        Statut: 'À analyser',
      });
      expect(capturedBody).toEqual({
        fields: {
          'Texte de l\'offre': 'Desc',
          Poste: 'Dev',
          Statut: 'À analyser',
        },
        typecast: true,
      });
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('getOffresARecuperer filtre par Activer l\'enrichissement quand sourcesId est fourni', async () => {
    const sourcesId = 'tblSources';
    const callUrls: string[] = [];
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url: string, _opts?: RequestInit) => {
      callUrls.push(url);
      if (url.includes(sourcesId)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            records: [
              {
                id: 'recHW',
                fields: {
                  'Activer l\'enrichissement': true,
                  source: 'HelloWork',
                  Adresse: 'notification@emails.hellowork.com',
                },
              },
              {
                id: 'recLinkedIn',
                fields: {
                  "Activer l'enrichissement": false,
                  source: 'Linkedin',
                  Adresse: 'jobs@linkedin.com',
                },
              },
            ],
          }),
        });
      }
      if (url.includes(offresId)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            records: [
              {
                id: 'recOffre1',
                fields: {
                  URL: 'https://www.hellowork.com/fr-fr/emplois/1.html',
                  Statut: 'A compléter',
                  Adresse: ['recHW'],
                },
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ records: [] }) });
    });
    try {
      const driver = createAirtableEnrichissementDriver({
        apiKey,
        baseId,
        offresId,
        sourcesId,
      });
      const r = await driver.getOffresARecuperer();
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('recOffre1');
      expect(r[0].url).toContain('hellowork');
      expect(r[0].emailExpéditeur).toBe('notification@emails.hellowork.com');
      expect(callUrls.some((u) => u.includes(sourcesId))).toBe(true);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('US-2.1 / US-3.2 : updateOffre envoie CritèreRéhibitoire1..4 (texte) dans le body PATCH', async () => {
    let capturedBody: unknown = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body ? JSON.parse(opts.body as string) : null;
      return Promise.resolve({ ok: true });
    });
    try {
      const driver = createAirtableEnrichissementDriver({ apiKey, baseId, offresId });
      await driver.updateOffre('rec1', {
        Poste: 'Dev',
        Statut: 'À traiter',
        CritèreRéhibitoire1: 'Télétravail non mentionné.',
        CritèreRéhibitoire2: 'Salaire non indiqué.',
      });
      const body = capturedBody as { fields: Record<string, unknown> };
      expect(body.fields.CritèreRéhibitoire1).toBe('Télétravail non mentionné.');
      expect(body.fields.CritèreRéhibitoire2).toBe('Salaire non indiqué.');
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('getOffresAAnalyser ne retourne que les offres dont la source a Activer l\'analyse par IA coché', async () => {
    const sourcesId = 'tblSources';
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url: string, _opts?: RequestInit) => {
      if (url.includes(sourcesId)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            records: [
              {
                id: 'recAvecIA',
                fields: {
                  "Activer l'analyse par IA": true,
                  source: 'Linkedin',
                  Adresse: 'avec-ia@test.com',
                },
              },
              {
                id: 'recSansIA',
                fields: {
                  "Activer l'analyse par IA": false,
                  source: 'HelloWork',
                  Adresse: 'sans-ia@test.com',
                },
              },
            ],
          }),
        });
      }
      if (url.includes(offresId)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            records: [
              {
                id: 'recOffre1',
                fields: {
                  Statut: 'À analyser',
                  Poste: 'Dev',
                  Ville: 'Paris',
                  "Texte de l'offre": 'Desc',
                  Adresse: ['recAvecIA'],
                },
              },
              {
                id: 'recOffre2',
                fields: {
                  Statut: 'À analyser',
                  Poste: 'PO',
                  Ville: 'Lyon',
                  "Texte de l'offre": 'Desc2',
                  Adresse: ['recSansIA'],
                },
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ records: [] }) });
    });
    try {
      const driver = createAirtableEnrichissementDriver({
        apiKey,
        baseId,
        offresId,
        sourcesId,
      });
      expect(driver.getOffresAAnalyser).toBeDefined();
      const r = await driver.getOffresAAnalyser!();
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('recOffre1');
      expect(r[0].poste).toBe('Dev');
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('getOffresAAnalyser filtre par sourceNomsActifs (sources.json) quand fourni', async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes(offresId)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            records: [
              { id: 'rec1', fields: { Statut: 'À analyser', source: 'APEC', Poste: 'Dev', "Texte de l'offre": 'T' } },
              { id: 'rec2', fields: { Statut: 'À analyser', source: 'Cadre Emploi', Poste: 'PO', "Texte de l'offre": 'T2' } },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ records: [] }) });
    });
    try {
      const driver = createAirtableEnrichissementDriver({
        apiKey,
        baseId,
        offresId,
        sourceNomsActifs: new Set(['APEC']),
      });
      const r = await driver.getOffresAAnalyser!();
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('rec1');
      expect(r[0].poste).toBe('Dev');
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('updateOffre n\'envoie pas les champs vides pour ne pas écraser des données phase 2', async () => {
    let capturedBody: unknown = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body ? JSON.parse(opts.body as string) : null;
      return Promise.resolve({ ok: true });
    });
    try {
      const driver = createAirtableEnrichissementDriver({ apiKey, baseId, offresId });
      await driver.updateOffre('rec1', {
        'Texte de l\'offre': '',
        Poste: 'Dev',
        Entreprise: undefined,
        Statut: 'À analyser',
      });
      const body = capturedBody as { fields: Record<string, string> };
      expect(body.fields).not.toHaveProperty("Texte de l'offre");
      expect(body.fields).not.toHaveProperty('Entreprise');
      expect(body.fields).toEqual({ Poste: 'Dev', Statut: 'À analyser' });
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
