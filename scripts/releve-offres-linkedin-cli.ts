#!/usr/bin/env node
import '../utils/load-env-local.js';
/**
 * Relève des offres LinkedIn depuis les emails (étape 1) + enrichissement (étape 2) séparé.
 * Lancement en CLI : relève seule, enrichissement seul, ou orchestration "tout" (qui reste étape 1).
 *
 * Usage:
 *   npm run cli:releve-offres              # relève uniquement
 *   npm run cli:releve-offres enrichissement  # enrichissement uniquement
 *   npm run cli:releve-offres tout        # relève (étape 1) ; l'étape 2 est un worker séparé
 *   # Les body HTML sont archivés automatiquement dans tests/exemples/<Source>/ (max 3 fichiers/source).
 *
 * Prérequis : parametres.json (compte email + airtable, mot de passe chiffré).
 */
import { join } from 'node:path';
import { runTraitement, createCompositeReleveDriverSqlite } from './run-traitement.js';
import { createAutoFixtureHook } from './email-fixtures.js';
import { lireCompte } from '../utils/compte-io.js';
import { getMotDePasseImapDecrypt } from '../utils/parametres-io.js';
import { createLecteurEmailsImap } from '../utils/lecteur-emails-imap.js';
import { createLecteurEmailsGraph } from '../utils/lecteur-emails-graph.js';
import { executerReleveOffresLinkedIn } from '../utils/relève-offres-linkedin.js';
import { createEnrichissementOffresSqliteDriver } from '../utils/enrichissement-offres-sqlite.js';
import { initOffresRepository } from '../utils/repository-offres-sqlite.js';
import { createFetcherContenuOffre } from '../utils/fetcher-contenu-offre.js';
import { executerEnrichissementOffres } from '../utils/enrichissement-offres.js';
import { getValidAccessToken } from '../utils/auth-microsoft.js';

const DATA_DIR = join(process.cwd(), 'data');

async function runReleve(): Promise<boolean> {
  const compte = lireCompte(DATA_DIR);
  if (!compte) {
    console.error('Aucun compte email configuré. Enregistre les paramètres (formulaire ou data/parametres.json).');
    return false;
  }
  const provider = compte.provider ?? 'imap';
  const useMicrosoft = provider === 'microsoft';
  const imapHost = (compte.imapHost ?? '').trim();
  if (!useMicrosoft && !imapHost) {
    console.error('Compte sans serveur IMAP. Configure imapHost (ou utilise Microsoft).');
    return false;
  }
  const motDePasse = getMotDePasseImapDecrypt(DATA_DIR) ?? '';
  if (!useMicrosoft && !motDePasse) {
    console.error('Mot de passe IMAP absent. Enregistre-le via l’application (stocké chiffré avec PARAMETRES_ENCRYPTION_KEY).');
    return false;
  }

  const driver = createCompositeReleveDriverSqlite(DATA_DIR);

  const lecteurEmails = useMicrosoft
    ? createLecteurEmailsGraph(() => getValidAccessToken())
    : createLecteurEmailsImap({
        host: imapHost,
        port: compte.imapPort ?? 993,
        secure: compte.imapSecure !== false,
      });

  const result = await executerReleveOffresLinkedIn({
    adresseEmail: compte.adresseEmail,
    motDePasse,
    cheminDossier: compte.cheminDossier ?? '',
    cheminDossierArchive: (compte.cheminDossierArchive ?? '').trim() || undefined,
    onProgress: (message) => console.log(message),
    onEmailLu: createAutoFixtureHook(),
    driver,
    lecteurEmails,
  });

  if (result.ok) {
    console.log(`Relève LinkedIn : ${result.nbEmailsLinkedin} email(s) LinkedIn, ${result.nbOffresCreees} offre(s) créée(s).`);
    return true;
  }
  console.error(`Relève LinkedIn : ${result.message}`);
  if (result.raison === 'source_absente') {
    console.error("L'utilisateur doit être informé de l'absence ou de l'indisponibilité de la source LinkedIn.");
  } else if (result.raison === 'source_inactive') {
    console.error("L'utilisateur est informé que la source LinkedIn est inactive.");
  }
  return false;
}

async function runEnrichissement(): Promise<boolean> {
  const repository = initOffresRepository(join(DATA_DIR, 'offres.sqlite'));
  const driver = createEnrichissementOffresSqliteDriver({ repository });
  const fetcher = createFetcherContenuOffre();
  const result = await executerEnrichissementOffres({ driver, fetcher });
  if (!result.ok) {
    console.error('Enrichissement :', result.message);
    return false;
  }
  console.log(`Enrichissement : ${result.nbEnrichies} offre(s) enrichie(s), ${result.nbEchecs} échec(s).`);
  result.messages.forEach((m) => console.log('  —', m));
  return true;
}

async function main(): Promise<void> {
  const mode = (process.argv[2] ?? 'relève').toLowerCase();
  if (mode === 'enrichissement') {
    const ok = await runEnrichissement();
    process.exitCode = ok ? 0 : 1;
    return;
  }
  if (mode === 'tout') {
    const result = await runTraitement(DATA_DIR, {
      onProgress: (message) => console.log(message),
      onEmailLu: createAutoFixtureHook(),
    });
    if (result.ok) {
      console.log(`Relève LinkedIn : ${result.nbEmailsLinkedin ?? 0} email(s) LinkedIn, ${result.nbOffresCreees ?? 0} offre(s) créée(s).`);
      console.log('Étape 2 (Lire offre / enrichissement URL) est exécutée par un worker séparé.');
      process.exitCode = 0;
    } else {
      console.error(result.message);
      process.exitCode = 1;
    }
    return;
  }
  const ok = await runReleve();
  process.exitCode = ok ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
