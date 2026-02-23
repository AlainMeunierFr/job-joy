/**
 * Tests TDD section Paramétrage IA (US-2.1) dans la page Paramètres.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getParametresContent } from './page-html.js';
import { getDefaultParametres, ecrireParametres } from '../utils/parametres-io.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('page Paramètres - section Paramétrage IA (US-2.1)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'page-html-ia-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    const p = getDefaultParametres();
    ecrireParametres(dataDir, p);
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('affiche un container "Paramétrage IA" avec titre', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Paramétrage prompt de l\'IA');
    expect(html).toContain('section-parametrage-ia');
    expect(html).toContain('data-layout="parametrage-ia"');
  });

  it('affiche la zone Rédhibitoires avec 4 blocs (titre + textarea)', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Rédhibitoires');
    expect(html).toContain('data-zone="rehibitoires"');
    for (let i = 0; i < 4; i++) {
      expect(html).toContain(`parametrage-ia-rehibitoires-${i}-titre`);
      expect(html).toContain(`parametrage-ia-rehibitoires-${i}-description`);
    }
  });

  it('affiche la zone Scores incontournables avec titres fixes et 4 textareas', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Scores incontournables');
    expect(html).toContain('Localisation');
    expect(html).toContain('Salaire');
    expect(html).toContain('Culture');
    expect(html).toContain('Qualité d\'offre');
    expect(html).toContain('parametrage-ia-scores-incontournables-localisation');
  });

  it('affiche un placeholder distinct pour chaque zone (rédhibitoires, scores incontournables, optionnels, autres)', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Ex. Secteur, localisation ou type de contrat');
    expect(html).toContain('Ex. Rejeter si hors Île-de-France');
    expect(html).toContain('Ex. Île-de-France ou télétravail 2 j/sem');
    expect(html).toContain('Ex. Fourchette 45–55 k€');
    expect(html).toContain('Ex. Petite structure, valeurs RSE');
    expect(html).toContain('Ex. Fiche de poste claire, processus structuré');
    expect(html).toContain('Ex. Langues, outils, secteur');
    expect(html).toContain('Ex. Anglais C1, expérience Jira');
    expect(html).toContain('Confiez CVs, lettres de motivation');
    expect(html).not.toContain('Ex. lieu de résidence, télétravail');
  });

  it('affiche la zone Autres ressources avec textarea 12 lignes', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Autres ressources');
    expect(html).toContain('parametrage-ia-autres-ressources');
    expect(html).toContain('rows="12"');
  });

  it('affiche le bouton Enregistrer avec e2eid', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('e2eid-bouton-enregistrer-parametrage-ia');
    expect(html).toContain('Enregistrer');
  });

  it('préremplit les champs quand options.parametrageIA est fourni', async () => {
    const html = await getParametresContent(dataDir, {
      parametrageIA: {
        rehibitoires: [{ titre: 'T1', description: 'D1' }, { titre: '', description: '' }, { titre: '', description: '' }, { titre: '', description: '' }],
        scoresIncontournables: { localisation: 'L', salaire: '', culture: '', qualiteOffre: '' },
        scoresOptionnels: [{ titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }, { titre: '', attente: '' }],
        autresRessources: 'C:\\path',
      },
    });
    expect(html).toContain('value="T1"');
    expect(html).toContain('>D1</textarea>');
    expect(html).toContain('>L</textarea>');
    expect(html).toContain('parametrage-ia-autres-ressources');
    expect(html).toMatch(/parametrage-ia-autres-ressources[^>]*>[\s\S]*path/);
  });
});
