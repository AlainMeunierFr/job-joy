/**
 * Tests pour appelerClaudeCode (US-2.4, baby step 3).
 */
import { appelerClaudeCode } from './appeler-claudecode.js';

describe('appelerClaudeCode', () => {
  const dataDir = '/tmp/data-claudecode-test';

  it('retourne ok: false, code no_api_key quand aucune clé configurée', async () => {
    const mockFetch = jest.fn();
    const result = await appelerClaudeCode(dataDir, 'System', 'User msg', mockFetch, () => undefined);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, code: 'no_api_key', message: expect.any(String) });
  });

  it('retourne ok: true et texte quand l’API renvoie du contenu', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: '{"Poste":"Dev","Entreprise":"Acme"}' }],
      }),
    });
    const result = await appelerClaudeCode(
      dataDir,
      'Tu es un assistant.',
      'Analyse cette offre.',
      mockFetch,
      () => 'sk-ant-test-key'
    );
    expect(result).toEqual({ ok: true, texte: '{"Poste":"Dev","Entreprise":"Acme"}' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'sk-ant-test-key',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        }),
      })
    );
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe('claude-sonnet-4-6');
    expect(body.system).toBe('Tu es un assistant.');
    expect(body.messages).toEqual([{ role: 'user', content: 'Analyse cette offre.' }]);
  });

  it('retourne ok: false avec code et message quand l’API renvoie une erreur', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { type: 'authentication_error', message: 'Invalid API key' } }),
    });
    const result = await appelerClaudeCode(
      dataDir,
      'System',
      'User',
      mockFetch,
      () => 'sk-ant-key'
    );
    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe('401');
    expect((result as { message?: string }).message).toMatch(/Invalid API key|401/);
  });

  it('retourne ok: false quand la réponse n’a pas content[0].text', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [] }),
    });
    const result = await appelerClaudeCode(
      dataDir,
      'System',
      'User',
      mockFetch,
      () => 'sk-ant-key'
    );
    expect(result).toEqual({ ok: false, code: 'invalid_response', message: expect.any(String) });
  });

  it('réessaie après une erreur réseau puis réussit', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: 'OK' }] }),
      });
    const result = await appelerClaudeCode(
      dataDir,
      'System',
      'User',
      mockFetch,
      () => 'sk-ant-key'
    );
    expect(result).toEqual({ ok: true, texte: 'OK' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
