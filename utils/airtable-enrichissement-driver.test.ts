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

  it('getOffresARecuperer filtre par sources actives quand sourcesId est fourni', async () => {
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
              { id: 'recHW', fields: { actif: true, plugin: 'HelloWork', emailExpéditeur: 'notification@emails.hellowork.com' } },
              { id: 'recLinkedIn', fields: { actif: false, plugin: 'Linkedin', emailExpéditeur: 'jobs@linkedin.com' } },
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
                  'email expéditeur': ['recHW'],
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
