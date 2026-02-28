/**
 * US-7.2 : tests TDD pour le driver sources JSON (même interface que Airtable sources).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSourcesJsonDriver } from './sources-json-driver.js';
import { lireSources } from './sources-io.js';

describe('sources-json-driver', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'sources-json-driver-'));
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  describe('createSourcesJsonDriver', () => {
    it('listerSources retourne les mêmes données que lireSources (forme SourceEmail + sourceId)', async () => {
      const driver = createSourcesJsonDriver(dataDir);
      const viaDriver = await driver.listerSources();
      const viaIo = await lireSources(dataDir);
      expect(viaDriver).toHaveLength(viaIo.length);
      for (let i = 0; i < viaIo.length; i++) {
        expect(viaDriver[i]).toMatchObject({
          sourceId: viaIo[i].id,
          emailExpéditeur: viaIo[i].emailExpéditeur,
          source: viaIo[i].source,
          type: viaIo[i].type,
          activerCreation: viaIo[i].activerCreation,
          activerEnrichissement: viaIo[i].activerEnrichissement,
          activerAnalyseIA: viaIo[i].activerAnalyseIA,
        });
      }
    });

    it('creerSource ajoute une entrée (id généré), persiste et retourne l’objet avec sourceId', async () => {
      const driver = createSourcesJsonDriver(dataDir);
      const avant = await driver.listerSources();
      const created = await driver.creerSource({
        emailExpéditeur: 'new@example.com',
        source: 'Inconnu',
        type: 'email',
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      });
      expect(created.sourceId).toBeDefined();
      expect(created.emailExpéditeur).toBe('new@example.com');
      expect(created.source).toBe('Inconnu');
      const apres = await driver.listerSources();
      expect(apres).toHaveLength(avant.length + 1);
      const trouve = apres.find((s) => s.sourceId === created.sourceId);
      expect(trouve).toEqual(created);
    });

    it('mettreAJourSource met à jour l’entrée par id et persiste', async () => {
      const driver = createSourcesJsonDriver(dataDir);
      const created = await driver.creerSource({
        emailExpéditeur: 'patch@example.com',
        source: 'Linkedin',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: true,
      });
      await driver.mettreAJourSource(created.sourceId, { activerCreation: false });
      const apres = await driver.listerSources();
      const trouve = apres.find((s) => s.sourceId === created.sourceId);
      expect(trouve).toBeDefined();
      expect(trouve!.activerCreation).toBe(false);
      expect(trouve!.activerEnrichissement).toBe(true);
      expect(trouve!.source).toBe('Linkedin');
    });

    it('mettreAJourSource peut patcher type et activerEnrichissement', async () => {
      const driver = createSourcesJsonDriver(dataDir);
      const created = await driver.creerSource({
        emailExpéditeur: 'type-patch@example.com',
        source: 'APEC',
        type: 'email',
        activerCreation: true,
        activerEnrichissement: true,
        activerAnalyseIA: false,
      });
      await driver.mettreAJourSource(created.sourceId, {
        type: 'liste html',
        activerEnrichissement: false,
      });
      const apres = await driver.listerSources();
      const trouve = apres.find((s) => s.sourceId === created.sourceId);
      expect(trouve!.type).toBe('liste html');
      expect(trouve!.activerEnrichissement).toBe(false);
    });

    it('mettreAJourSource avec sourceId inconnu ne modifie pas la liste', async () => {
      const driver = createSourcesJsonDriver(dataDir);
      const avant = await driver.listerSources();
      await driver.mettreAJourSource('id-inexistant', { activerCreation: false });
      const apres = await driver.listerSources();
      expect(apres).toEqual(avant);
    });
  });
});
