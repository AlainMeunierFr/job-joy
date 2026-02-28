/**
 * US-3.6 : répertoire des données (dev vs packagé Electron).
 * Logique testable pour choisir data dir : cwd/data ou userDataDir si isPackaged.
 */
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

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

/**
 * Répertoire des données pour l’application (serveur, CLI, etc.).
 * Source unique : JOB_JOY_USER_DATA si défini, sinon process.cwd()/data.
 * Les consommateurs de l’API n’ont pas à gérer l’accès aux données.
 */
export function getDataDirForApp(): string {
  if (process.env.BDD_IN_MEMORY_STORE === '1') {
    return resolve(join(tmpdir(), 'job-joy-bdd', String(process.pid)));
  }
  const env = process.env.JOB_JOY_USER_DATA;
  if (env !== undefined && env !== '') {
    return getDataDir({ isPackaged: true, userDataDir: env });
  }
  return getDataDir({ cwd: process.cwd() });
}
