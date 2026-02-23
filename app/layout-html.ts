/**
 * Layout commun : header sticky avec menu horizontal (US-1.2).
 * US-1.6 : configComplète === false masque le lien "Tableau de bord".
 * US-1.7 : tableau de synthèse des offres (colonnes fixes + statuts Airtable).
 */
import { STATUTS_OFFRES_AIRTABLE } from '../utils/statuts-offres-airtable.js';
export type PageActive = 'tableau-de-bord' | 'parametres';

export type HeaderOptions = {
  /** Si false, le lien "Tableau de bord" est masqué (config incomplète). */
  configComplète?: boolean;
};

export function getHeaderHtml(active: PageActive, options?: HeaderOptions): string {
  const tableauActive = active === 'tableau-de-bord';
  const parametresActive = active === 'parametres';
  const afficherTableauDeBord = options?.configComplète !== false;
  const lienTableauDeBord = afficherTableauDeBord
    ? `<li><a href="/tableau-de-bord" class="appNavLink${tableauActive ? ' appNavLinkActive' : ''}">Tableau de bord</a></li>`
    : '';
  return `
<header class="appHeader" role="banner">
  <nav class="appNav" aria-label="Navigation principale">
    <ul class="appNavList">
      ${lienTableauDeBord}
      <li><a href="/parametres" class="appNavLink${parametresActive ? ' appNavLinkActive' : ''}">Paramètres</a></li>
    </ul>
  </nav>
</header>`;
}

export function getLayoutHtml(
  active: PageActive,
  title: string,
  mainContent: string,
  options?: HeaderOptions
): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles/site.css">
</head>
<body class="appLayout">
${getHeaderHtml(active, options)}
  <main class="appMain">
${mainContent}
  </main>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type TableauDeBordOptions = {
  airtableBaseUrl?: string;
  /** Si false, masque le lien Tableau de bord dans le header (par défaut true sur cette page). */
  configComplète?: boolean;
};

function getTableauDeBordContent(options?: TableauDeBordOptions): string {
  const airtableBaseUrl = (options?.airtableBaseUrl ?? '').trim();
  const airtableUrlAttr = escapeHtml(airtableBaseUrl);
  const boutonOuvrirAirtableDisabled = airtableBaseUrl ? '' : ' disabled';
  return `
  <div class="pageTableauDeBord">
    <h1>Tableau de bord</h1>
    <section class="dossierBoiteContainer" aria-labelledby="titre-dossier-bal">
    <h2 id="titre-dossier-bal">Dossier de la boite aux lettres</h2>
    <button type="button" class="boutonAuditerDossier" e2eid="e2eid-bouton-auditer-dossier">Auditer le dossier</button>
    <div class="thermometreAudit" aria-hidden="true">
      <div id="thermometre-audit-bar" class="thermometreAuditBar" style="width:0%"></div>
    </div>
    <div id="resultat-audit" class="resultatAudit" role="status" aria-live="polite"></div>
    <div class="auditSynthese" data-layout="table" hidden>
      <table class="auditSyntheseTable" aria-label="Synthèse audit">
        <thead>
          <tr>
            <th scope="col">emailExpéditeur</th>
            <th scope="col">algo</th>
            <th scope="col">actif</th>
            <th scope="col">nbEmails</th>
          </tr>
        </thead>
        <tbody id="audit-synthese-body"></tbody>
      </table>
    </div>
    <div id="audit-sous-totaux" class="auditSousTotaux" hidden>
      <p id="audit-ligne-archivage">0 email sera archivé.</p>
      <p id="audit-ligne-subsistance">0 email subsistera dans le dossier à analyser.</p>
    </div>
    <button type="button" class="boutonLancerTraitement" e2eid="e2eid-bouton-lancer-traitement">Lancer le traitement</button>
    <div class="thermometreTraitement" aria-hidden="true">
      <div id="thermometre-traitement-bar" class="thermometreTraitementBar" style="width:0%"></div>
    </div>
    <div id="resultat-traitement" class="resultatTraitement" role="status" aria-live="polite"></div>
    </section>

    <section class="syntheseOffres" aria-labelledby="titre-synthese-offres" data-layout="table">
      <h2 id="titre-synthese-offres">
        Synthèse des offres
        <span
          class="syntheseOffresInfoBulle"
          aria-label="Aide sur les phases d'algorithme"
          title="Phase 1 : Extraction de l'URL des offres dans les emails&#10;Phase 2 : Ouverture des offres pour en récupérer le texte complet&#10;Phase 3 : Analyse et calcule d'un score par l'IA"
        >ⓘ</span>
      </h2>
      <table class="syntheseOffresTable" aria-label="Synthèse des offres par expéditeur et statut">
        <thead id="synthese-offres-head"></thead>
        <tbody id="synthese-offres-body"></tbody>
      </table>
      <div class="syntheseOffresActions">
        <div class="syntheseOffresActionsButtons">
          <button type="button" class="btnSecondary boutonRafraichirSynthese" e2eid="e2eid-bouton-rafraichir-synthese-offres">Mise à jour</button>
          <button type="button" class="boutonWorkerEnrichissement" e2eid="e2eid-bouton-worker-enrichissement">Ouvrir et récupérer les annonces</button>
          <button type="button" class="boutonOuvrirAirtable" e2eid="e2eid-bouton-ouvrir-airtable" data-airtable-url="${airtableUrlAttr}"${boutonOuvrirAirtableDisabled}>Ouvrir Airtable</button>
        </div>
        <div class="syntheseOffresProgress">
          <div class="thermometreWorkerEnrichissement" aria-hidden="true" hidden>
            <div id="thermometre-worker-enrichissement-bar" class="thermometreWorkerEnrichissementBar" style="width:0%"></div>
          </div>
          <div id="resultat-worker-enrichissement" class="resultatWorkerEnrichissement" role="status" aria-live="polite"></div>
        </div>
      </div>
    </section>
    <script>
(function() {
  var btnAudit = null;
  var zoneAudit = null;
  var barAudit = null;
  var auditSynthese = null;
  var auditSousTotaux = null;
  var syntheseBody = null;
  var ligneArchivage = null;
  var ligneSubsistance = null;
  var pollTimerAudit = null;

  function afficherAudit(texte, isError) {
    if (!zoneAudit) return;
    zoneAudit.textContent = texte;
    zoneAudit.className = 'resultatAudit' + (isError ? ' resultatAudit--erreur' : '');
  }

  function setPercentAudit(p) {
    if (!barAudit) return;
    var v = Number(p);
    if (!isFinite(v)) v = 0;
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    barAudit.style.width = v + '%';
  }

  function stopPollingAudit() {
    if (pollTimerAudit) {
      clearInterval(pollTimerAudit);
      pollTimerAudit = null;
    }
  }

  function afficherSectionsAudit() {
    if (auditSynthese) auditSynthese.hidden = false;
    if (auditSousTotaux) auditSousTotaux.hidden = false;
  }

  function escapeHtmlClient(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderAuditSynthese(st) {
    if (!syntheseBody) return;
    if (!st || !st.result || !Array.isArray(st.result.synthese)) {
      syntheseBody.innerHTML = '';
      return;
    }
    if (st.result.synthese.length === 0) {
      syntheseBody.innerHTML = '<tr><td colspan="4">Aucune source trouvée dans ce dossier.</td></tr>';
      return;
    }
    syntheseBody.innerHTML = st.result.synthese.map(function(ligne) {
      return '<tr>'
        + '<td>' + escapeHtmlClient((ligne && ligne['emailExpéditeur']) || '') + '</td>'
        + '<td>' + escapeHtmlClient((ligne && ligne.algo) || '') + '</td>'
        + '<td>' + escapeHtmlClient((ligne && ligne.actif) || '') + '</td>'
        + '<td>' + escapeHtmlClient((ligne && ligne.nbEmails != null) ? ligne.nbEmails : '') + '</td>'
        + '</tr>';
    }).join('');
  }

  function renderAuditSousTotaux(st) {
    if (!ligneArchivage || !ligneSubsistance) return;
    if (!st || !st.result || !st.result.sousTotauxPrevisionnels) {
      ligneArchivage.textContent = '0 email sera archivé.';
      ligneSubsistance.textContent = '0 email subsistera dans le dossier à analyser.';
      return;
    }
    var nbEmailsScannes = Number(st.result.nbEmailsScannes || 0);
    var emailsAArchiver = Number(st.result.sousTotauxPrevisionnels.emailsÀArchiver || 0);
    var emailsQuiSubsistent = Math.max(0, nbEmailsScannes - emailsAArchiver);
    ligneArchivage.textContent = emailsAArchiver + (emailsAArchiver > 1 ? ' emails seront archivés.' : ' email sera archivé.');
    ligneSubsistance.textContent = emailsQuiSubsistent + (emailsQuiSubsistent > 1
      ? ' emails subsisteront dans le dossier à analyser.'
      : ' email subsistera dans le dossier à analyser.');
  }

  function lancerAuditTableauDeBord(options) {
    var relanceApresTraitement = !!(options && options.relanceApresTraitement);
    afficherAudit(relanceApresTraitement ? 'Audit en cours (mise à jour après traitement)…' : 'Audit en cours…');
    setPercentAudit(0);
    if (btnAudit) btnAudit.disabled = true;
    fetch('/api/audit/start', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || !data.ok || !data.taskId) {
            afficherAudit((data && data.message) ? data.message : 'Erreur inconnue', true);
            if (btnAudit) btnAudit.disabled = false;
            return;
          }
          var taskId = data.taskId;
          stopPollingAudit();
          pollTimerAudit = setInterval(function() {
            fetch('/api/audit/status?taskId=' + encodeURIComponent(taskId))
              .then(function(r) { return r.json(); })
              .then(function(st) {
                if (!st || !st.ok) {
                  afficherAudit((st && st.message) ? st.message : 'Erreur de suivi', true);
                  stopPollingAudit();
                  if (btnAudit) btnAudit.disabled = false;
                  return;
                }

                if (st.percent != null) setPercentAudit(st.percent);
                if (st.message) afficherAudit(st.message, st.status === 'error');

                if (st.status === 'done' || st.status === 'error') {
                  stopPollingAudit();
                  if (st.result && st.result.ok) {
                    afficherSectionsAudit();
                    var msg = 'Audit terminé.';
                    if (st.result.nbEmailsScannes != null) msg += ' Emails scannés : ' + st.result.nbEmailsScannes + '.';
                    if (st.result.nbSourcesCreees != null) msg += ' Sources créées : ' + st.result.nbSourcesCreees + '.';
                    if (st.result.nbSourcesExistantes != null) msg += ' Sources existantes : ' + st.result.nbSourcesExistantes + '.';
                    if (st.result.messages && st.result.messages.length) msg += ' ' + st.result.messages.join(' ');
                    afficherAudit(msg);
                    renderAuditSynthese(st);
                    renderAuditSousTotaux(st);
                  }
                  if (btnAudit) btnAudit.disabled = false;
                }
              })
              .catch(function(err) {
                afficherAudit('Erreur de suivi : ' + (err && err.message ? err.message : 'réseau'), true);
                stopPollingAudit();
                if (btnAudit) btnAudit.disabled = false;
              });
          }, 500);
        })
        .catch(function(err) {
          afficherAudit('Erreur : ' + (err && err.message ? err.message : 'réseau'), true);
          stopPollingAudit();
          if (btnAudit) btnAudit.disabled = false;
        });
  }

  window.__lancerAuditTableauDeBord = lancerAuditTableauDeBord;

  function initAudit() {
    btnAudit = document.querySelector('[e2eid="e2eid-bouton-auditer-dossier"]');
    zoneAudit = document.getElementById('resultat-audit');
    barAudit = document.getElementById('thermometre-audit-bar');
    auditSynthese = document.querySelector('.auditSynthese');
    auditSousTotaux = document.getElementById('audit-sous-totaux');
    syntheseBody = document.getElementById('audit-synthese-body');
    ligneArchivage = document.getElementById('audit-ligne-archivage');
    ligneSubsistance = document.getElementById('audit-ligne-subsistance');
    if (btnAudit) {
      btnAudit.addEventListener('click', function() {
        lancerAuditTableauDeBord();
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudit);
  } else {
    initAudit();
  }
})();

(function() {
  var syntheseOffresSection = null;
  var syntheseOffresHead = null;
  var syntheseOffresBody = null;
  var btnRefreshSynthese = null;
  var DEFAULT_STATUTS_ORDER = ${JSON.stringify([...STATUTS_OFFRES_AIRTABLE])};
  var STATUTS_ORDER = DEFAULT_STATUTS_ORDER.slice();

  function escapeHtmlSynthese(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderTableauSyntheseHead(statutsOrder) {
    if (!syntheseOffresHead) return;
    var status = Array.isArray(statutsOrder) && statutsOrder.length > 0 ? statutsOrder : DEFAULT_STATUTS_ORDER;
    STATUTS_ORDER = status.slice();
    var fixed = ''
      + '<th scope="col">email expéditeur</th>'
      + '<th scope="col" title="Phase 1 : Extraction de l\\'URL des offres dans les emails">Phase 1</th>'
      + '<th scope="col" title="Phase 2 : Ouverture des offres pour en récupérer le texte complet">Phase 2</th>'
      + '<th scope="col">actif</th>';
    var dyn = STATUTS_ORDER.map(function(statut) {
      return '<th scope="col" class="syntheseOffresStatutCol"><span>' + escapeHtmlSynthese(statut) + '</span></th>';
    }).join('');
    syntheseOffresHead.innerHTML = '<tr>' + fixed + dyn + '</tr>';
  }

  function renderTableauSyntheseOffres(lignes, statutsOrder) {
    if (!syntheseOffresBody) return;
    if (Array.isArray(statutsOrder)) {
      renderTableauSyntheseHead(statutsOrder);
    } else if (!STATUTS_ORDER || STATUTS_ORDER.length === 0) {
      renderTableauSyntheseHead(DEFAULT_STATUTS_ORDER);
    }
    if (!lignes || !Array.isArray(lignes)) {
      syntheseOffresBody.innerHTML = '';
      return;
    }
    if (lignes.length === 0) {
      syntheseOffresBody.innerHTML = '';
      return;
    }
    syntheseOffresBody.innerHTML = lignes.map(function(ligne) {
      var actifStr = (ligne && ligne.actif === true) ? 'Oui' : 'Non';
      var phase1Impl = !!(ligne && ligne.phase1Implemented === true);
      if (ligne && ligne.phase1Implemented == null) {
        phase1Impl = !!(ligne && ligne.algoEtape1 && ligne.algoEtape1 !== 'Inconnu');
      }
      var phase2Impl = !!(ligne && ligne.phase2Implemented === true);
      if (ligne && ligne.phase2Implemented == null) {
        phase2Impl = !!(ligne && ligne.algoEtape2 && ligne.algoEtape2 !== 'Inconnu');
      }
      var phase1Html = phase1Impl
        ? '<span class="phaseEtat phaseEtat--ok" title="Phase 1 implémentée">✅</span>'
        : '<span class="phaseEtat phaseEtat--ko" title="Phase 1 non implémentée">❌</span>';
      var phase2Html = phase2Impl
        ? '<span class="phaseEtat phaseEtat--ok" title="Phase 2 implémentée">✅</span>'
        : '<span class="phaseEtat phaseEtat--ko" title="Phase 2 non implémentée">❌</span>';
      var statutsCells = STATUTS_ORDER.map(function(statut) {
        var n = (ligne && ligne.statuts && ligne.statuts[statut] != null) ? ligne.statuts[statut] : 0;
        return '<td>' + escapeHtmlSynthese(String(n)) + '</td>';
      }).join('');
      return '<tr>'
        + '<td>' + escapeHtmlSynthese((ligne && ligne.emailExpéditeur) || '') + '</td>'
        + '<td>' + phase1Html + '</td>'
        + '<td>' + phase2Html + '</td>'
        + '<td>' + escapeHtmlSynthese(actifStr) + '</td>'
        + statutsCells
        + '</tr>';
    }).join('');
    if (syntheseOffresSection && lignes.length > 0) syntheseOffresSection.hidden = false;
  }

  var STATUT_ANNONCE = 'Annonce à récupérer';
  var STATUT_ANALYSER = 'À analyser';

  /** Met à jour uniquement les cellules des colonnes « Annonce à récupérer » et « À analyser » à partir des lignes reçues. */
  function updateCellulesStatutSynthese(lignes) {
    if (!syntheseOffresBody || !lignes || !Array.isArray(lignes)) return;
    var idxAnnonce = STATUTS_ORDER.indexOf(STATUT_ANNONCE);
    var idxAnalyser = STATUTS_ORDER.indexOf(STATUT_ANALYSER);
    if (idxAnnonce === -1 || idxAnalyser === -1) return;
    var firstStatutCol = 4;
    var lignesByEmail = {};
    for (var i = 0; i < lignes.length; i++) {
      var email = (lignes[i] && lignes[i].emailExpéditeur) ? String(lignes[i].emailExpéditeur).trim().toLowerCase() : '';
      if (email) lignesByEmail[email] = lignes[i];
    }
    var rows = syntheseOffresBody.rows;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r];
      if (!row.cells || row.cells.length <= firstStatutCol + Math.max(idxAnnonce, idxAnalyser)) continue;
      var cellEmail = row.cells[0].textContent ? row.cells[0].textContent.trim().toLowerCase() : '';
      var ligne = lignesByEmail[cellEmail];
      if (!ligne || !ligne.statuts) continue;
      var nAnnonce = (ligne.statuts[STATUT_ANNONCE] != null) ? ligne.statuts[STATUT_ANNONCE] : 0;
      var nAnalyser = (ligne.statuts[STATUT_ANALYSER] != null) ? ligne.statuts[STATUT_ANALYSER] : 0;
      row.cells[firstStatutCol + idxAnnonce].textContent = String(nAnnonce);
      row.cells[firstStatutCol + idxAnalyser].textContent = String(nAnalyser);
    }
  }

  function refreshTableauSyntheseOffres() {
    fetch('/api/tableau-synthese-offres', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var statutsOrdre = data && Array.isArray(data.statutsOrdre) && data.statutsOrdre.length > 0
          ? data.statutsOrdre
          : DEFAULT_STATUTS_ORDER;
        renderTableauSyntheseOffres(data && data.lignes, statutsOrdre);
      })
      .catch(function() {});
  }

  /** Rafraîchit uniquement les cellules « Annonce à récupérer » et « À analyser » (sans tout recharger). À appeler après un enrichissement. */
  function refreshTableauSyntheseOffresStatutsOnly() {
    fetch('/api/tableau-synthese-offres', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var lignes = data && data.lignes;
        if (!lignes || !Array.isArray(lignes)) return;
        if (data.statutsOrdre && Array.isArray(data.statutsOrdre) && data.statutsOrdre.length > 0) {
          STATUTS_ORDER = data.statutsOrdre.slice();
        }
        if (!syntheseOffresBody || syntheseOffresBody.rows.length === 0) {
          var statutsOrdre = data.statutsOrdre && data.statutsOrdre.length > 0 ? data.statutsOrdre : DEFAULT_STATUTS_ORDER;
          renderTableauSyntheseOffres(lignes, statutsOrdre);
          return;
        }
        updateCellulesStatutSynthese(lignes);
      })
      .catch(function() {});
  }

  window.__renderTableauSyntheseOffres = renderTableauSyntheseOffres;
  window.__refreshTableauSyntheseOffres = refreshTableauSyntheseOffres;
  window.__refreshTableauSyntheseOffresStatutsOnly = refreshTableauSyntheseOffresStatutsOnly;

  function initSynthese() {
    syntheseOffresSection = document.querySelector('.syntheseOffres');
    syntheseOffresHead = document.getElementById('synthese-offres-head');
    syntheseOffresBody = document.getElementById('synthese-offres-body');
    btnRefreshSynthese = document.querySelector('[e2eid="e2eid-bouton-rafraichir-synthese-offres"]');
    renderTableauSyntheseHead(DEFAULT_STATUTS_ORDER);
    refreshTableauSyntheseOffres();
    if (btnRefreshSynthese) {
      btnRefreshSynthese.addEventListener('click', refreshTableauSyntheseOffres);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSynthese);
  } else {
    initSynthese();
  }
})();

(function() {
  var btn = document.querySelector('[e2eid="e2eid-bouton-lancer-traitement"]');
  var btnWorker = document.querySelector('[e2eid="e2eid-bouton-worker-enrichissement"]');
  var btnOuvrirAirtable = document.querySelector('[e2eid="e2eid-bouton-ouvrir-airtable"]');
  var zone = document.getElementById('resultat-traitement');
  var bar = document.getElementById('thermometre-traitement-bar');
  var barWorker = document.getElementById('thermometre-worker-enrichissement-bar');
  var zoneWorker = document.getElementById('resultat-worker-enrichissement');
  var thermometreWorker = document.querySelector('.thermometreWorkerEnrichissement');
  var pollTimer = null;
  var pollTimerWorker = null;
  var syntheseRefreshWhenWorkerRunning = null;
  var workerWasRunning = false;
  function afficher(texte, isError) {
    if (!zone) return;
    zone.textContent = texte;
    zone.className = 'resultatTraitement' + (isError ? ' resultatTraitement--erreur' : '');
  }
  function setPercent(p) {
    if (!bar) return;
    var v = Number(p);
    if (!isFinite(v)) v = 0;
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    bar.style.width = v + '%';
  }
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }
  function stopPollingWorker() {
    if (pollTimerWorker) {
      clearInterval(pollTimerWorker);
      pollTimerWorker = null;
    }
    if (syntheseRefreshWhenWorkerRunning) {
      clearInterval(syntheseRefreshWhenWorkerRunning);
      syntheseRefreshWhenWorkerRunning = null;
    }
  }
  function setWorkerButton(running) {
    if (!btnWorker) return;
    btnWorker.textContent = running
      ? 'Arrêter d\\'ouvrir et récupérer les annonces'
      : 'Ouvrir et récupérer les annonces';
    btnWorker.setAttribute('data-running', running ? '1' : '0');
  }
  function setWorkerProgress(percent, message, isError) {
    if (thermometreWorker) thermometreWorker.hidden = false;
    if (barWorker) {
      var v = Number(percent);
      if (!isFinite(v)) v = 0;
      if (v < 0) v = 0;
      if (v > 100) v = 100;
      barWorker.style.width = v + '%';
    }
    if (zoneWorker) {
      zoneWorker.textContent = message || '';
      zoneWorker.className = 'resultatWorkerEnrichissement' + (isError ? ' resultatWorkerEnrichissement--erreur' : '');
    }
  }
  function hideWorkerProgress() {
    if (thermometreWorker) thermometreWorker.hidden = true;
    if (barWorker) barWorker.style.width = '0%';
  }
  function refreshWorkerStatus() {
    fetch('/api/enrichissement-worker/status')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.ok) return;
        var running = !!data.running;
        setWorkerButton(running);
        if (running) {
          workerWasRunning = true;
          if (!syntheseRefreshWhenWorkerRunning && window.__refreshTableauSyntheseOffresStatutsOnly) {
            window.__refreshTableauSyntheseOffresStatutsOnly();
            syntheseRefreshWhenWorkerRunning = setInterval(function() {
              window.__refreshTableauSyntheseOffresStatutsOnly();
            }, 20000);
          }
          var p = data.currentProgress;
          if (p && p.total > 0) {
            var percent = Math.round(((p.index + 1) / p.total) * 100);
            var msg = (p.index + 1) + '/' + p.total + ' — ' + (p.algo || '?') + ' — Id: ' + (p.recordId || '');
            setWorkerProgress(percent, msg, false);
          } else {
            setWorkerProgress(0, 'Enrichissement en cours…', false);
          }
        } else {
          if (syntheseRefreshWhenWorkerRunning) {
            clearInterval(syntheseRefreshWhenWorkerRunning);
            syntheseRefreshWhenWorkerRunning = null;
          }
          if (workerWasRunning) {
            workerWasRunning = false;
            if (window.__refreshTableauSyntheseOffresStatutsOnly) window.__refreshTableauSyntheseOffresStatutsOnly();
          }
          hideWorkerProgress();
          if (zoneWorker) {
            var res = data.lastResult;
            if (res && res.ok) {
              zoneWorker.textContent = 'Terminé : ' + (res.nbEnrichies ?? 0) + ' enrichie(s), ' + (res.nbEchecs ?? 0) + ' échec(s).';
              zoneWorker.className = 'resultatWorkerEnrichissement';
            } else if (data.lastError) {
              zoneWorker.textContent = data.lastError;
              zoneWorker.className = 'resultatWorkerEnrichissement resultatWorkerEnrichissement--erreur';
            } else {
              zoneWorker.textContent = '';
            }
          }
        }
      })
      .catch(function() {});
  }
  if (btnWorker) {
    btnWorker.addEventListener('click', function() {
      var isRunning = btnWorker.getAttribute('data-running') === '1';
      var endpoint = isRunning ? '/api/enrichissement-worker/stop' : '/api/enrichissement-worker/start';
      fetch(endpoint, { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || !data.ok) return;
          setWorkerButton(!!data.running);
        })
        .catch(function() {});
    });
    refreshWorkerStatus();
    stopPollingWorker();
    pollTimerWorker = setInterval(refreshWorkerStatus, 1000);
  }
  if (btnOuvrirAirtable) {
    btnOuvrirAirtable.addEventListener('click', function() {
      var url = btnOuvrirAirtable.getAttribute('data-airtable-url') || '';
      if (!url) {
        afficher('URL Airtable non configurée.', true);
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }
  if (btn) {
    btn.addEventListener('click', function() {
      afficher('Traitement en cours…');
      setPercent(0);
      if (btn) btn.disabled = true;
      fetch('/api/traitement/start', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || !data.ok || !data.taskId) {
            afficher((data && data.message) ? data.message : 'Erreur inconnue', true);
            return;
          }
          var taskId = data.taskId;
          stopPolling();
          pollTimer = setInterval(function() {
            fetch('/api/traitement/status?taskId=' + encodeURIComponent(taskId))
              .then(function(r) { return r.json(); })
              .then(function(st) {
                if (!st || !st.ok) {
                  afficher((st && st.message) ? st.message : 'Erreur de suivi', true);
                  stopPolling();
                  return;
                }
                if (st.percent != null) setPercent(st.percent);
                if (st.message) afficher(st.message, st.status === 'error');
                if (st.status === 'done' || st.status === 'error') {
                  stopPolling();
                  if (st.result && st.result.ok) {
                    var msg = 'Traitement terminé.';
                    if (st.result.nbOffresCreees != null) msg += ' Offres créées : ' + st.result.nbOffresCreees + '.';
                    if (st.result.nbOffresDejaPresentes != null && st.result.nbOffresDejaPresentes > 0) msg += ' Offres déjà présentes (mises à jour) : ' + st.result.nbOffresDejaPresentes + '.';
                    if (st.result.nbEnrichies != null) msg += ' Enrichies : ' + st.result.nbEnrichies + '.';
                    if (st.result.messages && st.result.messages.length) msg += ' ' + st.result.messages.join(' ');
                    afficher(msg);
                    if (window.__lancerAuditTableauDeBord) {
                      window.__lancerAuditTableauDeBord({ relanceApresTraitement: true });
                    }
                    if (window.__refreshTableauSyntheseOffres) {
                      var refreshSynthese = window.__refreshTableauSyntheseOffres;
                      setTimeout(function() { refreshSynthese(); }, 400);
                    }
                  }
                  if (btn) btn.disabled = false;
                }
              })
              .catch(function(err) {
                afficher('Erreur de suivi : ' + (err && err.message ? err.message : 'réseau'), true);
                stopPolling();
                if (btn) btn.disabled = false;
              });
          }, 500);
        })
        .catch(function(err) {
          afficher('Erreur : ' + (err && err.message ? err.message : 'réseau'), true);
          stopPolling();
          if (btn) btn.disabled = false;
        })
        .finally(function() {});
    });
  }
})();
</script>
  </div>`;
}

export function getPageTableauDeBord(options?: TableauDeBordOptions): string {
  return getLayoutHtml('tableau-de-bord', 'Tableau de bord', getTableauDeBordContent(options), {
    configComplète: options?.configComplète ?? true,
  });
}
