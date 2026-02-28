/**
 * Page Audit de traçabilité US ↔ code (mode dev).
 * Données : data/audit-traceability.json chargé par le serveur.
 */
import type { AuditTraceabilityData } from '../types/audit-traceability.js';
import { getLayoutHtml } from './layout-html.js';

const TYPES: { key: keyof AuditTraceabilityData['byType']; label: string }[] = [
  { key: 'us', label: 'User Stories' },
  { key: 'ca', label: 'Critères d\'acceptation' },
  { key: 'feature', label: 'Features BDD' },
  { key: 'step', label: 'Steps' },
  { key: 'scenario', label: 'Scénarios' },
  { key: 'tu', label: 'Tests unitaires' },
  { key: 'ti', label: 'Tests d\'intégration' },
  { key: 'code', label: 'Code' },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Options pour la page Audit (layout uniquement). */
export type PageAuditOptions = {
  /** US-7.9 : afficher le lien Offres dans le menu (si au moins une offre en base). */
  showOffresLink?: boolean;
};

export function getPageAudit(data: AuditTraceabilityData | null, options?: PageAuditOptions): string {
  const noData = !data || !data.artefacts || Object.keys(data.artefacts).length === 0;
  const jsonScript = noData ? 'null' : JSON.stringify(data);

  const mainContent = `
<div class="pageAudit" data-layout="page-audit">
  ${noData ? `
  <p class="auditNoData">Aucun audit disponible. Lancez l’audit depuis <strong>Menu.ps1</strong> (option 7) puis exécutez la commande <strong>/audit-code</strong> dans Cursor pour compléter l’analyse sémantique.</p>
  ` : `
  <p class="auditMeta">Dernière génération : <time id="audit-generated-at">${escapeHtml(data!.generatedAt)}</time></p>
  <div class="auditFilters">
    <label><input type="radio" name="audit-filter" value="all" checked> Tous</label>
    <label><input type="radio" name="audit-filter" value="orphans"> Orphelins</label>
    <label><input type="radio" name="audit-filter" value="non-orphans"> Non orphelins</label>
  </div>
  <div class="auditTabs" role="tablist">
    ${TYPES.map((t, i) => `<button type="button" class="auditTab" role="tab" data-tab="${t.key}" aria-selected="${i === 0}">${escapeHtml(t.label)}</button>`).join('')}
  </div>
  <div class="auditPanels">
    ${TYPES.map((t, i) => `
    <div class="auditPanel" role="tabpanel" id="panel-${t.key}" data-tab="${t.key}" hidden="${i !== 0 ? 'true' : ''}">
      <table class="auditTable">
        <thead>
          <tr><th>ID</th><th>Nom</th><th>Description</th><th>Associés en amont</th><th>Associés en aval</th><th>Orphelin</th></tr>
        </thead>
        <tbody id="tbody-${t.key}"></tbody>
      </table>
    </div>`).join('')}
  </div>
</div>
<script>
(function() {
  var data = ${jsonScript};
  if (!data) return;
  var byType = data.byType || {};
  var artefacts = data.artefacts || {};
  var filter = 'all';
  var currentTab = 'us';

  function renderTable(type) {
    var ids = byType[type] || [];
    var tbody = document.getElementById('tbody-' + type);
    if (!tbody) return;
    var list = filter === 'orphans' ? ids.filter(function(id) { return artefacts[id] && artefacts[id].orphan; })
      : filter === 'non-orphans' ? ids.filter(function(id) { return artefacts[id] && !artefacts[id].orphan; })
      : ids;
    function short(s) {
      if (!s) return '';
      if (s.indexOf('code:') === 0) return s.replace(/^code:(app|utils):/, '$1/').replace(/^code:/, '');
      if (s.indexOf('tu:') === 0) return s.replace(/^tu:(app|utils):/, '').replace(/^tu:/, '');
      if (s.indexOf('ti:') === 0) return s.replace(/^ti:/, '');
      if (s.indexOf('feature:') === 0) return s.replace(/^feature:/, '');
      if (s.indexOf('step:') === 0) return s.replace(/^step:/, '').replace(/\\.steps\\.ts$/, '');
      return s;
    }
    tbody.innerHTML = list.map(function(id) {
      var a = artefacts[id];
      if (!a) return '';
      var amont = a.linkedIdsAmont || [];
      var aval = a.linkedIdsAval || [];
      var amontStr = amont.slice(0, 12).map(short).join(', ');
      if (amont.length > 12) amontStr += '…';
      var avalStr = aval.slice(0, 12).map(short).join(', ');
      if (aval.length > 12) avalStr += '…';
      return '<tr><td title="' + escapeHtml(a.id) + '">' + escapeHtml(short(a.id)) + '</td><td title="' + escapeHtml(a.name) + '">' + escapeHtml(short(a.name)) + '</td><td title="' + escapeHtml(a.description || '') + '">' + escapeHtml((a.description || '').slice(0, 60)) + ((a.description || '').length > 60 ? '…' : '') + '</td><td title="' + escapeHtml(amont.join(', ')) + '">' + escapeHtml(amontStr) + '</td><td title="' + escapeHtml(aval.join(', ')) + '">' + escapeHtml(avalStr) + '</td><td>' + (a.orphan ? 'Oui' : 'Non') + '</td></tr>';
    }).join('');
  }
  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
  function renderAll() {
    TYPES.forEach(function(t) { renderTable(t); });
  }
  var TYPES = ${JSON.stringify(TYPES.map(t => t.key))};
  document.querySelectorAll('input[name="audit-filter"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      filter = this.value;
      renderAll();
    });
  });
  document.querySelectorAll('.auditTab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      currentTab = this.getAttribute('data-tab');
      document.querySelectorAll('.auditTab').forEach(function(b) { b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.auditPanel').forEach(function(p) { p.hidden = true; });
      this.setAttribute('aria-selected', 'true');
      var panel = document.getElementById('panel-' + currentTab);
      if (panel) { panel.hidden = false; }
    });
  });
  renderAll();
})();
</script>
  ` }
  `;

  return getLayoutHtml('audit', 'Audit du code', mainContent, {
    showAuditLink: true,
    showOffresLink: options?.showOffresLink,
  });
}
