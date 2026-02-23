/**
 * Tests TDD section Configuration ClaudeCode (US-2.2) dans la page Paramètres.
 */
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getParametresContent } from './page-html.js';
import { getDefaultParametres, ecrireParametres } from '../utils/parametres-io.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('page Paramètres - section Configuration ClaudeCode (US-2.2)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'page-html-cc-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    const p = getDefaultParametres();
    ecrireParametres(dataDir, p);
    mkdirSync(join(dataDir, 'ressources'), { recursive: true });
    writeFileSync(
      join(dataDir, 'ressources', 'CréationCompteClaudeCode.html'),
      '<p>Tutoriel API Key ClaudeCode</p>',
      'utf-8'
    );
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('affiche une section Configuration ClaudeCode avec data-layout', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Configuration ClaudeCode');
    expect(html).toContain('data-layout="configuration-claudecode"');
    expect(html).toContain('blocParametrage-claudecode');
  });

  it('affiche la zone tutoriel et le champ API Key en mot de passe', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('zone-tutoriel-claudecode');
    expect(html).toContain('e2eid-champ-api-key-claudecode');
    expect(html).toContain('id="claudecode-api-key"');
    expect(html).toMatch(/type="password"/);
  });

  it('affiche le bouton Enregistrer avec e2eid', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('e2eid-bouton-enregistrer-claudecode');
    expect(html).toContain('bouton-enregistrer-claudecode');
  });

  it('placeholder "sk-ant-api03-…" quand aucune clé enregistrée', async () => {
    const html = await getParametresContent(dataDir, { claudecodeHasApiKey: false });
    expect(html).toContain('placeholder="sk-ant-api03-…"');
    expect(html).not.toContain('indicateurCleEnregistree');
  });

  it('placeholder "Déjà enregistrée" et indicateur quand claudecodeHasApiKey', async () => {
    const html = await getParametresContent(dataDir, { claudecodeHasApiKey: true });
    expect(html).toContain('placeholder="Déjà enregistrée"');
    expect(html).toContain('indicateurCleEnregistree');
    expect(html).toContain('Déjà enregistrée');
  });

  describe('US-2.4 Test ClaudeCode', () => {
    it('affiche le champ Texte d\'offre à tester (label + textarea) avec e2eid', async () => {
      const html = await getParametresContent(dataDir);
      expect(html).toContain('Texte d\'offre à tester');
      expect(html).toContain('id="texte-offre-test"');
      expect(html).toContain('e2eid="e2eid-texte-offre-test"');
      expect(html).toMatch(/<textarea[^>]*texte-offre-test/);
      expect(html).toContain('rows="6"');
    });

    it('n\'affiche pas le bouton Récupérer le texte d\'une offre quand offreTestHasOffre est false', async () => {
      const html = await getParametresContent(dataDir, { offreTestHasOffre: false });
      expect(html).not.toMatch(/<button[^>]*id="bouton-recuperer-texte-offre"/);
      expect(html).not.toContain('e2eid="e2eid-bouton-recuperer-texte-offre"');
    });

    it('affiche le bouton Récupérer le texte d\'une offre quand offreTestHasOffre est true', async () => {
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
      expect(html).toContain('id="zone-resultat-test-claudecode"');
      expect(html).toContain('zoneResultatTestClaudecode');
    });
  });
});
