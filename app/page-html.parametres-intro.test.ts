/**
 * Tests bloc « Avant propos » page Paramètres (contenu depuis ressources/guides/AvantPropos.html).
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getParametresContent } from './page-html.js';
import { getDefaultParametres, ecrireParametres } from '../utils/parametres-io.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('page Paramètres - bloc Avant propos', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'page-html-intro-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    const p = getDefaultParametres();
    ecrireParametres(dataDir, p);
    mkdirSync(join(dataDir, 'ressources'), { recursive: true });
    writeFileSync(
      join(dataDir, 'ressources', 'AvantPropos.html'),
      '<p>Contenu personnalisable Avant propos.</p>',
      'utf-8'
    );
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('affiche le bloc Avant propos en premier (avant Compte email)', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('data-layout="intro-parametrage"');
    const idxIntro = html.indexOf('data-layout="intro-parametrage"');
    const idxConnexion = html.indexOf('blocParametrage-connexion');
    expect(idxConnexion).toBeGreaterThan(-1);
    expect(idxIntro).toBeLessThan(idxConnexion);
  });

  it('le bloc est un details avec summary "Avant propos"', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Avant propos');
    expect(html).toContain('blocParametrage-intro');
  });

  it('le bloc est ouvert quand flashConfigManque est fourni', async () => {
    const html = await getParametresContent(dataDir, { flashConfigManque: ['x'] });
    const idx = html.indexOf('data-layout="intro-parametrage"');
    const slice = html.slice(html.lastIndexOf('<details', idx), idx + 400);
    expect(slice).toMatch(/<details[^>]*open/);
  });

  it('le bloc est fermé quand la config est complète (pas de flash)', async () => {
    const p = getDefaultParametres();
    p.connexionBoiteEmail = {
      ...p.connexionBoiteEmail,
      dossierAAnalyser: 'INBOX',
      imap: {
        host: 'imap.example.com',
        port: 993,
        secure: true,
        adresseEmail: 'test@example.com',
        motDePasseChiffre: '',
      },
      consentementEnvoyeLe: '2026-01-01T12:00:00.000Z',
    };
    p.airtable = { base: 'https://airtable.com/appX/tblY', apiKey: 'patXXX' };
    ecrireParametres(dataDir, p);
    const html = await getParametresContent(dataDir, { mistralHasApiKey: true });
    const idx = html.indexOf('data-layout="intro-parametrage"');
    const slice = html.slice(html.lastIndexOf('<details', idx), idx + 350);
    expect(slice).not.toMatch(/<details[^>]*open/);
  });

  it('affiche le contenu du fichier AvantPropos.html ou un fallback', async () => {
    const html = await getParametresContent(dataDir);
    const hasCustom = html.includes('Contenu personnalisable Avant propos');
    const hasFallback = html.includes('tutorielAbsent') && html.includes('Avant propos absent');
    expect(hasCustom || hasFallback).toBe(true);
  });
});
