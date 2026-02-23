/**
 * Tests TDD pour evaluerParametragesComplets (US-1.6).
 * Baby steps : un test à la fois, RED → GREEN → REFACTOR.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ecrireCompte } from './compte-io.js';
import { evaluerParametragesComplets } from './parametrages-complets.js';
import {
  getDefaultParametres,
  ecrireParametres,
  lireParametres,
  appliquerCallbackMicrosoft,
} from './parametres-io.js';
import { ecrireAirTable } from './parametres-airtable.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('evaluerParametragesComplets', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'parametrages-complets-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('sans aucun paramètre (pas de compte, pas d’Airtable) retourne complet: false et manque [connexion email, Airtable]', () => {
    const result = evaluerParametragesComplets(dataDir);
    expect(result.complet).toBe(false);
    expect(result.manque).toContain('connexion email');
    expect(result.manque).toContain('Airtable');
    expect(result.manque).toHaveLength(2);
  });

  it('compte configuré (valide) mais Airtable absent ou incomplet → complet: false, manque contient Airtable', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'user@example.com',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      imapHost: 'imap.example.com',
    });
    const result = evaluerParametragesComplets(dataDir);
    expect(result.complet).toBe(false);
    expect(result.manque).toContain('Airtable');
    expect(result.manque).not.toContain('connexion email');
    expect(result.manque).toHaveLength(1);
  });

  it('Airtable configuré (apiKey, base, sources, offres) mais compte absent ou incomplet → complet: false, manque contient connexion email', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    ecrireAirTable(dataDir, { apiKey: 'key', base: 'baseId', sources: 'srcId', offres: 'offId' });
    const result = evaluerParametragesComplets(dataDir);
    expect(result.complet).toBe(false);
    expect(result.manque).toContain('connexion email');
    expect(result.manque).not.toContain('Airtable');
    expect(result.manque).toHaveLength(1);
  });

  it('compte OK et Airtable OK → complet: true, manque: []', () => {
    ecrireCompte(dataDir, {
      adresseEmail: 'user@example.com',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      imapHost: 'imap.example.com',
    });
    ecrireAirTable(dataDir, { apiKey: 'key', base: 'baseId', sources: 'srcId', offres: 'offId' });
    const result = evaluerParametragesComplets(dataDir);
    expect(result.complet).toBe(true);
    expect(result.manque).toEqual([]);
  });

  it('compte Microsoft OK (sans imapHost) et Airtable OK → complet: true', () => {
    ecrireParametres(dataDir, getDefaultParametres());
    appliquerCallbackMicrosoft(dataDir, { adresseEmail: 'ms@example.com' });
    const p = lireParametres(dataDir);
    if (p) {
      p.connexionBoiteEmail.dossierAAnalyser = 'INBOX';
      ecrireParametres(dataDir, p);
    }
    ecrireAirTable(dataDir, { apiKey: 'k', base: 'b', sources: 's', offres: 'o' });
    const result = evaluerParametragesComplets(dataDir);
    expect(result.complet).toBe(true);
    expect(result.manque).toEqual([]);
  });

  it('les libellés dans manque sont exploitables pour un message d’erreur (ex. Il reste à terminer : …)', () => {
    const result = evaluerParametragesComplets(dataDir);
    expect(result.manque.length).toBeGreaterThan(0);
    const message = `Il reste à terminer : ${result.manque.join(', ')}.`;
    expect(message).toContain('connexion email');
    expect(message).toContain('Airtable');
    expect(message).toMatch(/^Il reste à terminer : .+\.$/);
  });
});
