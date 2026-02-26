/**
 * Tests POST /api/test-claudecode (US-2.4, US-2.6 métadonnées dans le payload).
 */
import type { ServerResponse } from 'node:http';
import { appelerClaudeCode } from '../utils/appeler-claudecode.js';
import { handlePostTestClaudecode } from './api-handlers.js';

jest.mock('../utils/appeler-claudecode.js');
jest.mock('../utils/parametres-claudecode.js', () => ({
  lireClaudeCode: () => ({ hasApiKey: true }),
}));
jest.mock('../utils/prompt-ia.js', () => ({
  ...jest.requireActual('../utils/prompt-ia.js'),
  construirePromptComplet: () => 'System prompt',
}));

const appelerClaudeCodeMock = appelerClaudeCode as jest.MockedFunction<typeof appelerClaudeCode>;

function createMockRes(): ServerResponse & { end: jest.Mock } {
  const res = {
    writeHead: jest.fn(),
    end: jest.fn(),
  } as unknown as ServerResponse;
  return res as ServerResponse & { end: jest.Mock };
}

describe('handlePostTestClaudecode (US-2.6)', () => {
  beforeEach(() => {
    appelerClaudeCodeMock.mockResolvedValue({ ok: true, texte: '{}' });
  });

  it('envoie à Claude un message contenant le bloc Métadonnées quand poste et ville sont fournis dans le body', async () => {
    const res = createMockRes();
    await handlePostTestClaudecode('/tmp/data', {
      texteOffre: 'Contenu offre.',
      poste: 'Développeur',
      ville: 'Paris',
    }, res);

    expect(appelerClaudeCodeMock).toHaveBeenCalledTimes(1);
    const [, , messageUser] = appelerClaudeCodeMock.mock.calls[0];
    expect(typeof messageUser).toBe('string');
    expect(messageUser).toContain('Métadonnées connues :');
    expect(messageUser).toMatch(/Poste\s*=\s*Développeur/);
    expect(messageUser).toMatch(/Ville\s*=\s*Paris/);
    expect(messageUser).toContain("Contenu de l'offre :");
    expect(messageUser).toContain('Contenu offre.');
  });

  it('accepte les métadonnées dans un objet metadata du body', async () => {
    const res = createMockRes();
    await handlePostTestClaudecode('/tmp/data', {
      texteOffre: 'Texte.',
      metadata: { poste: 'Dev', entreprise: 'Acme' },
    }, res);

    expect(appelerClaudeCodeMock).toHaveBeenCalledTimes(1);
    const [, , messageUser] = appelerClaudeCodeMock.mock.calls[0];
    expect(messageUser).toContain('Métadonnées connues :');
    expect(messageUser).toMatch(/Poste\s*=\s*Dev/);
    expect(messageUser).toMatch(/Entreprise\s*=\s*Acme/);
  });
});
