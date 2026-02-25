/**
 * Point d'entrée métier (US-1.1 Configuration compte email, US-1.3 Configuration Airtable).
 * À utiliser depuis app/, composants, scripts CLI ou steps BDD.
 */
export { validerParametresCompte, type OptionsValidationCompte } from './validation-compte.js';
export { ecrireCompte, lireCompte, enregistrerCompteEtNotifierSiConsentement } from './compte-io.js';
export { executerTestConnexion } from './test-connexion-compte.js';
export {
  executerConfigurationAirtable,
  libelleStatutConfigurationAirtable,
  type ResultatConfigurationAirtable,
  type AirtableConfigDriver,
} from './configuration-airtable.js';
export { lireAirTable, ecrireAirTable } from './parametres-airtable.js';
export { lireClaudeCode, ecrireClaudeCode } from './parametres-claudecode.js';
export { evaluerParametragesComplets, type ResultatParametragesComplets } from './parametrages-complets.js';
export {
  createAirtableDriverReel,
  type AirtableDriverReelOptions,
} from './airtable-driver-reel.js';
export { getUrlOuvertureBase } from './airtable-url.js';
export type {
  ParametresCompte,
  ComptePersiste,
  CompteLu,
  ResultatValidation,
  ResultatTestConnexion,
  ConnecteurEmail,
  ParametresEmailIdentification,
  ResultatEnvoiEmailIdentification,
  EnvoyeurEmailIdentification,
  ResultatEnregistrementCompteAvecNotification,
} from '../types/compte.js';
export { getTexteConsentementIdentification } from './texte-consentement-identification.js';
export {
  getParametresEmailIdentification,
  envoyerEmailIdentification,
} from './envoi-email-identification.js';
export {
  executerReleveOffresLinkedIn,
  STATUT_A_COMPLETER,
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
  type PluginSource,
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
export { STATUTS_OFFRES_AIRTABLE, STATUTS_OFFRES_AVEC_AUTRE } from './statuts-offres-airtable.js';
export {
  construireTableauSynthese,
  calculerTotauxTableauSynthese,
  produireTableauSynthese,
  type SourcePourTableau,
  type OffrePourTableau,
  type LigneTableauSynthese,
  type OptionsTableauSynthese,
  type TableauSyntheseRepository,
  type TotauxTableauSynthese,
} from './tableau-synthese-offres.js';
export {
  construirePromptComplet,
  construireListeClesJson,
  getPartieFixePromptIA,
  getPartieModifiablePromptDefaut,
  PARTIE_FIXE_PROMPT_IA,
} from './prompt-ia.js';
export { lirePartieModifiablePrompt, ecrirePartieModifiablePrompt } from './parametres-io.js';
export {
  assurerDossierLogAppels,
  enregistrerAppel,
  lireLogsDuJour,
  agregerConsommationParJourEtApi,
  agregerConsommationParJourEtIntention,
  type EntreeLogAppel,
  type OptionsEnregistrerAppel,
} from './log-appels-api.js';
export {
  compterEmailsAImporter,
  type ReaderEmailsAImporter,
} from './comptage-emails-a-importer.js';
export {
  executerOrchestrationTraitements,
  type PortsOrchestrationTraitements,
  type ResultatOrchestrationTraitements,
} from './orchestration-traitements.js';
export { getDataDir, type DataDirOptions } from './data-dir.js';
