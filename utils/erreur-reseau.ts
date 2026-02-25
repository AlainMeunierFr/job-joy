/**
 * Helper commun pour mapper les erreurs réseau vers un message utilisateur (US-3.14).
 */

export const MESSAGE_ERREUR_RESEAU =
  'Réseau indisponible ou service injoignable. Vérifiez votre connexion Internet.';

/**
 * Retourne un message utilisateur pour les erreurs réseau, ou le message d'origine sinon.
 */
export function messageErreurReseau(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
      return MESSAGE_ERREUR_RESEAU;
    }
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes('fetch failed') || err.name === 'AbortError') {
      return MESSAGE_ERREUR_RESEAU;
    }
    return msg;
  }
  return String(err);
}
