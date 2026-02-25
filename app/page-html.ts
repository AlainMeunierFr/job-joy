/**
 * Génère le HTML de la page de paramétrage du compte email (US-1.1).
 * Microsoft : bouton "Se connecter avec Microsoft" (ouvre la fenêtre d'auth) si pas encore connecté ;
 * une fois connecté, option radio + bloc comme les autres.
 */
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lireCompte, lireAirTable } from '../utils/index.js';
import { getListePluginsPourAvantPropos } from '../utils/source-plugins.js';
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

/** Formate une date-heure ISO pour affichage rappel consentement (US-3.15 CA6). */
function formatConsentementDateHeure(iso: string): { date: string; heure: string } {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: iso, heure: '' };
    const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return { date, heure };
  } catch {
    return { date: iso, heure: '' };
  }
}

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
  /** Répertoire des ressources projet (guides HTML, etc.). Si fourni, les tutoriels sont lus depuis resourcesDir/guides/ au lieu de dataDir/ressources/. */
  resourcesDir?: string;
  /** Répertoire docs (ex. pour Avant propos = docs/telecharger.html). Si fourni, le bloc Avant propos charge ce fichier. */
  docsDir?: string;
}

function getFlashMessageText(flash: FlashMicrosoft): string {
  if (flash.status === 'ok') {
    return "Connecté avec Microsoft. Vous n'aurez plus à ressaisir votre mot de passe pendant des mois.";
  }
  const msg = flash.message ?? 'Erreur de connexion Microsoft.';
  if (msg === 'AZURE_TENANT_ID') {
    return "Connexion Microsoft non configurée (annuaire manquant). Contactez l'administrateur de l'application.";
  }
  if (msg === 'AZURE_CLIENT_ID') {
    return "Connexion Microsoft non configurée (identifiant d'application manquant). Contactez l'administrateur de l'application.";
  }
  if (/AADSTS50020|does not exist in tenant|cannot access the application in that tenant/i.test(msg)) {
    return "Ce compte personnel (outlook.fr, hotmail.com) ne peut pas être utilisé avec l'application actuellement configurée. Utilisez un compte professionnel ou une autre méthode de connexion (ex. IMAP).";
  }
  return 'Microsoft : ' + msg;
}

export async function getParametresContent(
  dataDir: string,
  options?: OptionsParametresContent
): Promise<string> {
  const INJECT_CHAMP_URL_BASE = '<!-- INJECT_CHAMP_URL_BASE -->';
  const INJECT_CHAMP_API_KEY = '<!-- INJECT_CHAMP_API_KEY -->';

  const guidesDir = options?.resourcesDir
    ? join(options.resourcesDir, 'guides')
    : join(dataDir, 'ressources');
  const pathAirtable = join(guidesDir, 'CreationCompteAirtable.html');
  const pathClaude = join(guidesDir, 'CréationCompteClaudeCode.html');
  let tutorielAirtableHtml = '';
  try {
    tutorielAirtableHtml = await readFile(pathAirtable, 'utf-8');
  } catch {
    // Fichier absent : zone tutoriel vide
  }
  let tutorielClaudeCodeHtml = '';
  try {
    tutorielClaudeCodeHtml = await readFile(pathClaude, 'utf-8');
    tutorielClaudeCodeHtml = tutorielClaudeCodeHtml
      .replace(/<!-- INJECT_CHAMP_API_KEY -->/g, '')
      .replace(/<\/script>/gi, '<\\/script>');
  } catch {
    tutorielClaudeCodeHtml = '<p class="tutorielAbsent">Fichier tutoriel absent.</p>';
  }
  let avantProposHtml = '';
  if (options?.docsDir) {
    try {
      const pathTelecharger = join(options.docsDir, 'telecharger.html');
      avantProposHtml = await readFile(pathTelecharger, 'utf-8');
      const listePlugins = getListePluginsPourAvantPropos();
      const tablePluginsHtml =
        '<table class="introParametrageListePlugins" aria-label="Liste des plugins par source">' +
        '<thead><tr><th scope="col">Email</th><th scope="col">Plugin</th><th scope="col">Création</th><th scope="col">Enrichissement</th></tr></thead><tbody>' +
        listePlugins
          .map(
            (l) =>
              '<tr><td>' +
              escapeHtml(l.email) +
              '</td><td>' +
              escapeHtml(l.plugin) +
              '</td><td>' +
              (l.creation ? 'Oui' : 'Non') +
              '</td><td>' +
              (l.enrichissement ? 'Oui' : 'Non') +
              '</td></tr>'
          )
          .join('') +
        '</tbody></table>';
      avantProposHtml = avantProposHtml.replace(/<!-- INJECT_LISTE_PLUGIN -->/g, tablePluginsHtml);
      avantProposHtml = avantProposHtml.replace(/src="diagramme-de-flux\.png"/g, 'src="/docs/diagramme-de-flux.png"');
    } catch {
      avantProposHtml = '<p class="tutorielAbsent">Avant propos absent (fichier docs/telecharger.html absent).</p>';
    }
  } else {
    avantProposHtml = '<p class="tutorielAbsent">Avant propos absent.</p>';
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
  const connexionOuvert = !compteEmailConfigured || (options?.flashConfigManque && options.flashConfigManque.length > 0);
  const introOuvert = !!(options?.flashConfigManque && options.flashConfigManque.length > 0);
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
  const dossier = (compte?.cheminDossier ?? '').trim() || 'INBOX';
  const dossierArchive = compte?.cheminDossierArchive ?? '';
  const imapHost = compte?.imapHost ?? '';
  const imapPort = compte?.imapPort ?? 993;
  const imapSecure = compte?.imapSecure !== false;
  const consentementIdentification = compte?.consentementIdentification === true;
  const consentementEnvoyeLe = compte?.consentementEnvoyeLe ?? null;
  const consentementDejaEnvoye =
    typeof consentementEnvoyeLe === 'string' && consentementEnvoyeLe.trim() !== '';
  const { date: consentementDate, heure: consentementHeure } = consentementDejaEnvoye
    ? formatConsentementDateHeure(consentementEnvoyeLe.trim())
    : { date: '', heure: '' };
  /* Désactivation des boutons Tester connexion / Enregistrer : gérée en CSS (:has(#consentement-identification:not(:checked))) + JS (attribut disabled pour a11y). */

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
        <p style="margin-top:var(--space-sm)"><a href="${hrefMicrosoft}" target="_blank" rel="noopener noreferrer" class="btnSecondary" style="text-decoration:none;display:inline-block;padding:var(--space-xs) var(--space-md);font-size:0.875rem" id="bouton-se-reconnecter-microsoft">Renouveler la connexion</a></p>
      </div>`
    : `<div id="bloc-microsoft" class="blocProvider blocProvider-microsoft">
        <form method="get" action="${hrefMicrosoft}" target="_blank" style="display:inline">
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
    .replace(INJECT_CHAMP_API_KEY, champApiKeyHtml)
    .replace(/<\/script>/gi, '<\\/script>');

  const ia = normalizeParametrageIA(options?.parametrageIA);
  const scoresIncontournablesRemplis =
    [ia.scoresIncontournables.localisation, ia.scoresIncontournables.salaire, ia.scoresIncontournables.culture, ia.scoresIncontournables.qualiteOffre].every(
      (v) => (v ?? '').trim() !== ''
    );
  const parametrageIAConfigured = scoresIncontournablesRemplis;
  /** Paramétrage prompt de l'IA : rester ouvert (ajustements fréquents). */
  const parametrageIAOuvert = true;
  /** Configuration ClaudeCode : enroulé une fois l'API Key configurée. */
  const claudecodeOuvert = !options?.claudecodeHasApiKey;
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
      <hr class="formDivider parametrageIADivider" aria-hidden="true" />
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

  const introParametrageHtml = `
    <details class="blocParametrage blocParametrage-intro introParametrage" data-layout="intro-parametrage" aria-labelledby="titre-intro-parametrage" ${introOuvert ? 'open' : ''}>
      <summary id="titre-intro-parametrage" class="blocParametrageSummary introParametrageTitle">Avant propos</summary>
      <div class="blocParametrageContent blocParametrageContent-avantPropos">
        ${avantProposHtml}
      </div>
    </details>`;

  return `<div class="pageParametres parametrageCompteEmail" data-layout="page-parametres">
    <h1 class="pageParametresTitle">Paramètres</h1>
    ${introParametrageHtml}
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
          <legend>Dossiers de travail de la boîte mail</legend>
          <p class="fieldHint fieldHint-dossier" id="hint-chemin-dossier">
            <strong>Syntaxe du chemin</strong> : un seul nom pour le dossier principal, ou plusieurs niveaux séparés par <code>/</code>. La valeur par défaut <code>INBOX</code> correspond à la boîte de réception. <strong>Gmail</strong> : il n’y a pas de « dossiers » comme en IMAP classique — utilisez <code>INBOX</code> pour lire la boîte de réception (aucun dossier à créer). Les libellés Gmail sont exposés comme dossiers IMAP si vous en utilisez. Pas d’espace avant/après le chemin.
          </p>
          <div class="fieldGroup">
            <label for="chemin-dossier">Dossier à analyser</label>
            <input type="text" id="chemin-dossier" name="cheminDossier" value="${escapeHtml(dossier)}" placeholder="INBOX" e2eid="e2eid-champ-chemin-dossier" aria-describedby="hint-chemin-dossier" />
          </div>
          <div class="fieldGroup">
            <label for="chemin-dossier-archive">Dossier pour archiver</label>
            <input type="text" id="chemin-dossier-archive" name="cheminDossierArchive" value="${escapeHtml(dossierArchive)}" placeholder="INBOX/Traité" e2eid="e2eid-champ-chemin-dossier-archive" />
          </div>
        <div class="fieldGroup fieldGroup-consentement" aria-label="Consentement identification utilisateur">
          ${consentementDejaEnvoye ? `<p class="consentementRappel">Le consentement a été donné le ${escapeHtml(consentementDate)} à ${escapeHtml(consentementHeure)}.</p>` : `
          <label class="labelCheckbox">
            <input type="checkbox" id="consentement-identification" name="consentementIdentification" value="1" ${consentementIdentification ? 'checked' : ''} e2eid="e2eid-champ-consentement-identification" form="form-compte" />
            En cochant cette case j'accepte qu'un email soit envoyé à Alain Meunier, auteur de job-joy, pour l'informer que j'utilise le logiciel. Il sera utilisé pour le support et les retours du beta-test.
          </label>
        `}
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
    <details class="blocParametrage blocParametrage-claudecode" data-layout="configuration-claudecode" aria-labelledby="titre-claudecode" ${claudecodeOuvert ? 'open' : ''}>
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
      </div>
    </details>
    ${parametrageIASectionHtml}
  </div>
  <script src="/scripts/parametres.js"></script>`;
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
  /** Répertoire des ressources projet (guides HTML). Si fourni, les tutoriels sont lus depuis resourcesDir/guides/. */
  resourcesDir?: string;
  /** Répertoire des docs (ex. guides). Utilisé côté page pour liens ou chemins. */
  docsDir?: string;
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

/** Options pour la page À propos : version, date/heure de publication, répertoire des ressources (contenu depuis ressources/guides/APropos.html). */
export interface PageAProposOptions {
  version?: string;
  buildTime?: string | null;
  /** Répertoire des ressources projet (ex. ressources/). Si fourni, le contenu est lu depuis resourcesDir/guides/APropos.html. */
  resourcesDir?: string;
}

/** Formate une date ISO en français (ex. "21 février 2025 à 14:30"). */
function formatBuildTime(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${date} à ${time}`;
  } catch {
    return iso;
  }
}

/** Contenu À propos en dur (fallback si fichier ressources/guides/APropos.html absent). */
const PAGE_A_PROPOS_FALLBACK = `
<div class="pageAPropos">
  <h1 class="pageParametresTitle">À propos</h1>
  <!-- INJECT_VERSION_LINE -->
  <!-- INJECT_BUILD_TIME_LINE -->

  <div class="blocAPropos" aria-labelledby="a-propos-discuter">
    <h2 id="a-propos-discuter" class="blocAProposTitle">Discuter avec l'auteur</h2>
    <div class="blocAProposContent">
      <p>Je suis Alain Meunier.</p>
      <p>Pour discuter du produit ou simplement faire connaissance, prenez un rendez-vous de <a href="https://zcal.co/alain-meunier/30min" target="_blank" rel="noopener noreferrer">30&nbsp;mn en visio avec moi</a>.</p>
      <p>A bientôt.</p>
    </div>
  </div>

  <div class="blocAPropos" aria-labelledby="a-propos-changelog">
    <h2 id="a-propos-changelog" class="blocAProposTitle">Changelog / Release notes</h2>
    <div class="blocAProposContent">
      <p><a href="https://airtable.com/embed/appnnCmflxgrqf3H3/shr3ahE86sW7F1Qj9?viewControls=on" target="_blank" rel="noopener noreferrer" class="pageAProposBtn">Voir le changelog (nouvel onglet)</a></p>
    </div>
  </div>

  <div class="blocAPropos" aria-labelledby="a-propos-support">
    <h2 id="a-propos-support" class="blocAProposTitle">Support technique</h2>
    <div class="blocAProposContent">
      <p><a href="https://airtable.com/embed/appnnCmflxgrqf3H3/pagCSK6ZPjlXLz8fS/form" target="_blank" rel="noopener noreferrer" class="pageAProposBtn">Ouvrir le formulaire de ticket (nouvel onglet)</a></p>
    </div>
  </div>

  <div class="blocAPropos pageAProposSectionLegal" aria-labelledby="a-propos-gnu">
    <h2 id="a-propos-gnu" class="blocAProposTitle">Licence et conformité (GNU)</h2>
    <div class="blocAProposContent">
      <p>Ce logiciel est distribué sous licence <strong>GNU AGPL v3</strong> (ou ultérieure). Il est fourni «&nbsp;tel quel&nbsp;», sans garantie d'aucune sorte, explicite ou implicite, y compris les garanties de qualité marchande ou d'adéquation à un usage particulier.</p>
      <p>Le code source est disponible sur demande auprès de l'éditeur (voir mentions légales). Conformément à la licence GNU AGPL, toute utilisation en réseau de cette application confère aux utilisateurs le droit de recevoir le code source correspondant.</p>
      <p>Copyright &copy; Alain MEUNIER. Tous droits réservés selon les termes de la licence GNU AGPL v3.</p>
    </div>
  </div>

  <div class="blocAPropos pageAProposSectionLegal" aria-labelledby="a-propos-mentions">
    <h2 id="a-propos-mentions" class="blocAProposTitle">Mentions légales</h2>
    <div class="blocAProposContent">
      <p><strong>Éditeur et responsable de publication</strong></p>
      <p>Alain MEUNIER<br>
      Email&nbsp;: <a href="mailto:alain@maep.fr">alain@maep.fr</a><br>
      Site web&nbsp;: <a href="https://m-alain-et-possible.fr/" target="_blank" rel="noopener noreferrer">https://m-alain-et-possible.fr/</a></p>
    </div>
  </div>
</div>`;

/** Page À propos (US-3.16) : contenu depuis ressources/guides/APropos.html si options.resourcesDir fourni, sinon fallback. */
export function getPageAPropos(options?: PageAProposOptions): string {
  const { version, buildTime, resourcesDir } = options ?? {};
  const versionLine = version ? `<p class="pageAProposVersion">Version ${version}</p>` : '';
  const buildTimeLine = buildTime
    ? `<p class="pageAProposBuildTime">Publiée le&nbsp;: ${formatBuildTime(buildTime)}</p>`
    : '';

  let content: string;
  if (resourcesDir) {
    try {
      content = readFileSync(join(resourcesDir, 'guides', 'APropos.html'), 'utf-8');
    } catch {
      content = PAGE_A_PROPOS_FALLBACK;
    }
  } else {
    content = PAGE_A_PROPOS_FALLBACK;
  }

  content = content
    .replace(/<!-- INJECT_VERSION_LINE -->/g, versionLine)
    .replace(/<!-- INJECT_BUILD_TIME_LINE -->/g, buildTimeLine);

  return getLayoutHtml('a-propos', 'À propos', content);
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
