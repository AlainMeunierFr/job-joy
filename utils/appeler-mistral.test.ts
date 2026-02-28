/**
 * Tests pour appelerMistral (US-8.1).
 * Mock fetch, pas de clé → no_api_key, réponse 200 avec content → ok true avec texte.
 */
import { MESSAGE_ERREUR_RESEAU } from './erreur-reseau.js';
import { appelerMistral } from './appeler-mistral.js';

describe('appelerMistral', () => {
  const dataDir = '/tmp/data-mistral-test';

  it('retourne ok: false, code no_api_key quand aucune clé configurée', async () => {
    const mockFetch = jest.fn();
    const result = await appelerMistral(dataDir, 'System', 'User msg', mockFetch, () => undefined);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, code: 'no_api_key', message: expect.any(String) });
  });

  it('retourne ok: true et texte quand l’API renvoie du contenu', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"Poste":"Dev","Entreprise":"Acme"}' } }],
      }),
    });
    const result = await appelerMistral(
      dataDir,
      'Tu es un assistant.',
      'Analyse cette offre.',
      mockFetch,
      () => 'sk-mistral-test-key'
    );
    expect(result).toEqual({ ok: true, texte: '{"Poste":"Dev","Entreprise":"Acme"}' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-mistral-test-key',
          'content-type': 'application/json',
        }),
      })
    );
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe('mistral-small-latest');
    expect(body.max_tokens).toBe(1000);
    expect(body.messages).toEqual([
      { role: 'system', content: 'Tu es un assistant.' },
      { role: 'user', content: 'Analyse cette offre.' },
    ]);
  });

  it('retourne ok: false avec code et message quand l’API renvoie une erreur', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid API key' }),
    });
    const result = await appelerMistral(
      dataDir,
      'System',
      'User',
      mockFetch,
      () => 'sk-mistral-key'
    );
    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe('401');
    expect((result as { message?: string }).message).toBeDefined();
  });

  it('retourne ok: false quand la réponse n’a pas choices[0].message.content', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    });
    const result = await appelerMistral(
      dataDir,
      'System',
      'User',
      mockFetch,
      () => 'sk-mistral-key'
    );
    expect(result).toEqual({ ok: false, code: 'invalid_response', message: expect.any(String) });
  });

  it('réessaie après une erreur réseau puis réussit', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'OK' } }] }),
      });
    const result = await appelerMistral(
      dataDir,
      'System',
      'User',
      mockFetch,
      () => 'sk-mistral-key'
    );
    expect(result).toEqual({ ok: true, texte: 'OK' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it(
    'retourne message utilisateur clair après échec réseau (toutes tentatives)',
    async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('fetch failed'));
      const result = await appelerMistral(
        dataDir,
        'System',
        'User',
        mockFetch,
        () => 'sk-mistral-key'
      );
      expect(result.ok).toBe(false);
      expect((result as { message?: string }).message).toContain(MESSAGE_ERREUR_RESEAU);
    },
    15_000
  );
});
