/**
 * Test d'intégration IMAP (US-3.17) : vraie connexion au serveur.
 * Exécuté uniquement si les variables d'environnement sont définies :
 *   IMAP_TEST_HOST, IMAP_TEST_USER, IMAP_TEST_PASS, IMAP_TEST_FOLDER
 * En CI, ne pas les définir → le test est ignoré.
 * Pour valider en local : mettre login/mot de passe dans .env.local (non versionné) puis npm run test:integration:imap
 */
import './load-env-local.js';
import { getConnecteurEmailImap } from './connecteur-email-imap.js';
import { executerTestConnexion } from './test-connexion-compte.js';

const hasImapTestEnv =
  !!(
    process.env.IMAP_TEST_HOST?.trim() &&
    process.env.IMAP_TEST_USER?.trim() &&
    process.env.IMAP_TEST_PASS &&
    process.env.IMAP_TEST_FOLDER?.trim()
  );

const run = hasImapTestEnv ? it : it.skip;

describe('Connecteur IMAP - intégration (US-3.17)', () => {
  run('se connecte au serveur IMAP et retourne le nombre d\'emails du dossier', async () => {
    const host = process.env.IMAP_TEST_HOST!.trim();
    const port = Number(process.env.IMAP_TEST_PORT) || 993;
    const secure = process.env.IMAP_TEST_SECURE !== '0' && process.env.IMAP_TEST_SECURE !== 'false';
    const connecteur = getConnecteurEmailImap({
      host,
      port,
      secure,
    });
    const result = await executerTestConnexion(
      process.env.IMAP_TEST_USER!.trim(),
      process.env.IMAP_TEST_PASS!,
      process.env.IMAP_TEST_FOLDER!.trim(),
      connecteur
    );
    expect(result.ok).toBe(true);
    expect((result as { nbEmails: number }).nbEmails).toBeGreaterThanOrEqual(0);
  });
});
