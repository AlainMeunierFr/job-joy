/**
 * US-3.11 : Incrément de version W.X.Y.Z (major | schema | feature | hotfix).
 */

export type BumpType = 'major' | 'schema' | 'feature' | 'hotfix';

export function bumpVersion(current: string, type: BumpType): string {
  const parts = parseVersion(current);
  switch (type) {
    case 'hotfix':
      return `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3] + 1}`;
    case 'feature':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}.0`;
    case 'schema':
      return `${parts[0]}.${parts[1] + 1}.0.0`;
    case 'major':
      return `${parts[0] + 1}.0.0.0`;
  }
}

function parseVersion(v: string): [number, number, number, number] {
  const segments = v.trim().split('.').map((s) => parseInt(s, 10) || 0);
  return [
    segments[0] ?? 0,
    segments[1] ?? 0,
    segments[2] ?? 0,
    segments[3] ?? 0,
  ];
}
