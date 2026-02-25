/**
 * US-3.11 : Incrément de version semver (major.minor.patch).
 * major = marketing (gros changement), minor = schéma (Airtable, attention), patch = évolution et correction.
 */

export type BumpType = 'major' | 'schema' | 'feature' | 'hotfix';

export function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = parseSemver(current);
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'schema':
      return `${major}.${minor + 1}.0`;
    case 'feature':
    case 'hotfix':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function parseSemver(v: string): [number, number, number] {
  const segments = v.trim().split('.').map((s) => parseInt(s, 10) || 0);
  return [segments[0] ?? 0, segments[1] ?? 0, segments[2] ?? 0];
}
