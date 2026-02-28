/**
 * US-7.9 : page Offres — chargement des offres, RevoGrid, vues sauvegardées.
 * Dépend de RevoGrid chargé via script CDN avant ce fichier.
 */
(function () {
  var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);

  /** Libellés des filtres en français (RevoGrid localization). */
  var FILTER_NAMES_FR = {
    none: 'Aucun',
    empty: 'Non défini',
    notEmpty: 'Défini',
    eq: 'Égal à',
    notEq: 'Différent de',
    begins: 'Commence par',
    contains: 'Contient',
    notContains: 'Ne contient pas',
    eqN: '=',
    neqN: '!=',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<='
  };

  /** Construit les colonnes (sans id, masqué). Libellés Critères réhib. et Scores depuis config (parametrageIA). */
  function buildColumns(libelles) {
    var r = (libelles && libelles.rehibitoires) ? libelles.rehibitoires : ['Critère réhib. 1', 'Critère réhib. 2', 'Critère réhib. 3', 'Critère réhib. 4'];
    var si = (libelles && libelles.scoresIncontournables) ? libelles.scoresIncontournables : ['Localisation', 'Salaire', 'Culture', "Qualité d'offre"];
    var so = (libelles && libelles.scoresOptionnels) ? libelles.scoresOptionnels : ['Score opt. 1', 'Score opt. 2', 'Score opt. 3', 'Score opt. 4'];
    return [
      { prop: 'id_offre', name: 'Id offre', sortable: true, filter: true, size: 110 },
      { prop: 'url', name: 'URL', sortable: true, filter: true, size: 260 },
      { prop: "Texte de l'offre", name: "Texte de l'offre", sortable: true, filter: true, size: 200 },
      { prop: 'Poste', name: 'Poste', sortable: true, filter: true, size: 160 },
      { prop: 'Entreprise', name: 'Entreprise', sortable: true, filter: true, size: 140 },
      { prop: 'Ville', name: 'Ville', sortable: true, filter: true, size: 120 },
      { prop: 'Département', name: 'Département', sortable: true, filter: true, size: 110 },
      { prop: 'Salaire', name: 'Salaire', sortable: true, filter: true, size: 100 },
      { prop: 'DateOffre', name: 'DateOffre', sortable: true, filter: true, size: 100 },
      { prop: 'DateAjout', name: 'DateAjout', sortable: true, filter: true, size: 100 },
      { prop: 'Statut', name: 'Statut', sortable: true, filter: true, size: 140 },
      { prop: 'source', name: 'Source', sortable: true, filter: true, size: 120 },
      { prop: 'Méthode de création', name: 'Méthode de création', sortable: true, filter: true, size: 140 },
      { prop: 'Résumé', name: 'Résumé', sortable: true, filter: true, size: 180 },
      { prop: 'CritèreRéhibitoire1', name: r[0] || 'Critère réhib. 1', sortable: true, filter: true, size: 120 },
      { prop: 'CritèreRéhibitoire2', name: r[1] || 'Critère réhib. 2', sortable: true, filter: true, size: 120 },
      { prop: 'CritèreRéhibitoire3', name: r[2] || 'Critère réhib. 3', sortable: true, filter: true, size: 120 },
      { prop: 'CritèreRéhibitoire4', name: r[3] || 'Critère réhib. 4', sortable: true, filter: true, size: 120 },
      { prop: 'ScoreCritère1', name: so[0] || 'Score opt. 1', sortable: true, filter: true, size: 100 },
      { prop: 'ScoreCritère2', name: so[1] || 'Score opt. 2', sortable: true, filter: true, size: 100 },
      { prop: 'ScoreCritère3', name: so[2] || 'Score opt. 3', sortable: true, filter: true, size: 100 },
      { prop: 'ScoreCritère4', name: so[3] || 'Score opt. 4', sortable: true, filter: true, size: 100 },
      { prop: 'ScoreCulture', name: 'Score ' + (si[2] || 'Culture'), sortable: true, filter: true, size: 100 },
      { prop: 'ScoreLocalisation', name: 'Score ' + (si[0] || 'Localisation'), sortable: true, filter: true, size: 120 },
      { prop: 'ScoreSalaire', name: 'Score ' + (si[1] || 'Salaire'), sortable: true, filter: true, size: 100 },
      { prop: 'ScoreQualiteOffre', name: 'Score ' + (si[3] || "Qualité d'offre"), sortable: true, filter: true, size: 120 },
      { prop: 'Score_Total', name: 'Score total', sortable: true, filter: true, size: 100 },
      { prop: 'Verdict', name: 'Verdict', sortable: true, filter: true, size: 100 },
      { prop: 'Adresse', name: 'Adresse', sortable: true, filter: true, size: 140 },
      { prop: 'Commentaire', name: 'Commentaire', sortable: true, filter: true, size: 160 },
      { prop: 'Reprise', name: 'Reprise', sortable: true, filter: true, size: 90 },
    ];
  }

  var gridEl = null;
  var currentVues = [];
  var currentParametrage = {};
  var DIALOG_TITLE = 'Job-Joy';
  function withDialogTitle(fn) {
    var prev = document.title;
    document.title = DIALOG_TITLE;
    try {
      return fn();
    } finally {
      document.title = prev;
    }
  }

  function getGridParametrage() {
    if (!gridEl) return {};
    try {
      var order = gridEl.columns && gridEl.columns.map(function (c) { return c.prop; });
      var columnSizes = gridEl.columns && gridEl.columns.map(function (c) {
        return { prop: c.prop, size: c.size };
      });
      var sort = (gridEl.sort && gridEl.sort.length) ? gridEl.sort : null;
      var filter = (gridEl.filter && Object.keys(gridEl.filter).length) ? gridEl.filter : null;
      return { columnOrder: order || [], columnSizes: columnSizes || [], sort: sort || null, filter: filter || null };
    } catch (e) {
      return { columnOrder: [], columnSizes: [], sort: null, filter: null };
    }
  }

  function applyParametrage(param) {
    if (!gridEl || !param) return;
    try {
      var cols = (gridEl.columns || []).slice();
      if (param.columnOrder && param.columnOrder.length) {
        var ordered = [];
        for (var i = 0; i < param.columnOrder.length; i++) {
          var found = cols.find(function (c) { return c.prop === param.columnOrder[i]; });
          if (found) ordered.push(found);
        }
        var rest = cols.filter(function (c) { return param.columnOrder.indexOf(c.prop) === -1; });
        cols = ordered.concat(rest);
      }
      if (param.columnSizes && param.columnSizes.length) {
        var sizeMap = {};
        param.columnSizes.forEach(function (s) { if (s.prop != null && s.size != null) sizeMap[s.prop] = s.size; });
        cols = cols.map(function (c) {
          var size = sizeMap[c.prop];
          if (size == null) return c;
          var out = {};
          for (var k in c) if (Object.prototype.hasOwnProperty.call(c, k)) out[k] = c[k];
          out.size = size;
          return out;
        });
      }
      gridEl.columns = cols;
      if (param.sort) gridEl.sort = param.sort;
      if (param.filter) gridEl.filter = param.filter;
    } catch (e) { /* ignore */ }
  }

  function fetchOffres() {
    return fetch(origin + '/api/offres')
      .then(function (r) { return r.json(); })
      .then(function (data) { return data.offres || []; })
      .catch(function (err) { console.error('[offres-page] fetch offres failed', err); return []; });
  }

  function fetchVues() {
    return fetch(origin + '/api/offres/vues')
      .then(function (r) { return r.json(); })
      .then(function (data) { currentVues = data.vues || []; return currentVues; })
      .catch(function (err) { console.error('[offres-page] fetch vues failed', err); currentVues = []; return []; });
  }

  function fetchLibelles() {
    return fetch(origin + '/api/parametrage-ia-libelles')
      .then(function (r) { return r.json(); })
      .catch(function (err) { console.warn('[offres-page] fetch libelles failed', err); return null; });
  }

  function renderVuesList() {
    var list = document.getElementById('pageOffresVuesList');
    if (!list) return;
    list.innerHTML = '';
    currentVues.forEach(function (vue) {
      var li = document.createElement('li');
      li.className = 'pageOffresVueItem';
      var link = document.createElement('button');
      link.type = 'button';
      link.className = 'pageOffresVueLink';
      link.setAttribute('e2eid', 'e2eid-vue-offres-' + vue.id);
      link.textContent = vue.nom;
      link.addEventListener('click', function () {
        currentParametrage = vue.parametrage ? (typeof vue.parametrage === 'string' ? JSON.parse(vue.parametrage) : vue.parametrage) : {};
        applyParametrage(currentParametrage);
      });
      var actions = document.createElement('span');
      actions.className = 'pageOffresVueActions';
      var renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'pageOffresVueAction';
      renameBtn.setAttribute('aria-label', 'Renommer');
      renameBtn.textContent = '✎';
      renameBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var name = withDialogTitle(function () { return window.prompt('Nouveau nom', vue.nom); });
        if (name != null && name.trim()) {
          fetch(origin + '/api/offres/vues/' + encodeURIComponent(vue.id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom: name.trim() }),
          }).then(function () { return fetchVues(); }).then(renderVuesList);
        }
      });
      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'pageOffresVueAction';
      delBtn.setAttribute('aria-label', 'Supprimer');
      delBtn.textContent = '×';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (withDialogTitle(function () { return window.confirm('Supprimer la vue « ' + vue.nom + ' » ?'); })) {
          fetch(origin + '/api/offres/vues/' + encodeURIComponent(vue.id), { method: 'DELETE' })
            .then(function () { return fetchVues(); }).then(renderVuesList);
        }
      });
      actions.appendChild(renameBtn);
      actions.appendChild(delBtn);
      li.appendChild(link);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function updateRowCountFooter(visible, total) {
    var footer = document.getElementById('pageOffresGridFooter');
    if (!footer) return;
    if (total == null) total = 0;
    if (visible == null) visible = total;
    footer.textContent = visible === total ? total + ' offre' + (total !== 1 ? 's' : '') : visible + ' / ' + total + ' offre' + (total !== 1 ? 's' : '');
  }

  function initGrid(offres, columns) {
    var container = document.getElementById('pageOffresGrid');
    if (!container) return;
    var cols = columns || buildColumns(null);
    container.innerHTML = '';
    container.classList.remove('pageOffresGrid--loading');
    var total = offres ? offres.length : 0;
    // Données uniquement depuis l'API /api/offres (SQLite), pas de mock
    var useRevo = typeof customElements !== 'undefined' && customElements.get('revo-grid');
    if (useRevo) {
      try {
        gridEl = document.createElement('revo-grid');
        gridEl.columns = cols;
        gridEl.source = offres;
        gridEl.range = true;
        gridEl.theme = 'compact';
        /* Redimensionnement des colonnes par la poignée sur le bord (resize = true). */
        gridEl.resize = true;
        /* CA3 : ordre des colonnes par glisser-déposer (mécanisme natif RevoGrid). */
        gridEl.canMoveColumns = true;
        /* CA4 : filtre multicritère + localisation française des libellés de filtre. */
        gridEl.filter = { localization: { filterNames: FILTER_NAMES_FR } };
        /* CA5 : tri par clic sur en-tête (sortable sur chaque colonne). */
        /* Colonnes avec size fixe : contenu plus large que la zone visible => ascenseur horizontal. */
        gridEl.style.height = '70vh';
        gridEl.style.minHeight = '320px';
        container.appendChild(gridEl);
        updateRowCountFooter(total, total);
        /* Mise à jour du compte quand filtre/tri change (RevoGrid n’a pas de footer natif). */
        function refreshCount() {
          try {
            var visible = typeof gridEl.getVisibleSource === 'function' ? (gridEl.getVisibleSource() || []).length : total;
            updateRowCountFooter(visible, total);
          } catch (e) { updateRowCountFooter(total, total); }
        }
        function refreshCountDeferred() {
          setTimeout(refreshCount, 0);
        }
        gridEl.addEventListener('aftertrimmed', refreshCountDeferred);
        gridEl.addEventListener('filterconfigchanged', refreshCountDeferred);
        gridEl.addEventListener('beforesortingapply', refreshCountDeferred);
        gridEl.addEventListener('aftersourceset', refreshCountDeferred);
        setTimeout(refreshCount, 100);
        return;
      } catch (e) {
        console.warn('[offres-page] RevoGrid error, using table fallback', e);
        gridEl = null;
      }
    }
    // Fallback : tableau HTML avec toutes les offres
    var table = document.createElement('table');
    table.className = 'pageOffresTableFallback';
    table.setAttribute('role', 'grid');
    var thead = document.createElement('thead');
    var tr = document.createElement('tr');
    cols.forEach(function (c) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = c.name;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    offres.forEach(function (row) {
      var r = document.createElement('tr');
      cols.forEach(function (c) {
        var td = document.createElement('td');
        var v = row[c.prop];
        td.textContent = v != null ? String(v) : '';
        r.appendChild(td);
      });
      tbody.appendChild(r);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    updateRowCountFooter(total, total);
  }

  function init() {
    var btnCreer = document.querySelector('[e2eid="e2eid-bouton-creer-vue"]');
    if (btnCreer) {
      btnCreer.addEventListener('click', function () {
        var nom = withDialogTitle(function () { return window.prompt('Nom de la vue'); });
        if (nom != null && nom.trim()) {
          currentParametrage = getGridParametrage();
          fetch(origin + '/api/offres/vues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nom: nom.trim(), parametrage: currentParametrage }),
          }).then(function (r) { return r.json(); }).then(function () {
            return fetchVues();
          }).then(renderVuesList);
        }
      });
    }

    // Indicateur de chargement (données depuis SQLite uniquement)
    var container = document.getElementById('pageOffresGrid');
    if (container) {
      container.classList.add('pageOffresGrid--loading');
      container.innerHTML = '<p class="pageOffresGridLoading">Chargement des offres…</p>';
    }

    Promise.all([fetchOffres(), fetchVues()])
      .then(function (results) {
        var offres = results[0];
        renderVuesList();
        // Attendre que RevoGrid soit défini (script CDN peut enregistrer le custom element après nous)
        var revoReady = typeof customElements !== 'undefined' && customElements.get('revo-grid')
          ? Promise.resolve()
          : (typeof customElements !== 'undefined' && customElements.whenDefined
            ? customElements.whenDefined('revo-grid')
            : Promise.resolve());
        var timeout = new Promise(function (r) { setTimeout(r, 6000); });
        Promise.race([revoReady, timeout]).then(function () {
          return fetchLibelles();
        }).then(function (libelles) {
          initGrid(offres, buildColumns(libelles));
        });
      })
      .catch(function (err) {
        console.error('[offres-page] init failed', err);
        if (container) {
          container.classList.remove('pageOffresGrid--loading');
          container.innerHTML = '<p class="pageOffresGridError">Impossible de charger les offres. Vérifiez la console.</p>';
        }
        renderVuesList();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
