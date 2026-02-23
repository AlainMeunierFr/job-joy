/**
 * Point d'entrée métier (US-1.1 Configuration compte email, US-1.3 Configuration Airtable).
 * À utiliser depuis app/, composants, scripts CLI ou steps BDD.
 */
export { validerParametresCompte, type OptionsValidationCompte } from './validation-compte.js';
export { ecrireCompte, lireCompte } from './compte-io.js';
export { executerTestConnexion } from './test-connexion-compte.js';
export {
  executerConfigurationAirtable,
  libelleStatutConfigurationAirtable,
  type ResultatConfigurationAirtable,
  type AirtableConfigDriver,
} from './configuration-airtable.js';
export { lireAirTable, ecrireAirTable } from './parametres-airtable.js';
export { evaluerParametragesComplets, type ResultatParametragesComplets } from './parametrages-complets.js';
export {
  createAirtableDriverReel,
  type AirtableDriverReelOptions,
} from './airtable-driver-reel.js';
export { getUrlOuvertureBase } from './airtable-url.js';
export type { ParametresCompte, ComptePersiste, CompteLu, ResultatValidation, ResultatTestConnexion, ConnecteurEmail } from '../types/compte.js';
export {
  executerReleveOffresLinkedIn,
  STATUT_ANNONCE_A_RECUPERER,
  type RelèveOffresDriver,
  type LecteurEmails,
  type OptionsReleve,
} from './relève-offres-linkedin.js';
export { extractOffresFromHtml } from './extraction-offres-email.js';
export { createAirtableReleveDriver, type AirtableReleveDriverOptions } from './airtable-releve-driver.js';
export {
  preparerMigrationSources,
  auditerSourcesDepuisEmails,
  traiterEmailsSelonStatutSource,
  type AlgoSource,
  type SourceEmail,
  type EmailAAnalyser,
  type OptionsTraitementSources,
  type ResultatTraitementSources,
} from './gouvernance-sources-emails.js';
export { createLecteurEmailsImap } from './lecteur-emails-imap.js';
export { createLecteurEmailsMock, type LecteurEmailsMockOptions } from './lecteur-emails-mock.js';
export {
  executerEnrichissementOffres,
  STATUT_A_ANALYSER as STATUT_ENRICHISSEMENT_A_ANALYSER,
  type EnrichissementOffresDriver,
  type FetcherContenuOffre,
  type ChampsOffreAirtable,
  type OptionsEnrichissement,
} from './enrichissement-offres.js';
export { createAirtableEnrichissementDriver, type AirtableEnrichissementDriverOptions } from './airtable-enrichissement-driver.js';
export { createFetcherContenuOffre } from './fetcher-contenu-offre.js';
export { STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';
export {
  construireTableauSynthese,
  produireTableauSynthese,
  type SourcePourTableau,
  type OffrePourTableau,
  type LigneTableauSynthese,
  type OptionsTableauSynthese,
  type TableauSyntheseRepository,
} from './tableau-synthese-offres.js';
