/**
 * Génère le HTML de la page de paramétrage du compte email (US-1.1).
 * Microsoft : bouton "Se connecter avec Microsoft" (ouvre la fenêtre d'auth) si pas encore connecté ;
 * une fois connecté, option radio + bloc comme les autres.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lireCompte, lireAirTable } from '../utils/index.js';
import { maskEmail } from '../utils/mask-email.js';
import { getLayoutHtml } from './layout-html.js';
import type { ParametrageIA, Rehibitoire, ScoreOptionnel, ScoresIncontournables } from '../types/parametres.js';

const N_REHIBITOIRES = 4;
const N_SCORES_OPTIONNELS = 4;
const SCORES_INCONTOURNABLES_TITRES = ['Localisation', 'Salaire', 'Culture', 'Qualité d\'offre'] as const;

/** Exemples (placeholders) par zone, dans l’esprit du prompt « Autres ressources » (recherche d’emploi). */
const PLACEHOLDER_REHIBITOIRE_TITRE = "Ex. Secteur, localisation ou type de contrat";
const PLACEHOLDER_REHIBITOIRE_DESCRIPTION =
  "Ex. Rejeter si hors Île-de-France, sans télétravail, ou CDD uniquement. Décrivez ce qui doit faire rejeter l'offre.";
/** Un placeholder distinct par score incontournable (ordre : localisation, salaire, culture, qualiteOffre). */
const PLACEHOLDERS_SCORES_INCONTOURNABLES = [
  "Ex. Île-de-France ou télétravail 2 j/sem. Déplacements occasionnels acceptés.",
  "Ex. Fourchette 45–55 k€, variable selon poste et responsabilités.",
  "Ex. Petite structure, valeurs RSE, pas de présentéisme.",
  "Ex. Fiche de poste claire, processus structuré, retour sous 2 semaines.",
] as const;
const PLACEHOLDER_OPTIONNEL_TITRE = "Ex. Langues, outils, secteur";
const PLACEHOLDER_OPTIONNEL_ATTENTE =
  "Ex. Anglais C1, expérience Jira ou équivalent, secteur tech ou conseil. Attente ou grille de scoring.";

function normalizeParametrageIA(ia?: ParametrageIA | null): {
  rehibitoires: Rehibitoire[];
  scoresIncontournables: ScoresIncontournables;
  scoresOptionnels: ScoreOptionnel[];
  autresRessources: string;
} {
  const rehibitoires = (ia?.rehibitoires ?? []).slice(0, N_REHIBITOIRES);
  while (rehibitoires.length < N_REHIBITOIRES) {
    rehibitoires.push({ titre: '', description: '' });
  }
  const scoresIncontournables = ia?.scoresIncontournables ?? {
    localisation: '',
    salaire: '',
    culture: '',
    qualiteOffre: '',
  };
  const scoresOptionnels = (ia?.scoresOptionnels ?? []).slice(0, N_SCORES_OPTIONNELS);
  while (scoresOptionnels.length < N_SCORES_OPTIONNELS) {
    scoresOptionnels.push({ titre: '', attente: '' });
  }
  return {
    rehibitoires,
    scoresIncontournables,
    scoresOptionnels,
    autresRessources: ia?.autresRessources ?? '',
  };
}

/** Message flash après redirection OAuth (plus de paramètres en clair dans l’URL). */
export type FlashMicrosoft =
  | { type: 'microsoft'; status: 'ok' }
  | { type: 'microsoft'; status: 'error'; message: string };

export interface OptionsParametresContent {
  /** True si un token Microsoft est déjà disponible (refresh token). */
  microsoftAvailable?: boolean;
  /** Message flash à afficher (connexion Microsoft ok/erreur). */
  flash?: FlashMicrosoft;
  /** URL de base (ex. http://127.0.0.1:3001) pour le lien "Se connecter" Microsoft. */
  baseUrl?: string;
  /** Epoch ms : date d'obtention du refresh token Microsoft (pour afficher jours restants). */
  tokenObtainedAt?: number;
  /** Message flash config incomplète : liste des éléments manquants (US-1.6). */
  flashConfigManque?: string[];
  /** Section Paramétrage IA (US-2.1) pour préremplir les champs. */
  parametrageIA?: ParametrageIA | null;
  /** Indicateur « Déjà enregistrée » pour la section ClaudeCode (US-2.2). */
  claudecodeHasApiKey?: boolean;
  /** Partie modifiable du prompt IA pour affichage (ou défaut si vide). US-2.3 */
  promptIAPartieModifiable?: string;
  /** Partie fixe du prompt IA (lecture seule). US-2.3 */
  promptIAPartieFixe?: string;
  /** True si au moins une offre Airtable a du texte (afficher bouton "Récupérer le texte d'une offre"). US-2.4 */
  offreTestHasOffre?: boolean;
}

function getFlashMessageText(flash: FlashMicrosoft): string {
  if (flash.status === 'ok') {
    return "Connecté avec Microsoft. Vous n'aurez plus à ressaisir votre mot de passe pendant des mois.";
  }
  const msg = flash.message ?? 'Erreur de connexion Microsoft.';
  if (msg === 'AZURE_TENANT_ID') {
    return "Définissez AZURE_TENANT_ID dans le fichier .env à la racine du projet (ID de l'annuaire Entra : Vue d'ensemble de l'app > ID de l'annuaire). Puis redémarrez le serveur.";
  }
  return 'Microsoft : ' + msg;
}

export async function getParametresContent(
  dataDir: string,
  options?: OptionsParametresContent
): Promise<string> {
  const INJECT_CHAMP_URL_BASE = '<!-- INJECT_CHAMP_URL_BASE -->';
  const INJECT_CHAMP_API_KEY = '<!-- INJECT_CHAMP_API_KEY -->';

  let tutorielAirtableHtml = '';
  try {
    tutorielAirtableHtml = await readFile(
      join(dataDir, 'ressources', 'CréationCompteAirTable.html'),
      'utf-8'
    );
  } catch {
    // Fichier absent : zone tutoriel vide
  }
  let tutorielClaudeCodeHtml = '';
  try {
    tutorielClaudeCodeHtml = await readFile(
      join(dataDir, 'ressources', 'CréationCompteClaudeCode.html'),
      'utf-8'
    );
    tutorielClaudeCodeHtml = tutorielClaudeCodeHtml.replace(/<!-- INJECT_CHAMP_API_KEY -->/g, '');
  } catch {
    tutorielClaudeCodeHtml = '<p class="tutorielAbsent">Fichier tutoriel absent.</p>';
  }
  const airtable = lireAirTable(dataDir);
  const hasApiKey = !!(airtable?.apiKey?.trim());
  const airtableBase = airtable?.base ?? '';
  const tablesAirtableCreees = !!(airtable?.sources && airtable?.offres);
  const statutAirtableInitial = tablesAirtableCreees ? 'AirTable prêt' : '';
  const compte = lireCompte(dataDir);
  const microsoftAvailable = options?.microsoftAvailable ?? false;
  const dossierAAnalyserConfigure = !!(compte?.cheminDossier?.trim());
  const modeConnexionOk =
    compte &&
    (compte.provider === 'imap'
      ? !!(compte.adresseEmail?.trim() && compte.imapHost?.trim())
      : compte.provider === 'microsoft'
        ? !!(compte.adresseEmail?.trim() && microsoftAvailable)
        : compte.provider === 'gmail'
          ? !!(compte.adresseEmail?.trim())
          : false);
  const compteEmailConfigured = !!(dossierAAnalyserConfigure && modeConnexionOk);
  const airtableOuvert = !tablesAirtableCreees;
  const connexionOuvert = !compteEmailConfigured;
  const flash = options?.flash;
  const baseUrl = (options?.baseUrl ?? '').replace(/\/$/, '');
  const hrefMicrosoft = baseUrl ? `${baseUrl}/api/auth/microsoft` : '/api/auth/microsoft';
  const flashDansBlocMicrosoft =
    flash?.type === 'microsoft' && flash?.status === 'ok';
  const flashConfigManque = options?.flashConfigManque;
  const flashTextConfig =
    flashConfigManque?.length
      ? 'Il reste à terminer : ' + flashConfigManque.join(', ')
      : '';
  const flashText =
    flashTextConfig ||
    (flashDansBlocMicrosoft ? '' : (flash ? getFlashMessageText(flash) : ''));
  const feedbackErreurClass = flashTextConfig ? ' feedbackEnregistrement--erreur' : '';
  const provider = (compte?.provider ?? 'imap') as string;
  const adresseReelle = compte?.adresseEmail ?? '';
  const adresseDisplay = adresseReelle ? maskEmail(adresseReelle) : '';
  const dossier = compte?.cheminDossier ?? '';
  const dossierArchive = compte?.cheminDossierArchive ?? '';
  const imapHost = compte?.imapHost ?? '';
  const imapPort = compte?.imapPort ?? 993;
  const imapSecure = compte?.imapSecure !== false;

  const blocImapHtml = `
      <div id="bloc-imap" class="blocProvider blocProvider-imap">
        <div class="blocImapRow blocImapRow--serveur">
          <div class="fieldGroup">
            <label for="imap-host">Serveur IMAP</label>
            <input type="text" id="imap-host" name="imapHost" value="${escapeHtml(imapHost)}" placeholder="imap.example.com" autocomplete="off" e2eid="e2eid-champ-imap-host" form="form-compte" />
          </div>
          <div class="fieldGroup fieldGroup--port">
            <label for="imap-port">Port</label>
            <input type="number" id="imap-port" name="imapPort" value="${imapPort}" min="1" max="65535" e2eid="e2eid-champ-imap-port" form="form-compte" />
          </div>
          <div class="fieldGroup fieldGroup--tls">
            <input type="hidden" name="imapSecure" value="0" form="form-compte" />
            <label class="labelCheckbox"><input type="checkbox" id="imap-secure" name="imapSecure" value="1" ${imapSecure ? 'checked' : ''} e2eid="e2eid-champ-imap-secure" form="form-compte" /> TLS</label>
          </div>
        </div>
        <div class="blocImapRow blocImapRow--login">
      <div class="fieldGroup">
        <label for="adresse-email">Adresse email</label>
            <input type="email" id="adresse-email" name="adresseEmail" value="" placeholder="${escapeHtml(adresseDisplay || 'vous@exemple.fr')}" autocomplete="email" e2eid="e2eid-champ-adresse-email" form="form-compte" />
      </div>
      <div class="fieldGroup">
        <label for="mot-de-passe">Mot de passe</label>
        <div class="passwordWrapper">
              <input type="password" id="mot-de-passe" name="motDePasse" autocomplete="off" e2eid="e2eid-champ-mot-de-passe" form="form-compte" />
              <button type="button" id="toggle-password" class="togglePasswordBtn" aria-label="Afficher le mot de passe" title="Afficher le mot de passe" e2eid="e2eid-bouton-afficher-mot-de-passe"><span class="iconEye" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span><span class="iconEyeOff" aria-hidden="true" hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></span></button>
            </div>
          </div>
        </div>
      </div>`;

  const tokenObtainedAt = options?.tokenObtainedAt;
  const REFRESH_TOKEN_LIFETIME_DAYS = 90;
  let joursRestantsHtml = '';
  if (microsoftAvailable && tokenObtainedAt) {
    const ageDays = (Date.now() - tokenObtainedAt) / (1000 * 60 * 60 * 24);
    const joursRestants = Math.max(0, Math.round(REFRESH_TOKEN_LIFETIME_DAYS - ageDays));
    joursRestantsHtml = joursRestants > 0
      ? `<p class="providerHint">Il vous reste environ <strong>${joursRestants} jour(s)</strong> avant de devoir renouveler votre connexion.</p>`
      : `<p class="providerHint" style="color:var(--color-error)">Votre token a expiré. Reconnectez-vous.</p>`;
  }

  const microsoftBlocHtml = microsoftAvailable
    ? `<div id="bloc-microsoft" class="blocProvider blocProvider-microsoft">
        ${flashDansBlocMicrosoft ? `<p class="flashSuccessMicrosoft" id="hint-microsoft">Connecté avec Microsoft. Vous n'aurez plus à ressaisir votre mot de passe pendant des mois.</p>` : `<p class="providerHint" id="hint-microsoft">Connecté avec Microsoft.</p>`}
        ${adresseDisplay ? `<p class="providerEmailInfo" aria-label="Adresse du compte">${escapeHtml(adresseDisplay)}</p>` : ''}
        ${joursRestantsHtml}
        <p style="margin-top:var(--space-sm)"><a href="${hrefMicrosoft}" class="btnSecondary" style="text-decoration:none;display:inline-block;padding:var(--space-xs) var(--space-md);font-size:0.875rem" id="bouton-se-reconnecter-microsoft">Renouveler la connexion</a></p>
      </div>`
    : `<div id="bloc-microsoft" class="blocProvider blocProvider-microsoft">
        <form method="get" action="${hrefMicrosoft}" style="display:inline">
          <button type="submit" class="btnPrimary" id="bouton-se-connecter-microsoft" e2eid="e2eid-bouton-se-connecter-microsoft">Se connecter</button>
        </form>
      </div>`;

  const gmailBlocHtml = `<div id="bloc-gmail" class="blocProvider blocProvider-gmail">
        <button type="button" id="bouton-se-connecter-gmail" class="btnPrimary" disabled title="En construction">Se connecter</button>
      </div>`;

  const champUrlBaseHtml = `<div class="fieldGroup">
        <label for="airtable-base">URL de la base Airtable</label>
        <input type="text" id="airtable-base" name="airtableBase" value="${escapeHtml(airtableBase)}" placeholder="https://airtable.com/appXXX/…" e2eid="e2eid-champ-airtable-base" form="form-compte" />
      </div>`;
  const champApiKeyHtml = `<div class="fieldGroup">
        <label for="airtable-api-key">API Key Airtable</label>
        <input type="password" id="airtable-api-key" name="airtableApiKey" value="" placeholder="${hasApiKey ? 'Déjà enregistrée' : 'patXXX…'}" autocomplete="off" e2eid="e2eid-champ-api-key-airtable" form="form-compte" />
      </div>`;
  tutorielAirtableHtml = tutorielAirtableHtml
    .replace(INJECT_CHAMP_URL_BASE, champUrlBaseHtml)
    .replace(INJECT_CHAMP_API_KEY, champApiKeyHtml);

  const ia = normalizeParametrageIA(options?.parametrageIA);
  const scoresIncontournablesRemplis =
    [ia.scoresIncontournables.localisation, ia.scoresIncontournables.salaire, ia.scoresIncontournables.culture, ia.scoresIncontournables.qualiteOffre].every(
      (v) => (v ?? '').trim() !== ''
    );
  const parametrageIAConfigured = scoresIncontournablesRemplis;
  const parametrageIAOuvert = !parametrageIAConfigured;
  const zoneRehibitoiresHtml = `
    <div class="zoneParametrageIA zoneRehibitoires" data-zone="rehibitoires" aria-labelledby="titre-zone-rehibitoires">
      <h3 id="titre-zone-rehibitoires" class="zoneParametrageIATitle">Rédhibitoires</h3>
      ${[0, 1, 2, 3].map((i) => `
      <div class="blocCritere blocRehibitoire" data-layout="bloc-critere" data-bloc-index="${i}">
        <label for="parametrage-ia-rehibitoires-${i}-titre" class="blocCritereLabel">Titre</label>
        <input type="text" id="parametrage-ia-rehibitoires-${i}-titre" name="rehibitoires_${i}_titre" value="${escapeHtml(ia.rehibitoires[i].titre)}" maxlength="200" placeholder="${escapeHtml(PLACEHOLDER_REHIBITOIRE_TITRE)}" e2eid="e2eid-parametrage-ia-rehibitoires-${i}-titre" form="form-parametrage-ia" />
        <label for="parametrage-ia-rehibitoires-${i}-description" class="blocCritereLabel">Description</label>
        <textarea id="parametrage-ia-rehibitoires-${i}-description" name="rehibitoires_${i}_description" rows="3" placeholder="${escapeHtml(PLACEHOLDER_REHIBITOIRE_DESCRIPTION)}" e2eid="e2eid-parametrage-ia-rehibitoires-${i}-description" form="form-parametrage-ia">${escapeHtml(ia.rehibitoires[i].description)}</textarea>
      </div>`).join('')}
    </div>`;
  const scoresIncontournablesKeys = ['localisation', 'salaire', 'culture', 'qualiteOffre'] as const;
  const zoneScoresIncontournablesHtml = `
    <div class="zoneParametrageIA zoneScoresIncontournables" data-zone="scores-incontournables" aria-labelledby="titre-zone-scores-incontournables">
      <h3 id="titre-zone-scores-incontournables" class="zoneParametrageIATitle">Scores incontournables</h3>
      ${scoresIncontournablesKeys.map((key, i) => {
        const titre = SCORES_INCONTOURNABLES_TITRES[i];
        const value = ia.scoresIncontournables[key];
        return `
      <div class="blocCritere blocScoreIncontournable" data-layout="bloc-critere" data-bloc-key="${key}">
        <span class="blocCritereTitreFixe" id="parametrage-ia-scores-incontournables-${key}-label">${escapeHtml(titre)}</span>
        <textarea id="parametrage-ia-scores-incontournables-${key}" name="scores_incontournables_${key}" rows="3" placeholder="${escapeHtml(PLACEHOLDERS_SCORES_INCONTOURNABLES[i])}" e2eid="e2eid-parametrage-ia-scores-${key}" form="form-parametrage-ia">${escapeHtml(value)}</textarea>
      </div>`;
      }).join('')}
    </div>`;
  const zoneScoresOptionnelsHtml = `
    <div class="zoneParametrageIA zoneScoresOptionnels" data-zone="scores-optionnels" aria-labelledby="titre-zone-scores-optionnels">
      <h3 id="titre-zone-scores-optionnels" class="zoneParametrageIATitle">Scores optionnels</h3>
      ${[0, 1, 2, 3].map((i) => `
      <div class="blocCritere blocScoreOptionnel" data-layout="bloc-critere" data-bloc-index="${i}">
        <label for="parametrage-ia-scores-optionnels-${i}-titre" class="blocCritereLabel">Titre</label>
        <input type="text" id="parametrage-ia-scores-optionnels-${i}-titre" name="scores_optionnels_${i}_titre" value="${escapeHtml(ia.scoresOptionnels[i].titre)}" maxlength="200" placeholder="${escapeHtml(PLACEHOLDER_OPTIONNEL_TITRE)}" e2eid="e2eid-parametrage-ia-scores-optionnels-${i}-titre" form="form-parametrage-ia" />
        <label for="parametrage-ia-scores-optionnels-${i}-attente" class="blocCritereLabel">Attente</label>
        <textarea id="parametrage-ia-scores-optionnels-${i}-attente" name="scores_optionnels_${i}_attente" rows="3" placeholder="${escapeHtml(PLACEHOLDER_OPTIONNEL_ATTENTE)}" e2eid="e2eid-parametrage-ia-scores-optionnels-${i}-attente" form="form-parametrage-ia">${escapeHtml(ia.scoresOptionnels[i].attente)}</textarea>
      </div>`).join('')}
    </div>`;
  const placeholderAutresRessources =
    'Confiez CVs, lettres de motivation, portfolio... toutes les ressources à votre disposition à l\'IA de votre choix et demandez-lui de vous rédiger un texte qui résume vos expériences, apprentissages, compétences et appétances dans le cadre d\'une recherche d\'emploi. Collez le résultat ici.';
  const zoneAutresRessourcesHtml = `
    <div class="zoneParametrageIA zoneAutresRessources" data-zone="autres-ressources" aria-labelledby="titre-zone-autres-ressources">
      <h3 id="titre-zone-autres-ressources" class="zoneParametrageIATitle">Autres ressources</h3>
      <div class="blocCritere blocAutresRessources" data-layout="bloc-critere">
        <textarea id="parametrage-ia-autres-ressources" name="autres_ressources" rows="12" placeholder="${escapeHtml(placeholderAutresRessources)}" e2eid="e2eid-parametrage-ia-autres-ressources" form="form-parametrage-ia">${escapeHtml(ia.autresRessources)}</textarea>
      </div>
    </div>`;

  const promptIAPartieModifiable = options?.promptIAPartieModifiable ?? '';
  const promptIAPartieFixe = options?.promptIAPartieFixe ?? '';
  const zonePromptIAHtml = `
    <div class="zoneParametrageIA zonePromptIA" data-zone="prompt-ia" data-layout="zone-prompt-ia" aria-labelledby="titre-zone-prompt-ia">
      <h3 id="titre-zone-prompt-ia" class="zoneParametrageIATitle">Prompt IA</h3>
      <div class="blocPromptIA blocPromptIA-partieFixe" data-layout="bloc-prompt-partie-fixe">
        <details class="detailsPartieFixePrompt" aria-label="Partie fixe du prompt">
          <summary class="lienPartieFixePrompt">Voir la partie fixe du prompt</summary>
          <div class="zonePartieFixeLectureSeule" aria-readonly="true">
            <pre id="prompt-ia-partie-fixe" class="promptIAPartieFixeTexte" readonly>${escapeHtml(promptIAPartieFixe)}</pre>
          </div>
        </details>
      </div>
      <div class="blocPromptIA blocPromptIA-partieModifiable" data-layout="bloc-prompt-partie-modifiable">
        <label for="prompt-ia-partie-modifiable" class="blocCritereLabel">Partie modifiable du prompt</label>
        <textarea id="prompt-ia-partie-modifiable" name="prompt_ia_partie_modifiable" rows="10" class="zonePromptModifiable" e2eid="e2eid-zone-prompt-modifiable" form="form-parametrage-ia" aria-label="Partie modifiable du prompt IA">${escapeHtml(promptIAPartieModifiable)}</textarea>
      </div>
      <div class="actions actionsPromptIA">
        <button type="button" id="bouton-proposer-prompt" e2eid="e2eid-bouton-proposer-prompt">Proposer un prompt</button>
      </div>
    </div>`;

  const parametrageIASectionHtml = `
    <details id="section-parametrage-ia" class="blocParametrage blocParametrage-ia parametrageIA" data-layout="parametrage-ia" aria-labelledby="titre-parametrage-ia" ${parametrageIAOuvert ? 'open' : ''}>
      <summary id="titre-parametrage-ia" class="parametrageIATitle blocParametrageSummary">Paramétrage prompt de l'IA</summary>
      <div class="blocParametrageContent">
      <form id="form-parametrage-ia" class="formParametrageIA" aria-label="Formulaire Paramétrage prompt de l'IA">
        ${zoneRehibitoiresHtml}
        <hr class="formDivider parametrageIADivider" aria-hidden="true" />
        ${zoneScoresIncontournablesHtml}
        <hr class="formDivider parametrageIADivider" aria-hidden="true" />
        ${zoneScoresOptionnelsHtml}
        <hr class="formDivider parametrageIADivider" aria-hidden="true" />
        ${zoneAutresRessourcesHtml}
        <hr class="formDivider parametrageIADivider" aria-hidden="true" />
        ${zonePromptIAHtml}
        <div class="actions actionsParametrageIA">
          <button type="button" id="bouton-enregistrer-parametrage-ia" e2eid="e2eid-bouton-enregistrer-parametrage-ia">Enregistrer</button>
        </div>
      </form>
      </div>
    </details>`;

  return `<div class="pageParametres parametrageCompteEmail" data-layout="page-parametres">
    <h1 class="pageParametresTitle">Paramètres</h1>
    <details class="blocParametrage blocParametrage-airtable configurationAirtable" data-layout="configuration-airtable" aria-labelledby="titre-airtable" ${airtableOuvert ? 'open' : ''}>
      <summary id="titre-airtable" class="blocParametrageSummary">Configuration Airtable</summary>
      <div class="blocParametrageContent">
        <div id="zone-tutoriel-airtable" class="zoneTutorielAirtable" aria-label="Tutoriel création compte Airtable">${tutorielAirtableHtml}</div>
        <div class="actions actions-configuration-airtable">
          <button type="button" id="bouton-lancer-configuration-airtable" e2eid="e2eid-bouton-lancer-configuration-airtable">Lancer la configuration</button>
        </div>
        <div id="statut-configuration-airtable" class="statutConfigurationAirtable" role="status" aria-live="polite">${escapeHtml(statutAirtableInitial)}</div>
      </div>
    </details>
    <details class="blocParametrage blocParametrage-connexion" aria-labelledby="titre-connexion" ${connexionOuvert ? 'open' : ''}>
      <summary id="titre-connexion" class="blocParametrageSummary">Paramétrage du compte email</summary>
      <div class="blocParametrageContent">
    <div class="formCard">
      <fieldset class="fieldGroup providerChoice providerChoiceRadios" aria-label="Mode de connexion">
        <legend>Mode de connexion</legend>
        <input type="radio" name="provider" id="provider-imap" value="imap" ${provider === 'imap' ? 'checked' : ''} class="providerRadio" e2eid="e2eid-provider-imap" form="form-compte" />
        <input type="radio" name="provider" id="provider-microsoft" value="microsoft" ${provider === 'microsoft' ? 'checked' : ''} class="providerRadio" e2eid="e2eid-provider-microsoft" form="form-compte" />
        <input type="radio" name="provider" id="provider-gmail" value="gmail" ${provider === 'gmail' ? 'checked' : ''} class="providerRadio" e2eid="e2eid-provider-gmail" form="form-compte" />
        <label for="provider-imap" class="providerModeBtn">IMAP</label>
        <label for="provider-microsoft" class="providerModeBtn">Microsoft</label>
        <label for="provider-gmail" class="providerModeBtn">Gmail</label>
        ${blocImapHtml}
        ${microsoftBlocHtml}
        ${gmailBlocHtml}
      </fieldset>
      <hr class="formDivider" />
      <form id="form-compte" class="formCompte" method="post" action="/parametres">
        <fieldset class="fieldGroup fieldGroup-dossier" aria-label="Dossiers de travail de la boîte mail">
          <legend>Dossiers de travail de la boîte mail (ex. inbox, INBOX, Offres)</legend>
          <div class="fieldGroup">
            <label for="chemin-dossier">Dossier à analyser</label>
            <input type="text" id="chemin-dossier" name="cheminDossier" value="${escapeHtml(dossier)}" placeholder="inbox" e2eid="e2eid-champ-chemin-dossier" />
          </div>
          <div class="fieldGroup">
            <label for="chemin-dossier-archive">Dossier pour archiver</label>
            <input type="text" id="chemin-dossier-archive" name="cheminDossierArchive" value="${escapeHtml(dossierArchive)}" placeholder="Traité" e2eid="e2eid-champ-chemin-dossier-archive" />
          </div>
          <div class="actions actions-dossier">
            <button type="button" id="bouton-test-connexion" e2eid="e2eid-bouton-test-connexion">Tester connexion</button>
            <span id="resultat-test-message" class="resultatTestMessage" role="status" data-type="">Cliquez sur « Tester connexion » pour lancer le test.</span>
          </div>
        </fieldset>
        <div class="actions actions-formulaire">
          <button type="button" id="bouton-annuler" class="btnSecondary" e2eid="e2eid-bouton-annuler">Annuler</button>
          <button type="submit" id="bouton-enregistrer" e2eid="e2eid-bouton-enregistrer">Enregistrer</button>
      </div>
    </form>
    </div>
    <section id="zone-resultat-test" class="zoneResultatTest" aria-live="polite" role="region" aria-label="Résultat du test de connexion">
      <table id="tableau-resultat" class="tableauResultat" hidden>
        <thead>
          <tr>
            <th>adresse email</th>
            <th>Mot de passe [masqué]</th>
            <th>Dossier</th>
            <th>Type de message</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
    <div id="feedback-enregistrement" class="feedbackEnregistrement${feedbackErreurClass}" aria-live="polite" data-type="${flashTextConfig ? 'erreur' : 'info'}">${escapeHtml(flashText)}</div>
      </div>
    </details>
    ${parametrageIASectionHtml}
    <details class="blocParametrage blocParametrage-claudecode" data-layout="configuration-claudecode" aria-labelledby="titre-claudecode">
      <summary id="titre-claudecode" class="blocParametrageSummary">Configuration ClaudeCode</summary>
      <div class="blocParametrageContent detailsBlocParametrageClaudecode">
        <div id="zone-tutoriel-claudecode" class="zoneTutorielClaudecode" aria-label="Tutoriel création compte ClaudeCode et obtention API Key">${tutorielClaudeCodeHtml}</div>
        <div class="fieldGroup">
          <label for="claudecode-api-key">API Key ClaudeCode</label>
          <input type="password" id="claudecode-api-key" name="claudecodeApiKey" value="" placeholder="${escapeHtml(options?.claudecodeHasApiKey ? 'Déjà enregistrée' : 'sk-ant-api03-…')}" autocomplete="off" e2eid="e2eid-champ-api-key-claudecode" />
          ${options?.claudecodeHasApiKey ? '<span class="indicateurCleEnregistree" aria-live="polite">Déjà enregistrée</span>' : ''}
        </div>
        <div class="actions actions-configuration-claudecode">
          <button type="button" id="bouton-enregistrer-claudecode" e2eid="e2eid-bouton-enregistrer-claudecode">Enregistrer</button>
        </div>
        <hr class="formDivider" aria-hidden="true" />
        <div class="zoneTestClaudecode" data-layout="zone-test-claudecode" aria-labelledby="label-texte-offre-test">
          <div class="fieldGroup">
            <label for="texte-offre-test" id="label-texte-offre-test">Texte d'offre à tester</label>
            <textarea id="texte-offre-test" name="texteOffreTest" rows="6" class="zoneTexteOffreTest" e2eid="e2eid-texte-offre-test" aria-label="Texte d'offre à tester"></textarea>
          </div>
          ${options?.offreTestHasOffre === true ? '<div class="actions actions-recuperer-offre"><button type="button" id="bouton-recuperer-texte-offre" e2eid="e2eid-bouton-recuperer-texte-offre">Récupérer le texte d\'une offre</button></div>' : ''}
          <div class="actions actions-tester-api">
            <button type="button" id="bouton-tester-api" e2eid="e2eid-bouton-tester-api">Tester API</button>
          </div>
          <div id="zone-resultat-test-claudecode" class="zoneResultatTestClaudecode" role="status" aria-live="polite" data-type="" aria-label="Résultat du test API ClaudeCode"></div>
        </div>
      </div>
    </details>
  </div>
  <script>
    function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    document.addEventListener('click', function(e) {
      var t = e.target;
      if (!t) return;
      var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      if (t.id === 'toggle-password' || (t.closest && t.closest('#toggle-password'))) {
        e.preventDefault();
        var pwd = document.getElementById('mot-de-passe');
        var btn = document.getElementById('toggle-password');
        if (pwd && btn) {
          var isPwd = pwd.type === 'password';
          pwd.type = isPwd ? 'text' : 'password';
          btn.setAttribute('aria-label', isPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
          btn.setAttribute('title', isPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
          var eye = btn.querySelector('.iconEye');
          var eyeOff = btn.querySelector('.iconEyeOff');
          if (eye) eye.hidden = !isPwd;
          if (eyeOff) eyeOff.hidden = isPwd;
        }
        return;
      }
      if (t.id === 'bouton-annuler' || (t.closest && t.closest('#bouton-annuler'))) {
        e.preventDefault();
        window.location.href = origin + '/tableau-de-bord';
        return;
      }
      if (t.id === 'bouton-enregistrer' || (t.closest && t.closest('#bouton-enregistrer'))) {
        e.preventDefault();
        var formEl = document.getElementById('form-compte');
        if (!formEl) return;
        var providerEl = document.querySelector('input[name="provider"]:checked');
        var providerVal = providerEl ? providerEl.value : 'imap';
        var adresse = (document.getElementById('adresse-email') && document.getElementById('adresse-email').value) || '';
        if (providerVal === 'microsoft' && !adresse.trim()) {
          var mb = document.getElementById('bloc-microsoft');
          var pe = mb && mb.querySelector('.providerEmailInfo');
          adresse = (pe && pe.textContent && pe.textContent.trim()) || '';
        }
        var parts = [];
        parts.push('provider=' + encodeURIComponent(providerVal));
        parts.push('adresseEmail=' + encodeURIComponent(adresse));
        parts.push('motDePasse=' + encodeURIComponent((document.getElementById('mot-de-passe') && document.getElementById('mot-de-passe').value) || ''));
        parts.push('cheminDossier=' + encodeURIComponent((document.getElementById('chemin-dossier') && document.getElementById('chemin-dossier').value) || ''));
        parts.push('cheminDossierArchive=' + encodeURIComponent((document.getElementById('chemin-dossier-archive') && document.getElementById('chemin-dossier-archive').value) || ''));
        parts.push('imapHost=' + encodeURIComponent((document.getElementById('imap-host') && document.getElementById('imap-host').value) || ''));
        parts.push('imapPort=' + encodeURIComponent((document.getElementById('imap-port') && document.getElementById('imap-port').value) || '993'));
        parts.push('imapSecure=' + ((document.getElementById('imap-secure') && document.getElementById('imap-secure').checked) ? '1' : '0'));
        parts.push('airtableBase=' + encodeURIComponent((document.getElementById('airtable-base') && document.getElementById('airtable-base').value) || ''));
        var apiKeyEl = document.getElementById('airtable-api-key');
        if (apiKeyEl && apiKeyEl.value) parts.push('airtableApiKey=' + encodeURIComponent(apiKeyEl.value));
        var body = parts.join('&');
        var btnSave = document.getElementById('bouton-enregistrer');
        if (btnSave) btnSave.disabled = true;
        fetch(origin + '/parametres', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
          .then(function() { window.location.href = origin + '/tableau-de-bord'; })
          .catch(function() { window.location.href = origin + '/tableau-de-bord'; })
          .finally(function() { if (btnSave) btnSave.disabled = false; });
        return;
      }
      if (t.id === 'bouton-test-connexion' || (t.closest && t.closest('#bouton-test-connexion'))) {
        e.preventDefault();
        e.stopPropagation();
        var zone = document.getElementById('resultat-test-message');
        if (!zone) return;
        var form = document.getElementById('form-compte');
        var providerEl = document.querySelector('input[name="provider"]:checked');
        var providerVal = providerEl ? providerEl.value : 'imap';
        var adresseFromForm = (document.getElementById('adresse-email') && document.getElementById('adresse-email').value) || '';
        if (providerVal === 'microsoft' && !adresseFromForm) {
          var microsoftBloc = document.getElementById('bloc-microsoft');
          var emailEl = microsoftBloc && microsoftBloc.querySelector('.providerEmailInfo');
          adresseFromForm = (emailEl && emailEl.textContent && emailEl.textContent.trim()) || '';
        }
        var payload = {
          provider: providerVal,
          adresseEmail: adresseFromForm,
          motDePasse: (document.getElementById('mot-de-passe') && document.getElementById('mot-de-passe').value) || '',
          cheminDossier: (document.getElementById('chemin-dossier') && document.getElementById('chemin-dossier').value) || '',
          cheminDossierArchive: (document.getElementById('chemin-dossier-archive') && document.getElementById('chemin-dossier-archive').value) || '',
          imapHost: (document.getElementById('imap-host') && document.getElementById('imap-host').value) || '',
          imapPort: (document.getElementById('imap-port') && document.getElementById('imap-port').value) ? Number(document.getElementById('imap-port').value) : 993,
          imapSecure: (document.getElementById('imap-secure') && document.getElementById('imap-secure').checked)
        };
        var tokenTestEl = document.getElementById('token-test');
        if (tokenTestEl && tokenTestEl.value) payload.accessToken = tokenTestEl.value;
        var tab = document.getElementById('tableau-resultat');
        var tb = tab ? tab.querySelector('tbody') : null;
        var btnTest = document.getElementById('bouton-test-connexion');
        zone.textContent = 'test en cours';
        zone.setAttribute('data-type', 'attente');
        if (btnTest) btnTest.disabled = true;
        var sectionTest = document.getElementById('zone-resultat-test');
        if (sectionTest) sectionTest.scrollIntoView({ behavior: 'smooth', block: 'start' });
        fetch(origin + '/api/test-connexion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function(r) { return r.text(); })
          .then(function(text) {
            var data;
            try { data = text ? JSON.parse(text) : null; } catch (err) { data = { ok: false, message: 'Réponse invalide' }; }
            var type = data && data.ok ? 'succès' : 'erreur';
            var nb = (data && data.ok && data.nbEmails != null) ? data.nbEmails : 0;
            var msg = (data && data.ok)
              ? ('Dossier « ' + escapeHtml(payload.cheminDossier || '') + ' » trouvé. ' + nb + ' email(s) à l\\'intérieur.')
              : ((data && data.message) || 'Erreur inconnue');
            zone.textContent = type + ': ' + msg;
            zone.setAttribute('data-type', type);
            if (tab) tab.hidden = false;
            if (tb) tb.innerHTML = '<tr><td>' + escapeHtml(payload.adresseEmail) + '</td><td>[masqué]</td><td>' + escapeHtml(payload.cheminDossier) + '</td><td>' + type + '</td><td>' + escapeHtml(msg) + '</td></tr>';
            if (sectionTest) sectionTest.scrollIntoView({ behavior: 'smooth', block: 'start' });
          })
          .catch(function(err) {
            zone.textContent = 'erreur: ' + (err && err.message ? err.message : 'requête échouée');
            zone.setAttribute('data-type', 'erreur');
            if (tab) tab.hidden = false;
            if (tb) tb.innerHTML = '';
            if (sectionTest) sectionTest.scrollIntoView({ behavior: 'smooth', block: 'start' });
          })
          .finally(function() { if (btnTest) btnTest.disabled = false; });
        return;
      }
      if (t.id === 'bouton-enregistrer-parametrage-ia' || (t.closest && t.closest('#bouton-enregistrer-parametrage-ia'))) {
        e.preventDefault();
        var rehibitoires = [];
        for (var ri = 0; ri < 4; ri++) {
          var titreEl = document.getElementById('parametrage-ia-rehibitoires-' + ri + '-titre');
          var descEl = document.getElementById('parametrage-ia-rehibitoires-' + ri + '-description');
          rehibitoires.push({ titre: titreEl ? titreEl.value : '', description: descEl ? descEl.value : '' });
        }
        var scoresIncontournables = {
          localisation: (document.getElementById('parametrage-ia-scores-incontournables-localisation') && document.getElementById('parametrage-ia-scores-incontournables-localisation').value) || '',
          salaire: (document.getElementById('parametrage-ia-scores-incontournables-salaire') && document.getElementById('parametrage-ia-scores-incontournables-salaire').value) || '',
          culture: (document.getElementById('parametrage-ia-scores-incontournables-culture') && document.getElementById('parametrage-ia-scores-incontournables-culture').value) || '',
          qualiteOffre: (document.getElementById('parametrage-ia-scores-incontournables-qualiteOffre') && document.getElementById('parametrage-ia-scores-incontournables-qualiteOffre').value) || ''
        };
        var scoresOptionnels = [];
        for (var si = 0; si < 4; si++) {
          var stEl = document.getElementById('parametrage-ia-scores-optionnels-' + si + '-titre');
          var saEl = document.getElementById('parametrage-ia-scores-optionnels-' + si + '-attente');
          scoresOptionnels.push({ titre: stEl ? stEl.value : '', attente: saEl ? saEl.value : '' });
        }
        var autresRessourcesEl = document.getElementById('parametrage-ia-autres-ressources');
        var autresRessources = autresRessourcesEl ? autresRessourcesEl.value : '';
        var taPrompt = document.getElementById('prompt-ia-partie-modifiable');
        var partieModifiable = (taPrompt && taPrompt.value) ? taPrompt.value : '';
        var btnIa = document.getElementById('bouton-enregistrer-parametrage-ia');
        if (btnIa) btnIa.disabled = true;
        fetch(origin + '/api/parametrage-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rehibitoires: rehibitoires, scoresIncontournables: scoresIncontournables, scoresOptionnels: scoresOptionnels, autresRessources: autresRessources }) })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (!data || !data.ok) return;
            return fetch(origin + '/api/prompt-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partieModifiable: partieModifiable }) })
              .then(function(r2) { return r2.json(); })
              .then(function(data2) { if (data2 && data2.ok) window.location.reload(); });
          })
          .finally(function() { if (btnIa) btnIa.disabled = false; });
        return;
      }
      if (t.id === 'bouton-proposer-prompt' || (t.closest && t.closest('#bouton-proposer-prompt'))) {
        e.preventDefault();
        var ta = document.getElementById('prompt-ia-partie-modifiable');
        if (!ta) return;
        var btnProposer = document.getElementById('bouton-proposer-prompt');
        if (btnProposer) btnProposer.disabled = true;
        fetch(origin + '/api/prompt-ia')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data && typeof data.partieModifiableDefaut === 'string') ta.value = data.partieModifiableDefaut;
          })
          .finally(function() { if (btnProposer) btnProposer.disabled = false; });
        return;
      }
      if (t.id === 'bouton-lancer-configuration-airtable' || (t.closest && t.closest('#bouton-lancer-configuration-airtable'))) {
        e.preventDefault();
        var statutEl = document.getElementById('statut-configuration-airtable');
        var apiKeyEl = document.getElementById('airtable-api-key');
        var baseEl = document.getElementById('airtable-base');
        if (!statutEl) return;
        var apiKey = (apiKeyEl && apiKeyEl.value) ? apiKeyEl.value.trim() : '';
        var base = (baseEl && baseEl.value) ? baseEl.value.trim() : '';
        statutEl.textContent = 'Configuration en cours…';
        var btnConfig = document.getElementById('bouton-lancer-configuration-airtable');
        if (btnConfig) btnConfig.disabled = true;
        fetch(origin + '/api/configuration-airtable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey, base: base })
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            statutEl.textContent = (data && data.status) ? data.status : (data && data.ok ? 'AirTable prêt' : 'Erreur avec AirTable');
          })
          .catch(function(err) {
            statutEl.textContent = 'Erreur avec AirTable : ' + (err && err.message ? err.message : 'requête échouée');
          })
          .finally(function() { if (btnConfig) btnConfig.disabled = false; });
      }
      if (t.id === 'bouton-enregistrer-claudecode' || (t.closest && t.closest('#bouton-enregistrer-claudecode'))) {
        e.preventDefault();
        var claudecodeInput = document.getElementById('claudecode-api-key');
        var value = (claudecodeInput && claudecodeInput.value) ? claudecodeInput.value.trim() : '';
        var body = value ? { apiKey: value } : {};
        var btnClaude = document.getElementById('bouton-enregistrer-claudecode');
        if (btnClaude) btnClaude.disabled = true;
        fetch(origin + '/api/claudecode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
          .then(function(r) { return r.json(); })
          .then(function(data) { if (data && data.ok) { window.location.reload(); } })
          .finally(function() { if (btnClaude) btnClaude.disabled = false; });
      }
      if (t.id === 'bouton-recuperer-texte-offre' || (t.closest && t.closest('#bouton-recuperer-texte-offre'))) {
        e.preventDefault();
        var ta = document.getElementById('texte-offre-test');
        var btnRecup = document.getElementById('bouton-recuperer-texte-offre');
        if (!ta) return;
        if (btnRecup) btnRecup.disabled = true;
        fetch(origin + '/api/offre-test')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data && typeof data.texte === 'string') ta.value = data.texte;
          })
          .finally(function() { if (btnRecup) btnRecup.disabled = false; });
      }
      if (t.id === 'bouton-tester-api' || (t.closest && t.closest('#bouton-tester-api'))) {
        e.preventDefault();
        var taTest = document.getElementById('texte-offre-test');
        var zoneResultat = document.getElementById('zone-resultat-test-claudecode');
        var btnTester = document.getElementById('bouton-tester-api');
        if (!zoneResultat) return;
        var texteOffre = (taTest && taTest.value) ? taTest.value : '';
        if (btnTester) btnTester.disabled = true;
        zoneResultat.setAttribute('data-type', '');
        zoneResultat.classList.remove('zoneResultatTestClaudecode--erreur');
        zoneResultat.removeAttribute('role');
        zoneResultat.textContent = 'Test en cours…';
        zoneResultat.setAttribute('aria-label', 'Résultat du test API ClaudeCode');
        fetch(origin + '/api/test-claudecode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texteOffre: texteOffre })
        })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            zoneResultat.setAttribute('role', 'status');
            if (data && data.ok === true) {
              zoneResultat.setAttribute('data-type', 'succes');
              zoneResultat.setAttribute('aria-label', 'Résultat du test API ClaudeCode');
              var txt = (typeof data.texte === 'string') ? data.texte : '';
              var html = '<pre class="resultatTestClaudecodeTexte">' + escapeHtml(txt) + '</pre>';
              var jv = data.jsonValidation;
              if (jv && typeof jv === 'object') {
                if (jv.valid === true) {
                  html += '<p class="resultatTestClaudecodeValidation resultatTestClaudecodeValidation--ok">JSON valide.</p>';
                  if (jv.conform === true) {
                    html += '<p class="resultatTestClaudecodeValidation resultatTestClaudecodeValidation--ok">Conforme au schéma attendu.</p>';
                  } else if (jv.conform === false && Array.isArray(jv.validationErrors) && jv.validationErrors.length) {
                    html += '<p class="resultatTestClaudecodeValidation resultatTestClaudecodeValidation--erreur">Non conforme au schéma :</p><ul class="resultatTestClaudecodeValidationListe">';
                    jv.validationErrors.forEach(function(e) {
                      html += '<li>' + escapeHtml(String(e)) + '</li>';
                    });
                    html += '</ul>';
                  }
                } else if (jv.valid === false && typeof jv.error === 'string') {
                  html += '<p class="resultatTestClaudecodeValidation resultatTestClaudecodeValidation--erreur">JSON invalide : ' + escapeHtml(jv.error) + '</p>';
                }
              }
              zoneResultat.innerHTML = html;
            } else {
              zoneResultat.setAttribute('data-type', 'erreur');
              zoneResultat.classList.add('zoneResultatTestClaudecode--erreur');
              zoneResultat.setAttribute('aria-label', 'Erreur du test API ClaudeCode');
              var code = (data && data.code) ? String(data.code) : '';
              var msg = (data && data.message) ? String(data.message) : '';
              zoneResultat.textContent = code ? (msg ? code + ' : ' + msg : code) : (msg || 'Erreur inconnue');
            }
          })
          .catch(function(err) {
            zoneResultat.setAttribute('role', 'status');
            zoneResultat.setAttribute('data-type', 'erreur');
            zoneResultat.classList.add('zoneResultatTestClaudecode--erreur');
            zoneResultat.textContent = 'Erreur : ' + (err && err.message ? err.message : 'requête échouée');
          })
          .finally(function() { if (btnTester) btnTester.disabled = false; });
      }
    });
    function runParametres() {
      var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      var form = document.getElementById('form-compte');
      var formUserEdited = false;
      var initialChecked = document.querySelector('input[name="provider"]:checked');
      var initialProvider = initialChecked ? initialChecked.value : null;
      var storedProvider = typeof localStorage !== 'undefined' ? localStorage.getItem('parametresProvider') : null;
      if (initialProvider !== 'microsoft' && initialProvider !== 'gmail' && (storedProvider === 'imap' || storedProvider === 'microsoft' || storedProvider === 'gmail')) {
        var radio = document.querySelector('input[name="provider"][value="' + storedProvider + '"]');
        if (radio) radio.checked = true;
      }
      var radios = document.querySelectorAll('input[name="provider"]');
      for (var i = 0; i < radios.length; i++) {
        radios[i].addEventListener('change', function() {
          var r = document.querySelector('input[name="provider"]:checked');
          if (r && typeof localStorage !== 'undefined') localStorage.setItem('parametresProvider', r.value);
        });
      }
      var r = document.querySelector('input[name="provider"]:checked');
      if (r && typeof localStorage !== 'undefined') localStorage.setItem('parametresProvider', r.value);
      var adresseInput = document.getElementById('adresse-email');
      var motDePasseInput = document.getElementById('mot-de-passe');
      var cheminInput = document.getElementById('chemin-dossier');
      var cheminArchiveInput = document.getElementById('chemin-dossier-archive');
      var togglePwd = document.getElementById('toggle-password');
      var resultatMessage = document.getElementById('resultat-test-message');
      var tableauResultat = document.getElementById('tableau-resultat');
      var tbody = tableauResultat ? tableauResultat.querySelector('tbody') : null;
      var feedbackEnregistrement = document.getElementById('feedback-enregistrement');

      var imapHostInput = document.getElementById('imap-host');
      var imapPortInput = document.getElementById('imap-port');
      var imapSecureInput = document.getElementById('imap-secure');

      function marquerEditionUtilisateur() {
        formUserEdited = true;
      }
      if (form) {
        form.addEventListener('input', marquerEditionUtilisateur, { once: true });
        form.addEventListener('change', marquerEditionUtilisateur, { once: true });
      }

      function appliquerParametres(data) {
        if (adresseInput && data.adresseEmail != null) adresseInput.value = data.adresseEmail;
        if (cheminInput && data.cheminDossier != null) cheminInput.value = data.cheminDossier;
        if (cheminArchiveInput && data.cheminDossierArchive != null) cheminArchiveInput.value = data.cheminDossierArchive;
        if (imapHostInput && data.imapHost != null) imapHostInput.value = data.imapHost;
        if (imapPortInput && data.imapPort != null) imapPortInput.value = String(data.imapPort);
        if (imapSecureInput) imapSecureInput.checked = data.imapSecure !== false;
        if (motDePasseInput) motDePasseInput.value = '';
        if (data.provider) {
          var r = document.querySelector('input[name="provider"][value="' + data.provider + '"]');
          if (r) r.checked = true;
        }
        if (resultatMessage) { resultatMessage.textContent = 'Cliquez sur « Tester connexion » pour lancer le test.'; resultatMessage.removeAttribute('data-type'); }
        if (feedbackEnregistrement) feedbackEnregistrement.textContent = '';
      }

      if (adresseInput || cheminInput || cheminArchiveInput || imapHostInput) {
        fetch(origin + '/api/compte')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            // Evite d'écraser une saisie manuelle si l'utilisateur a déjà modifié le formulaire.
            if (formUserEdited) return;
            if (data && (data.adresseEmail != null || data.cheminDossier != null || data.cheminDossierArchive != null || data.provider)) appliquerParametres(data);
          })
          .catch(function() {});
      }

    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runParametres);
    } else {
      runParametres();
    }
  </script>`;
}

export interface OptionsPageParametres {
  microsoftAvailable?: boolean;
  flash?: FlashMicrosoft;
  /** URL de base pour le lien "Se connecter" Microsoft (ex. http://127.0.0.1:3001). */
  baseUrl?: string;
  /** Epoch ms : date d'obtention du refresh token Microsoft. */
  tokenObtainedAt?: number;
  /** Si false, masque le lien "Tableau de bord" dans le header (US-1.6). */
  configComplète?: boolean;
  /** Message flash config incomplète après POST /parametres (manque). */
  flashConfigManque?: string[];
  /** Section Paramétrage IA (US-2.1) pour préremplir les champs. */
  parametrageIA?: ParametrageIA | null;
  /** Indicateur « Déjà enregistrée » pour la section ClaudeCode (US-2.2). */
  claudecodeHasApiKey?: boolean;
  /** Partie modifiable du prompt IA (affichage). US-2.3 */
  promptIAPartieModifiable?: string;
  /** Partie fixe du prompt IA (lecture seule). US-2.3 */
  promptIAPartieFixe?: string;
  /** True si au moins une offre Airtable a du texte (bouton Récupérer). US-2.4 */
  offreTestHasOffre?: boolean;
}

export async function getPageParametres(
  dataDir: string,
  options?: OptionsPageParametres
): Promise<string> {
  const content = await getParametresContent(dataDir, options);
  return getLayoutHtml('parametres', 'Paramètres', content, {
    configComplète: options?.configComplète,
  });
}

/** @deprecated Utiliser getPageParametres pour le layout avec menu. Conservé pour compatibilité (ex. BDD). */
export async function getPageHtml(dataDir: string): Promise<string> {
  return getPageParametres(dataDir);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
