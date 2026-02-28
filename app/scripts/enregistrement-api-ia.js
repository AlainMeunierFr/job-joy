/**
 * Enregistrement de la clé API Mistral (section API IA de la page Paramètres).
 * Gère aussi le bouton « Tester API » pour éviter toute dépendance à parametres.js.
 */
(function () {
  function escapeHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function run() {
    var form = document.getElementById('form-api-ia');
    var feedback = document.getElementById('feedback-enregistrement-ia');
    if (!form || !feedback) return;

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var inp = document.getElementById('api-key-ia');
      var value = (inp && inp.value) ? inp.value.trim() : '';
      var body = value ? { apiKey: value } : {};
      var btn = document.getElementById('bouton-enregistrer-ia');
      if (btn) btn.disabled = true;
      feedback.textContent = '';
      feedback.removeAttribute('data-type');

      var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      fetch(origin + '/api/mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d && d.ok) {
            feedback.textContent = 'Clé enregistrée.';
            feedback.setAttribute('data-type', 'succes');
            if (inp) {
              inp.value = '';
              inp.placeholder = 'API Key correctement enregistrée';
            }
            /* Recharger pour mettre à jour le header (lien Tableau de bord si config complète). */
            setTimeout(function () { window.location.reload(); }, 400);
          } else {
            feedback.textContent = (d && d.message) || 'Erreur lors de l\'enregistrement.';
            feedback.setAttribute('data-type', 'erreur');
          }
        })
        .catch(function (err) {
          feedback.textContent = (err && err.message) ? err.message : 'Erreur réseau.';
          feedback.setAttribute('data-type', 'erreur');
        })
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    });

    /* Bouton « Tester API » : délégation sur document pour garantir le fonctionnement. */
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || (t.id !== 'bouton-tester-api' && (!t.closest || !t.closest('#bouton-tester-api')))) return;
      ev.preventDefault();
      var zoneResultat = document.getElementById('zone-resultat-test-ia');
      var btnTester = document.getElementById('bouton-tester-api');
      if (!zoneResultat) return;
      var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      var taTest = document.getElementById('texte-offre-test');
      var texteOffre = (taTest && taTest.value) ? taTest.value.trim() : '';
      var body = { texteOffre: texteOffre };
      var poste = (document.getElementById('metadata-poste') && document.getElementById('metadata-poste').value) ? document.getElementById('metadata-poste').value.trim() : '';
      var entreprise = (document.getElementById('metadata-entreprise') && document.getElementById('metadata-entreprise').value) ? document.getElementById('metadata-entreprise').value.trim() : '';
      var ville = (document.getElementById('metadata-ville') && document.getElementById('metadata-ville').value) ? document.getElementById('metadata-ville').value.trim() : '';
      var salaire = (document.getElementById('metadata-salaire') && document.getElementById('metadata-salaire').value) ? document.getElementById('metadata-salaire').value.trim() : '';
      var dateOffre = (document.getElementById('metadata-date-offre') && document.getElementById('metadata-date-offre').value) ? document.getElementById('metadata-date-offre').value.trim() : '';
      var departement = (document.getElementById('metadata-departement') && document.getElementById('metadata-departement').value) ? document.getElementById('metadata-departement').value.trim() : '';
      if (poste) body.poste = poste;
      if (entreprise) body.entreprise = entreprise;
      if (ville) body.ville = ville;
      if (salaire) body.salaire = salaire;
      if (dateOffre) body.dateOffre = dateOffre;
      if (departement) body.departement = departement;
      if (btnTester) btnTester.disabled = true;
      zoneResultat.removeAttribute('data-type');
      zoneResultat.classList.remove('zoneResultatTestApiIa--erreur');
      zoneResultat.textContent = 'Test en cours…';
      zoneResultat.setAttribute('aria-label', 'Résultat du test API IA');
      fetch(origin + '/api/test-mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          zoneResultat.setAttribute('role', 'status');
          if (data && data.ok === true) {
            zoneResultat.setAttribute('data-type', 'succes');
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
                  jv.validationErrors.forEach(function (e) { html += '<li>' + escapeHtml(String(e)) + '</li>'; });
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
                    if (justif !== '') html += '<p class="blocResultatRehibitoireJustification">' + escapeHtml(justif) + '</p>';
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
            zoneResultat.classList.add('zoneResultatTestApiIa--erreur');
            var code = (data && data.code) ? String(data.code) : '';
            var msg = (data && data.message) ? String(data.message) : '';
            zoneResultat.textContent = code ? (msg ? code + ' : ' + msg : code) : (msg || 'Erreur inconnue');
          }
        })
        .catch(function (err) {
          zoneResultat.setAttribute('role', 'status');
          zoneResultat.setAttribute('data-type', 'erreur');
          zoneResultat.classList.add('zoneResultatTestApiIa--erreur');
          zoneResultat.textContent = 'Erreur : ' + (err && err.message ? err.message : 'requête échouée');
        })
        .finally(function () { if (btnTester) btnTester.disabled = false; });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
