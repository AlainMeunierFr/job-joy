/**
 * US-3.6 : répertoire des données (dev vs packagé Electron).
 * Logique testable pour choisir data dir : cwd/data ou userDataDir si isPackaged.
 */
import { join, resolve } from 'node:path';

export type DataDirOptions = {
  cwd?: string;
  userDataDir?: string;
  isPackaged?: boolean;
};

/**
 * Retourne le répertoire des données (absolu).
 * - Si isPackaged === true et userDataDir fourni → userDataDir (résolu).
 * - Sinon → join(cwd ?? process.cwd(), 'data') (résolu).
 */
export function getDataDir(options: DataDirOptions = {}): string {
  const { cwd, userDataDir, isPackaged } = options ?? {};
  if (isPackaged === true && userDataDir !== undefined && userDataDir !== '') {
    return resolve(userDataDir);
  }
  const base = cwd ?? process.cwd();
  return resolve(join(base, 'data'));
}
