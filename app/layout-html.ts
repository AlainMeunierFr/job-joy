/**
 * Layout commun : header sticky avec menu horizontal (US-1.2).
 * US-1.6 : configComplète === false masque le lien "Tableau de bord".
 * US-1.7 : tableau de synthèse des offres (colonnes fixes + statuts Airtable).
 */
import { STATUTS_OFFRES_AVEC_AUTRE } from '../utils/statuts-offres-airtable.js';
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
  const APP_TITLE = 'Job-Joy';
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(APP_TITLE + ' - ' + title)}</title>
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

    <section class="syntheseOffres" aria-labelledby="titre-synthese-offres" data-layout="synthese-offres">
      <h2 id="titre-synthese-offres">
        Synthèse des offres
        <span
          class="syntheseOffresInfoBulle"
          aria-label="Aide sur les phases (plugin)"
          title="Phase 1 : Extraction de l'URL des offres dans les emails&#10;Phase 2 : Ouverture des offres pour en récupérer le texte complet&#10;Phase 3 : Analyse et calcul d'un score par l'IA"
        >ⓘ</span>
      </h2>
      <table class="syntheseOffresTable" aria-label="Synthèse des offres par expéditeur et statut">
        <thead id="synthese-offres-head"></thead>
        <tbody id="synthese-offres-body"></tbody>
      </table>
      <div class="syntheseOffresActions syntheseOffresActionsOneLine">
        <button type="button" class="btnSecondary boutonRafraichirSynthese" e2eid="e2eid-bouton-rafraichir-synthese-offres">Mise à jour</button>
        <button type="button" class="boutonOuvrirAirtable" e2eid="e2eid-bouton-ouvrir-airtable" data-airtable-url="${airtableUrlAttr}"${boutonOuvrirAirtableDisabled}>Ouvrir Airtable</button>
      </div>
    </section>

    <section class="traitementsBloc" aria-labelledby="titre-traitements" data-layout="traitements">
      <h2 id="titre-traitements">Traitements</h2>
      <div class="traitementsBlocActions">
        <button type="button" class="boutonWorkerEnrichissement" e2eid="e2eid-bouton-worker-enrichissement">Lancer les traitements</button>
      </div>
      <div class="traitementsBlocPhases" data-layout="lignes-phase">
        <div class="traitementsLignePhase" data-layout="ligne-phase" data-phase="creation">
          <span class="traitementsLignePhaseNom">Création</span>
          <div class="syntheseOffresThermo syntheseOffresThermoPhase1" data-layout="thermometre-phase1" aria-label="Progression phase 1 création">
            <div class="thermometreWorkerPhase1" aria-hidden="true" hidden>
              <div id="thermometre-worker-phase1-bar" class="thermometreWorkerPhase1Bar" style="width:0%"></div>
            </div>
            <div id="resultat-worker-phase1" class="resultatWorkerEnrichissement" role="status" aria-live="polite"></div>
          </div>
        </div>
        <div class="traitementsLignePhase" data-layout="ligne-phase" data-phase="enrichissement">
          <span class="traitementsLignePhaseNom">Enrichissement</span>
          <div class="syntheseOffresThermo syntheseOffresThermoEnrichissement">
            <div class="thermometreWorkerEnrichissement" aria-hidden="true" hidden>
              <div id="thermometre-worker-enrichissement-bar" class="thermometreWorkerEnrichissementBar" style="width:0%"></div>
            </div>
            <div id="resultat-worker-enrichissement" class="resultatWorkerEnrichissement" role="status" aria-live="polite"></div>
          </div>
        </div>
        <div class="traitementsLignePhase" data-layout="ligne-phase" data-phase="analyse-ia">
          <span class="traitementsLignePhaseNom">Analyse IA</span>
          <div class="syntheseOffresThermo syntheseOffresThermoAnalyseIA">
            <div class="thermometreWorkerAnalyseIA" aria-hidden="true" hidden>
              <div id="thermometre-worker-analyse-ia-bar" class="thermometreWorkerEnrichissementBar" style="width:0%"></div>
            </div>
            <div id="resultat-worker-analyse-ia" class="resultatWorkerEnrichissement" role="status" aria-live="polite"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="consommationApi" aria-labelledby="titre-consommation-api" data-layout="consommation-api">
      <h2 id="titre-consommation-api">Consommation API</h2>
      <div class="consommationApiRow">
        <div class="consommationApiTableWrap">
          <table class="consommationApiTable" aria-label="Consommation API par jour et par API">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Claude</th>
                <th scope="col">Airtable</th>
              </tr>
            </thead>
            <tbody id="consommation-api-body">
              <tr><td colspan="3">Cliquez sur Calculer pour afficher les données.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="consommationApiHistogram" id="consommation-api-histogram">
          <canvas id="consommation-api-chart" aria-label="Histogramme consommation API par jour"></canvas>
        </div>
      </div>
      <button type="button" class="boutonCalculerConsommationApi" e2eid="e2eid-bouton-calculer-consommation-api">Calculer</button>
    </section>
    <script>
(function() {
  var syntheseOffresSection = null;
  var syntheseOffresHead = null;
  var syntheseOffresBody = null;
  var btnRefreshSynthese = null;
  var DEFAULT_STATUTS_ORDER = ${JSON.stringify([...STATUTS_OFFRES_AVEC_AUTRE])};
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
      + '<th scope="col" title="Adresse email de l\\'expéditeur des messages relevés">email expéditeur</th>'
      + '<th scope="col" title="Source ou plateforme (LinkedIn, HelloWork, etc.)">plugin</th>'
      + '<th scope="col" title="Phase 1 : Extraction de l\\'URL des offres dans les emails">création</th>'
      + '<th scope="col" title="Phase 2 : Ouverture des offres pour en récupérer le texte complet">enrichissement</th>'
      + '<th scope="col" title="Phase 3 : Analyse et calcul d\\'un score par l\\'IA">analyse</th>'
      + '<th scope="col" class="syntheseOffresColAImporter" title="Nombre d\\'emails en attente d\\'extraction (phase 1)">A importer</th>';
    var dyn = STATUTS_ORDER.map(function(statut) {
      return '<th scope="col" class="syntheseOffresStatutCol" title="Nombre d\\'offres au statut « ' + escapeHtmlSynthese(statut) + ' »"><span>' + escapeHtmlSynthese(statut) + '</span></th>';
    }).join('');
    var colTotaux = '<th scope="col" class="syntheseOffresColTotaux" e2eid="e2eid-synthese-offres-col-totaux" title="Total des offres pour cette ligne">Totaux</th>';
    syntheseOffresHead.innerHTML = '<tr>' + fixed + dyn + colTotaux + '</tr>';
  }

  var lastSyntheseLignes = null;
  var lastSyntheseStatutsOrder = null;
  var lastSyntheseTotaux = null;

  function renderTableauSyntheseOffres(lignes, statutsOrder, totaux) {
    if (!syntheseOffresBody) return;
    if (Array.isArray(statutsOrder)) {
      renderTableauSyntheseHead(statutsOrder);
    } else if (!STATUTS_ORDER || STATUTS_ORDER.length === 0) {
      renderTableauSyntheseHead(DEFAULT_STATUTS_ORDER);
    }
    if (!lignes || !Array.isArray(lignes)) {
      syntheseOffresBody.innerHTML = '';
      lastSyntheseLignes = null;
      lastSyntheseStatutsOrder = null;
      lastSyntheseTotaux = null;
      return;
    }
    if (lignes.length === 0) {
      syntheseOffresBody.innerHTML = '';
      lastSyntheseLignes = null;
      lastSyntheseStatutsOrder = null;
      lastSyntheseTotaux = null;
      return;
    }
    lastSyntheseLignes = lignes;
    lastSyntheseStatutsOrder = statutsOrder && Array.isArray(statutsOrder) ? statutsOrder.slice() : null;
    lastSyntheseTotaux = totaux;
    var totalParLigne = (totaux && Array.isArray(totaux.totalParLigne)) ? totaux.totalParLigne : [];
    var totauxColonnes = (totaux && totaux.totauxColonnes && typeof totaux.totauxColonnes === 'object') ? totaux.totauxColonnes : {};
    var totalGeneral = (totaux && typeof totaux.totalGeneral === 'number') ? totaux.totalGeneral : 0;
    var totalAImporter = lignes.reduce(function(s, l) { return s + ((l && typeof l.aImporter === 'number') ? l.aImporter : 0); }, 0);
    var totalACompleter = (totauxColonnes && typeof totauxColonnes['A compléter'] === 'number') ? totauxColonnes['A compléter'] : 0;
    var totalAAnalyser = (totauxColonnes && typeof totauxColonnes['À analyser'] === 'number') ? totauxColonnes['À analyser'] : 0;
    var workerCreationEnCours = !!(typeof window !== 'undefined' && window.__workerCreationEnCours);
    var workerEnrichissementEnCours = !!(typeof window !== 'undefined' && window.__workerEnrichissementEnCours);
    var workerAnalyseIAEnCours = !!(typeof window !== 'undefined' && window.__workerAnalyseIAEnCours);
    var rowsHtml = lignes.map(function(ligne, i) {
      var actifCreation = !!(ligne && ligne.activerCreation === true);
      var actifEnrichissement = !!(ligne && ligne.activerEnrichissement === true);
      var actifAnalyseIA = !!(ligne && ligne.activerAnalyseIA === true);
      var phase1Impl = !!(ligne && ligne.phase1Implemented === true);
      if (ligne && ligne.phase1Implemented == null) {
        phase1Impl = !!(ligne && ligne.pluginEtape1 && ligne.pluginEtape1 !== 'Inconnu');
      }
      var phase2Impl = !!(ligne && ligne.phase2Implemented === true);
      if (ligne && ligne.phase2Implemented == null) {
        phase2Impl = !!(ligne && ligne.pluginEtape2 && ligne.pluginEtape2 !== 'Inconnu');
      }
      var phase3Impl = !!(ligne && ligne.phase3Implemented === true);
      if (ligne && ligne.phase3Implemented == null) phase3Impl = phase2Impl;
      var phase1Html;
      if (!phase1Impl) {
        phase1Html = '<span class="phaseEtat phaseEtat--ko" title="Phase 1 non implémentée">❌</span>';
      } else if (!actifCreation) {
        phase1Html = '<span class="phaseEtat phaseEtat--inactive" title="Phase 1 implémentée, source désactivée">😴</span>';
      } else if (workerCreationEnCours && totalAImporter > 0) {
        phase1Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 1 activée – worker en cours">🏃</span>';
      } else if (workerCreationEnCours) {
        phase1Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 1 activée">✅</span>';
      } else {
        phase1Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 1 activée">✅</span>';
      }
      var phase2Html;
      if (!phase2Impl) {
        phase2Html = '<span class="phaseEtat phaseEtat--ko" title="Phase 2 non implémentée">❌</span>';
      } else if (!actifEnrichissement) {
        phase2Html = '<span class="phaseEtat phaseEtat--inactive" title="Phase 2 implémentée, source désactivée">😴</span>';
      } else if (workerEnrichissementEnCours && totalACompleter > 0) {
        phase2Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 2 activée – worker en cours">🏃</span>';
      } else if (workerEnrichissementEnCours) {
        phase2Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 2 activée">✅</span>';
      } else {
        phase2Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 2 activée">✅</span>';
      }
      var phase3Html;
      if (!phase3Impl) {
        phase3Html = '<span class="phaseEtat phaseEtat--ko" title="Phase 3 non implémentée">❌</span>';
      } else if (!actifAnalyseIA) {
        phase3Html = '<span class="phaseEtat phaseEtat--inactive" title="Phase 3 implémentée, source désactivée">😴</span>';
      } else if (workerAnalyseIAEnCours && totalAAnalyser > 0) {
        phase3Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 3 activée – worker en cours">🏃</span>';
      } else if (workerAnalyseIAEnCours) {
        phase3Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 3 activée">✅</span>';
      } else {
        phase3Html = '<span class="phaseEtat phaseEtat--ok" title="Phase 3 activée">✅</span>';
      }
      var pluginLabel = (ligne && (ligne.pluginEtape2 || ligne.pluginEtape1)) ? (ligne.pluginEtape2 || ligne.pluginEtape1) : 'Inconnu';
      var pluginLabelLower = String(pluginLabel).trim().toLowerCase();
      var pluginSlug = pluginLabelLower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+$/, '') || 'inconnu';
      if (pluginLabelLower.includes('welcome') && pluginLabelLower.includes('jungle')) pluginSlug = 'wttj';
      else if (pluginLabelLower.includes('job') && pluginLabelLower.includes('make') && pluginLabelLower.includes('sense')) pluginSlug = 'jtms';
      else if (pluginSlug === 'linkedin') pluginSlug = 'linkedin';
      else if (pluginSlug === 'job-that-make-sense' || pluginSlug === 'job-that-makes-sense' || pluginSlug === 'jobthatmakesense') pluginSlug = 'jtms';
      else if (pluginSlug === 'welcome-to-the-jungle' || pluginSlug === 'welcometothejungle') pluginSlug = 'wttj';
      else if (pluginSlug === 'hellowork') pluginSlug = 'hellowork';
      else if (pluginSlug === 'cadre-emploi' || pluginSlug === 'cadreemploi') pluginSlug = 'cadreemploi';
      var pluginCapsule = '<span class="synthesePluginCapsule synthesePluginCapsule--' + escapeHtmlSynthese(pluginSlug) + '">' + escapeHtmlSynthese(pluginLabel) + '</span>';
      var aImporter = (ligne && typeof ligne.aImporter === 'number') ? ligne.aImporter : 0;
      var cellAImporter = '<td class="syntheseOffresCellAImporter">' + escapeHtmlSynthese(String(aImporter)) + '</td>';
      var statutsCells = STATUTS_ORDER.map(function(statut) {
        var n = (ligne && ligne.statuts && ligne.statuts[statut] != null) ? ligne.statuts[statut] : 0;
        return '<td>' + escapeHtmlSynthese(String(n)) + '</td>';
      }).join('');
      var totalLigne = (totalParLigne[i] != null) ? totalParLigne[i] : 0;
      var cellTotaux = '<td class="syntheseOffresCellTotaux">' + escapeHtmlSynthese(String(totalLigne)) + '</td>';
      return '<tr>'
        + '<td>' + escapeHtmlSynthese((ligne && ligne.emailExpéditeur) || '') + '</td>'
        + '<td>' + pluginCapsule + '</td>'
        + '<td>' + phase1Html + '</td>'
        + '<td>' + phase2Html + '</td>'
        + '<td>' + phase3Html + '</td>'
        + cellAImporter
        + statutsCells
        + cellTotaux
        + '</tr>';
    }).join('');
    var ligneTotauxHtml = '<tr class="syntheseOffresLigneTotaux" e2eid="e2eid-synthese-offres-ligne-totaux">'
      + '<td>Totaux</td><td></td><td></td><td></td><td></td><td></td>';
    STATUTS_ORDER.forEach(function(statut) {
      var n = (totauxColonnes[statut] != null) ? totauxColonnes[statut] : 0;
      ligneTotauxHtml += '<td>' + escapeHtmlSynthese(String(n)) + '</td>';
    });
    ligneTotauxHtml += '<td class="syntheseOffresCellTotaux" e2eid="e2eid-synthese-offres-cellule-totaux-generaux">' + escapeHtmlSynthese(String(totalGeneral)) + '</td></tr>';
    syntheseOffresBody.innerHTML = rowsHtml + ligneTotauxHtml;
    if (syntheseOffresSection && lignes.length > 0) syntheseOffresSection.hidden = false;
  }

  var STATUT_ANNONCE = 'A compléter';
  var STATUT_ANALYSER = 'À analyser';

  /** Met à jour uniquement les cellules des colonnes « Annonce à récupérer » et « À analyser » à partir des lignes reçues. */
  function updateCellulesStatutSynthese(lignes) {
    if (!syntheseOffresBody || !lignes || !Array.isArray(lignes)) return;
    var idxAnnonce = STATUTS_ORDER.indexOf(STATUT_ANNONCE);
    var idxAnalyser = STATUTS_ORDER.indexOf(STATUT_ANALYSER);
    if (idxAnnonce === -1 || idxAnalyser === -1) return;
    var firstStatutCol = 6;
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
        var totaux = (data && (data.totalParLigne != null || data.totauxColonnes != null || data.totalGeneral != null))
          ? { totauxColonnes: data.totauxColonnes || {}, totalParLigne: Array.isArray(data.totalParLigne) ? data.totalParLigne : [], totalGeneral: typeof data.totalGeneral === 'number' ? data.totalGeneral : 0 }
          : null;
        renderTableauSyntheseOffres(data && data.lignes, statutsOrdre, totaux);
      })
      .catch(function() {});
  }

  /** Audit puis chargement du tableau (colonne "A importer" à jour). Réutilisé au chargement et sur clic "Mise à jour". */
  function loadTableauAvecAudit() {
    return fetch('/api/tableau-synthese-offres/refresh', { method: 'POST' })
      .then(function(r) { return r.json(); })
      .then(function() {
        return fetch('/api/tableau-synthese-offres', { cache: 'no-store' });
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var statutsOrdre = data && Array.isArray(data.statutsOrdre) && data.statutsOrdre.length > 0
          ? data.statutsOrdre
          : DEFAULT_STATUTS_ORDER;
        var totaux = (data && (data.totalParLigne != null || data.totauxColonnes != null || data.totalGeneral != null))
          ? { totauxColonnes: data.totauxColonnes || {}, totalParLigne: Array.isArray(data.totalParLigne) ? data.totalParLigne : [], totalGeneral: typeof data.totalGeneral === 'number' ? data.totalGeneral : 0 }
          : null;
        renderTableauSyntheseOffres(data && data.lignes, statutsOrdre, totaux);
      });
  }

  /** Mise à jour (US-3.3 CA2, US-3.5 CA4) : un clic déclenche l'audit puis le chargement du tableau. */
  function onMiseAJourSyntheseClick() {
    if (btnRefreshSynthese) btnRefreshSynthese.disabled = true;
    loadTableauAvecAudit()
      .catch(function() {})
      .finally(function() {
        if (btnRefreshSynthese) btnRefreshSynthese.disabled = false;
      });
  }

  /** Rafraîchit les données du tableau (statuts et totaux). À appeler après un enrichissement. */
  function refreshTableauSyntheseOffresStatutsOnly() {
    fetch('/api/tableau-synthese-offres', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var lignes = data && data.lignes;
        if (!lignes || !Array.isArray(lignes)) return;
        if (data.statutsOrdre && Array.isArray(data.statutsOrdre) && data.statutsOrdre.length > 0) {
          STATUTS_ORDER = data.statutsOrdre.slice();
        }
        var statutsOrdre = data.statutsOrdre && data.statutsOrdre.length > 0 ? data.statutsOrdre : DEFAULT_STATUTS_ORDER;
        var totaux = (data && (data.totalParLigne != null || data.totauxColonnes != null || data.totalGeneral != null))
          ? { totauxColonnes: data.totauxColonnes || {}, totalParLigne: Array.isArray(data.totalParLigne) ? data.totalParLigne : [], totalGeneral: typeof data.totalGeneral === 'number' ? data.totalGeneral : 0 }
          : null;
        renderTableauSyntheseOffres(lignes, statutsOrdre, totaux);
      })
      .catch(function() {});
  }

  window.__renderTableauSyntheseOffres = renderTableauSyntheseOffres;
  window.__refreshTableauSyntheseOffres = refreshTableauSyntheseOffres;
  window.__refreshTableauSyntheseOffresStatutsOnly = refreshTableauSyntheseOffresStatutsOnly;
  window.__updateTableauSyntheseWorkerState = function() {
    if (lastSyntheseLignes && lastSyntheseStatutsOrder && syntheseOffresBody) {
      renderTableauSyntheseOffres(lastSyntheseLignes, lastSyntheseStatutsOrder, lastSyntheseTotaux);
    }
  };

  function initSynthese() {
    syntheseOffresSection = document.querySelector('.syntheseOffres');
    syntheseOffresHead = document.getElementById('synthese-offres-head');
    syntheseOffresBody = document.getElementById('synthese-offres-body');
    btnRefreshSynthese = document.querySelector('[e2eid="e2eid-bouton-rafraichir-synthese-offres"]');
    renderTableauSyntheseHead(DEFAULT_STATUTS_ORDER);
    loadTableauAvecAudit().catch(function() {});
    if (btnRefreshSynthese) {
      btnRefreshSynthese.addEventListener('click', onMiseAJourSyntheseClick);
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
  var barWorkerPhase1 = document.getElementById('thermometre-worker-phase1-bar');
  var zoneWorkerPhase1 = document.getElementById('resultat-worker-phase1');
  var thermometreWorkerPhase1 = document.querySelector('.thermometreWorkerPhase1');
  var barWorker = document.getElementById('thermometre-worker-enrichissement-bar');
  var zoneWorker = document.getElementById('resultat-worker-enrichissement');
  var thermometreWorker = document.querySelector('.thermometreWorkerEnrichissement');
  var barWorkerAnalyseIA = document.getElementById('thermometre-worker-analyse-ia-bar');
  var zoneWorkerAnalyseIA = document.getElementById('resultat-worker-analyse-ia');
  var thermometreAnalyseIA = document.querySelector('.thermometreWorkerAnalyseIA');
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
    btnWorker.textContent = running ? 'Arrêter les traitements' : 'Lancer les traitements';
    btnWorker.setAttribute('data-running', running ? '1' : '0');
  }
  function setWorkerProgressPhase1(percent, message, isError) {
    if (thermometreWorkerPhase1) thermometreWorkerPhase1.hidden = false;
    if (barWorkerPhase1) {
      var v = Number(percent);
      if (!isFinite(v)) v = 0;
      if (v < 0) v = 0;
      if (v > 100) v = 100;
      barWorkerPhase1.style.width = v + '%';
    }
    if (zoneWorkerPhase1) {
      zoneWorkerPhase1.textContent = message || '';
      zoneWorkerPhase1.className = 'resultatWorkerEnrichissement' + (isError ? ' resultatWorkerEnrichissement--erreur' : '');
    }
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
  function setWorkerProgressAnalyseIA(percent, message, isError) {
    if (thermometreAnalyseIA) thermometreAnalyseIA.hidden = false;
    if (barWorkerAnalyseIA) {
      var v = Number(percent);
      if (!isFinite(v)) v = 0;
      if (v < 0) v = 0;
      if (v > 100) v = 100;
      barWorkerAnalyseIA.style.width = v + '%';
    }
    if (zoneWorkerAnalyseIA) {
      zoneWorkerAnalyseIA.textContent = message || '';
      zoneWorkerAnalyseIA.className = 'resultatWorkerEnrichissement' + (isError ? ' resultatWorkerEnrichissement--erreur' : '');
    }
  }
  function hideWorkerProgressPhase1() {
    if (thermometreWorkerPhase1) thermometreWorkerPhase1.hidden = true;
    if (barWorkerPhase1) barWorkerPhase1.style.width = '0%';
  }
  function hideWorkerProgress() {
    if (thermometreWorker) thermometreWorker.hidden = true;
    if (barWorker) barWorker.style.width = '0%';
  }
  function hideWorkerProgressAnalyseIA() {
    if (thermometreAnalyseIA) thermometreAnalyseIA.hidden = true;
    if (barWorkerAnalyseIA) barWorkerAnalyseIA.style.width = '0%';
  }
  function refreshWorkerStatus() {
    fetch('/api/enrichissement-worker/status')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.ok) return;
        var running = !!data.running;
        var enrich = data.enrichissement || {};
        var analyseIA = data.analyseIA || {};
        window.__workerEnCours = running;
        window.__workerCreationEnCours = !!(data.creation && data.creation.running) || !!(enrich.running);
        window.__workerEnrichissementEnCours = !!(enrich.running);
        window.__workerAnalyseIAEnCours = !!(analyseIA.running) || (running && !enrich.running);
        if (typeof window.__updateTableauSyntheseWorkerState === 'function') {
          window.__updateTableauSyntheseWorkerState();
        }
        setWorkerButton(running);
        if (running) {
          workerWasRunning = true;
          if (!syntheseRefreshWhenWorkerRunning && window.__refreshTableauSyntheseOffresStatutsOnly) {
            window.__refreshTableauSyntheseOffresStatutsOnly();
            syntheseRefreshWhenWorkerRunning = setInterval(function() {
              window.__refreshTableauSyntheseOffresStatutsOnly();
            }, 20000);
          }
          var creation = data.creation || {};
          var pCreation = creation.currentProgress;
          if (pCreation && pCreation.total > 0) {
            var percentCreation = Math.round(((pCreation.index + 1) / pCreation.total) * 100);
            setWorkerProgressPhase1(percentCreation, (pCreation.index + 1) + '/' + pCreation.total + ' — création…', false);
          } else {
            setWorkerProgressPhase1(0, (creation.running ? 'Création en cours…' : ''), false);
          }
          var p = enrich.currentProgress || data.currentProgress;
          if (p && p.total > 0) {
            var percent = Math.round(((p.index + 1) / p.total) * 100);
            var msg = (p.index + 1) + '/' + p.total + ' — ' + (p.plugin || '?') + ' — Id: ' + (p.recordId || '');
            setWorkerProgress(percent, msg, false);
          } else {
            setWorkerProgress(0, enrich.running ? 'Enrichissement en cours…' : '', false);
          }
          var pIA = analyseIA.currentProgress;
          var stateAnalyseIA = data.stateAnalyseIA || {};
          var nbCandidates = stateAnalyseIA.nbCandidates;
          if (pIA && pIA.total > 0) {
            var percentIA = Math.round(((pIA.index + 1) / pIA.total) * 100);
            var poste = (pIA.poste || '').trim() || '?';
            var ville = (pIA.ville || '').trim() || '?';
            setWorkerProgressAnalyseIA(percentIA, 'Analyse par l\\'IA : ' + poste + ' - ' + ville, false);
          } else {
            var suffix = typeof nbCandidates === 'number' ? ' (' + nbCandidates + ' offre(s) À analyser)' : '';
            var msgIA = analyseIA.running
              ? (pIA && pIA.total === 0
                ? 'Analyse par l\\'IA : en attente…' + suffix
                : 'Analyse par l\\'IA en cours…' + suffix)
              : '';
            setWorkerProgressAnalyseIA(0, msgIA, false);
          }
        } else {
          window.__workerCreationEnCours = false;
          window.__workerEnrichissementEnCours = false;
          window.__workerAnalyseIAEnCours = false;
          if (syntheseRefreshWhenWorkerRunning) {
            clearInterval(syntheseRefreshWhenWorkerRunning);
            syntheseRefreshWhenWorkerRunning = null;
          }
          if (workerWasRunning) {
            workerWasRunning = false;
            if (window.__refreshTableauSyntheseOffresStatutsOnly) window.__refreshTableauSyntheseOffresStatutsOnly();
          }
          hideWorkerProgressPhase1();
          hideWorkerProgress();
          hideWorkerProgressAnalyseIA();
          var creation = data.creation || {};
          var enrich = data.enrichissement || {};
          if (zoneWorkerPhase1) {
            var resCreation = creation.lastResult || data.creationLastResult;
            if (resCreation && resCreation.ok) {
              zoneWorkerPhase1.textContent = 'Terminé : ' + (resCreation.nbCreees ?? 0) + ' créée(s), ' + (resCreation.nbEchecs ?? 0) + ' échec(s).';
              zoneWorkerPhase1.className = 'resultatWorkerEnrichissement';
            } else if (creation.lastError) {
              zoneWorkerPhase1.textContent = creation.lastError;
              zoneWorkerPhase1.className = 'resultatWorkerEnrichissement resultatWorkerEnrichissement--erreur';
            } else {
              zoneWorkerPhase1.textContent = 'Terminé : 0 créée(s).';
              zoneWorkerPhase1.className = 'resultatWorkerEnrichissement';
            }
          }
          if (zoneWorker) {
            var res = enrich.lastResult || data.lastResult;
            if (res && res.ok) {
              zoneWorker.textContent = 'Terminé : ' + (res.nbEnrichies ?? 0) + ' enrichie(s), ' + (res.nbEchecs ?? 0) + ' échec(s).';
              zoneWorker.className = 'resultatWorkerEnrichissement';
            } else if (enrich.lastError || data.lastError) {
              zoneWorker.textContent = enrich.lastError || data.lastError;
              zoneWorker.className = 'resultatWorkerEnrichissement resultatWorkerEnrichissement--erreur';
            } else {
              zoneWorker.textContent = '';
            }
          }
          if (zoneWorkerAnalyseIA) {
            var resIA = (data.analyseIA || {}).lastResult;
            if (resIA && resIA.ok) {
              var txt = 'Terminé : ' + (resIA.nbAnalysees ?? 0) + ' analysée(s), ' + (resIA.nbEchecs ?? 0) + ' échec(s).';
              if ((resIA.nbEchecs ?? 0) > 0 && resIA.messages && resIA.messages.length > 0) {
                txt += ' Erreur (ex.) : ' + resIA.messages[0];
              }
              zoneWorkerAnalyseIA.textContent = txt;
              zoneWorkerAnalyseIA.className = (resIA.nbEchecs ?? 0) > 0 ? 'resultatWorkerEnrichissement resultatWorkerEnrichissement--erreur' : 'resultatWorkerEnrichissement';
            } else if ((data.analyseIA || {}).lastError) {
              zoneWorkerAnalyseIA.textContent = data.analyseIA.lastError;
              zoneWorkerAnalyseIA.className = 'resultatWorkerEnrichissement resultatWorkerEnrichissement--erreur';
            } else {
              zoneWorkerAnalyseIA.textContent = '';
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
          refreshWorkerStatus();
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
})();

(function() {
  var btnCalculer = document.querySelector('[e2eid="e2eid-bouton-calculer-consommation-api"]');
  var tbodyConsommation = document.getElementById('consommation-api-body');
  var canvasChart = document.getElementById('consommation-api-chart');
  function escapeConsommation(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function allDaysFromTo(minISO, maxISO) {
    var out = [];
    var d = new Date(minISO + 'T12:00:00Z');
    var end = new Date(maxISO + 'T12:00:00Z');
    while (d <= end) {
      var y = d.getUTCFullYear();
      var m = String(d.getUTCMonth() + 1).padStart(2, '0');
      var day = String(d.getUTCDate()).padStart(2, '0');
      out.push(y + '-' + m + '-' + day);
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
  }
  function nextNiceStep(rawStep) {
    if (!isFinite(rawStep) || rawStep <= 0) return 10;
    var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    var norm = rawStep / mag;
    var mult = (norm <= 1) ? 1 : (norm <= 2) ? 2 : (norm <= 5) ? 5 : 10;
    var step = mult * mag;
    return step < 1 ? 1 : step;
  }
  function computeYScale(maxVal, chartHeightPx, minSpacingPx) {
    minSpacingPx = minSpacingPx || 28;
    var maxTicks = Math.max(2, Math.floor(chartHeightPx / minSpacingPx) - 1);
    var rawStep = maxVal / maxTicks;
    var step = nextNiceStep(rawStep);
    var yMax = step * Math.ceil(maxVal / step) || step;
    return { yMax: yMax, step: step };
  }
  function drawConsommationHistogram(data) {
    if (!canvasChart || !data || typeof data !== 'object') return;
    var dates = Object.keys(data).sort();
    if (dates.length === 0) {
      var ctx = canvasChart.getContext('2d');
      if (ctx) {
        canvasChart.width = canvasChart.offsetWidth;
        canvasChart.height = 120;
        ctx.clearRect(0, 0, canvasChart.width, canvasChart.height);
      }
      return;
    }
    var minDate = dates[0];
    var maxDate = dates[dates.length - 1];
    var allDays = allDaysFromTo(minDate, maxDate);
    var claudeValues = allDays.map(function(d) {
      var row = data[d] || {};
      return (row.Claude != null) ? Number(row.Claude) : 0;
    });
    var airtableValues = allDays.map(function(d) {
      var row = data[d] || {};
      return (row.Airtable != null) ? Number(row.Airtable) : 0;
    });
    var maxVal = Math.max(
      Math.max.apply(null, claudeValues),
      Math.max.apply(null, airtableValues),
      1
    );
    var paddingLeft = 32;
    var paddingRight = 8;
    var paddingTop = 24;
    var paddingBottom = 28;
    var w = canvasChart.offsetWidth || 300;
    var h = 320;
    canvasChart.width = w;
    canvasChart.height = h;
    var ctx = canvasChart.getContext('2d');
    if (!ctx) return;
    var chartW = w - paddingLeft - paddingRight;
    var chartH = h - paddingTop - paddingBottom;
    var scale = computeYScale(maxVal, chartH, 28);
    var yMax = scale.yMax;
    var step = scale.step;
    var colorClaude = '#2c5282';
    var colorAirtable = '#276749';
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#cccccc';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var yTick = 0; yTick <= yMax; yTick += step) {
      var yy = paddingTop + chartH - (yTick / yMax) * chartH;
      ctx.fillText(String(yTick), paddingLeft - 6, yy);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, yy);
      ctx.lineTo(paddingLeft + chartW, yy);
      ctx.stroke();
    }
    var n = allDays.length;
    var barGap = n > 0 ? Math.max(2, 4) : 0;
    var slotW = n > 0 ? (chartW - (n - 1) * barGap) / n : 0;
    var barInnerGap = 2;
    var barW = slotW > barInnerGap ? (slotW - barInnerGap) / 2 : 0;
    for (var i = 0; i < n; i++) {
      var slotX = paddingLeft + i * (slotW + barGap);
      var labelX = slotX + slotW / 2;
      var label = allDays[i].slice(8, 10) + '/' + allDays[i].slice(5, 7);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(label, labelX, h - paddingBottom + 6);
      var cVal = claudeValues[i];
      var aVal = airtableValues[i];
      if (cVal > 0) {
        var barH = (cVal / yMax) * chartH;
        var barX = slotX + 1;
        var barY = paddingTop + chartH - barH;
        ctx.fillStyle = colorClaude;
        ctx.fillRect(barX, barY, Math.max(0, barW - 1), barH);
      }
      if (aVal > 0) {
        var barH = (aVal / yMax) * chartH;
        var barX = slotX + 1 + barW + barInnerGap;
        var barY = paddingTop + chartH - barH;
        ctx.fillStyle = colorAirtable;
        ctx.fillRect(barX, barY, Math.max(0, barW - 1), barH);
      }
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var legendX = paddingLeft + chartW - 100;
    var legendY = paddingTop - 14;
    ctx.fillStyle = colorClaude;
    ctx.fillRect(legendX, legendY - 5, 10, 10);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('Claude', legendX + 14, legendY);
    ctx.fillStyle = colorAirtable;
    ctx.fillRect(legendX + 52, legendY - 5, 10, 10);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText('Airtable', legendX + 66, legendY);
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + chartH);
    ctx.lineTo(paddingLeft + chartW, paddingTop + chartH);
    ctx.stroke();
  }
  function renderConsommationApi(data) {
    if (!tbodyConsommation) return;
    if (!data || typeof data !== 'object') {
      tbodyConsommation.innerHTML = '<tr><td colspan="3">Aucune donnée.</td></tr>';
      drawConsommationHistogram(null);
      return;
    }
    var dataForTable = data;
    if (Object.prototype.hasOwnProperty.call(data, 'parIntention')) {
      dataForTable = {};
      for (var k in data) if (k !== 'parIntention') dataForTable[k] = data[k];
    }
    var dates = Object.keys(dataForTable).sort().reverse();
    if (dates.length === 0) {
      tbodyConsommation.innerHTML = '<tr><td colspan="3">Aucun log pour la période.</td></tr>';
      drawConsommationHistogram(dataForTable);
      return;
    }
    tbodyConsommation.innerHTML = dates.map(function(date) {
      var row = dataForTable[date] || {};
      var claude = (row.Claude != null) ? Number(row.Claude) : 0;
      var airtable = (row.Airtable != null) ? Number(row.Airtable) : 0;
      return '<tr data-date="' + escapeConsommation(date) + '">'
        + '<td>' + escapeConsommation(date) + '</td>'
        + '<td data-api="Claude">' + escapeConsommation(String(claude)) + '</td>'
        + '<td data-api="Airtable">' + escapeConsommation(String(airtable)) + '</td>'
        + '</tr>';
    }).join('');
    drawConsommationHistogram(dataForTable);
  }
  if (btnCalculer) {
    btnCalculer.addEventListener('click', function() {
      fetch('/api/consommation-api', { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          renderConsommationApi(data);
        })
        .catch(function() {
          if (tbodyConsommation) {
            tbodyConsommation.innerHTML = '<tr><td colspan="3">Erreur lors du chargement.</td></tr>';
          }
          drawConsommationHistogram(null);
        });
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
