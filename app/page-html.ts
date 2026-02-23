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
  const airtable = lireAirTable(dataDir);
  const hasApiKey = !!(airtable?.apiKey?.trim());
  const airtableBase = airtable?.base ?? '';
  const tablesAirtableCreees = !!(airtable?.sources && airtable?.offres);
  const statutAirtableInitial = tablesAirtableCreees ? 'AirTable prêt' : '';
  const compte = lireCompte(dataDir);
  const compteEmailConfigured =
    !!(compte && (compte.adresseEmail || compte.cheminDossier || compte.imapHost));
  const airtableOuvert = !tablesAirtableCreees;
  const connexionOuvert = compteEmailConfigured;
  const microsoftAvailable = options?.microsoftAvailable ?? false;
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
