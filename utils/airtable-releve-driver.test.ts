/**
 * Tests pour le driver Airtable relève (US-1.4).
 * Utilise des mocks fetch pour éviter d'appeler l'API réelle.
 */
import { createAirtableReleveDriver } from './airtable-releve-driver.js';

describe('createAirtableReleveDriver', () => {
  const apiKey = 'patTest';
  const baseId = 'appBase';
  const sourcesId = 'tblSources';
  const offresId = 'tblOffres';

  it('getSourceLinkedIn retourne found: false quand la table Sources ne contient pas LinkedIn', async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] }),
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      const r = await driver.getSourceLinkedIn();
      expect(r.found).toBe(false);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('getSourceLinkedIn retourne found: true avec actif et emailExpéditeur quand un enregistrement algo=Linkedin existe', async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [
          {
            id: 'recLinkedIn',
            fields: {
              algo: 'Linkedin',
              emailExpéditeur: 'jobs-noreply@linkedin.com',
              actif: true,
            },
          },
        ],
      }),
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      const r = await driver.getSourceLinkedIn();
      expect(r.found).toBe(true);
      if (r.found) {
        expect(r.sourceId).toBe('recLinkedIn');
        expect(r.actif).toBe(true);
        expect(r.emailExpéditeur).toBe('jobs-noreply@linkedin.com');
      }
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('getSourceLinkedIn retourne actif: false quand le champ actif est false', async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [
          {
            id: 'recX',
            fields: {
              algo: 'Linkedin',
              emailExpéditeur: 'j@l.com',
              actif: false,
            },
          },
        ],
      }),
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      const r = await driver.getSourceLinkedIn();
      expect(r.found).toBe(true);
      if (r.found) expect(r.actif).toBe(false);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('creerOffres envoie un POST avec URL, email expéditeur (lien Sources) et champs extraits du mail quand présents', async () => {
    let capturedUrl = '';
    let capturedBody: unknown = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
      capturedUrl = url;
      const method = opts?.method ?? 'GET';
      if (method === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ records: [] }) });
      }
      capturedBody = opts?.body ? JSON.parse(opts.body as string) : null;
      return Promise.resolve({ ok: true, json: async () => ({ records: [{ id: 'recNew' }] }) });
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      const result = await driver.creerOffres(
        [
          {
            idOffre: '123',
            url: 'https://www.linkedin.com/jobs/view/123/',
            dateAjout: '2025-01-15T10:00:00.000Z',
            statut: 'Annonce à récupérer',
            poste: 'Dev',
            entreprise: 'Acme',
            ville: 'Paris',
            département: '75',
            salaire: '60k-70k',
          },
        ],
        'recLinkedIn'
      );
      expect(result).toEqual({ nbCreees: 1, nbDejaPresentes: 0 });
      expect(capturedUrl).toContain(baseId);
      expect(capturedUrl).toContain(offresId);
      expect(capturedBody).not.toBeNull();
      const body = capturedBody as { records: Array<{ fields: Record<string, unknown> }> };
      expect(body.records).toHaveLength(1);
      expect(body.records[0].fields).toMatchObject({
        'Id offre': '123',
        URL: 'https://www.linkedin.com/jobs/view/123/',
        DateAjout: '2025-01-15T10:00:00.000Z',
        Statut: 'Annonce à récupérer',
        'email expéditeur': ['recLinkedIn'],
        Poste: 'Dev',
        Entreprise: 'Acme',
        Ville: 'Paris',
        Département: '75',
        Salaire: '60k-70k',
      });
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('creerOffres conserve le fallback historique lieu -> champ Airtable Ville (non regression Linkedin)', async () => {
    let capturedBody: unknown = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if ((opts?.method ?? 'GET') === 'GET') return Promise.resolve({ ok: true, json: async () => ({ records: [] }) });
      capturedBody = opts?.body ? JSON.parse(opts.body as string) : null;
      return Promise.resolve({ ok: true, json: async () => ({ records: [{ id: 'recNew' }] }) });
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      await driver.creerOffres(
        [
          {
            idOffre: '124',
            url: 'https://www.linkedin.com/jobs/view/124/',
            dateAjout: '2025-01-15T10:00:00.000Z',
            statut: 'Annonce à récupérer',
            lieu: 'Lyon',
          },
        ],
        'recLinkedIn'
      );
      const body = capturedBody as { records: Array<{ fields: Record<string, unknown> }> };
      expect(body.records[0].fields.Ville).toBe('Lyon');
      expect(body.records[0].fields.Département).toBeUndefined();
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('creerOffres retente sans Statut si Airtable refuse une option single select', async () => {
    const calls: Array<{ url: string; method?: string; body: unknown }> = [];
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest
      .fn()
      .mockImplementationOnce((url: string, opts?: RequestInit) => {
        calls.push({ url, method: opts?.method, body: opts?.body ? JSON.parse(opts.body as string) : null });
        return Promise.resolve({ ok: true, json: async () => ({ records: [] }) });
      })
      .mockImplementationOnce((url: string, opts?: RequestInit) => {
        calls.push({ url, method: opts?.method, body: opts?.body ? JSON.parse(opts.body as string) : null });
        return Promise.resolve({
          ok: false,
          status: 422,
          text: async () =>
            '{"error":{"type":"INVALID_MULTIPLE_CHOICE_OPTIONS","message":"Insufficient permissions"}}',
        });
      })
      .mockImplementationOnce((url: string, opts?: RequestInit) => {
        calls.push({ url, method: opts?.method, body: opts?.body ? JSON.parse(opts.body as string) : null });
        return Promise.resolve({ ok: true, json: async () => ({ records: [{ id: 'recNew' }] }) });
      });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      await driver.creerOffres(
        [
          {
            idOffre: '123',
            url: 'https://www.linkedin.com/jobs/view/123/',
            dateAjout: '2025-01-15T10:00:00.000Z',
            statut: 'Annonce à récupérer',
            poste: 'Dev',
            entreprise: 'Acme',
            ville: 'Paris',
            salaire: '60k-70k',
          },
        ],
        'recLinkedIn'
      );
      expect(calls).toHaveLength(3);
      const postRetryBody = calls[2].body as { records: Array<{ fields: Record<string, unknown> }> };
      expect(postRetryBody.records[0].fields.Statut).toBeUndefined();
      expect(postRetryBody.records[0].fields.URL).toBe('https://www.linkedin.com/jobs/view/123/');
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('creerOffres PATCH (offre déjà présente) n\'envoie pas les champs vides pour ne pas écraser la phase 2', async () => {
    const calls: Array<{ method?: string; body: unknown }> = [];
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      const method = opts?.method ?? 'GET';
      const body = opts?.body ? JSON.parse(opts.body as string) : null;
      calls.push({ method, body });
      if (method === 'GET') {
        return Promise.resolve({ ok: true, json: async () => ({ records: [{ id: 'recExist' }] }) });
      }
      return Promise.resolve({ ok: true });
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      await driver.creerOffres(
        [
          {
            idOffre: '123',
            url: 'https://www.linkedin.com/jobs/view/123/',
            dateAjout: '2025-01-15T10:00:00.000Z',
            statut: 'Annonce à récupérer',
            poste: '',
            entreprise: '',
          },
        ],
        'recLinkedIn'
      );
      expect(calls).toHaveLength(2);
      const patchCall = calls.find((c) => c.method === 'PATCH');
      expect(patchCall).toBeDefined();
      const patchBody = patchCall!.body as { records: Array<{ id: string; fields: Record<string, unknown> }> };
      const fields = patchBody.records[0].fields;
      expect(fields).not.toHaveProperty('Poste');
      expect(fields).not.toHaveProperty('Entreprise');
      expect(fields).toHaveProperty('URL', 'https://www.linkedin.com/jobs/view/123/');
      expect(fields).toHaveProperty('Statut', 'Annonce à récupérer');
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('listerSources lit emailExpéditeur lowercase + algo + actif', async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [
          {
            id: 'rec1',
            fields: {
              emailExpéditeur: 'Jobs@LinkedIn.com',
              algo: 'Linkedin',
              actif: true,
            },
          },
        ],
      }),
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      const sources = await driver.listerSources();
      expect(sources).toEqual([
        {
          sourceId: 'rec1',
          emailExpéditeur: 'jobs@linkedin.com',
          algo: 'Linkedin',
          actif: true,
        },
      ]);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('creerSource écrit emailExpéditeur/algo/actif', async () => {
    let capturedBody: unknown = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body ? JSON.parse(opts.body as string) : null;
      return Promise.resolve({ ok: true, json: async () => ({ records: [{ id: 'recNew' }] }) });
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      await driver.creerSource({
        emailExpéditeur: 'Alertes@Unknown.test',
        algo: 'Inconnu',
        actif: false,
      });
      const body = capturedBody as { records: Array<{ fields: Record<string, unknown> }> };
      expect(body.records[0].fields).toMatchObject({
        emailExpéditeur: 'alertes@unknown.test',
        algo: 'Inconnu',
        actif: false,
      });
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('mettreAJourSource patch algo/actif', async () => {
    let capturedBody: unknown = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      capturedBody = opts?.body ? JSON.parse(opts.body as string) : null;
      return Promise.resolve({ ok: true, text: async () => '' });
    });
    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      await driver.mettreAJourSource('rec1', { algo: 'Inconnu', actif: false });
      const body = capturedBody as { records: Array<{ id: string; fields: Record<string, unknown> }> };
      expect(body.records).toEqual([{ id: 'rec1', fields: { algo: 'Inconnu', actif: false } }]);
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('creerSource auto-ajoute option algo manquante puis retente', async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = [];
    const globalFetch = globalThis.fetch;
    globalThis.fetch = jest
      .fn()
      // 1) POST Sources -> 422 invalid single select option
      .mockImplementationOnce((url: string, opts?: RequestInit) => {
        calls.push({ url, method: opts?.method ?? 'GET', body: opts?.body ? JSON.parse(opts.body as string) : null });
        return Promise.resolve({
          ok: false,
          status: 422,
          text: async () =>
            '{"error":{"type":"INVALID_MULTIPLE_CHOICE_OPTIONS","message":"Insufficient permissions to create new select option"}}',
        });
      })
      // 2) POST Sources typecast=true -> still KO (force fallback meta)
      .mockImplementationOnce((url: string, opts?: RequestInit) => {
        calls.push({ url, method: opts?.method ?? 'GET', body: opts?.body ? JSON.parse(opts.body as string) : null });
        return Promise.resolve({
          ok: false,
          status: 422,
          text: async () =>
            '{"error":{"type":"INVALID_MULTIPLE_CHOICE_OPTIONS","message":"Still not allowed with typecast"}}',
        });
      })
      // 3) GET meta schema
      .mockImplementationOnce((url: string, opts?: RequestInit) => {
        calls.push({ url, method: opts?.method ?? 'GET', body: null });
        return Promise.resolve({
          ok: true,
          json: async () => ({
            tables: [
              {
                id: sourcesId,
                name: 'Sources',
                fields: [
                  {
                    id: 'fldAlgo',
                    name: 'algo',
                    type: 'singleSelect',
                    options: { choices: [{ name: 'Linkedin' }, { name: 'Inconnu' }] },
                  },
                ],
              },
            ],
          }),
        });
      })
      // 4) PATCH meta field algo choices
      .mockImplementationOnce((url: string, opts?: RequestInit) => {
        calls.push({ url, method: opts?.method ?? 'GET', body: opts?.body ? JSON.parse(opts.body as string) : null });
        return Promise.resolve({ ok: true, text: async () => '' });
      })
      // 5) POST Sources retry -> ok
      .mockImplementationOnce((url: string, opts?: RequestInit) => {
        calls.push({ url, method: opts?.method ?? 'GET', body: opts?.body ? JSON.parse(opts.body as string) : null });
        return Promise.resolve({ ok: true, json: async () => ({ records: [{ id: 'recNew' }] }) });
      });

    try {
      const driver = createAirtableReleveDriver({ apiKey, baseId, sourcesId, offresId });
      await driver.creerSource({
        emailExpéditeur: 'alerts@welcometothejungle.com',
        algo: 'Welcome to the Jungle',
        actif: true,
      });
      expect(calls).toHaveLength(5);
      const typecastCall = calls[1];
      const typecastBody = typecastCall.body as { typecast?: boolean };
      expect(typecastBody.typecast).toBe(true);
      const patchCall = calls[3];
      expect(patchCall.method).toBe('PATCH');
      const patchBody = patchCall.body as { options?: { choices?: Array<{ name: string }> } };
      const choices = patchBody.options?.choices?.map((c) => c.name) ?? [];
      expect(choices).toContain('Welcome to the Jungle');
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
