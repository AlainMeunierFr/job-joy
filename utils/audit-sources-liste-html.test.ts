/**
 * Tests US-6.1 : création des sources manquantes pour les dossiers "liste html".
 */
import type { SourceEmail } from './gouvernance-sources-emails.js';
import {
  creerSourcesManquantesPourListeHtml,
  normaliserCheminListeHtml,
} from './audit-sources-liste-html.js';

describe('audit-sources-liste-html (US-6.1)', () => {
  describe('normaliserCheminListeHtml', () => {
    it('normalise les backslashes en slashes et trim', () => {
      expect(normaliserCheminListeHtml('  data\\liste html\\apec  ')).toBe('data/liste html/apec');
    });

    it('conserve les slashes avant', () => {
      expect(normaliserCheminListeHtml('data/liste html/apec')).toBe('data/liste html/apec');
    });
  });

  describe('creerSourcesManquantesPourListeHtml', () => {
    it('ne crée aucune source si aucun sous-dossier liste html', async () => {
      const creerSource = jest.fn();
      const result = await creerSourcesManquantesPourListeHtml({
        dataDir: '/tmp',
        listerDossiers: jest.fn().mockResolvedValue([]),
        getSourceDir: jest.fn(),
        sourcesExistantes: [],
        creerSource,
      });
      expect(result.nbCreees).toBe(0);
      expect(result.creees).toEqual([]);
      expect(creerSource).not.toHaveBeenCalled();
    });

    it('crée une source par dossier sans source existante (type liste html) ; slug apec → source APEC (CA3)', async () => {
      const creerSource = jest.fn().mockImplementation(async (s: SourceEmail) => ({
        sourceId: 'rec_' + s.emailExpéditeur.replace(/\//g, '_'),
        ...s,
      }));
      const getSourceDir = (dataDir: string, slug: string) =>
        `${dataDir}/liste html/${slug}`;
      const result = await creerSourcesManquantesPourListeHtml({
        dataDir: '/base/data',
        listerDossiers: jest.fn().mockResolvedValue(['apec']),
        getSourceDir,
        sourcesExistantes: [],
        creerSource,
      });
      expect(result.nbCreees).toBe(1);
      expect(result.creees).toHaveLength(1);
      expect(creerSource).toHaveBeenCalledTimes(1);
      const call = creerSource.mock.calls[0][0];
      expect(call.emailExpéditeur).toBe('liste html/apec');
      expect(call.source).toBe('APEC');
      expect(call.type).toBe('liste html');
      expect(call.activerCreation).toBe(true);
      expect(call.activerEnrichissement).toBe(false);
      expect(call.activerAnalyseIA).toBe(true);
    });

    it('CA3: slug inconnu → source Inconnu', async () => {
      const creerSource = jest.fn().mockImplementation(async (s: SourceEmail) => ({
        sourceId: 'rec_' + s.emailExpéditeur.replace(/\//g, '_'),
        ...s,
      }));
      const result = await creerSourcesManquantesPourListeHtml({
        dataDir: '/base/data',
        listerDossiers: jest.fn().mockResolvedValue(['mon-dossier-custom']),
        getSourceDir: (dataDir: string, slug: string) => `${dataDir}/liste html/${slug}`,
        sourcesExistantes: [],
        creerSource,
      });
      expect(result.nbCreees).toBe(1);
      const call = creerSource.mock.calls[0][0];
      expect(call.emailExpéditeur).toBe('liste html/mon-dossier-custom');
      expect(call.source).toBe('Inconnu');
    });

    it('ne crée pas de source si une source existe déjà pour ce chemin', async () => {
      const creerSource = jest.fn();
      const result = await creerSourcesManquantesPourListeHtml({
        dataDir: '/base/data',
        listerDossiers: jest.fn().mockResolvedValue(['apec']),
        getSourceDir: (dataDir: string, slug: string) => `${dataDir}/liste html/${slug}`,
        sourcesExistantes: [{ emailExpéditeur: 'liste html/apec' }],
        creerSource,
      });
      expect(result.nbCreees).toBe(0);
      expect(creerSource).not.toHaveBeenCalled();
    });

    it('ne crée pas de source si une source existe déjà avec chemin absolu (déduplication par adresse relative)', async () => {
      const creerSource = jest.fn();
      const result = await creerSourcesManquantesPourListeHtml({
        dataDir: 'c:/dev/job-joy/data',
        listerDossiers: jest.fn().mockResolvedValue(['apec']),
        getSourceDir: (dataDir: string, slug: string) => `${dataDir}/liste html/${slug}`,
        sourcesExistantes: [{ emailExpéditeur: 'c:/dev/job-joy/data/liste html/apec' }],
        creerSource,
      });
      expect(result.nbCreees).toBe(0);
      expect(creerSource).not.toHaveBeenCalled();
    });

    it('crée une source par dossier quand deux dossiers et aucune source existante', async () => {
      const creerSource = jest.fn().mockImplementation(async (s: SourceEmail) => ({
        sourceId: 'rec_' + s.emailExpéditeur.replace(/\//g, '_'),
        ...s,
      }));
      const getSourceDir = (dataDir: string, slug: string) =>
        `${dataDir}/liste html/${slug}`;
      const result = await creerSourcesManquantesPourListeHtml({
        dataDir: '/base/data',
        listerDossiers: jest.fn().mockResolvedValue(['apec', 'autre']),
        getSourceDir,
        sourcesExistantes: [],
        creerSource,
      });
      expect(result.nbCreees).toBe(2);
      expect(creerSource).toHaveBeenCalledTimes(2);
      const paths = creerSource.mock.calls.map((c) => c[0].emailExpéditeur);
      expect(paths).toContain('liste html/apec');
      expect(paths).toContain('liste html/autre');
      expect(paths.some((p) => p.endsWith('autre'))).toBe(true);
    });
  });
});
