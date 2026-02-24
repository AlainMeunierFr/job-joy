/**
 * Tests US-3.6 : répertoire des données (dev vs packagé Electron).
 * getDataDir(options) : cwd/data ou userDataDir si isPackaged.
 */
import { resolve, join } from 'node:path';
import { getDataDir } from './data-dir.js';

describe('data-dir (US-3.6)', () => {
  const cwdFixture = resolve('/fixture/cwd');

  it('sans options → retourne cwd/data (résolu)', () => {
    const result = getDataDir({});
    expect(result).toBe(resolve(join(process.cwd(), 'data')));
  });

  it('options undefined (ex. getDataDir(undefined)) → retourne cwd/data', () => {
    const result = getDataDir(undefined as unknown as Parameters<typeof getDataDir>[0]);
    expect(result).toBe(resolve(join(process.cwd(), 'data')));
  });

  it('avec cwd fourni → retourne cwd/data (résolu)', () => {
    const result = getDataDir({ cwd: cwdFixture });
    expect(result).toBe(resolve(join(cwdFixture, 'data')));
  });

  it('isPackaged true + userDataDir → retourne userDataDir (normalisé, résolu)', () => {
    const userData = resolve('/appdata/job-joy');
    const result = getDataDir({ isPackaged: true, userDataDir: userData });
    expect(result).toBe(userData);
  });

  it('isPackaged true mais userDataDir vide → utilise cwd/data', () => {
    const result = getDataDir({ cwd: cwdFixture, isPackaged: true, userDataDir: '' });
    expect(result).toBe(resolve(join(cwdFixture, 'data')));
  });

  it('isPackaged true mais userDataDir non fourni (undefined) → utilise cwd/data', () => {
    const result = getDataDir({ cwd: cwdFixture, isPackaged: true });
    expect(result).toBe(resolve(join(cwdFixture, 'data')));
  });

  it('isPackaged false avec userDataDir fourni → ignore userDataDir et retourne cwd/data', () => {
    const result = getDataDir({
      cwd: cwdFixture,
      isPackaged: false,
      userDataDir: '/other/appdata',
    });
    expect(result).toBe(resolve(join(cwdFixture, 'data')));
  });

  it('chemin relatif en userDataDir → résultat absolu', () => {
    const result = getDataDir({
      isPackaged: true,
      userDataDir: 'subdir/user-data',
    });
    expect(result).toBe(resolve('subdir/user-data'));
  });

  it('chemin relatif en cwd → résultat absolu', () => {
    const result = getDataDir({ cwd: 'relative/cwd' });
    expect(result).toBe(resolve(join('relative/cwd', 'data')));
  });
});
