/**
 * Appel à l'API Mistral Chat Completions pour l'analyse IA (US-8.1).
 * Timeout long + retry en cas d'erreur réseau ou timeout.
 */
import { messageErreurReseau, MESSAGE_ERREUR_RESEAU } from './erreur-reseau.js';
import { lireMistral } from './parametres-mistral.js';

/** Même forme que ResultatAppelClaude (ok + texte ou ok false + code, message). */
export type ResultatAppelIA =
  | { ok: true; texte: string }
  | { ok: false; code: string; message?: string };

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type GetApiKeyFn = (dataDir: string) => string | undefined;

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const MODEL = 'mistral-small-latest';

/** Timeout par tentative (ms). */
const TIMEOUT_MS = 90_000;
/** Nombre de tentatives (1 tentative initiale + retries). */
const MAX_ATTEMPTS = 3;
/** Délai entre deux tentatives (ms). */
const RETRY_DELAY_MS = 3_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Appelle l'API Mistral (chat completions) avec prompt système et message utilisateur.
 * Timeout 90 s par tentative, jusqu'à 3 tentatives en cas d'erreur réseau ou timeout.
 * Lit la clé via lireMistral(dataDir) sauf si getApiKey est fourni (tests).
 * fetchFn optionnel pour les tests.
 */
export async function appelerMistral(
  dataDir: string,
  promptSystem: string,
  messageUser: string,
  fetchFn?: FetchFn,
  getApiKey?: GetApiKeyFn
): Promise<ResultatAppelIA> {
  const fetch = fetchFn ?? globalThis.fetch;
  const apiKey = getApiKey ? getApiKey(dataDir) : lireMistral(dataDir)?.apiKey;
  if (!apiKey?.trim()) {
    return { ok: false, code: 'no_api_key', message: 'Clé API Mistral non configurée.' };
  }

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 1000,
    messages: [
      { role: 'system' as const, content: promptSystem },
      { role: 'user' as const, content: messageUser },
    ],
  });

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(MISTRAL_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'content-type': 'application/json',
        },
        body,
      });

      clearTimeout(timeoutId);

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        message?: string;
      };

      if (!res.ok) {
        const code = String(res.status);
        const message = data?.message ?? res.statusText ?? 'Erreur API';
        return { ok: false, code, message };
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        return { ok: false, code: 'invalid_response', message: 'Réponse sans contenu texte.' };
      }
      return { ok: true, texte: content };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable =
        lastError.name === 'AbortError' ||
        lastError.message.includes('fetch') ||
        lastError.message.includes('network') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT');

      if (attempt < MAX_ATTEMPTS && isRetryable) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const code = lastError.name === 'AbortError' ? 'timeout' : 'network_error';
      const msgReseau = messageErreurReseau(lastError);
      const message =
        lastError.name === 'AbortError'
          ? `Délai dépassé (${TIMEOUT_MS / 1000} s). ${MAX_ATTEMPTS} tentative(s) effectuée(s).`
          : msgReseau === MESSAGE_ERREUR_RESEAU
            ? `${msgReseau} ${MAX_ATTEMPTS} tentative(s) effectuée(s).`
            : `${msgReseau}. ${MAX_ATTEMPTS} tentative(s) effectuée(s).`;
      return { ok: false, code, message };
    }
  }

  const err = lastError ?? new Error('Échec inconnu');
  const msgReseau = messageErreurReseau(err);
  return {
    ok: false,
    code: 'network_error',
    message:
      msgReseau === MESSAGE_ERREUR_RESEAU
        ? `${msgReseau} ${MAX_ATTEMPTS} tentative(s) effectuée(s).`
        : `${msgReseau}. ${MAX_ATTEMPTS} tentative(s) effectuée(s).`,
  };
}
