/**
 * Tests TDD bloc Formule du score total (US-2.7) dans la page Paramètres.
 * Baby steps : un test à la fois, RED → GREEN → REFACTOR.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getParametresContent } from './page-html.js';
import { getDefaultParametres, ecrireParametres } from '../utils/parametres-io.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('page Paramètres - bloc Formule du score total (US-2.7)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'page-html-formule-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    const p = getDefaultParametres();
    ecrireParametres(dataDir, p);
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('affiche un bloc "Formule du score total" et ce bloc est sous "Paramétrage prompt de l\'IA"', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Formule du score total');
    const idxParametrageIA = html.indexOf("Paramétrage prompt de l'IA");
    const idxFormuleScore = html.indexOf('Formule du score total');
    expect(idxParametrageIA).toBeGreaterThanOrEqual(0);
    expect(idxFormuleScore).toBeGreaterThanOrEqual(0);
    expect(idxFormuleScore).toBeGreaterThan(idxParametrageIA);
  });

  it('la page comporte un container ou section intitulée "Formule du score total"', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Formule du score total');
    expect(html).toMatch(/details[^>]*class="[^"]*blocParametrage[^"]*"[^>]*>[\s\S]*?summary[^>]*>[\s\S]*Formule du score total/);
  });

  it('le bloc comporte les 8 champs coefficients (coefScoreLocalisation, coefScoreSalaire, etc.)', async () => {
    const html = await getParametresContent(dataDir);
    const coefIds = ['coefScoreLocalisation', 'coefScoreSalaire', 'coefScoreCulture', 'coefScoreQualiteOffre', 'coefScoreOptionnel1', 'coefScoreOptionnel2', 'coefScoreOptionnel3', 'coefScoreOptionnel4'];
    for (const id of coefIds) {
      expect(html).toContain('formule-score-total-' + id);
      expect(html).toContain('name="' + id + '"');
    }
  });

  it('le bloc comporte une zone de saisie texte pour le champ formule', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('id="formule-score-total-formule"');
    expect(html).toContain('name="formule"');
    expect(html).toContain('<textarea');
  });

  it('le bloc affiche la liste des noms de variables (scores et coefficients)', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('ScoreLocalisation');
    expect(html).toContain('ScoreSalaire');
    expect(html).toContain('coefScoreLocalisation');
    expect(html).toContain('formuleScoreTotalVariable');
  });

  it('le bloc comporte un bouton Enregistrer avec e2eid', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('bouton-enregistrer-formule-score-total');
    expect(html).toContain('e2eid-bouton-enregistrer-formule-score-total');
  });

  it('sans paramètre enregistré, affiche coefficients à 1 et formule par défaut', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('value="1"');
    expect(html).toMatch(/ScoreLocalisation.*0.*\?/);
  });

  it('le bloc comporte une aide (texte ou bouton Ouvrir la doc)', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('math.js');
    expect(html).toContain('Ouvrir la doc');
    expect(html).toContain('https://mathjs.org/docs/index.html');
    expect(html).toContain('bouton-ouvrir-doc-mathjs');
    expect(html).toMatch(/data-href="https:\/\/mathjs\.org\/docs\/index\.html"/);
    expect(html).toContain('btnExterne');
  });

  it('préremplit coefficients et formule quand options.formuleDuScoreTotal est fourni', async () => {
    const html = await getParametresContent(dataDir, {
      formuleDuScoreTotal: {
        coefScoreLocalisation: 2,
        coefScoreSalaire: 1,
        coefScoreCulture: 1,
        coefScoreQualiteOffre: 1,
        coefScoreOptionnel1: 1,
        coefScoreOptionnel2: 1,
        coefScoreOptionnel3: 1,
        coefScoreOptionnel4: 1,
        formule: 'ScoreSalaire + 1',
      },
    });
    expect(html).toContain('value="2"');
    expect(html).toContain('>ScoreSalaire + 1</textarea>');
  });
});