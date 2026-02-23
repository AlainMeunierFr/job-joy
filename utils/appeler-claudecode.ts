/**
 * Appel à l'API Anthropic Messages pour le test ClaudeCode (US-2.4).
 * Timeout long + retry en cas d'erreur réseau ou timeout.
 */
import { lireClaudeCode } from './parametres-claudecode.js';

export type ResultatAppelClaude =
  | { ok: true; texte: string }
  | { ok: false; code: string; message?: string };

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type GetApiKeyFn = (dataDir: string) => string | undefined;

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

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
 * Appelle l'API Claude (Anthropic Messages) avec prompt système et message utilisateur.
 * Timeout 90 s par tentative, jusqu'à 3 tentatives en cas d'erreur réseau ou timeout.
 * Lit la clé via lireClaudeCode(dataDir) sauf si getApiKey est fourni (tests).
 * fetchFn optionnel pour les tests.
 */
export async function appelerClaudeCode(
  dataDir: string,
  promptSystem: string,
  messageUser: string,
  fetchFn?: FetchFn,
  getApiKey?: GetApiKeyFn
): Promise<ResultatAppelClaude> {
  const fetch = fetchFn ?? globalThis.fetch;
  const apiKey = getApiKey ? getApiKey(dataDir) : lireClaudeCode(dataDir)?.apiKey;
  if (!apiKey?.trim()) {
    return { ok: false, code: 'no_api_key', message: 'Clé API ClaudeCode non configurée.' };
  }

  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 1000,
    temperature: 0,
    system: promptSystem,
    messages: [{ role: 'user' as const, content: messageUser }],
  });

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': apiKey.trim(),
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body,
      });

      clearTimeout(timeoutId);

      const data = (await res.json()) as {
        content?: Array<{ type?: string; text?: string }>;
        error?: { type?: string; message?: string };
      };

      if (!res.ok) {
        const code = String(res.status);
        const message = data?.error?.message ?? res.statusText ?? 'Erreur API';
        return { ok: false, code, message };
      }

      const text = data?.content?.[0]?.text;
      if (typeof text !== 'string') {
        return { ok: false, code: 'invalid_response', message: 'Réponse sans contenu texte.' };
      }
      return { ok: true, texte: text };
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
      const message =
        lastError.name === 'AbortError'
          ? `Délai dépassé (${TIMEOUT_MS / 1000} s). ${MAX_ATTEMPTS} tentative(s) effectuée(s).`
          : `${lastError.message}. ${MAX_ATTEMPTS} tentative(s) effectuée(s).`;
      return { ok: false, code, message };
    }
  }

  const err = lastError ?? new Error('Échec inconnu');
  return {
    ok: false,
    code: 'network_error',
    message: `${err.message}. ${MAX_ATTEMPTS} tentative(s) effectuée(s).`,
  };
}
