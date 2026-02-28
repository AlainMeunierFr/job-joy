/**
 * Tests pour le driver Airtable relève (US-1.4).
 * Utilise des mocks fetch pour éviter d'appeler l'API réelle.
 */
import { createAirtableReleveDriver } from './airtable-releve-driver.js';

describe('createAirtableReleveDriver', () => {
  const apiKey = 'patTest';
  const baseId = 'appBase';
  const offresId = 'tblOffres';
  const sourcesId = 'tblSources';

  it('getSourceLinkedIn retourne toujours found: false (sources = data/sources.json, utiliser createCompositeReleveDriver)', async () => {
    const driver = createAirtableReleveDriver({ apiKey, baseId, offresId });
    const r = await driver.getSourceLinkedIn();
    expect(r.found).toBe(false);
  });

  it('creerOffres envoie un POST avec URL, source (nom), Méthode de création et champs extraits', async () => {
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
      const driver = createAirtableReleveDriver({ apiKey, baseId, offresId });
      const result = await driver.creerOffres(
        [
          {
            idOffre: '123',
            url: 'https://www.linkedin.com/jobs/view/123/',
            dateAjout: '2025-01-15T10:00:00.000Z',
            statut: 'A compléter',
            poste: 'Dev',
            entreprise: 'Acme',
            ville: 'Paris',
            département: '75',
            salaire: '60k-70k',
          },
        ],
        'Linkedin',
        'email'
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
        Statut: 'A compléter',
        source: 'Linkedin',
        'Méthode de création': 'email',
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
      const driver = createAirtableReleveDriver({ apiKey, baseId, offresId });
      await driver.creerOffres(
        [
          {
            idOffre: '124',
            url: 'https://www.linkedin.com/jobs/view/124/',
            dateAjout: '2025-01-15T10:00:00.000Z',
            statut: 'A compléter',
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
      const driver = createAirtableReleveDriver({ apiKey, baseId, offresId });
      await driver.creerOffres(
        [
          {
            idOffre: '123',
            url: 'https://www.linkedin.com/jobs/view/123/',
            dateAjout: '2025-01-15T10:00:00.000Z',
            statut: 'A compléter',
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
      const driver = createAirtableReleveDriver({ apiKey, baseId, offresId });
      await driver.creerOffres(
        [
          {
            idOffre: '123',
            url: 'https://www.linkedin.com/jobs/view/123/',
            dateAjout: '2025-01-15T10:00:00.000Z',
            statut: 'A compléter',
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
      expect(fields).toHaveProperty('Statut', 'A compléter');
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it('listerSources retourne [] (sources = data/sources.json)', async () => {
    const driver = createAirtableReleveDriver({ apiKey, baseId, offresId });
    const sources = await driver.listerSources();
    expect(sources).toEqual([]);
  });

  it('creerSource lance une erreur (sources = data/sources.json)', async () => {
    const driver = createAirtableReleveDriver({ apiKey, baseId, offresId });
    await expect(
      driver.creerSource({
        emailExpéditeur: 'Alertes@Unknown.test',
        source: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      })
    ).rejects.toThrow(/data\/sources\.json|createCompositeReleveDriver/);
  });

  it('mettreAJourSource ne fait pas d’appel API (no-op)', async () => {
    const driver = createAirtableReleveDriver({ apiKey, baseId, offresId });
    await expect(
      driver.mettreAJourSource('rec1', { source: 'Inconnu', activerEnrichissement: false })
    ).resolves.toBeUndefined();
  });
});
