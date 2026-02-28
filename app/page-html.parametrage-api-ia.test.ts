/**
 * Tests TDD section API IA / Mistral (US-8.1) dans la page Paramètres.
 */
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getParametresContent } from './page-html.js';
import { getDefaultParametres, ecrireParametres } from '../utils/parametres-io.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('page Paramètres - section API IA (US-8.1)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'page-html-api-ia-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    const p = getDefaultParametres();
    ecrireParametres(dataDir, p);
    mkdirSync(join(dataDir, 'ressources'), { recursive: true });
    writeFileSync(
      join(dataDir, 'ressources', 'CréationCompteMistral.html'),
      '<p>Tutoriel API Key Mistral</p>',
      'utf-8'
    );
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('affiche une section API IA avec data-layout', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('API IA');
    expect(html).toContain('data-layout="configuration-api-ia"');
    expect(html).toContain('blocParametrage-api-ia');
  });

  it('affiche la zone tutoriel et le champ API Key en mot de passe', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('zone-tutoriel-api-ia');
    expect(html).toContain('e2eid-champ-api-key-ia');
    expect(html).toContain('id="api-key-ia"');
    expect(html).toMatch(/type="password"/);
  });

  it('affiche le bouton Enregistrer avec e2eid', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('e2eid-bouton-enregistrer-ia');
    expect(html).toContain('bouton-enregistrer-ia');
  });

  it('contient le formulaire API IA, la zone de feedback et le script d’enregistrement', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('id="form-api-ia"');
    expect(html).toContain('id="feedback-enregistrement-ia"');
    expect(html).toContain('/scripts/enregistrement-api-ia.js');
  });

  it('placeholder "sk-…" quand aucune clé enregistrée', async () => {
    const html = await getParametresContent(dataDir, { mistralHasApiKey: false });
    expect(html).toContain('placeholder="sk-…"');
  });

  it('placeholder "API Key correctement enregistrée" quand mistralHasApiKey (pas d’indicateur sous le champ)', async () => {
    const html = await getParametresContent(dataDir, { mistralHasApiKey: true });
    expect(html).toContain('placeholder="API Key correctement enregistrée"');
    expect(html).not.toContain('indicateurCleEnregistree');
  });

  it('bloc API IA ouvert par défaut quand pas de clé', async () => {
    const html = await getParametresContent(dataDir, { mistralHasApiKey: false });
    expect(html).toMatch(/details[^>]*blocParametrage-api-ia[^>]*open/);
  });

  it('bloc API IA fermé par défaut quand clé enregistrée', async () => {
    const html = await getParametresContent(dataDir, { mistralHasApiKey: true });
    const detailsMatch = html.match(/<details[^>]*blocParametrage-api-ia[^>]*>/);
    expect(detailsMatch).toBeTruthy();
    expect(detailsMatch![0]).not.toContain('open');
  });

  describe('Test API IA (zone dans section API IA)', () => {
    it('affiche le champ Texte d\'offre à tester (label + textarea) avec e2eid', async () => {
      const html = await getParametresContent(dataDir);
      expect(html).toContain('Texte d\'offre à tester');
      expect(html).toContain('id="texte-offre-test"');
      expect(html).toContain('e2eid="e2eid-texte-offre-test"');
      expect(html).toMatch(/<textarea[^>]*texte-offre-test/);
      expect(html).toContain('rows="6"');
    });

    it('n\'affiche pas le bouton Récupérer quand offreTestHasOffre est false', async () => {
      const html = await getParametresContent(dataDir, { offreTestHasOffre: false });
      expect(html).not.toMatch(/<button[^>]*id="bouton-recuperer-texte-offre"/);
      expect(html).not.toContain('e2eid="e2eid-bouton-recuperer-texte-offre"');
    });

    it('affiche le bouton Récupérer quand offreTestHasOffre est true', async () => {
      const html = await getParametresContent(dataDir, { offreTestHasOffre: true });
      expect(html).toContain('id="bouton-recuperer-texte-offre"');
      expect(html).toContain('e2eid="e2eid-bouton-recuperer-texte-offre"');
      expect(html).toContain('Récupérer le texte d\'une offre');
    });

    it('affiche le bouton Tester API avec e2eid', async () => {
      const html = await getParametresContent(dataDir);
      expect(html).toContain('id="bouton-tester-api"');
      expect(html).toContain('e2eid="e2eid-bouton-tester-api"');
      expect(html).toContain('Tester API');
    });

    it('affiche une zone résultat pour le test API', async () => {
      const html = await getParametresContent(dataDir);
      expect(html).toContain('id="zone-resultat-test-ia"');
      expect(html).toContain('zoneResultatTestApiIa');
    });

    it('zone test est dans la section API IA (blocParametrage-api-ia)', async () => {
      const html = await getParametresContent(dataDir);
      expect(html).toContain('zone-resultat-test-ia');
      expect(html).toContain('zoneTestApiIa');
      expect(html).toContain('bouton-tester-api');
      const idxBloc = html.indexOf('blocParametrage-api-ia');
      const idxZone = html.indexOf('zone-resultat-test-ia');
      expect(idxBloc).toBeGreaterThan(0);
      expect(idxZone).toBeGreaterThan(idxBloc);
    });
  });
});
