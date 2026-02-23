/**
 * Tests TDD pour le test de connexion au compte email (US-1.1).
 * Baby step 6 : succès + nombre d'emails à analyser.
 */
import { executerTestConnexion } from './test-connexion-compte.js';
import type { ConnecteurEmail } from '../types/compte.js';

describe('executerTestConnexion', () => {
  it('retourne succès et nombre d\'emails quand le connecteur réussit', async () => {
    const connecteur: ConnecteurEmail = {
      connecterEtCompter: async () => ({ ok: true, nbEmails: 42 }),
    };
    const r = await executerTestConnexion(
      'alain@maep.fr',
      'MonMotDePasse',
      'C:\\Dossier',
      connecteur
    );
    expect(r.ok).toBe(true);
    expect((r as { nbEmails: number }).nbEmails).toBe(42);
  });

  it('retourne erreur quand le connecteur échoue (identifiants invalides)', async () => {
    const connecteur: ConnecteurEmail = {
      connecterEtCompter: async () => ({
        ok: false,
        message: "erreur sur 'adresse email' ou le 'mot de passe'",
      }),
    };
    const r = await executerTestConnexion('bad@x.fr', 'wrong', 'C:\\D', connecteur);
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toBe(
      "erreur sur 'adresse email' ou le 'mot de passe'"
    );
  });

  it('retourne 0 emails quand le dossier est vide', async () => {
    const connecteur: ConnecteurEmail = {
      connecterEtCompter: async () => ({ ok: true, nbEmails: 0 }),
    };
    const r = await executerTestConnexion('a@b.fr', 'p', 'C:\\Vide', connecteur);
    expect(r.ok).toBe(true);
    expect((r as { nbEmails: number }).nbEmails).toBe(0);
  });
});
