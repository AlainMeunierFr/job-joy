/**
 * US-7.6 : tests TDD pour le repository offres SQLite (schéma aligné Airtable).
 */
import { initOffresRepository, _coerceNumericCol } from './repository-offres-sqlite.js';

describe('repository-offres-sqlite', () => {
  describe('init', () => {
    it('crée la base et la table offres en mémoire (PRAGMA table_info)', () => {
      const repo = initOffresRepository(':memory:');
      expect(repo).toBeDefined();
      const info = repo.getTableInfo();
      expect(info).toBeDefined();
      expect(info.some((c) => c.name === 'id')).toBe(true);
      expect(info.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('schéma : colonne UID', () => {
    it('table offres a id TEXT PRIMARY KEY ; insert puis SELECT retourne la ligne', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id: 'test-1', id_offre: 'X', url: 'https://x.com/1' });
      const rows = repo.getAll();
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('test-1');
      expect(rows[0].id_offre).toBe('X');
      expect(rows[0].url).toBe('https://x.com/1');
    });
  });

  describe('attribution automatique UID', () => {
    it('insert sans id génère un UID unique non vide', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id_offre: 'O1', url: 'https://exemple.com/o1' });
      const rows = repo.getAll();
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBeDefined();
      expect(rows[0].id).not.toBe('');
      expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/i);
      repo.insert({ id_offre: 'O2', url: 'https://exemple.com/o2' });
      const rows2 = repo.getAll();
      expect(rows2).toHaveLength(2);
      expect(rows2[0].id).not.toBe(rows2[1].id);
    });
  });

  describe('upsert par Id offre', () => {
    it('insert puis upsert même id_offre met à jour (une seule ligne, Poste = Lead Dev)', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id_offre: 'U1', url: 'https://u.com/1', Poste: 'Ingénieur' });
      repo.upsert({ id_offre: 'U1', url: 'https://u.com/1', Poste: 'Lead Dev' });
      const rows = repo.getAll();
      expect(rows).toHaveLength(1);
      expect(rows[0].Poste).toBe('Lead Dev');
      expect(rows[0].id_offre).toBe('U1');
    });
  });

  describe('upsert par URL', () => {
    it('upsert par URL puis même URL avec Statut met à jour (une seule ligne, Statut = Importée)', () => {
      const repo = initOffresRepository(':memory:');
      repo.upsert({ url: 'https://wttj.com/42', id_offre: 'W42', source: 'Welcome to the Jungle' });
      repo.upsert({ url: 'https://wttj.com/42', Statut: 'Importée' });
      const rows = repo.getAll();
      expect(rows).toHaveLength(1);
      expect(rows[0].Statut).toBe('Importée');
      expect(rows[0].url).toBe('https://wttj.com/42');
      expect(rows[0].id_offre).toBe('W42');
    });
  });

  describe('mise à jour partielle par UID', () => {
    it('updateById ne modifie que les champs fournis (Statut mis à jour, Poste inchangé)', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id: 'uid-1', id_offre: 'X', url: 'https://x.com/1', Poste: 'Dev', Statut: 'À importer' });
      repo.updateById('uid-1', { Statut: 'Importée' });
      const offre = repo.getById('uid-1');
      expect(offre).not.toBeNull();
      expect(offre!.Statut).toBe('Importée');
      expect(offre!.Poste).toBe('Dev');
    });
  });

  describe('requête par statut', () => {
    it('getByStatut retourne uniquement les offres avec le statut demandé', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id_offre: 'A', url: 'https://a.com/1', Statut: 'À importer' });
      repo.insert({ id_offre: 'B', url: 'https://b.com/1', Statut: 'Importée' });
      const aImporter = repo.getByStatut('À importer');
      expect(aImporter).toHaveLength(1);
      expect(aImporter[0].Statut).toBe('À importer');
      expect(aImporter[0].id_offre).toBe('A');
    });
  });

  describe('requête par source', () => {
    it('getBySource retourne uniquement les offres de la source demandée', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id_offre: 'A', url: 'https://a.com/1', source: 'APEC' });
      repo.insert({ id_offre: 'B', url: 'https://b.com/1', source: 'Linkedin' });
      const apec = repo.getBySource('APEC');
      expect(apec).toHaveLength(1);
      expect(apec[0].source).toBe('APEC');
      expect(apec[0].id_offre).toBe('A');
    });
  });

  describe('get par UID', () => {
    it('getById retourne l\'offre avec le bon UID', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id: 'recXYZ', id_offre: 'X', url: 'https://x.com/1', Poste: 'Data Engineer' });
      const offre = repo.getById('recXYZ');
      expect(offre).not.toBeNull();
      expect(offre!.id).toBe('recXYZ');
      expect(offre!.Poste).toBe('Data Engineer');
    });
  });

  describe('suppression par UID', () => {
    it('deleteById retire l\'offre ; getById retourne null', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({ id: 'del-1', id_offre: 'D', url: 'https://d.com/1' });
      repo.deleteById('del-1');
      const offre = repo.getById('del-1');
      expect(offre).toBeNull();
    });
  });

  describe('persistance de tous les champs métier', () => {
    it('insert avec sous-ensemble de champs (Poste, Résumé, Score_Total, CritèreRéhibitoire1) relus à l’identique', () => {
      const repo = initOffresRepository(':memory:');
      repo.insert({
        id_offre: 'M1',
        url: 'https://m.com/1',
        Poste: 'Dev Full Stack',
        Résumé: 'Résumé court',
        Score_Total: 72,
        CritèreRéhibitoire1: 'Non',
      });
      const rows = repo.getAll();
      expect(rows).toHaveLength(1);
      expect(rows[0].Poste).toBe('Dev Full Stack');
      expect(rows[0].Résumé).toBe('Résumé court');
      expect(rows[0].Score_Total).toBe(72);
      expect(rows[0].CritèreRéhibitoire1).toBe('Non');
    });
  });

  describe('_coerceNumericCol', () => {
    it('convertit une valeur string en number pour une colonne score', () => {
      expect(_coerceNumericCol('Score_Total', '72.0')).toBe(72);
      expect(_coerceNumericCol('ScoreCritère1', '20')).toBe(20);
    });
    it('laisse la valeur inchangée pour colonne non numérique ou déjà number', () => {
      expect(_coerceNumericCol('Poste', 'Dev')).toBe('Dev');
      expect(_coerceNumericCol('Score_Total', 75)).toBe(75);
    });
  });

  describe('création automatique du fichier', () => {
    it('init avec chemin réel crée le fichier (et le répertoire si besoin)', async () => {
      const { mkdtempSync, rmSync, existsSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { tmpdir } = await import('node:os');
      const dir = mkdtempSync(join(tmpdir(), 'offres-sqlite-'));
      const dbPath = join(dir, 'data', 'offres.sqlite');
      const repo = initOffresRepository(dbPath);
      expect(existsSync(dbPath)).toBe(true);
      repo.close();
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
