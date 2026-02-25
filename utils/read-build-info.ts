/**
 * Lecture synchrone de la version et de la date de build (package.json + dist/build-info.json).
 * Utilisé par la page À propos et l'email de consentement.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CWD = process.cwd();

export function getVersionEtBuildTime(): { version?: string; buildTime?: string } {
  const result: { version?: string; buildTime?: string } = {};
  try {
    const pkgPath = join(CWD, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      result.version = pkg.version;
    }
    const buildInfoPath = join(CWD, 'dist', 'build-info.json');
    if (existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(readFileSync(buildInfoPath, 'utf-8'));
      result.buildTime = buildInfo.buildTime;
      if (!result.version && buildInfo.version) result.version = buildInfo.version;
    }
  } catch {
    // ignorer
  }
  return result;
}
