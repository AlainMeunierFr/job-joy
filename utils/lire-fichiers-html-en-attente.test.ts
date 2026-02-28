/**
 * Tests US-6.1 : lecture des fichiers .html en attente (racine du dossier, pas sous-dossiers comme "traité").
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  lireFichiersHtmlEnAttente,
  compterFichiersHtmlEnAttente,
} from './lire-fichiers-html-en-attente.js';

describe('lire-fichiers-html-en-attente (US-6.1)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lire-html-attente-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('retourne un tableau vide si le dossier est vide', async () => {
    const result = await lireFichiersHtmlEnAttente(dir);
    expect(result).toEqual([]);
  });

  it('retourne les fichiers .html à la racine avec filePath et content', async () => {
    writeFileSync(join(dir, 'a.html'), '<html>A</html>');
    writeFileSync(join(dir, 'b.html'), '<html>B</html>');
    const result = await lireFichiersHtmlEnAttente(dir);
    expect(result).toHaveLength(2);
    const byName = result.reduce((acc, r) => {
      acc[r.filePath.split(/[/\\]/).pop() ?? ''] = r;
      return acc;
    }, {} as Record<string, { filePath: string; content: string }>);
    expect(byName['a.html'].content).toBe('<html>A</html>');
    expect(byName['b.html'].content).toBe('<html>B</html>');
  });

  it('ignore les fichiers .html dans le sous-dossier "traité"', async () => {
    writeFileSync(join(dir, 'racine1.html'), '<html>R1</html>');
    writeFileSync(join(dir, 'racine2.html'), '<html>R2</html>');
    const traiteDir = join(dir, 'traité');
    mkdirSync(traiteDir, { recursive: true });
    writeFileSync(join(traiteDir, 'deja-traite.html'), '<html>Traite</html>');
    const result = await lireFichiersHtmlEnAttente(dir);
    expect(result).toHaveLength(2);
    const paths = result.map((r) => r.filePath);
    expect(paths.some((p) => p.includes('traité'))).toBe(false);
    expect(result.map((r) => r.content)).toContain('<html>R1</html>');
    expect(result.map((r) => r.content)).toContain('<html>R2</html>');
  });

  it('n\'inclut pas les fichiers non .html', async () => {
    writeFileSync(join(dir, 'seul.html'), '<html>OK</html>');
    writeFileSync(join(dir, 'readme.txt'), 'texte');
    const result = await lireFichiersHtmlEnAttente(dir);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('<html>OK</html>');
  });
});

describe('compterFichiersHtmlEnAttente (US-6.1)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'compter-html-attente-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('retourne 0 si le dossier est vide', async () => {
    const result = await compterFichiersHtmlEnAttente(dir);
    expect(result).toBe(0);
  });

  it('retourne le nombre de fichiers .html en attente à la racine', async () => {
    writeFileSync(join(dir, 'a.html'), '<html>A</html>');
    writeFileSync(join(dir, 'b.html'), '<html>B</html>');
    const result = await compterFichiersHtmlEnAttente(dir);
    expect(result).toBe(2);
  });

  it('ignore les fichiers dans le sous-dossier traité', async () => {
    writeFileSync(join(dir, 'racine.html'), '<html>R</html>');
    mkdirSync(join(dir, 'traité'), { recursive: true });
    writeFileSync(join(dir, 'traité', 'deja.html'), '<html>X</html>');
    const result = await compterFichiersHtmlEnAttente(dir);
    expect(result).toBe(1);
  });
});
