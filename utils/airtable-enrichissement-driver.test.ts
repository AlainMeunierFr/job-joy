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
              Statut: 'Annonce à récupérer',
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
      expect(r[0]).toEqual({
        id: 'rec1',
        url: 'https://linkedin.com/jobs/view/1/',
        statut: 'Annonce à récupérer',
        poste: 'PO',
        entreprise: 'Acme',
        ville: 'Paris',
        département: '75',
        salaire: undefined,
        dateOffre: undefined,
      });
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
      });
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
