/**
 * US-7.2 : tests TDD pour sources-io (lecture/écriture data/sources.json).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lireSources, ecrireSources } from './sources-io.js';

describe('sources-io', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'sources-io-'));
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  describe('lireSources', () => {
    it('retourne une liste initiale (sources par défaut) quand le fichier est absent', async () => {
      const sources = await lireSources(dataDir);
      expect(Array.isArray(sources)).toBe(true);
      const noms = sources.map((s) => s.source);
      expect(noms).toContain('Linkedin');
      expect(noms).toContain('HelloWork');
      expect(noms).toContain('Welcome to the Jungle');
      expect(noms).toContain('Job That Make Sense');
      expect(noms).toContain('Cadre Emploi');
      expect(sources.length).toBeGreaterThanOrEqual(5);
    });

    it('après ecrireSources avec une source (id), lireSources retourne cette source', async () => {
      const uneSource = {
        id: 'src-test-1',
        emailExpéditeur: 'test@example.com',
        source: 'Inconnu' as const,
        type: 'email' as const,
        activerCreation: false,
        activerEnrichissement: false,
        activerAnalyseIA: true,
      };
      await ecrireSources(dataDir, [uneSource]);
      const relu = await lireSources(dataDir);
      expect(relu).toHaveLength(1);
      expect(relu[0]).toEqual(uneSource);
    });

    it('écrit plusieurs sources, relit : les ids sont présents et l’ordre conservé', async () => {
      const sources = [
        {
          id: 'id-a',
          emailExpéditeur: 'a@test.com',
          source: 'Linkedin' as const,
          type: 'email' as const,
          activerCreation: true,
          activerEnrichissement: true,
          activerAnalyseIA: true,
        },
        {
          id: 'id-b',
          emailExpéditeur: 'b@test.com',
          source: 'HelloWork' as const,
          type: 'email' as const,
          activerCreation: true,
          activerEnrichissement: false,
          activerAnalyseIA: false,
        },
      ];
      await ecrireSources(dataDir, sources);
      const relu = await lireSources(dataDir);
      expect(relu).toHaveLength(2);
      expect(relu[0].id).toBe('id-a');
      expect(relu[1].id).toBe('id-b');
      expect(relu[0].emailExpéditeur).toBe('a@test.com');
      expect(relu[1].emailExpéditeur).toBe('b@test.com');
    });

    it('accepte un fichier au format { "sources": [ ... ] }', async () => {
      const path = join(dataDir, 'sources.json');
      const { writeFile } = await import('node:fs/promises');
      await writeFile(
        path,
        JSON.stringify({
          sources: [
            {
              id: 'src-wrapped',
              emailExpéditeur: 'wrapped@test.com',
              source: 'Inconnu',
              type: 'email',
              activerCreation: false,
              activerEnrichissement: false,
              activerAnalyseIA: true,
            },
          ],
        }),
        'utf-8'
      );
      const relu = await lireSources(dataDir);
      expect(relu).toHaveLength(1);
      expect(relu[0].id).toBe('src-wrapped');
      expect(relu[0].emailExpéditeur).toBe('wrapped@test.com');
    });

    it('fichier JSON invalide → liste par défaut', async () => {
      const path = join(dataDir, 'sources.json');
      const { writeFile } = await import('node:fs/promises');
      await writeFile(path, 'not valid json {', 'utf-8');
      const relu = await lireSources(dataDir);
      expect(relu.length).toBeGreaterThanOrEqual(5);
      expect(relu.map((s) => s.source)).toContain('Linkedin');
    });
  });
});
