#!/usr/bin/env node
import '../utils/load-env-local.js';
/**
 * Test de connexion au compte email en mode CLI (même domaine que le serveur HTTP).
 * Lit les paramètres depuis data/parametres.json ; le mot de passe IMAP vient du fichier (chiffré).
 *
 * Usage:
 *   npm run cli:test-connexion
 *
 * Prérequis : avoir enregistré les paramètres (formulaire ou data/parametres.json)
 * avec adresseEmail, imapHost, imapPort, imapSecure, cheminDossier. En IMAP, le mot de passe
 * doit être stocké chiffré (PARAMETRES_ENCRYPTION_KEY).
 */
import { join } from 'node:path';
import { lireCompte } from '../utils/compte-io.js';
import { getMotDePasseImapDecrypt } from '../utils/parametres-io.js';
import { getConnecteurEmail } from '../utils/connecteur-email-factory.js';
import { executerTestConnexion } from '../utils/test-connexion-compte.js';

const DATA_DIR = join(process.cwd(), 'data');

async function main(): Promise<void> {
  const compte = lireCompte(DATA_DIR);
  if (!compte) {
    console.error('Aucun compte trouvé. Enregistre les paramètres via l’application ou crée data/parametres.json.');
    process.exit(1);
  }
  const provider = compte.provider ?? 'imap';
  const useMicrosoft = provider === 'microsoft';
  const imapHost = (compte.imapHost ?? '').trim();
  if (!useMicrosoft && !imapHost) {
    console.error('Le compte n’a pas de serveur IMAP (imapHost). Configure-le via l’application.');
    process.exit(1);
  }
  const motDePasse = getMotDePasseImapDecrypt(DATA_DIR) ?? '';
  if (!useMicrosoft && !motDePasse) {
    console.error('Enregistre le mot de passe (chiffré) via l’application (PARAMETRES_ENCRYPTION_KEY requis).');
    process.exit(1);
  }

  const connecteur = getConnecteurEmail(
    useMicrosoft ? undefined : { host: imapHost, port: compte.imapPort ?? 993, secure: compte.imapSecure !== false },
    useMicrosoft ? { provider: 'microsoft' } : undefined
  );
  const result = await executerTestConnexion(
    compte.adresseEmail,
    motDePasse,
    compte.cheminDossier ?? '',
    connecteur
  );

  if (result.ok) {
    console.log('Connexion OK —', result.nbEmails, 'emails à analyser dans le dossier.');
  } else {
    console.error('Échec:', result.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
