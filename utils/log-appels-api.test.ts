/**
 * Tests TDD pour le log des appels API (US-2.5 Comptage des appels API).
 * Baby steps : un test à la fois, RED → GREEN → REFACTOR.
 */
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assurerDossierLogAppels,
  enregistrerAppel,
  lireLogsDuJour,
  agregerConsommationParJourEtApi,
  agregerConsommationParJourEtIntention,
} from './log-appels-api.js';

describe('log-appels-api (US-2.5)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'log-appels-api-'));
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  describe('assurerDossierLogAppels', () => {
    it('crée le dossier dataDir/log-appels-api/ s’il n’existe pas', () => {
      assurerDossierLogAppels(dataDir);
      const dossierLog = join(dataDir, 'log-appels-api');
      expect(existsSync(dossierLog)).toBe(true);
    });
  });

  describe('enregistrerAppel', () => {
    it('un appel avec api "Claude" et succes true crée le fichier du jour avec une entrée (api, dateTime ISO 8601, succes: true)', () => {
      const dateISO = '2026-02-23';
      enregistrerAppel(dataDir, { api: 'Claude', succes: true }, dateISO);
      const cheminFichier = join(dataDir, 'log-appels-api', `${dateISO}.json`);
      expect(existsSync(cheminFichier)).toBe(true);
      const contenu = JSON.parse(readFileSync(cheminFichier, 'utf-8'));
      expect(Array.isArray(contenu)).toBe(true);
      expect(contenu).toHaveLength(1);
      expect(contenu[0]).toMatchObject({ api: 'Claude', succes: true });
      expect(contenu[0].dateTime).toBeDefined();
      expect(contenu[0].dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('sans dateISO utilise le jour courant et crée le fichier correspondant', () => {
      enregistrerAppel(dataDir, { api: 'Claude', succes: true });
      const jour = new Date().toISOString().slice(0, 10);
      const cheminFichier = join(dataDir, 'log-appels-api', `${jour}.json`);
      expect(existsSync(cheminFichier)).toBe(true);
      const contenu = JSON.parse(readFileSync(cheminFichier, 'utf-8'));
      expect(contenu).toHaveLength(1);
      expect(contenu[0].api).toBe('Claude');
    });

    it('enregistrer avec succes false et codeErreur "429" → entrée avec succes: false, codeErreur: "429", pas de message ni corps', () => {
      const dateISO = '2026-02-23';
      enregistrerAppel(dataDir, { api: 'Airtable', succes: false, codeErreur: '429' }, dateISO);
      const cheminFichier = join(dataDir, 'log-appels-api', `${dateISO}.json`);
      const contenu = JSON.parse(readFileSync(cheminFichier, 'utf-8'));
      const entree = contenu[0];
      expect(entree.succes).toBe(false);
      expect(entree.codeErreur).toBe('429');
      expect(entree).not.toHaveProperty('message');
      expect(entree).not.toHaveProperty('corpsReponse');
    });

    it('si le fichier existant n’est pas un tableau JSON, il est traité comme tableau vide puis une entrée ajoutée', () => {
      assurerDossierLogAppels(dataDir);
      const chemin = join(dataDir, 'log-appels-api', '2026-02-23.json');
      writeFileSync(chemin, '{}', 'utf-8');
      enregistrerAppel(dataDir, { api: 'Claude', succes: true }, '2026-02-23');
      const contenu = JSON.parse(readFileSync(chemin, 'utf-8'));
      expect(contenu).toHaveLength(1);
      expect(contenu[0].api).toBe('Claude');
    });

    it('deux appels (Claude puis Airtable) le même jour → fichier contient un tableau de 2 entrées', () => {
      const dateISO = '2026-02-23';
      enregistrerAppel(dataDir, { api: 'Claude', succes: true }, dateISO);
      enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, dateISO);
      const cheminFichier = join(dataDir, 'log-appels-api', `${dateISO}.json`);
      const contenu = JSON.parse(readFileSync(cheminFichier, 'utf-8'));
      expect(contenu).toHaveLength(2);
      expect(contenu[0].api).toBe('Claude');
      expect(contenu[1].api).toBe('Airtable');
    });

    it('enregistrer un appel avec intention → entrée contient cette intention (US-3.4)', () => {
      const dateISO = '2026-02-24';
      enregistrerAppel(dataDir, { api: 'Claude', succes: true, intention: 'Analyse IA lot' }, dateISO);
      const cheminFichier = join(dataDir, 'log-appels-api', `${dateISO}.json`);
      const contenu = JSON.parse(readFileSync(cheminFichier, 'utf-8'));
      expect(contenu).toHaveLength(1);
      expect(contenu[0].intention).toBe('Analyse IA lot');
    });

    it('enregistrer sans intention → pas de champ intention ou vide (US-3.4)', () => {
      const dateISO = '2026-02-24';
      enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, dateISO);
      const cheminFichier = join(dataDir, 'log-appels-api', `${dateISO}.json`);
      const contenu = JSON.parse(readFileSync(cheminFichier, 'utf-8'));
      expect(contenu).toHaveLength(1);
      expect(contenu[0].intention === undefined || contenu[0].intention === '').toBe(true);
    });

    it('un appel pour J1 et un pour J2 → deux fichiers AAAA-MM-JJ.json existent', () => {
      enregistrerAppel(dataDir, { api: 'Claude', succes: true }, '2026-02-22');
      enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, '2026-02-23');
      const dossier = join(dataDir, 'log-appels-api');
      expect(existsSync(join(dossier, '2026-02-22.json'))).toBe(true);
      expect(existsSync(join(dossier, '2026-02-23.json'))).toBe(true);
    });
  });

  describe('lireLogsDuJour', () => {
    it('après avoir enregistré 1 appel, lireLogsDuJour retourne 1 entrée avec api, dateTime, succes', () => {
      const dateISO = '2026-02-23';
      enregistrerAppel(dataDir, { api: 'Claude', succes: true }, dateISO);
      const entrées = lireLogsDuJour(dataDir, dateISO);
      expect(entrées).toHaveLength(1);
      expect(entrées[0]).toMatchObject({ api: 'Claude', succes: true });
      expect(entrées[0].dateTime).toBeDefined();
      expect(entrées[0].dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('retourne [] si le fichier du jour est absent', () => {
      const entrées = lireLogsDuJour(dataDir, '2026-02-23');
      expect(entrées).toEqual([]);
    });

    it('retourne [] si le fichier existe mais contient du JSON invalide', () => {
      assurerDossierLogAppels(dataDir);
      const chemin = join(dataDir, 'log-appels-api', '2026-02-23.json');
      writeFileSync(chemin, 'pas du json', 'utf-8');
      expect(lireLogsDuJour(dataDir, '2026-02-23')).toEqual([]);
    });

    it('retourne [] si le fichier contient un JSON qui n’est pas un tableau', () => {
      assurerDossierLogAppels(dataDir);
      writeFileSync(join(dataDir, 'log-appels-api', '2026-02-23.json'), '{}', 'utf-8');
      expect(lireLogsDuJour(dataDir, '2026-02-23')).toEqual([]);
    });
  });

  describe('agregerConsommationParJourEtApi', () => {
    it('avec 2 appels Claude et 3 Airtable le 2026-02-21 → pour cette date Claude=2, Airtable=3', () => {
      const dateISO = '2026-02-21';
      enregistrerAppel(dataDir, { api: 'Claude', succes: true }, dateISO);
      enregistrerAppel(dataDir, { api: 'Claude', succes: true }, dateISO);
      enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, dateISO);
      enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, dateISO);
      enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, dateISO);
      const agrege = agregerConsommationParJourEtApi(dataDir);
      expect(agrege['2026-02-21']).toEqual({ Claude: 2, Airtable: 3 });
    });

    it('retourne {} si le dossier log-appels-api n’existe pas', () => {
      expect(agregerConsommationParJourEtApi(dataDir)).toEqual({});
    });

    it('ignore les fichiers .json dont le nom n’est pas AAAA-MM-JJ', () => {
      assurerDossierLogAppels(dataDir);
      writeFileSync(join(dataDir, 'log-appels-api', 'invalide.json'), '[]', 'utf-8');
      enregistrerAppel(dataDir, { api: 'Claude', succes: true }, '2026-02-21');
      const agrege = agregerConsommationParJourEtApi(dataDir);
      expect(agrege['2026-02-21']).toEqual({ Claude: 1 });
      expect(agrege).not.toHaveProperty('invalide');
    });

    it('ignore les entrées sans api ou avec api non-string dans un fichier du jour', () => {
      assurerDossierLogAppels(dataDir);
      writeFileSync(
        join(dataDir, 'log-appels-api', '2026-02-20.json'),
        JSON.stringify([
          { api: 'Claude', dateTime: '2026-02-20T10:00:00.000Z', succes: true },
          { api: '', dateTime: '2026-02-20T10:01:00.000Z', succes: true },
          { dateTime: '2026-02-20T10:02:00.000Z', succes: true },
        ]),
        'utf-8'
      );
      const agrege = agregerConsommationParJourEtApi(dataDir);
      expect(agrege['2026-02-20']).toEqual({ Claude: 1 });
    });
  });

  describe('agregerConsommationParJourEtIntention (US-3.4)', () => {
    it('plusieurs entrées avec intentions A et B → agrégation retourne les bons totaux', () => {
      const dateISO = '2026-02-24';
      enregistrerAppel(dataDir, { api: 'Claude', succes: true, intention: 'Analyse IA lot' }, dateISO);
      enregistrerAppel(dataDir, { api: 'Claude', succes: true, intention: 'Analyse IA lot' }, dateISO);
      enregistrerAppel(dataDir, { api: 'Airtable', succes: true, intention: 'Synthèse Airtable' }, dateISO);
      const agrege = agregerConsommationParJourEtIntention(dataDir);
      expect(agrege[dateISO]).toEqual({ 'Analyse IA lot': 2, 'Synthèse Airtable': 1 });
    });

    it('entrées sans intention n’apparaissent pas dans les totaux par intention', () => {
      const dateISO = '2026-02-24';
      enregistrerAppel(dataDir, { api: 'Claude', succes: true, intention: 'Analyse IA' }, dateISO);
      enregistrerAppel(dataDir, { api: 'Airtable', succes: true }, dateISO);
      const agrege = agregerConsommationParJourEtIntention(dataDir);
      expect(agrege[dateISO]).toEqual({ 'Analyse IA': 1 });
      expect(agrege[dateISO]['Airtable']).toBeUndefined();
    });

    it('retourne {} si le dossier log-appels-api n’existe pas', () => {
      expect(agregerConsommationParJourEtIntention(dataDir)).toEqual({});
    });
  });

  describe('rétrocompatibilité (US-3.4)', () => {
    it('fichier avec anciennes entrées sans intention → lireLogsDuJour et agregerConsommationParJourEtApi fonctionnent', () => {
      assurerDossierLogAppels(dataDir);
      const dateISO = '2026-02-23';
      const cheminFichier = join(dataDir, 'log-appels-api', `${dateISO}.json`);
      writeFileSync(
        cheminFichier,
        JSON.stringify([
          { api: 'Claude', dateTime: '2026-02-23T10:00:00.000Z', succes: true },
          { api: 'Airtable', dateTime: '2026-02-23T10:01:00.000Z', succes: true },
        ]),
        'utf-8'
      );
      const entrées = lireLogsDuJour(dataDir, dateISO);
      expect(entrées).toHaveLength(2);
      expect(entrées[0].api).toBe('Claude');
      expect(entrées[1].api).toBe('Airtable');
      expect(entrées[0].intention).toBeUndefined();
      const agregeApi = agregerConsommationParJourEtApi(dataDir);
      expect(agregeApi[dateISO]).toEqual({ Claude: 1, Airtable: 1 });
    });
  });
});
