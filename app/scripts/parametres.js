(function() {
  function init() {
    function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function runTestConnexion(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      var zone = document.getElementById('resultat-test-message');
      var tab = document.getElementById('tableau-resultat');
      var tb = tab ? tab.querySelector('tbody') : null;
      var btnTest = document.getElementById('bouton-test-connexion');
      function showTestError(msg) {
        if (zone) { zone.textContent = 'erreur: ' + msg; zone.setAttribute('data-type', 'erreur'); }
        if (tab) tab.hidden = false;
        if (tb) tb.innerHTML = '';
        if (btnTest) btnTest.disabled = false;
      }
      try {
        if (!zone) {
          console.error('Test connexion: élément #resultat-test-message introuvable');
          showTestError('élément d\'affichage introuvable');
          return;
        }
        var providerEl = document.querySelector('input[name="provider"]:checked');
        var providerVal = providerEl ? providerEl.value : 'imap';
        var adresseFromForm = (document.getElementById('adresse-email') && document.getElementById('adresse-email').value) || '';
        if (providerVal === 'microsoft' && !adresseFromForm) {
          var microsoftBloc = document.getElementById('bloc-microsoft');
          var emailEl = microsoftBloc && microsoftBloc.querySelector('.providerEmailInfo');
          adresseFromForm = (emailEl && emailEl.textContent && emailEl.textContent.trim()) || '';
        }
        var consentementEl = document.getElementById('consentement-identification');
        var payload = {
          provider: providerVal,
          adresseEmail: adresseFromForm,
          motDePasse: (document.getElementById('mot-de-passe') && document.getElementById('mot-de-passe').value) || '',
          cheminDossier: (document.getElementById('chemin-dossier') && document.getElementById('chemin-dossier').value) || '',
          cheminDossierArchive: (document.getElementById('chemin-dossier-archive') && document.getElementById('chemin-dossier-archive').value) || '',
          imapHost: (document.getElementById('imap-host') && document.getElementById('imap-host').value) || '',
          imapPort: (document.getElementById('imap-port') && document.getElementById('imap-port').value) ? Number(document.getElementById('imap-port').value) : 993,
          imapSecure: (document.getElementById('imap-secure') && document.getElementById('imap-secure').checked),
          consentementIdentification: !!(consentementEl && consentementEl.checked)
        };
        var tokenTestEl = document.getElementById('token-test');
        if (tokenTestEl && tokenTestEl.value) payload.accessToken = tokenTestEl.value;
        zone.textContent = 'test en cours';
        zone.setAttribute('data-type', 'attente');
        if (btnTest) btnTest.disabled = true;
        fetch(origin + '/api/test-connexion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          .then(function(r) { return r.text(); })
          .then(function(text) {
            var data;
            try { data = text ? JSON.parse(text) : null; } catch (parseErr) { data = { ok: false, message: 'Réponse invalide' }; }
            var type = data && data.ok ? 'succès' : 'erreur';
            var nb = (data && data.ok && data.nbEmails != null) ? data.nbEmails : 0;
            var msg = (data && data.ok)
              ? ('Dossier « ' + escapeHtml(payload.cheminDossier || '') + ' » trouvé. ' + nb + " email(s) à l'intérieur.")
              : ((data && data.message) || 'Erreur inconnue');
            if (type === 'erreur' && (msg === 'Command failed' || /^Command failed/i.test(msg))) {
              msg = 'Connexion au serveur impossible. Vérifiez l\'hôte IMAP, le port, le mot de passe (ou mot de passe d\'application) et le chemin du dossier.';
            }
            if (zone) { zone.textContent = type + ': ' + msg; zone.setAttribute('data-type', type); }
            if (tab) tab.hidden = false;
            if (tb) tb.innerHTML = '<tr><td>' + escapeHtml(payload.adresseEmail) + '</td><td>[masqué]</td><td>' + escapeHtml(payload.cheminDossier) + '</td><td>' + type + '</td><td>' + escapeHtml(msg) + '</td></tr>';
            if (data && data.openFormUrl) { window.open(data.openFormUrl, '_blank', 'noopener'); }
          })
          .catch(function(err) {
            var msg = (err && err.message) ? err.message : 'requête échouée';
            if (msg === 'Command failed' || /^Command failed/i.test(msg)) {
              msg = 'Connexion au serveur impossible. Vérifiez l\'hôte IMAP, le port, le mot de passe (ou mot de passe d\'application) et le chemin du dossier.';
            }
            showTestError(msg);
          })
          .finally(function() { if (btnTest) btnTest.disabled = false; });
      } catch (err) {
        var msg = (err && err.message) ? err.message : 'Erreur inattendue';
        console.error('Test connexion (client):', err);
        showTestError(msg);
      }
    }
    /* Bouton "Tester connexion" géré par délégation sur document (voir plus bas) pour éviter tout souci d’ordre de chargement. */
    (function() {
      var consentementCheck = document.getElementById('consentement-identification');
      var btnTest = document.getElementById('bouton-test-connexion');
      var btnSave = document.getElementById('bouton-enregistrer');
      function setButtonsCompteFromConsentement() {
        var checked;
        if (consentementCheck) {
          checked = consentementCheck.checked;
        } else {
          var consentAlreadySent = !!document.querySelector('.consentementRappel');
          checked = consentAlreadySent;
        }
        if (btnTest) btnTest.disabled = !checked;
        if (btnSave) btnSave.disabled = !checked;
      }
      if (consentementCheck) {
        consentementCheck.addEventListener('change', setButtonsCompteFromConsentement);
        consentementCheck.addEventListener('click', function() { setTimeout(setButtonsCompteFromConsentement, 0); });
      }
      setButtonsCompteFromConsentement();
    })();
    /* Un seul listener consentement : l’IIFE ci‑dessus (change + click sur la case). Pas de doublon sur document.change. */
    document.addEventListener('click', function(e) {
      var t = e.target;
      if (!t) return;
      var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      if (t.id === 'bouton-test-connexion' || (t.closest && t.closest('#bouton-test-connexion'))) {
        e.preventDefault();
        runTestConnexion(e);
        return;
      }
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
        var consentementEl = document.getElementById('consentement-identification');
        parts.push('consentementIdentification=' + (consentementEl && consentementEl.checked ? '1' : '0'));
        parts.push('airtableBase=' + encodeURIComponent((document.getElementById('airtable-base') && document.getElementById('airtable-base').value) || ''));
        var apiKeyEl = document.getElementById('airtable-api-key');
        if (apiKeyEl && apiKeyEl.value) parts.push('airtableApiKey=' + encodeURIComponent(apiKeyEl.value));
        var body = parts.join('&');
        var btnSave = document.getElementById('bouton-enregistrer');
        var feedbackSave = document.getElementById('feedback-enregistrement');
        if (btnSave) btnSave.disabled = true;
        if (feedbackSave) { feedbackSave.textContent = ''; feedbackSave.removeAttribute('data-type'); }
        fetch(origin + '/parametres', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
          .then(function(r) {
            if (!r.ok) {
              return r.json().then(function(b) {
                var msg = (b && b.message) ? b.message : 'Erreur lors de l\'enregistrement.';
                if (feedbackSave) {
                  feedbackSave.textContent = msg;
                  feedbackSave.setAttribute('data-type', 'erreur');
                  feedbackSave.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                throw new Error(msg);
              });
            }
            window.location.href = origin + '/tableau-de-bord';
          })
          .catch(function(err) {
            if (feedbackSave && !feedbackSave.textContent) {
              feedbackSave.textContent = (err && err.message) ? err.message : 'Requête échouée. Les données n\'ont pas été enregistrées.';
              feedbackSave.setAttribute('data-type', 'erreur');
              feedbackSave.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          })
          .finally(function() { if (btnSave) btnSave.disabled = false; });
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
                  if (jv.json && typeof jv.json === 'object') {
                    html += '<section class="zoneResultatRehibitoires" data-layout="zone-resultat-rehibitoires" aria-labelledby="titre-resultat-rehibitoires"><h4 id="titre-resultat-rehibitoires" class="zoneResultatRehibitoiresTitle">Réhibitoires</h4>';
                    for (var ri = 1; ri <= 4; ri++) {
                      var keyRehib = 'Réhibitoire' + ri;
                      var valRehib = jv.json[keyRehib];
                      var justif = (typeof valRehib === 'string' && valRehib.trim()) ? valRehib.trim() : '';
                      var estRehibitoire = justif !== '';
                      html += '<div class="blocResultatRehibitoire" data-layout="bloc-resultat-rehibitoire" data-rehibitoire-index="' + ri + '">';
                      html += '<span class="blocResultatRehibitoireLabel">Réhibitoire ' + ri + '</span> ';
                      html += '<span class="blocResultatRehibitoireValeur">' + (estRehibitoire ? 'true' : 'false') + '</span>';
                      if (justif !== '') {
                        html += '<p class="blocResultatRehibitoireJustification">' + escapeHtml(justif) + '</p>';
                      }
                      html += '</div>';
                    }
                    html += '</section>';
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
    runParametres();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();