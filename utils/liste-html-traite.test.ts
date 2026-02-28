/**
 * Tests US-6.1 : sous-dossier "traité" et déplacement des fichiers après extraction.
 */
import { mkdtempSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureTraiteDir, deplacerFichierVersTraite } from './liste-html-traite.js';

describe('liste-html-traite (US-6.1)', () => {
  let sourceDir: string;

  beforeEach(() => {
    sourceDir = mkdtempSync(join(tmpdir(), 'liste-html-traite-'));
  });

  afterEach(() => {
    rmSync(sourceDir, { recursive: true, force: true });
  });

  describe('ensureTraiteDir', () => {
    it('crée le sous-dossier traité s\'il est absent et retourne son chemin', async () => {
      const traitePath = await ensureTraiteDir(sourceDir);
      expect(traitePath).toBe(join(sourceDir, 'traité'));
      expect(existsSync(traitePath)).toBe(true);
    });
  });

  describe('deplacerFichierVersTraite', () => {
    it('déplace le fichier vers sourceDir/traité et le retire de la racine', async () => {
      const fichier = join(sourceDir, 'page1.html');
      writeFileSync(fichier, '<html>test</html>');
      await deplacerFichierVersTraite(fichier, sourceDir);
      const traitePath = join(sourceDir, 'traité');
      expect(existsSync(fichier)).toBe(false);
      expect(existsSync(join(traitePath, 'page1.html'))).toBe(true);
    });
  });
});
