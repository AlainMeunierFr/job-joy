/**
 * Tests pour messageErreurReseau (US-3.14).
 * Baby step 1 : ECONNREFUSED → message utilisateur.
 */
import { messageErreurReseau, MESSAGE_ERREUR_RESEAU } from './erreur-reseau.js';

describe('messageErreurReseau', () => {
  it('retourne le message utilisateur pour erreur ECONNREFUSED', () => {
    const err = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), {
      code: 'ECONNREFUSED',
    });
    expect(messageErreurReseau(err)).toBe(MESSAGE_ERREUR_RESEAU);
  });

  it('retourne le message utilisateur pour ETIMEDOUT ou ENOTFOUND', () => {
    const errTimeout = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
    expect(messageErreurReseau(errTimeout)).toBe(MESSAGE_ERREUR_RESEAU);
    const errNotFound = Object.assign(new Error('getaddrinfo ENOTFOUND api.example.com'), {
      code: 'ENOTFOUND',
    });
    expect(messageErreurReseau(errNotFound)).toBe(MESSAGE_ERREUR_RESEAU);
  });

  it('retourne le message utilisateur pour "fetch failed" ou AbortError', () => {
    expect(messageErreurReseau(new Error('fetch failed'))).toBe(MESSAGE_ERREUR_RESEAU);
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    expect(messageErreurReseau(abortErr)).toBe(MESSAGE_ERREUR_RESEAU);
  });

  it('retourne le message d’origine pour une erreur non réseau', () => {
    const err = new Error('Authentification Airtable échouée');
    expect(messageErreurReseau(err)).toBe('Authentification Airtable échouée');
    expect(messageErreurReseau('string error')).toBe('string error');
  });
});
