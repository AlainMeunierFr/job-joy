/**
 * Tests TDD tableau de bord (US-1.4) : bouton « Lancer le traitement ».
 * US-1.6 : getHeaderHtml avec configComplète.
 */
import { getHeaderHtml, getPageTableauDeBord } from './layout-html.js';

describe('getHeaderHtml', () => {
  it('affiche toujours le lien Tableau de bord (configComplète option ignorée pour ne pas bloquer en paramètres)', () => {
    expect(getHeaderHtml('parametres')).toContain('/tableau-de-bord');
    expect(getHeaderHtml('parametres', { configComplète: true })).toContain('/tableau-de-bord');
    expect(getHeaderHtml('parametres', { configComplète: false })).toContain('/tableau-de-bord');
    expect(getHeaderHtml('tableau-de-bord')).toContain('/tableau-de-bord');
  });

  it('affiche le lien À propos et le marque actif sur la page À propos (US-3.16)', () => {
    const htmlParametres = getHeaderHtml('parametres');
    expect(htmlParametres).toContain('/a-propos');
    expect(htmlParametres).toContain('À propos');
    const htmlAPropos = getHeaderHtml('a-propos');
    expect(htmlAPropos).toContain('appNavLinkActive');
    expect(htmlAPropos).toContain('/a-propos');
  });
});

describe('getPageTableauDeBord', () => {
  // US-3.5 : ancien bloc "Dossier de la boîte aux lettres" / "Auditer le dossier" supprimé ; structure 3 blocs (Synthèse, Traitements, Consommation API).
  it('contient le bloc Synthèse des offres avec tableau et bouton Ouvrir Airtable', () => {
    const html = getPageTableauDeBord({ airtableBaseUrl: 'https://airtable.com/appTest123' });
    expect(html).toContain('data-layout="synthese-offres"');
    expect(html).toContain('syntheseOffresTable');
    expect(html).toContain('e2eid="e2eid-bouton-ouvrir-airtable"');
    expect(html).toContain('Ouvrir Airtable');
  });

  it('contient le bloc Traitements avec bouton Lancer les traitements (e2eid worker-enrichissement)', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('e2eid="e2eid-bouton-worker-enrichissement"');
    expect(html).toContain('Lancer les traitements');
    expect(html).toContain('Arrêter les traitements');
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

  it('contient un script worker avec enrichissement-worker start/stop et status', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('/api/enrichissement-worker/start');
    expect(html).toContain('/api/enrichissement-worker/stop');
    expect(html).toContain('/api/enrichissement-worker/status');
    expect(html).toContain('e2eid-bouton-worker-enrichissement');
  });

  it('n’a plus de script audit dédié dans le layout (US-3.5: bloc audit retiré)', () => {
    const html = getPageTableauDeBord();
    expect(html).not.toContain('/api/audit/start');
    expect(html).not.toContain('e2eid-bouton-auditer-dossier');
  });

  it('n’a plus de zone résultat audit dans le layout (US-3.5: bloc audit retiré)', () => {
    const html = getPageTableauDeBord();
    expect(html).not.toContain('id="resultat-audit"');
  });

  it('n’a plus de table de synthèse audit dans le layout (US-3.5: bloc audit retiré)', () => {
    const html = getPageTableauDeBord();
    expect(html).not.toContain('class="auditSyntheseTable"');
  });

  it('n’a plus de sous-totaux prévisionnels audit dans le layout (US-3.5: bloc audit retiré)', () => {
    const html = getPageTableauDeBord();
    expect(html).not.toContain('id="audit-sous-totaux"');
  });

  it('respecte l’ordre IHM: audit, puis tableau/sous-totaux, puis traitement', () => {
    const html = getPageTableauDeBord();
    // US-3.5 : bloc audit retiré du layout, test désactivé.
    expect(html).toContain('data-layout="traitements"');
  });

  it('n’utilise plus result.synthese audit dans le layout (US-3.5: bloc audit retiré)', () => {
    const html = getPageTableauDeBord();
    expect(html).not.toContain('audit-sous-totaux');
    expect(html).toContain('data-layout="traitements"');
  });

  // --- US-1.7 : Tableau de synthèse des offres (conteneur distinct) ---
  it('contient un conteneur dédié synthèse offres (data-layout synthese-offres)', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('data-layout="synthese-offres"');
    expect(html).toContain('class="syntheseOffres"');
  });

  it('affiche les colonnes fixes du tableau synthèse offres : email expéditeur, plugin, création, enrichissement, analyse', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('renderTableauSyntheseHead');
    expect(html).toContain('email expéditeur</th>');
    expect(html).toContain('plugin</th>');
    expect(html).toContain("création");
    expect(html).toContain("enrichissement");
    expect(html).toContain("analyse");
    expect(html).toContain("Phase 1 : Extraction de l'URL des offres dans les emails");
    expect(html).toContain("Phase 2 : Ouverture des offres pour en récupérer le texte complet");
    expect(html).toContain("Phase 3 : Analyse et calcul");
    expect(html).toContain("score par l'IA");
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
    expect(html).toContain('phase3Html');
    expect(html).toContain('activerCreation');
    expect(html).toContain('activerEnrichissement');
    expect(html).toContain('activerAnalyseIA');
  });

  it('ajoute une info-bulle qui décrit les phases 1, 2 et 3', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('class="syntheseOffresInfoBulle"');
    expect(html).toContain("Phase 1 : Extraction de l'URL des offres dans les emails");
    expect(html).toContain('Phase 2 : Ouverture des offres pour en récupérer le texte complet');
    expect(html).toContain("Phase 3 : Analyse et calcul d'un score par l'IA");
  });

  it('affiche les zéros pour les compteurs (largeur stable)', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain("String(n)");
    expect(html).toContain("ligne.statuts[statut] != null");
  });

  it('tableau synthèse offres a un tbody dédié et des classes distinctes', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('id="synthese-offres-body"');
    expect(html).toContain('class="syntheseOffresTable"');
    expect(html).toContain('class="syntheseOffres"');
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

  // --- US-3.5 CA5 : Structure 3 blocs ---
  it('expose 3 containers identifiables : Synthèse des offres, Traitements, Consommation API', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('Synthèse des offres');
    expect(html).toContain('data-layout="synthese-offres"');
    expect(html).toContain('data-layout="traitements"');
    expect(html).toContain('data-layout="consommation-api"');
    const idxSynthese = html.indexOf('data-layout="synthese-offres"');
    const idxTraitements = html.indexOf('data-layout="traitements"');
    const idxConsommation = html.indexOf('data-layout="consommation-api"');
    expect(idxSynthese).toBeGreaterThan(-1);
    expect(idxTraitements).toBeGreaterThan(-1);
    expect(idxConsommation).toBeGreaterThan(-1);
    expect(idxSynthese).toBeLessThan(idxTraitements);
    expect(idxTraitements).toBeLessThan(idxConsommation);
  });

  it('US-3.5 : bloc Synthèse contient Mise à jour puis Ouvrir Airtable ; bloc Traitements contient Lancer les traitements', () => {
    const html = getPageTableauDeBord();
    const blocSynthese = html.indexOf('data-layout="synthese-offres"');
    expect(blocSynthese).toBeGreaterThan(-1);
    const sliceSynthese = html.slice(blocSynthese, blocSynthese + 1500);
    expect(sliceSynthese).toContain('e2eid="e2eid-bouton-rafraichir-synthese-offres"');
    expect(sliceSynthese).toContain('e2eid="e2eid-bouton-ouvrir-airtable"');
    expect(sliceSynthese.indexOf('rafraichir-synthese-offres')).toBeLessThan(sliceSynthese.indexOf('ouvrir-airtable'));
    const blocTraitements = html.indexOf('data-layout="traitements"');
    expect(blocTraitements).toBeGreaterThan(-1);
    const sliceTraitements = html.slice(blocTraitements, blocTraitements + 800);
    expect(sliceTraitements).toContain('e2eid="e2eid-bouton-worker-enrichissement"');
  });

  it('US-3.5 : dans le bloc Traitements, 3 lignes de phase avec data-layout ligne-phase', () => {
    const html = getPageTableauDeBord();
    const blocTraitements = html.indexOf('data-layout="traitements"');
    expect(blocTraitements).toBeGreaterThan(-1);
    const slice = html.slice(blocTraitements);
    const countLignePhase = (slice.match(/data-layout="ligne-phase"/g) || []).length;
    expect(countLignePhase).toBe(3);
    expect(slice).toContain('traitementsLignePhaseNom');
    expect(slice).toContain('Création');
    expect(slice).toContain('Enrichissement');
    expect(slice).toContain('Analyse IA');
  });

  it('US-3.5 CA1 : au chargement, aucun setInterval ne déclenche de requête synthèse après le premier chargement', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain('refreshTableauSyntheseOffres');
    expect(html).not.toMatch(/setInterval\s*\([^)]*refreshTableauSyntheseOffres/);
  });

  it('US-3.5 CA4 / US-3.3 CA2 : le clic sur Mise à jour déclenche l\'audit (POST refresh) puis le chargement du tableau (GET synthèse)', () => {
    const html = getPageTableauDeBord();
    expect(html).toContain("'/api/tableau-synthese-offres/refresh'");
    expect(html).toContain("method: 'POST'");
    expect(html).toContain("'/api/tableau-synthese-offres'");
  });
});
