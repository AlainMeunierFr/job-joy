/**
 * Tests US-6.1 : chemins dossier "liste html" et sous-dossiers par source.
 * getListeHtmlDir(dataDir), getListeHtmlSourceDir(dataDir, sourceSlug), listerDossiersSourceListeHtml.
 */
import { join } from 'node:path';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  getListeHtmlDir,
  getListeHtmlSourceDir,
  getListeHtmlAdresseRelative,
  toFullPathListeHtml,
  listerDossiersSourceListeHtml,
} from './liste-html-paths.js';

describe('liste-html-paths (US-6.1)', () => {
  it('getListeHtmlDir retourne join(dataDir, "liste html")', () => {
    const dataDir = join('/base', 'data');
    expect(getListeHtmlDir(dataDir)).toBe(join('/base', 'data', 'liste html'));
  });

  it('getListeHtmlDir avec dataDir relatif normalise le chemin', () => {
    const dataDir = 'data';
    const result = getListeHtmlDir(dataDir);
    expect(result).toBe(join('data', 'liste html'));
  });

  it('getListeHtmlSourceDir retourne .../liste html/<sourceSlug>', () => {
    const dataDir = join('/base', 'data');
    expect(getListeHtmlSourceDir(dataDir, 'apec')).toBe(
      join('/base', 'data', 'liste html', 'apec')
    );
  });

  it('getListeHtmlSourceDir avec sourceSlug différent', () => {
    const dataDir = join('/base', 'data');
    expect(getListeHtmlSourceDir(dataDir, 'autre-plugin')).toBe(
      join('/base', 'data', 'liste html', 'autre-plugin')
    );
  });

  it('getListeHtmlAdresseRelative retourne "liste html/<slug>" (US-6.2)', () => {
    expect(getListeHtmlAdresseRelative('apec')).toBe('liste html/apec');
    expect(getListeHtmlAdresseRelative('autre')).toBe('liste html/autre');
  });

  it('toFullPathListeHtml convertit adresse relative en chemin absolu (US-6.2)', () => {
    const dataDir = join('/base', 'data');
    expect(toFullPathListeHtml(dataDir, 'liste html/apec')).toBe(
      join('/base', 'data', 'liste html', 'apec')
    );
  });
});

describe('listerDossiersSourceListeHtml (US-6.1)', () => {
  it('retourne [] si le dossier "liste html" n\'existe pas', async () => {
    const dataDir = join(tmpdir(), 'job-joy-inexistant-' + Date.now());
    const result = await listerDossiersSourceListeHtml(dataDir);
    expect(result).toEqual([]);
  });

  it('retourne les noms des sous-dossiers (ex. apec), exclut "traité" à la racine', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'job-joy-liste-html-'));
    try {
      const listeHtmlDir = join(tmp, 'liste html');
      await mkdir(listeHtmlDir, { recursive: true });
      await mkdir(join(listeHtmlDir, 'apec'), { recursive: true });
      await mkdir(join(listeHtmlDir, 'traité'), { recursive: true });
      await mkdir(join(listeHtmlDir, 'autre'), { recursive: true });
      const dataDir = tmp;
      const result = await listerDossiersSourceListeHtml(dataDir);
      expect(result.sort()).toEqual(['apec', 'autre']);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('retourne uniquement les répertoires (ignore les fichiers)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'job-joy-liste-html-'));
    try {
      const listeHtmlDir = join(tmp, 'liste html');
      await mkdir(listeHtmlDir, { recursive: true });
      await mkdir(join(listeHtmlDir, 'apec'), { recursive: true });
      const { writeFile } = await import('node:fs/promises');
      await writeFile(join(listeHtmlDir, 'fichier.txt'), '');
      const result = await listerDossiersSourceListeHtml(tmp);
      expect(result).toEqual(['apec']);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
