/**
 * Tests TDD tableau de bord (US-1.4) : bouton « Lancer le traitement ».
 * US-1.6 : getHeaderHtml avec configComplète.
 */
import { getHeaderHtml, getPageTableauDeBord } from './layout-html.js';

describe('getHeaderHtml', () => {
  it('affiche le lien Tableau de bord quand configComplète est true ou non fourni', () => {
    expect(getHeaderHtml('parametres')).toContain('/tableau-de-bord');
    expect(getHeaderHtml('parametres', { configComplète: true })).toContain('/tableau-de-bord');
    expect(getHeaderHtml('tableau-de-bord')).toContain('/tableau-de-bord');
  });

  it('masque le lien Tableau de bord quand configComplète est false', () => {
    const html = getHeaderHtml('parametres', { configComplète: false });
    expect(html).not.toContain('/tableau-de-bord');
    expect(html).not.toContain('Tableau de bord');
    expect(html).toContain('/parametres');
    expect(html).toContain('Paramètres');
  });
});

describe('getPageTableauDeBord', () => {
  it('contient un bouton "Auditer le dossier" distinct au-dessus du bouton de traitement', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('Dossier de la boite aux lettres');
    expect(html).toContain('class="dossierBoiteContainer"');
    expect(html).toContain('Auditer le dossier');
    expect(html).toContain('e2eid="e2eid-bouton-auditer-dossier"');

    const indexAudit = html.indexOf('Auditer le dossier');
    const indexTraitement = html.indexOf('Lancer le traitement');
    expect(indexAudit).toBeGreaterThan(-1);
    expect(indexTraitement).toBeGreaterThan(-1);
    expect(indexAudit).toBeLessThan(indexTraitement);
  });

  it('contient un bouton "Lancer le traitement" avec e2eid e2eid-bouton-lancer-traitement', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('Lancer le traitement');
    expect(html).toContain('e2eid="e2eid-bouton-lancer-traitement"');
  });

  it('ajoute un bouton "Ouvrir Airtable" sous le bouton de traitement', () => {
    const html = getPageTableauDeBord({ airtableBaseUrl: 'https://airtable.com/appTest123' });
    expect(html).toContain('Ouvrir Airtable');
    expect(html).toContain('e2eid="e2eid-bouton-ouvrir-airtable"');
    const indexTraitement = html.indexOf('e2eid-bouton-lancer-traitement');
    const indexOuvrirAirtable = html.indexOf('e2eid-bouton-ouvrir-airtable');
    expect(indexTraitement).toBeGreaterThan(-1);
    expect(indexOuvrirAirtable).toBeGreaterThan(-1);
    expect(indexTraitement).toBeLessThan(indexOuvrirAirtable);
  });

  it('place le bloc Synthèse des offres en dehors du bloc Dossier de la boite aux lettres', () => {
    const html = getPageTableauDeBord();
    const indexDossierStart = html.indexOf('<section class="dossierBoiteContainer"');
    const indexDossierEnd = html.indexOf('</section>', indexDossierStart);
    const indexSyntheseOffres = html.indexOf('<section class="syntheseOffres"');
    expect(indexDossierStart).toBeGreaterThan(-1);
    expect(indexDossierEnd).toBeGreaterThan(-1);
    expect(indexSyntheseOffres).toBeGreaterThan(-1);
    expect(indexSyntheseOffres).toBeGreaterThan(indexDossierEnd);
  });

  it('place worker, mise à jour et Ouvrir Airtable dans le bloc Synthèse des offres', () => {
    const html = getPageTableauDeBord({ airtableBaseUrl: 'https://airtable.com/appTest123' });
    const indexSyntheseOffres = html.indexOf('<section class="syntheseOffres"');
    const indexWorker = html.indexOf('e2eid="e2eid-bouton-worker-enrichissement"');
    const indexRefresh = html.indexOf('e2eid="e2eid-bouton-rafraichir-synthese-offres"');
    const indexOuvrirAirtable = html.indexOf('e2eid="e2eid-bouton-ouvrir-airtable"');
    const indexSyntheseOffresEnd = html.indexOf('</section>', indexSyntheseOffres);
    expect(indexSyntheseOffres).toBeGreaterThan(-1);
    expect(indexWorker).toBeGreaterThan(indexSyntheseOffres);
    expect(indexRefresh).toBeGreaterThan(indexSyntheseOffres);
    expect(indexOuvrirAirtable).toBeGreaterThan(indexSyntheseOffres);
    expect(indexWorker).toBeLessThan(indexSyntheseOffresEnd);
    expect(indexRefresh).toBeLessThan(indexSyntheseOffresEnd);
    expect(indexOuvrirAirtable).toBeLessThan(indexSyntheseOffresEnd);
  });

  it('affiche un bouton worker enrichissement avec libellés explicites', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('e2eid="e2eid-bouton-worker-enrichissement"');
    expect(html).toContain('Ouvrir, récupérer et analyser les annonces');
    expect(html).toContain('Arrêter d\\\'ouvrir, récupérer et analyser les annonces');
    expect(html).toContain('/api/enrichissement-worker/status');
    expect(html).toContain('/api/enrichissement-worker/start');
    expect(html).toContain('/api/enrichissement-worker/stop');
  });

  it('affiche un bouton de mise à jour de la synthèse des offres', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('e2eid="e2eid-bouton-rafraichir-synthese-offres"');
    expect(html).toContain('Mise à jour');
    expect(html).toContain('window.__refreshTableauSyntheseOffres');
  });

  it('ouvre Airtable dans un nouvel onglet sans API dédiée', () => {
    const html = getPageTableauDeBord({ airtableBaseUrl: 'https://airtable.com/appTest123' });
    expect(html).toContain('data-airtable-url="https://airtable.com/appTest123"');
    expect(html).toContain("window.open(url, '_blank', 'noopener,noreferrer')");
    expect(html).toContain('e2eid-bouton-ouvrir-airtable');
  });

  it('désactive le bouton "Ouvrir Airtable" quand l’URL est absente', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('e2eid="e2eid-bouton-ouvrir-airtable" data-airtable-url="" disabled');
  });

  it('contient un script qui envoie POST vers /api/traitement/start au clic sur le bouton de traitement', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('/api/traitement/start');
    expect(html).toContain('/api/traitement/status?taskId=');
    expect(html).toContain('POST');
    expect(html).toContain('e2eid-bouton-lancer-traitement');
    expect(html).toContain('window.__lancerAuditTableauDeBord');
  });

  it('contient un script audit dédié avec POST /api/audit/start et polling /api/audit/status', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('/api/audit/start');
    expect(html).toContain('/api/audit/status?taskId=');
    expect(html).toContain('e2eid-bouton-auditer-dossier');
    expect(html).toContain('relanceApresTraitement');
  });

  it('prévoit une zone de résultat audit avec indicateurs métier attendus', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('id="resultat-audit"');
    expect(html).toContain('nbEmailsScannes');
    expect(html).toContain('nbSourcesCreees');
    expect(html).toContain('nbSourcesExistantes');
  });

  it('affiche une table de synthèse audit avec les colonnes attendues', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('<div class="auditSynthese" data-layout="table" hidden>');
    expect(html).toContain('<table class="auditSyntheseTable"');
    expect(html).toContain('<th scope="col">emailExpéditeur</th>');
    expect(html).toContain('<th scope="col">plugin</th>');
    expect(html).toContain('<th scope="col">actif</th>');
    expect(html).toContain('<th scope="col">nbEmails</th>');
  });

  it('affiche les sous-totaux prévisionnels sous le tableau', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('id="audit-sous-totaux" class="auditSousTotaux" hidden');
    expect(html).toContain('id="audit-ligne-archivage"');
    expect(html).toContain('id="audit-ligne-subsistance"');
  });

  it('respecte l’ordre IHM: audit, puis tableau/sous-totaux, puis traitement', () => {
    const html = getPageTableauDeBord();
    const indexBoutonAudit = html.indexOf('e2eid-bouton-auditer-dossier');
    const indexTableau = html.indexOf('auditSyntheseTable');
    const indexSousTotaux = html.indexOf('id="audit-sous-totaux"');
    const indexBoutonTraitement = html.indexOf('e2eid-bouton-lancer-traitement');

    expect(indexBoutonAudit).toBeGreaterThan(-1);
    expect(indexTableau).toBeGreaterThan(-1);
    expect(indexSousTotaux).toBeGreaterThan(-1);
    expect(indexBoutonTraitement).toBeGreaterThan(-1);
    expect(indexBoutonAudit).toBeLessThan(indexTableau);
    expect(indexTableau).toBeLessThan(indexSousTotaux);
    expect(indexSousTotaux).toBeLessThan(indexBoutonTraitement);
  });

  it('utilise result.synthese et les sous-totaux pour afficher archivé/subsistance', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('st.result.synthese');
    expect(html).toContain('st.result.sousTotauxPrevisionnels');
    expect(html).toContain('emailsÀArchiver');
    expect(html).toContain('emails subsisteront dans le dossier à analyser');
  });

  // --- US-1.7 : Tableau de synthèse des offres (conteneur distinct) ---
  it('contient un conteneur dédié synthèse offres distinct de auditSynthese', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('class="auditSynthese"');
    expect(html).toContain('class="syntheseOffres"');
    expect(html.indexOf('syntheseOffres')).not.toBe(html.indexOf('auditSynthese'));
  });

  it('affiche les colonnes fixes du tableau synthèse offres : email expéditeur, plugin, phase 1, phase 2', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('renderTableauSyntheseHead');
    expect(html).toContain("'<th scope=\"col\">email expéditeur</th>'");
    expect(html).toContain("'<th scope=\"col\">plugin</th>'");
    expect(html).toContain("Phase 1 : Extraction de l\\'URL des offres dans les emails");
    expect(html).toContain("Phase 2 : Ouverture des offres pour en récupérer le texte complet");
    expect(html).toContain('synthesePluginCapsule');
    expect(html).not.toContain("'<th scope=\"col\">actif</th>'");
  });

  it('rend les colonnes statut dynamiquement depuis statutsOrdre API', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain("var DEFAULT_STATUTS_ORDER =");
    expect(html).toContain('data.statutsOrdre');
    expect(html).toContain('renderTableauSyntheseHead');
  });

  it('contient un tbody dédié pour le tableau synthèse offres', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('<tbody id="synthese-offres-body"></tbody>');
  });

  it('contient un script avec la fonction renderTableauSyntheseOffres', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('function renderTableauSyntheseOffres');
    expect(html).toContain('renderTableauSyntheseOffres');
  });

  it('renderTableauSyntheseOffres rend expéditeur, états de phases (emoji) et compteurs par statut', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('ligne.emailExpéditeur');
    expect(html).toContain('phaseEtat--ok');
    expect(html).toContain('phaseEtat--ko');
    expect(html).toContain('ligne.statuts');
    expect(html).toContain('phase1Html');
    expect(html).toContain('phase2Html');
  });

  it('ajoute une info-bulle qui décrit les phases 1, 2 et 3', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('class="syntheseOffresInfoBulle"');
    expect(html).toContain("Phase 1 : Extraction de l'URL des offres dans les emails");
    expect(html).toContain('Phase 2 : Ouverture des offres pour en récupérer le texte complet');
    expect(html).toContain("Phase 3 : Analyse et calcule d'un score par l'IA");
  });

  it('affiche les zéros pour les compteurs (largeur stable)', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain("String(n)");
    expect(html).toContain("ligne.statuts[statut] != null");
  });

  it('tableau emails et tableau offres ont des ids/classes distincts sans collision', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('id="audit-synthese-body"');
    expect(html).toContain('id="synthese-offres-body"');
    expect(html).toContain('class="auditSyntheseTable"');
    expect(html).toContain('class="syntheseOffresTable"');
    expect(html).toContain('class="auditSynthese"');
    expect(html).toContain('class="syntheseOffres"');
    expect(html.indexOf('audit-synthese-body')).not.toBe(html.indexOf('synthese-offres-body'));
  });

  // --- US-1.13 : Totaux (colonne et ligne) ---
  it('le script reçoit totauxColonnes, totalParLigne, totalGeneral depuis l’API et les passe au rendu', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('data.totauxColonnes');
    expect(html).toContain('data.totalParLigne');
    expect(html).toContain('data.totalGeneral');
  });

  it('le script ajoute une colonne Totaux dans le thead à droite des colonnes de statut', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('Totaux');
    expect(html).toContain('e2eid-synthese-offres-col-totaux');
  });

  it('le script affiche pour chaque ligne une cellule Totaux avec totalParLigne et une ligne Totaux en bas avec totauxColonnes et totalGeneral', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('syntheseOffresCellTotaux');
    expect(html).toContain('e2eid-synthese-offres-ligne-totaux');
    expect(html).toContain('e2eid-synthese-offres-cellule-totaux-generaux');
  });

  // --- US-2.5 : Consommation API (container, tableau, bouton Calculer) ---
  it('contient un bloc Consommation API avec titre et bouton Calculer', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('Consommation API');
    expect(html).toContain('e2eid="e2eid-bouton-calculer-consommation-api"');
    expect(html).toContain('Calculer');
    expect(html).toContain('data-layout="consommation-api"');
  });

  it('le container Consommation API comporte un tableau avec colonnes Date, Claude, Airtable', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('consommationApiTable');
    expect(html).toContain('consommation-api-body');
    const idx = html.indexOf('data-layout="consommation-api"');
    expect(idx).toBeGreaterThan(-1);
    const slice = html.slice(idx, idx + 1200);
    expect(slice).toMatch(/Date|Claude|Airtable/);
  });
});
