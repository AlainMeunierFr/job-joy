/**
 * Lecture synchrone de la version et de la date de build (package.json + dist/build-info.json).
 * Utilisé par la page À propos et l'email de consentement.
 * @param appRoot - Racine de l'app (ex. __dirname/../.. en packagé) ; si omis, process.cwd().
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function getVersionEtBuildTime(appRoot?: string): {
  version?: string;
  buildTime?: string;
  preprod?: boolean;
} {
  const base = appRoot ?? process.cwd();
  const result: { version?: string; buildTime?: string; preprod?: boolean } = {};
  try {
    const pkgPath = join(base, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      result.version = pkg.version;
    }
    const buildInfoPath = join(base, 'dist', 'build-info.json');
    if (existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(readFileSync(buildInfoPath, 'utf-8'));
      result.buildTime = buildInfo.buildTime;
      if (!result.version && buildInfo.version) result.version = buildInfo.version;
      if (buildInfo.channel === 'preprod') result.preprod = true;
    }
  } catch {
    // ignorer
  }
  return result;
}
