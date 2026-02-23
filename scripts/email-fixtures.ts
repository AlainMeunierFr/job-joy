import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_FIXTURES_PER_SOURCE = 3;

function sanitizeSourceName(value: string): string {
  const s = (value ?? '').trim() || 'Source-inconnue';
  return s
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function countHtmlFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.html')).length;
}

export function createAutoFixtureHook(baseDir = join(process.cwd(), 'tests', 'exemples')): (email: {
  sourceNom: string;
  index: number;
  total: number;
  html: string;
}) => void {
  return ({ sourceNom, index, total, html }) => {
    const sourceDir = join(baseDir, sanitizeSourceName(sourceNom));
    const existingCount = countHtmlFiles(sourceDir);
    if (existingCount >= MAX_FIXTURES_PER_SOURCE) return;

    mkdirSync(sourceDir, { recursive: true });
    const seq = String(existingCount + 1).padStart(2, '0');
    const name = `${seq}-email-${index}-of-${total}.html`;
    const fullPath = join(sourceDir, name);
    writeFileSync(fullPath, html ?? '', 'utf-8');
    console.log(`Fixture source ajoutée: ${fullPath}`);
  };
}
