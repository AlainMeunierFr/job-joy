/**
 * US-7.3 : tests TDD pour sources V2 (une entrée par source, schéma SourceEntry).
 * US-6.6 : liste canonique 15 noms + Inconnu, urlOfficielle, migration.
 */
import {
  SOURCES_NOMS_CANONIQUES,
  SOURCES_NOMS_REFERENCE_US_6_6,
  type SourceEntry,
  getCheminListeHtmlPourSource,
  getSourcesParDefautV2,
  lireSourcesV2,
  ecrireSourcesV2,
  createSourcesV2Driver,
  sourceEntriesToLegacyLignes,
  migrerLegacyVersSourceEntries,
} from './sources-v2.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('sources-v2 (US-7.3)', () => {
  describe('1. Types et liste canonique', () => {
    it('US-6.6 : liste canonique = exactement les 15 noms de référence + Inconnu ; tout écart est détecté', () => {
      const referenceAvecInconnu = [...SOURCES_NOMS_REFERENCE_US_6_6, 'Inconnu'];
      expect(SOURCES_NOMS_REFERENCE_US_6_6).toHaveLength(15);
      expect(SOURCES_NOMS_CANONIQUES).toHaveLength(16);
      const canoniques = [...SOURCES_NOMS_CANONIQUES];
      for (let i = 0; i < referenceAvecInconnu.length; i++) {
        expect(canoniques[i]).toBe(referenceAvecInconnu[i]);
      }
      const manquants = referenceAvecInconnu.filter((n) => !SOURCES_NOMS_CANONIQUES.includes(n as typeof SOURCES_NOMS_CANONIQUES[number]));
      const enTrop = canoniques.filter((n) => !referenceAvecInconnu.includes(n));
      expect(manquants).toEqual([]);
      expect(enTrop).toEqual([]);
    });

    it('SourceEntry a les champs source, urlOfficielle, creationEmail, creationListeHtml, enrichissement, analyse', () => {
      const entree: SourceEntry = {
        source: 'APEC',
        urlOfficielle: 'https://www.apec.fr',
        creationEmail: { activé: true, emails: [] },
        creationListeHtml: { activé: true },
        enrichissement: { activé: true },
        analyse: { activé: true },
      };
      expect(entree.source).toBe('APEC');
      expect(entree.urlOfficielle).toBe('https://www.apec.fr');
      expect(entree.creationEmail.activé).toBe(true);
      expect(entree.creationEmail.emails).toEqual([]);
      expect(entree.creationListeHtml.activé).toBe(true);
      expect(entree.enrichissement.activé).toBe(true);
      expect(entree.analyse.activé).toBe(true);
    });
  });

  describe('2. Dérivation chemin liste html', () => {
    it('pour un nom canonique donné, le chemin est dérivé sans stockage JSON (ex. APEC → liste html/apec)', () => {
      expect(getCheminListeHtmlPourSource('APEC')).toBe('liste html/apec');
      expect(getCheminListeHtmlPourSource('Linkedin')).toBe('liste html/linkedin');
    });
  });

  describe('3. Lecture/écriture nouveau schéma', () => {
    let dataDir: string;
    beforeEach(() => {
      dataDir = mkdtempSync(join(tmpdir(), 'sources-v2-'));
    });
    it('fichier absent ou JSON invalide retourne liste par défaut', async () => {
      const dirAbsent = mkdtempSync(join(tmpdir(), 'sources-v2-empty-'));
      const reluAbsent = await lireSourcesV2(dirAbsent);
      expect(reluAbsent.length).toBe(SOURCES_NOMS_CANONIQUES.length);
      const pathInvalid = join(dataDir, 'sources.json');
      const { writeFile, mkdir } = await import('node:fs/promises');
      await mkdir(dataDir, { recursive: true });
      await writeFile(pathInvalid, 'not json {', 'utf-8');
      const reluInvalid = await lireSourcesV2(dataDir);
      expect(reluInvalid.length).toBe(SOURCES_NOMS_CANONIQUES.length);
    });
    it('entrées invalides (source inconnue ou champs manquants) sont ignorées au chargement', async () => {
      const path = join(dataDir, 'sources.json');
      const { writeFile, mkdir } = await import('node:fs/promises');
      await mkdir(dataDir, { recursive: true });
      await writeFile(
        path,
        JSON.stringify([
          { source: 'APEC', urlOfficielle: 'https://www.apec.fr', creationEmail: { activé: true, emails: [] }, creationListeHtml: { activé: true }, enrichissement: { activé: true }, analyse: { activé: true } },
          { source: 'UnknownSource' },
          { source: 'Linkedin' },
        ], null, 2),
        'utf-8'
      );
      const relu = await lireSourcesV2(dataDir);
      expect(relu).toHaveLength(1);
      expect(relu[0].source).toBe('APEC');
    });
    it('écrire puis relire retourne la même structure', async () => {
      const entries: SourceEntry[] = [
        {
          source: 'APEC',
          urlOfficielle: 'https://www.apec.fr',
          creationEmail: { activé: true, emails: [] },
          creationListeHtml: { activé: true },
          enrichissement: { activé: true },
          analyse: { activé: true },
        },
        {
          source: 'Linkedin',
          urlOfficielle: 'https://www.linkedin.com/jobs',
          creationEmail: { activé: true, emails: ['a@linkedin.com'] },
          creationListeHtml: { activé: false },
          enrichissement: { activé: true },
          analyse: { activé: false },
        },
      ];
      await ecrireSourcesV2(dataDir, entries);
      const relu = await lireSourcesV2(dataDir);
      expect(relu).toHaveLength(2);
      expect(relu[0].source).toBe('APEC');
      expect(relu[0].creationEmail.emails).toEqual([]);
      expect(relu[1].source).toBe('Linkedin');
      expect(relu[1].creationEmail.emails).toEqual(['a@linkedin.com']);
      expect(relu[1].creationListeHtml.activé).toBe(false);
      expect(relu[1].analyse.activé).toBe(false);
    });

    it('US-6.6 : lireSourcesV2 / ecrireSourcesV2 round-trip préserve urlOfficielle', async () => {
      const entries: SourceEntry[] = [
        {
          source: 'Cadre Emploi',
          urlOfficielle: 'https://www.cadremploi.fr',
          creationEmail: { activé: true, emails: ['offres@alertes.cadremploi.fr'] },
          creationListeHtml: { activé: true },
          enrichissement: { activé: true },
          analyse: { activé: true },
        },
      ];
      await ecrireSourcesV2(dataDir, entries);
      const relu = await lireSourcesV2(dataDir);
      expect(relu).toHaveLength(1);
      expect(relu[0].urlOfficielle).toBe('https://www.cadremploi.fr');
    });
  });

  describe('4. Déduplication', () => {
    let dataDir: string;
    beforeEach(() => {
      dataDir = mkdtempSync(join(tmpdir(), 'sources-v2-dedup-'));
    });
    it('fichier avec deux entrées Linkedin → après lecture, une seule entrée pour Linkedin', async () => {
      const path = join(dataDir, 'sources.json');
      const { writeFile } = await import('node:fs/promises');
      const { mkdir } = await import('node:fs/promises');
      await mkdir(dataDir, { recursive: true });
      await writeFile(
        path,
        JSON.stringify([
          { source: 'Linkedin', urlOfficielle: 'https://www.linkedin.com/jobs', creationEmail: { activé: true, emails: ['a@l.com'] }, creationListeHtml: { activé: true }, enrichissement: { activé: true }, analyse: { activé: true } },
          { source: 'Linkedin', urlOfficielle: 'https://www.linkedin.com/jobs', creationEmail: { activé: false, emails: ['b@l.com'] }, creationListeHtml: { activé: false }, enrichissement: { activé: false }, analyse: { activé: false } },
        ], null, 2),
        'utf-8'
      );
      const relu = await lireSourcesV2(dataDir);
      const linkedin = relu.filter((e) => e.source === 'Linkedin');
      expect(linkedin).toHaveLength(1);
      expect(linkedin[0].creationEmail.activé).toBe(true);
      expect(linkedin[0].creationEmail.emails).toEqual(['a@l.com']);
    });
  });

  describe('5. Initialisation par défaut', () => {
    it('nombre d’entrées = nombre de noms canoniques ; chaque entrée a les bons champs', () => {
      const def = getSourcesParDefautV2();
      expect(def).toHaveLength(SOURCES_NOMS_CANONIQUES.length);
      for (const e of def) {
        expect(e).toMatchObject({
          creationEmail: { activé: true, emails: expect.any(Array) },
          creationListeHtml: { activé: true },
          enrichissement: { activé: true },
          analyse: { activé: true },
        });
      }
    });
    it('WTTJ, Linkedin, JTMS, HelloWork, Cadre Emploi ont des emails non vides', () => {
      const def = getSourcesParDefautV2();
      const bySource = new Map(def.map((e) => [e.source, e]));
      expect(bySource.get('Welcome to the Jungle')!.creationEmail.emails.length).toBeGreaterThan(0);
      expect(bySource.get('Linkedin')!.creationEmail.emails.length).toBeGreaterThan(0);
      expect(bySource.get('Job That Make Sense')!.creationEmail.emails.length).toBeGreaterThan(0);
      expect(bySource.get('HelloWork')!.creationEmail.emails.length).toBeGreaterThan(0);
      expect(bySource.get('Cadre Emploi')!.creationEmail.emails.length).toBeGreaterThan(0);
    });

    it('US-6.6 : getSourcesParDefautV2 retourne des entrées avec urlOfficielle non vide pour chaque source (sauf Inconnu)', () => {
      const def = getSourcesParDefautV2();
      const inconnu = def.find((e) => e.source === 'Inconnu');
      expect(inconnu?.urlOfficielle).toBe('');
      const autres = def.filter((e) => e.source !== 'Inconnu');
      for (const e of autres) {
        expect(e.urlOfficielle).toBeDefined();
        expect(typeof e.urlOfficielle).toBe('string');
        expect(e.urlOfficielle.length).toBeGreaterThan(0);
      }
    });
  });

  describe('6. Driver listSources / getSource / updateSource', () => {
    let dataDir: string;
    beforeEach(() => {
      dataDir = mkdtempSync(join(tmpdir(), 'sources-v2-driver-'));
    });
    it('listSources retourne une entrée par source (fichier initialisé par défaut)', async () => {
      const driver = createSourcesV2Driver(dataDir);
      const list = await driver.listSources();
      expect(list.length).toBe(SOURCES_NOMS_CANONIQUES.length);
      const noms = list.map((e) => e.source);
      for (const canon of SOURCES_NOMS_CANONIQUES) {
        expect(noms.filter((n) => n === canon)).toHaveLength(1);
      }
    });
    it('getSource("APEC") retourne l’entrée APEC', async () => {
      const driver = createSourcesV2Driver(dataDir);
      const apec = await driver.getSource('APEC');
      expect(apec).toBeDefined();
      expect(apec!.source).toBe('APEC');
      expect(apec!.creationEmail).toBeDefined();
      expect(apec!.creationListeHtml).toBeDefined();
      expect(apec!.enrichissement).toBeDefined();
      expect(apec!.analyse).toBeDefined();
    });
    it('US-6.6 : getSource(nom).urlOfficielle correspond au tableau de référence (ex. Cadre Emploi, Indeed, Inconnu)', async () => {
      const driver = createSourcesV2Driver(dataDir);
      const cadreEmploi = await driver.getSource('Cadre Emploi');
      expect(cadreEmploi?.urlOfficielle).toBe('https://www.cadremploi.fr');
      const indeed = await driver.getSource('Indeed');
      expect(indeed?.urlOfficielle).toBe('https://www.indeed.fr');
      const linkedin = await driver.getSource('Linkedin');
      expect(linkedin?.urlOfficielle).toBe('https://www.linkedin.com/jobs');
      const inconnu = await driver.getSource('Inconnu');
      expect(inconnu?.urlOfficielle).toBe('');
    });
    it('updateSource("Linkedin", { enrichissement: { activé: false } }) puis lecture → une seule entrée Linkedin avec enrichissement.activé false', async () => {
      const driver = createSourcesV2Driver(dataDir);
      await driver.updateSource('Linkedin', { enrichissement: { activé: false } });
      const list = await driver.listSources();
      const linkedin = list.filter((e) => e.source === 'Linkedin');
      expect(linkedin).toHaveLength(1);
      expect(linkedin[0].enrichissement.activé).toBe(false);
    });
    it('updateSource sur un nom absent de la liste ne fait rien (pas d’ajout)', async () => {
      await ecrireSourcesV2(dataDir, [
        {
          source: 'APEC',
          urlOfficielle: 'https://www.apec.fr',
          creationEmail: { activé: true, emails: [] },
          creationListeHtml: { activé: true },
          enrichissement: { activé: true },
          analyse: { activé: true },
        },
      ]);
      const driver = createSourcesV2Driver(dataDir);
      await driver.updateSource('Linkedin', { enrichissement: { activé: false } });
      const list = await driver.listSources();
      expect(list).toHaveLength(1);
      expect(list[0].source).toBe('APEC');
    });
    it('updateSource avec creationEmail, creationListeHtml, analyse met à jour les champs', async () => {
      const driver = createSourcesV2Driver(dataDir);
      await driver.updateSource('APEC', {
        creationEmail: { activé: false, emails: ['custom@apec.fr'] },
        creationListeHtml: { activé: false },
        analyse: { activé: false },
      });
      const apec = await driver.getSource('APEC');
      expect(apec!.creationEmail.activé).toBe(false);
      expect(apec!.creationEmail.emails).toEqual(['custom@apec.fr']);
      expect(apec!.creationListeHtml.activé).toBe(false);
      expect(apec!.analyse.activé).toBe(false);
    });
  });

  describe('7. US-6.6 Migration legacy → une entrée par source', () => {
    it('migration depuis entrées legacy (une par email) regroupe par source et produit une entrée par source avec emails regroupés', () => {
      const legacy = [
        { emailExpéditeur: 'a@cadremploi.fr', source: 'Cadre Emploi' as const, activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true },
        { emailExpéditeur: 'b@cadremploi.fr', source: 'Cadre Emploi' as const, activerCreation: false, activerEnrichissement: true, activerAnalyseIA: false },
        { emailExpéditeur: 'x@linkedin.com', source: 'Linkedin' as const, activerCreation: true, activerEnrichissement: true, activerAnalyseIA: true },
      ];
      const entries = migrerLegacyVersSourceEntries(legacy);
      expect(entries).toHaveLength(2);
      const cadre = entries.find((e) => e.source === 'Cadre Emploi');
      const linkedin = entries.find((e) => e.source === 'Linkedin');
      expect(cadre?.creationEmail.emails).toContain('a@cadremploi.fr');
      expect(cadre?.creationEmail.emails).toContain('b@cadremploi.fr');
      expect(cadre?.creationEmail.emails).toHaveLength(2);
      expect(linkedin?.creationEmail.emails).toEqual(['x@linkedin.com']);
    });

    it('US-6.6 : migration mappe les orphelins (source inconnue ou non canonique) vers l’entrée Inconnu', () => {
      const legacy = [
        { emailExpéditeur: 'orphan@unknown.org', source: 'Inconnu' as const, activerCreation: true },
        { emailExpéditeur: 'other@externe.com', source: 'Externatic' as unknown as string, activerCreation: false },
      ];
      const entries = migrerLegacyVersSourceEntries(legacy);
      const inconnu = entries.find((e) => e.source === 'Inconnu');
      expect(inconnu).toBeDefined();
      expect(inconnu!.creationEmail.emails).toContain('orphan@unknown.org');
      expect(inconnu!.creationEmail.emails).toContain('other@externe.com');
      expect(inconnu!.creationEmail.emails).toHaveLength(2);
      expect(inconnu!.urlOfficielle).toBe('');
    });
  });

  describe('8. Compatibilité appelants (adaptateur)', () => {
    it('sourceEntriesToLegacyLignes produit des lignes avec emailExpéditeur et type pour audit/traitement', () => {
      const entries: SourceEntry[] = [
        {
          source: 'APEC',
          urlOfficielle: 'https://www.apec.fr',
          creationEmail: { activé: false, emails: [] },
          creationListeHtml: { activé: true },
          enrichissement: { activé: true },
          analyse: { activé: true },
        },
        {
          source: 'Linkedin',
          urlOfficielle: 'https://www.linkedin.com/jobs',
          creationEmail: { activé: true, emails: ['a@l.com'] },
          creationListeHtml: { activé: false },
          enrichissement: { activé: true },
          analyse: { activé: true },
        },
      ];
      const lignes = sourceEntriesToLegacyLignes(entries);
      const apecListe = lignes.filter((l) => l.source === 'APEC' && l.type === 'liste html');
      const linkedinEmail = lignes.filter((l) => l.source === 'Linkedin' && l.type === 'email');
      expect(apecListe).toHaveLength(1);
      expect(apecListe[0].emailExpéditeur).toBe('liste html/apec');
      expect(linkedinEmail).toHaveLength(1);
      expect(linkedinEmail[0].emailExpéditeur).toBe('a@l.com');
    });
  });
});
