/**
 * Layout commun : header sticky avec menu horizontal (US-1.2).
 * Si la config est incomplète, le lien "Tableau de bord" est masqué (US-1.6).
 * US-1.7 : tableau de synthèse des offres (colonnes fixes + statuts Airtable).
 */
import { STATUTS_OFFRES_AVEC_AUTRE } from '../utils/statuts-offres-airtable.js';
export type PageActive = 'tableau-de-bord' | 'offres' | 'parametres' | 'documentation' | 'a-propos' | 'audit';

export type HeaderOptions = {
  /** Si false, masque le lien "Tableau de bord" (paramétrage incomplet). */
  configComplète?: boolean;
  /** Si true, affiche le lien "Audit du code" (mode dev uniquement). */
  showAuditLink?: boolean;
  /** Si true, affiche le lien "Offres" (US-7.9 : uniquement si au moins une offre en base). */
  showOffresLink?: boolean;
};

export function getHeaderHtml(active: PageActive, options?: HeaderOptions): string {
  const tableauActive = active === 'tableau-de-bord';
  const offresActive = active === 'offres';
  const parametresActive = active === 'parametres';
  const documentationActive = active === 'documentation';
  const aProposActive = active === 'a-propos';
  const auditActive = active === 'audit';
  const showTableauDeBord = options?.configComplète !== false;
  const lienTableauDeBord = showTableauDeBord
    ? `<li><a href="/tableau-de-bord" class="appNavLink${tableauActive ? ' appNavLinkActive' : ''}" e2eid="e2eid-nav-tableau-de-bord">Tableau de bord</a></li>`
    : '';
  /** US-7.9 : lien Offres visible sur toutes les pages (Tableau de bord, Paramètres, Documentation, À propos, Offres, Audit) dès qu'il y a au moins une offre en base. */
  const showOffresLink = Boolean(options?.showOffresLink);
  const lienOffres = showOffresLink
    ? `<li><a href="/offres" class="appNavLink${offresActive ? ' appNavLinkActive' : ''}" e2eid="e2eid-nav-offres">Offres</a></li>`
    : '';
  const lienAudit = options?.showAuditLink
    ? `<li><a href="/audit" class="appNavLink${auditActive ? ' appNavLinkActive' : ''}">Audit du code</a></li>`
    : '';
  return `
<header class="appHeader" role="banner">
  <nav class="appNav" aria-label="Navigation principale">
    <ul class="appNavList">
      ${lienTableauDeBord}
      ${lienOffres}
      <li><a href="/parametres" class="appNavLink${parametresActive ? ' appNavLinkActive' : ''}" e2eid="e2eid-nav-parametres">Paramètres</a></li>
      <li><a href="/documentation" class="appNavLink${documentationActive ? ' appNavLinkActive' : ''}">Documentation</a></li>
      <li><a href="/a-propos" class="appNavLink${aProposActive ? ' appNavLinkActive' : ''}">À propos</a></li>
      ${lienAudit}
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
  <div class="pageTitleBar visuallyHidden" role="presentation">
    <h1 class="pageTitleBarTitle">${escapeHtml(title)}</h1>
  </div>
  <main class="appMain">
${mainContent}
  </main>
  <script>
  (function() {
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a[href^="http"]');
      if (!a || a.target === '_blank' || a.getAttribute('target')) return;
      try {
        var u = new URL(a.href);
        var defPort = location.protocol === 'https:' ? 443 : 80;
        var locPort = location.port ? parseInt(location.port, 10) : defPort;
        var urlPort = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
        if (u.hostname === location.hostname && urlPort === locPort) return;
      } catch (_) { return; }
      e.preventDefault();
      window.open(a.href, '_blank', 'noopener,noreferrer');
    });
  })();
  </script>
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

/** US-6.6 CA5 : fragment HTML pour la cellule Source du tableau de synthèse. Si urlOfficielle est fournie et non vide, enveloppe le nom dans un lien target="_blank". */
export function buildSourceCapsuleHtml(
  sourceNom: string,
  sourceSlug: string,
  urlOfficielle?: string
): string {
  const escapedNom = escapeHtml(sourceNom);
  const escapedSlug = escapeHtml(sourceSlug);
  const spanContent =
    '<span class="syntheseSourceCapsule syntheseSourceCapsule--' + escapedSlug + '">' + escapedNom + '</span>';
  const url = (urlOfficielle ?? '').trim();
  if (url !== '') {
    const escapedUrl = escapeHtml(url);
    return '<a href="' + escapedUrl + '" target="_blank" rel="noopener noreferrer">' + spanContent + '</a>';
  }
  return spanContent;
}

type TableauDeBordOptions = {
  airtableBaseUrl?: string;
  /** US-7.9 : afficher le lien Offres dans le menu (si au moins une offre en base). */
  showOffresLink?: boolean;
  /** Si false, masque le lien Tableau de bord dans le header (par défaut true sur cette page). */
  configComplète?: boolean;
  /** Si true, affiche le lien "Audit du code" dans le header (mode dev). */
  showAuditLink?: boolean;
};

function getTableauDeBordContent(options?: TableauDeBordOptions): string {
  const airtableBaseUrl = (options?.airtableBaseUrl ?? '').trim();
  const airtableUrlAttr = escapeHtml(airtableBaseUrl);
  const boutonOuvrirAirtableDisabled = airtableBaseUrl ? '' : ' disabled';
  return `
  <div class="pageTableauDeBord">
    <section class="syntheseOffres" aria-labelledby="titre-synthese-offres" data-layout="synthese-offres">
      <h2 id="titre-synthese-offres">Synthèse des offres</h2>
      <div class="syntheseOffresTableWrap">
        <table class="syntheseOffresTable" aria-label="Synthèse des offres par expéditeur et statut">
          <thead id="synthese-offres-head"></thead>
          <tbody id="synthese-offres-body"></tbody>
        </table>
      </div>
      <div class="syntheseOffresActions syntheseOffresActionsOneLine">
        <button type="button" class="btnSecondary boutonRafraichirSynthese" e2eid="e2eid-bouton-rafraichir-synthese-offres">Mise à jour</button>
        <button type="button" class="boutonOuvrirAirtable" e2eid="e2eid-bouton-ouvrir-airtable" data-airtable-url="${airtableUrlAttr}"${boutonOuvrirAirtableDisabled}>Ouvrir Airtable</button>
        <label class="syntheseOffresToggleLignesVides" e2eid="e2eid-masquer-lignes-vides">
          <span class="syntheseOffresToggleSwitchWrap">
            <input type="checkbox" class="syntheseOffresToggleSwitchInput" checked aria-label="Masquer les lignes vides">
            <span class="syntheseOffresToggleSwitch" aria-hidden="true"></span>
          </span>
          <span class="syntheseOffresToggleLabel">Masquer les lignes vides</span>
        </label>
      </div>
      <div id="synthese-offres-message" class="syntheseOffresMessage" role="alert" aria-live="polite" e2eid="e2eid-message-mise-a-jour-synthese"></div>
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

    <section class="histogrammeScoresOffres" aria-labelledby="titre-histogramme-scores" data-layout="histogramme-scores-offres">
      <h2 id="titre-histogramme-scores">Statistiques des scores</h2>
      <p class="histogrammeScoresOffresIntro">Offres avec un score total ≠ 0 ou statut « Expiré ». Une colonne par plage de score.</p>
      <div class="histogrammeScoresOffresChartWrap" id="histogramme-scores-chart-wrap">
        <canvas id="histogramme-scores-chart" aria-label="Histogramme des scores des offres"></canvas>
      </div>
      <button type="button" class="boutonCalculerHistogrammeScores btnSecondary" e2eid="e2eid-bouton-calculer-histogramme-scores">Calculer</button>
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
  var syntheseOffresMessage = null;
  var toggleMasquerLignesVidesInput = null;
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
      + '<th scope="col" class="syntheseOffresThSource" title="Source (plateforme)"><span class="syntheseOffresThLabel">Source</span></th>'
      + '<th scope="col" class="syntheseOffresThRotate" title="Phase 1 : Créer par email"><span class="syntheseOffresThLabel">Créer par email</span></th>'
      + '<th scope="col" class="syntheseOffresThRotate" title="Phase 1 : Créer par liste html"><span class="syntheseOffresThLabel">Créer par liste html</span></th>'
      + '<th scope="col" class="syntheseOffresThRotate" title="Phase 2 : Enrichissement"><span class="syntheseOffresThLabel">Enrichir</span></th>'
      + '<th scope="col" class="syntheseOffresThRotate" title="Phase 3 : Analyser par l\\'IA"><span class="syntheseOffresThLabel">Analyser</span></th>'
      + '<th scope="col" class="syntheseOffresThRotate syntheseOffresColAImporter" title="Emails en attente d\\'extraction"><span class="syntheseOffresThLabel">Emails à importer</span></th>'
      + '<th scope="col" class="syntheseOffresThRotate syntheseOffresColFichierImporter" title="Fichiers HTML en attente"><span class="syntheseOffresThLabel">Fichiers à importer</span></th>';
    var dyn = STATUTS_ORDER.map(function(statut) {
      var extraClass = (statut === 'À analyser') ? ' syntheseOffresColAAnalyser' : '';
      return '<th scope="col" class="syntheseOffresThRotate syntheseOffresStatutCol' + extraClass + '" title="Nombre d\\'offres au statut « ' + escapeHtmlSynthese(statut) + ' »"><span class="syntheseOffresThLabel">' + escapeHtmlSynthese(statut) + '</span></th>';
    }).join('');
    var colTotaux = '<th scope="col" class="syntheseOffresThHorizontal syntheseOffresColTotaux" e2eid="e2eid-synthese-offres-col-totaux" title="Total des offres pour cette ligne"><span class="syntheseOffresThLabel">Totaux</span></th>';
    syntheseOffresHead.innerHTML = '<tr>' + fixed + dyn + colTotaux + '</tr>';
  }

  var lastSyntheseLignes = null;
  var lastSyntheseStatutsOrder = null;
  var lastSyntheseTotaux = null;

  /** Affiche la quantité ou une chaîne vide si 0 (pour rendre visibles les phases avec travail restant). */
  function qteOuVide(val) { return (val != null && Number(val) !== 0) ? String(val) : ''; }

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
      if (syntheseOffresSection) syntheseOffresSection.hidden = false;
      return;
    }
    if (lignes.length === 0) {
      syntheseOffresBody.innerHTML = '';
      lastSyntheseLignes = null;
      lastSyntheseStatutsOrder = null;
      lastSyntheseTotaux = null;
      if (syntheseOffresSection) syntheseOffresSection.hidden = false;
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
      var sourceNom = (ligne && (ligne.sourceEtape2 || ligne.sourceEtape1 || ligne.emailExpéditeur)) ? (ligne.sourceEtape2 || ligne.sourceEtape1 || ligne.emailExpéditeur) : 'Inconnu';
      var actifCreationEmail = ligne && ligne.creationEmailActivé === true;
      var actifCreationListeHtml = ligne && ligne.creationListeHtmlActivé === true;
      var actifEnrichissement = !!(ligne && ligne.activerEnrichissement === true);
      var actifAnalyseIA = !!(ligne && ligne.activerAnalyseIA === true);
      var phase1EmailImpl = !!(ligne && ligne.phase1EmailImplemented === true);
      var phase1ListeHtmlImpl = !!(ligne && ligne.phase1ListeHtmlImplemented === true);
      var phase2Impl = !!(ligne && ligne.phase2Implemented === true);
      var phase3Impl = !!(ligne && ligne.phase3Implemented === true);
      if (ligne && ligne.phase2Implemented == null) phase2Impl = !!(ligne && ligne.sourceEtape2 && ligne.sourceEtape2 !== 'Inconnu');
      if (ligne && ligne.phase3Implemented == null) phase3Impl = phase2Impl;
      var emailAImporter = (ligne && typeof ligne.emailÀImporter === 'number') ? ligne.emailÀImporter : 0;
      var fichierAImporter = (ligne && typeof ligne.fichierÀImporter === 'number') ? ligne.fichierÀImporter : 0;
      var aCompleterLigne = (ligne && ligne.statuts && ligne.statuts['A compléter'] != null) ? ligne.statuts['A compléter'] : 0;
      var aAnalyserLigne = (ligne && ligne.statuts && ligne.statuts['À analyser'] != null) ? ligne.statuts['À analyser'] : 0;
      function phaseIconHtml(impl, actif, workerEnCours, enCoursCount, phaseKey) {
        if (!impl) return '<span class="phaseEtat phaseEtat--ko" title="Non implémenté">❌</span>';
        if (!actif) return '<button type="button" class="phaseEtat phaseEtat--inactive syntheseTogglePhase" data-source="' + escapeHtmlSynthese(sourceNom) + '" data-phase="' + escapeHtmlSynthese(phaseKey) + '" data-activé="false" aria-pressed="false" title="Cliquer pour activer"><span class="phaseEtatToggle" aria-hidden="true"></span></button>';
        if (workerEnCours && enCoursCount > 0) return '<span class="phaseEtat phaseEtat--ok" title="Activé – worker en cours">🏃</span>';
        return '<button type="button" class="phaseEtat phaseEtat--ok syntheseTogglePhase" data-source="' + escapeHtmlSynthese(sourceNom) + '" data-phase="' + escapeHtmlSynthese(phaseKey) + '" data-activé="true" aria-pressed="true" title="Cliquer pour désactiver"><span class="phaseEtatToggle phaseEtatToggle--on" aria-hidden="true"></span></button>';
      }
      var phase1EmailHtml = phaseIconHtml(phase1EmailImpl, actifCreationEmail, workerCreationEnCours, emailAImporter, 'creationEmail');
      var phase1ListeHtmlHtml = phaseIconHtml(phase1ListeHtmlImpl, actifCreationListeHtml, false, 0, 'creationListeHtml');
      var phase2Html = phaseIconHtml(phase2Impl, actifEnrichissement, workerEnrichissementEnCours, aCompleterLigne, 'enrichissement');
      var phase3Html = phaseIconHtml(phase3Impl, actifAnalyseIA, workerAnalyseIAEnCours, aAnalyserLigne, 'analyse');
      var sourceLabelLower = String(sourceNom).trim().toLowerCase();
      var sourceSlug = sourceLabelLower.replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+$/, '') || 'inconnu';
      if (sourceLabelLower.includes('welcome') && sourceLabelLower.includes('jungle')) sourceSlug = 'wttj';
      else if (sourceLabelLower.includes('job') && sourceLabelLower.includes('make') && sourceLabelLower.includes('sense')) sourceSlug = 'jtms';
      else if (sourceSlug === 'linkedin') sourceSlug = 'linkedin';
      else if (sourceSlug === 'job-that-make-sense' || sourceSlug === 'job-that-makes-sense' || sourceSlug === 'jobthatmakesense') sourceSlug = 'jtms';
      else if (sourceSlug === 'welcome-to-the-jungle' || sourceSlug === 'welcometothejungle') sourceSlug = 'wttj';
      else if (sourceSlug === 'hellowork') sourceSlug = 'hellowork';
      else if (sourceSlug === 'cadre-emploi' || sourceSlug === 'cadreemploi') sourceSlug = 'cadreemploi';
      var urlOfficielle = (ligne && ligne.urlOfficielle && String(ligne.urlOfficielle).trim()) ? String(ligne.urlOfficielle).trim() : '';
      var spanCapsule = '<span class="syntheseSourceCapsule syntheseSourceCapsule--' + escapeHtmlSynthese(sourceSlug) + '">' + escapeHtmlSynthese(sourceNom) + '</span>';
      var sourceCapsule = urlOfficielle ? ('<a href="' + escapeHtmlSynthese(urlOfficielle) + '" target="_blank" rel="noopener noreferrer">' + spanCapsule + '</a>') : spanCapsule;
      var cellEmailAImporter = '<td class="syntheseOffresCellAImporter">' + escapeHtmlSynthese(qteOuVide(emailAImporter)) + '</td>';
      var cellFichierAImporter = '<td class="syntheseOffresCellFichierImporter">' + escapeHtmlSynthese(qteOuVide(fichierAImporter)) + '</td>';
      var statutsCells = STATUTS_ORDER.map(function(statut) {
        var n = (ligne && ligne.statuts && ligne.statuts[statut] != null) ? ligne.statuts[statut] : 0;
        var cellClass = (statut === 'À analyser') ? ' class="syntheseOffresCellAAnalyser"' : '';
        return '<td' + cellClass + '>' + escapeHtmlSynthese(qteOuVide(n)) + '</td>';
      }).join('');
      var totalLigne = (totalParLigne[i] != null) ? totalParLigne[i] : 0;
      var cellTotaux = '<td class="syntheseOffresCellTotaux">' + escapeHtmlSynthese(qteOuVide(totalLigne)) + '</td>';
      return '<tr data-total-ligne="' + escapeHtmlSynthese(String(totalLigne)) + '">'
        + '<td>' + sourceCapsule + '</td>'
        + '<td>' + phase1EmailHtml + '</td>'
        + '<td>' + phase1ListeHtmlHtml + '</td>'
        + '<td>' + phase2Html + '</td>'
        + '<td>' + phase3Html + '</td>'
        + cellEmailAImporter
        + cellFichierAImporter
        + statutsCells
        + cellTotaux
        + '</tr>';
    }).join('');
    var totalEmailAImporter = lignes.reduce(function(s, l) { return s + ((l && typeof l.emailÀImporter === 'number') ? l.emailÀImporter : 0); }, 0);
    var totalFichierAImporter = lignes.reduce(function(s, l) { return s + ((l && typeof l.fichierÀImporter === 'number') ? l.fichierÀImporter : 0); }, 0);
    var ligneTotauxHtml = '<tr class="syntheseOffresLigneTotaux" e2eid="e2eid-synthese-offres-ligne-totaux">'
      + '<td>Totaux</td><td></td><td></td><td></td><td></td><td class="syntheseOffresCellAImporter">' + escapeHtmlSynthese(qteOuVide(totalEmailAImporter)) + '</td><td class="syntheseOffresCellFichierImporter">' + escapeHtmlSynthese(qteOuVide(totalFichierAImporter)) + '</td>';
    STATUTS_ORDER.forEach(function(statut) {
      var n = (totauxColonnes[statut] != null) ? totauxColonnes[statut] : 0;
      var cellClass = (statut === 'À analyser') ? ' class="syntheseOffresCellAAnalyser"' : '';
      ligneTotauxHtml += '<td' + cellClass + '>' + escapeHtmlSynthese(qteOuVide(n)) + '</td>';
    });
    ligneTotauxHtml += '<td class="syntheseOffresCellTotaux" e2eid="e2eid-synthese-offres-cellule-totaux-generaux">' + escapeHtmlSynthese(qteOuVide(totalGeneral)) + '</td></tr>';
    syntheseOffresBody.innerHTML = rowsHtml + ligneTotauxHtml;
    applyMasquerLignesVides();
    if (syntheseOffresSection) syntheseOffresSection.hidden = false;
  }

  var masquerLignesVides = true;

  function applyMasquerLignesVides() {
    if (!syntheseOffresBody || !toggleMasquerLignesVidesInput) return;
    masquerLignesVides = toggleMasquerLignesVidesInput.checked;
    var rows = syntheseOffresBody.querySelectorAll('tr:not(.syntheseOffresLigneTotaux)');
    for (var r = 0; r < rows.length; r++) {
      var tr = rows[r];
      var totalStr = tr.getAttribute('data-total-ligne');
      var total = (totalStr !== null && totalStr !== '') ? parseInt(totalStr, 10) : 0;
      if (isNaN(total)) total = 0;
      tr.classList.toggle('syntheseOffresLigneMasquee', masquerLignesVides && total === 0);
    }
  }

  var STATUT_ANNONCE = 'A compléter';
  var STATUT_ANALYSER = 'À analyser';

  /** Met à jour uniquement les cellules des colonnes « Annonce à récupérer » et « À analyser » à partir des lignes reçues. */
  function updateCellulesStatutSynthese(lignes) {
    if (!syntheseOffresBody || !lignes || !Array.isArray(lignes)) return;
    var idxAnnonce = STATUTS_ORDER.indexOf(STATUT_ANNONCE);
    var idxAnalyser = STATUTS_ORDER.indexOf(STATUT_ANALYSER);
    if (idxAnnonce === -1 || idxAnalyser === -1) return;
    var firstStatutCol = 7;
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
      row.cells[firstStatutCol + idxAnnonce].textContent = qteOuVide(nAnnonce);
      row.cells[firstStatutCol + idxAnalyser].textContent = qteOuVide(nAnalyser);
    }
  }

  function refreshTableauSyntheseOffres() {
    fetch('/api/tableau-synthese-offres', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.erreur) setSyntheseMessage(data.erreur, true);
        else if (data && data.avertissement) setSyntheseMessage(data.avertissement, 'warning');
        else setSyntheseMessage('', false);
        var statutsOrdre = data && Array.isArray(data.statutsOrdre) && data.statutsOrdre.length > 0
          ? data.statutsOrdre
          : DEFAULT_STATUTS_ORDER;
        var totaux = (data && (data.totalParLigne != null || data.totauxColonnes != null || data.totalGeneral != null))
          ? { totauxColonnes: data.totauxColonnes || {}, totalParLigne: Array.isArray(data.totalParLigne) ? data.totalParLigne : [], totalGeneral: typeof data.totalGeneral === 'number' ? data.totalGeneral : 0 }
          : null;
        renderTableauSyntheseOffres(data && data.lignes, statutsOrdre, totaux);
      })
      .catch(function(err) {
        setSyntheseMessage('Impossible de charger le tableau.', true);
        console.error('Tableau synthèse offres', err);
      });
  }

  /** type: false = clear, true = error (red), 'warning' = warning (orange) */
  function setSyntheseMessage(text, type) {
    if (!syntheseOffresMessage) return;
    syntheseOffresMessage.textContent = text || '';
    syntheseOffresMessage.classList.toggle('syntheseOffresMessage--error', type === true);
    syntheseOffresMessage.classList.toggle('syntheseOffresMessage--warning', type === 'warning');
  }

  /** Charge les données du tableau (GET) et les affiche. Partie commune au chargement initial et après refresh. */
  function applyTableauData(data) {
    if (data && data.erreur) setSyntheseMessage(data.erreur, true);
    else if (data && data.avertissement) setSyntheseMessage(data.avertissement, 'warning');
    else setSyntheseMessage('', false);
    var statutsOrdre = data && Array.isArray(data.statutsOrdre) && data.statutsOrdre.length > 0
      ? data.statutsOrdre
      : DEFAULT_STATUTS_ORDER;
    var totaux = (data && (data.totalParLigne != null || data.totauxColonnes != null || data.totalGeneral != null))
      ? { totauxColonnes: data.totauxColonnes || {}, totalParLigne: Array.isArray(data.totalParLigne) ? data.totalParLigne : [], totalGeneral: typeof data.totalGeneral === 'number' ? data.totalGeneral : 0 }
      : null;
    renderTableauSyntheseOffres(data && data.lignes, statutsOrdre, totaux);
    return { hadError: !!(data && data.erreur) };
  }

  /** Audit puis chargement du tableau (colonne "A importer" à jour). Réutilisé au chargement et sur clic "Mise à jour". */
  function loadTableauAvecAudit() {
    if (syntheseOffresSection) syntheseOffresSection.hidden = false;
    var getData = function() {
      return fetch('/api/tableau-synthese-offres', { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          return applyTableauData(data);
        });
    };
    return getData()
      .then(function(initialResult) {
        return fetch('/api/tableau-synthese-offres/refresh', { method: 'POST' })
          .then(function(r) { return r.json(); })
          .then(function(body) {
            if (body && body.ok === false && body.message) setSyntheseMessage(body.message, true);
            return getData();
          })
          .catch(function(refreshErr) {
            console.warn('Refresh synthèse (POST) ignoré, données déjà affichées', refreshErr);
            return initialResult;
          });
      })
      .catch(function(err) {
        renderTableauSyntheseOffres([], DEFAULT_STATUTS_ORDER, null);
        if (syntheseOffresSection) syntheseOffresSection.hidden = false;
        setSyntheseMessage('Impossible de charger le tableau.', true);
        console.error('Chargement tableau synthèse offres', err);
        throw err;
      });
  }

  /** Mise à jour (US-3.3 CA2, US-3.5 CA4) : un clic déclenche l'audit puis le chargement du tableau. */
  function onMiseAJourSyntheseClick() {
    setSyntheseMessage('Mise à jour en cours…');
    if (btnRefreshSynthese) btnRefreshSynthese.disabled = true;
    loadTableauAvecAudit()
      .then(function(result) { if (!(result && result.hadError)) setSyntheseMessage('', false); })
      .catch(function(err) {
        setSyntheseMessage('Erreur lors de la mise à jour.', true);
        console.error('Mise à jour synthèse offres', err);
      })
      .finally(function() {
        if (btnRefreshSynthese) btnRefreshSynthese.disabled = false;
      });
  }

  /** Rafraîchit les données du tableau (statuts et totaux). À appeler après un enrichissement. */
  function refreshTableauSyntheseOffresStatutsOnly() {
    fetch('/api/tableau-synthese-offres', { cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.erreur) setSyntheseMessage(data.erreur, true);
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
  window.__loadTableauAvecAudit = loadTableauAvecAudit;
  window.__updateTableauSyntheseWorkerState = function() {
    if (lastSyntheseLignes && lastSyntheseStatutsOrder && syntheseOffresBody) {
      renderTableauSyntheseOffres(lastSyntheseLignes, lastSyntheseStatutsOrder, lastSyntheseTotaux);
    }
  };

  function initSynthese() {
    try {
      syntheseOffresSection = document.querySelector('.syntheseOffres');
      syntheseOffresHead = document.getElementById('synthese-offres-head');
      syntheseOffresBody = document.getElementById('synthese-offres-body');
      btnRefreshSynthese = document.querySelector('[e2eid="e2eid-bouton-rafraichir-synthese-offres"]');
      syntheseOffresMessage = document.querySelector('[e2eid="e2eid-message-mise-a-jour-synthese"]');
      var toggleWrap = document.querySelector('[e2eid="e2eid-masquer-lignes-vides"]');
      toggleMasquerLignesVidesInput = toggleWrap ? toggleWrap.querySelector('input.syntheseOffresToggleSwitchInput') : null;
      if (toggleMasquerLignesVidesInput) {
        toggleMasquerLignesVidesInput.addEventListener('change', applyMasquerLignesVides);
      }
      renderTableauSyntheseHead(DEFAULT_STATUTS_ORDER);
      if (syntheseOffresSection) syntheseOffresSection.hidden = false;
      loadTableauAvecAudit().catch(function(err) {
        renderTableauSyntheseOffres([], DEFAULT_STATUTS_ORDER, null);
        if (syntheseOffresSection) syntheseOffresSection.hidden = false;
        setSyntheseMessage('Erreur lors du chargement.', true);
        console.error('Chargement synthèse offres', err);
      });
    } catch (err) {
      console.error('initSynthese (chargement initial)', err);
      if (syntheseOffresSection) syntheseOffresSection.hidden = false;
      renderTableauSyntheseOffres([], DEFAULT_STATUTS_ORDER, null);
    }
    if (btnRefreshSynthese) {
      btnRefreshSynthese.addEventListener('click', onMiseAJourSyntheseClick);
    }
    if (syntheseOffresBody) {
      syntheseOffresBody.addEventListener('click', function(e) {
        var btn = e.target && e.target.closest && e.target.closest('button.syntheseTogglePhase');
        if (!btn) return;
        e.preventDefault();
        var source = btn.getAttribute('data-source');
        var phase = btn.getAttribute('data-phase');
        var activéStr = btn.getAttribute('data-activé');
        var activé = activéStr === 'true';
        if (!source || !phase) return;
        fetch('/api/sources/activation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: source, phase: phase, activé: !activé }),
        })
          .then(function(r) { return r.json(); })
          .then(function(body) {
            if (body && body.ok === true) refreshTableauSyntheseOffres();
            else if (body && body.message) setSyntheseMessage(body.message, true);
          })
          .catch(function(err) {
            setSyntheseMessage('Erreur lors de la modification.', true);
            console.error('Toggle activation', err);
          });
      });
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
  var creationWasRunning = false;
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
        var creation = data.creation || {};
        var creationRunning = !!(creation && creation.running);
        if (creationRunning) creationWasRunning = true;
        window.__workerCreationEnCours = creationRunning || !!(enrich.running);
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
            }, 2000);
          }
          var pCreation = creation.currentProgress;
          if (pCreation && pCreation.total > 0) {
            var current = Math.min(pCreation.index + 1, pCreation.total);
            var percentCreation = Math.round((current / pCreation.total) * 100);
            setWorkerProgressPhase1(percentCreation, current + '/' + pCreation.total + ' — création…', false);
          } else {
            setWorkerProgressPhase1(0, (creation.running ? 'Création en cours…' : ''), false);
          }
          var p = enrich.currentProgress || data.currentProgress;
          if (p && p.total > 0) {
            var percent = Math.round(((p.index + 1) / p.total) * 100);
            var msg = (p.index + 1) + '/' + p.total + ' — ' + (p.sourceNom || '?') + ' — Id: ' + (p.recordId || '');
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
          var creationStopped = data.creation && !data.creation.running;
          if (creationWasRunning && creationStopped) {
            creationWasRunning = false;
            if (typeof window.__loadTableauAvecAudit === 'function') window.__loadTableauAvecAudit().catch(function() {});
          }
          hideWorkerProgressPhase1();
          hideWorkerProgress();
          hideWorkerProgressAnalyseIA();
          var creation = data.creation || {};
          var enrich = data.enrichissement || {};
          if (zoneWorkerPhase1) {
            var resCreation = creation.lastResult || data.creationLastResult;
            if (resCreation && resCreation.ok) {
              var nbCreees = (resCreation.nbCreees != null ? resCreation.nbCreees : resCreation.nbOffresCreees) ?? 0;
              var nbEchecs = resCreation.nbEchecs ?? 0;
              var nbDeja = (resCreation.nbOffresDejaPresentes ?? 0) > 0 ? ', ' + resCreation.nbOffresDejaPresentes + ' déjà présente(s)' : '';
              zoneWorkerPhase1.textContent = 'Terminé : ' + nbCreees + ' créée(s)' + (nbEchecs > 0 ? ', ' + nbEchecs + ' échec(s)' : '') + nbDeja + '.';
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

(function() {
  var btnHistogramme = document.querySelector('[e2eid="e2eid-bouton-calculer-histogramme-scores"]');
  var canvasHistogramme = document.getElementById('histogramme-scores-chart');
  var wrapHistogramme = document.getElementById('histogramme-scores-chart-wrap');
  function barColorForBucketIndex(i) {
    if (i >= 0 && i <= 4) return 'rgb(110, 119, 129)';
    if (i === 5) return 'rgb(217, 115, 13)';
    return 'rgb(26, 127, 55)';
  }
  function drawHistogrammeScores(data) {
    if (!canvasHistogramme) return;
    var ctx = canvasHistogramme.getContext('2d');
    if (!ctx) return;
    var w = (wrapHistogramme && wrapHistogramme.clientWidth) ? wrapHistogramme.clientWidth : canvasHistogramme.offsetWidth || 280;
    var h = (wrapHistogramme && wrapHistogramme.clientHeight) ? wrapHistogramme.clientHeight : 240;
    if (w <= 0 || h <= 0) { w = 280; h = 240; }
    canvasHistogramme.width = w;
    canvasHistogramme.height = h;
    ctx.clearRect(0, 0, w, h);
    if (!data || !data.ok || !Array.isArray(data.buckets) || data.buckets.length === 0) {
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#57606a';
      ctx.textAlign = 'center';
      ctx.fillText('Cliquez sur Calculer pour afficher l\\'histogramme.', w / 2, h / 2);
      return;
    }
    var buckets = data.buckets;
    var maxCount = Math.max(1, Math.max.apply(null, buckets.map(function(b) { return b.count || 0; })));
    var paddingLeft = 36;
    var paddingRight = 12;
    var paddingTop = 20;
    var paddingBottom = 36;
    var chartW = w - paddingLeft - paddingRight;
    var chartH = h - paddingTop - paddingBottom;
    var n = buckets.length;
    var barGap = Math.max(2, Math.floor(chartW / (n * 8)));
    var barWidth = Math.max(4, (chartW - (n - 1) * barGap) / n);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var i = 0; i < n; i++) {
      var count = buckets[i].count || 0;
      var label = buckets[i].label || '';
      var x = paddingLeft + i * (barWidth + barGap);
      var barH = maxCount > 0 ? (count / maxCount) * chartH : 0;
      var y = paddingTop + chartH - barH;
      ctx.fillStyle = barColorForBucketIndex(i);
      ctx.fillRect(x, y, barWidth, barH);
      ctx.strokeStyle = '#8c8c8c';
      ctx.strokeRect(x, y, barWidth, barH);
      ctx.fillStyle = '#1a1a1a';
      var labelShort = label.length > 8 ? label.replace(/\s*-\s*/, '-').slice(0, 8) : label;
      ctx.fillText(labelShort, x + barWidth / 2, h - paddingBottom + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#57606a';
    var step = maxCount <= 5 ? 1 : (maxCount <= 20 ? 5 : Math.ceil(maxCount / 5));
    for (var v = 0; v <= maxCount; v += step) {
      var yy = paddingTop + chartH - (v / maxCount) * chartH;
      ctx.fillText(String(v), paddingLeft - 4, yy);
    }
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + chartH);
    ctx.lineTo(paddingLeft + chartW, paddingTop + chartH);
    ctx.stroke();
  }
  if (btnHistogramme && canvasHistogramme) {
    drawHistogrammeScores(null);
    if (wrapHistogramme && typeof window !== 'undefined' && window.ResizeObserver) {
      try {
        new window.ResizeObserver(function() { drawHistogrammeScores(window.__lastHistogrammeScoresData || null); }).observe(wrapHistogramme);
      } catch (e) {}
    }
    btnHistogramme.addEventListener('click', function() {
      btnHistogramme.disabled = true;
      fetch('/api/histogramme-scores-offres', { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (typeof window !== 'undefined') window.__lastHistogrammeScoresData = data;
          drawHistogrammeScores(data);
        })
        .catch(function() {
          drawHistogrammeScores({ ok: false, message: 'Erreur' });
        })
        .finally(function() {
          btnHistogramme.disabled = false;
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
    showAuditLink: options?.showAuditLink,
    showOffresLink: options?.showOffresLink,
  });
}
