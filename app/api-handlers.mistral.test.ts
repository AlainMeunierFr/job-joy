/**
 * Tests POST /api/test-mistral (US-8.1) — métadonnées dans le payload.
 */
import type { ServerResponse } from 'node:http';
import { appelerMistral } from '../utils/appeler-mistral.js';
import { handlePostTestMistral } from './api-handlers.js';

jest.mock('../utils/appeler-mistral.js');
jest.mock('../utils/parametres-mistral.js', () => ({
  lireMistral: () => ({ hasApiKey: true }),
}));
jest.mock('../utils/prompt-ia.js', () => ({
  ...jest.requireActual('../utils/prompt-ia.js'),
  construirePromptComplet: () => 'System prompt',
}));

const appelerMistralMock = appelerMistral as jest.MockedFunction<typeof appelerMistral>;

function createMockRes(): ServerResponse & { end: jest.Mock } {
  const res = {
    writeHead: jest.fn(),
    end: jest.fn(),
  } as unknown as ServerResponse;
  return res as ServerResponse & { end: jest.Mock };
}

describe('handlePostTestMistral (US-8.1)', () => {
  beforeEach(() => {
    appelerMistralMock.mockResolvedValue({ ok: true, texte: '{}' });
  });

  it('envoie à Mistral un message contenant le bloc Métadonnées quand poste et ville sont fournis dans le body', async () => {
    const res = createMockRes();
    await handlePostTestMistral('/tmp/data', {
      texteOffre: 'Contenu offre.',
      poste: 'Développeur',
      ville: 'Paris',
    }, res);

    expect(appelerMistralMock).toHaveBeenCalledTimes(1);
    const [, , messageUser] = appelerMistralMock.mock.calls[0];
    expect(typeof messageUser).toBe('string');
    expect(messageUser).toContain('Métadonnées connues :');
    expect(messageUser).toMatch(/Poste\s*=\s*Développeur/);
    expect(messageUser).toMatch(/Ville\s*=\s*Paris/);
    expect(messageUser).toContain("Contenu de l'offre :");
    expect(messageUser).toContain('Contenu offre.');
  });

  it('accepte les métadonnées dans un objet metadata du body', async () => {
    const res = createMockRes();
    await handlePostTestMistral('/tmp/data', {
      texteOffre: 'Texte.',
      metadata: { poste: 'Dev', entreprise: 'Acme' },
    }, res);

    expect(appelerMistralMock).toHaveBeenCalledTimes(1);
    const [, , messageUser] = appelerMistralMock.mock.calls[0];
    expect(messageUser).toContain('Métadonnées connues :');
    expect(messageUser).toMatch(/Poste\s*=\s*Dev/);
    expect(messageUser).toMatch(/Entreprise\s*=\s*Acme/);
  });
});
