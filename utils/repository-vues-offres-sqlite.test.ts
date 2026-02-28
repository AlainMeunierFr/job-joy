/**
 * US-7.9 (CA6) : tests TDD pour le repository vues offres SQLite (table vues).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initVuesOffresRepository } from './repository-vues-offres-sqlite.js';

describe('repository-vues-offres-sqlite', () => {
  describe('init', () => {
    it('crée la table vues si elle n\'existe pas (PRAGMA table_info) ; listAll vide', () => {
      const repo = initVuesOffresRepository(':memory:');
      expect(repo).toBeDefined();
      const info = repo.getTableInfo();
      expect(info).toBeDefined();
      expect(info.some((c) => c.name === 'id')).toBe(true);
      expect(info.some((c) => c.name === 'nom')).toBe(true);
      expect(info.some((c) => c.name === 'parametrage')).toBe(true);
      expect(repo.listAll()).toEqual([]);
    });

    it('avec dbPath fichier crée le répertoire si besoin et la table vues', () => {
      const dir = mkdtempSync(join(tmpdir(), 'vues-offres-sqlite-'));
      const dbPath = join(dir, 'offres.db');
      const repo = initVuesOffresRepository(dbPath);
      expect(repo.getTableInfo().some((c) => c.name === 'id')).toBe(true);
      expect(repo.listAll()).toEqual([]);
      repo.close();
      rmSync(dir, { recursive: true });
    });
  });

  describe('create et getById', () => {
    it('create(nom, parametrage) insère une ligne et retourne l\'id (UUID) ; getById retourne la vue', () => {
      const repo = initVuesOffresRepository(':memory:');
      const parametrage = { ordreColonnes: ['Poste', 'Entreprise'], filtre: {} };
      const id = repo.create('Ma vue', parametrage);
      expect(id).toBeDefined();
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
      const vue = repo.getById(id);
      expect(vue).not.toBeNull();
      expect(vue!.id).toBe(id);
      expect(vue!.nom).toBe('Ma vue');
      expect(JSON.parse(vue!.parametrage)).toEqual(parametrage);
      repo.close();
    });
  });

  describe('listAll', () => {
    it('listAll vide puis create une vue ; listAll retourne un tableau avec un élément', () => {
      const repo = initVuesOffresRepository(':memory:');
      expect(repo.listAll()).toEqual([]);
      const id = repo.create('Vue A', { tri: 'Poste' });
      const list = repo.listAll();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(id);
      expect(list[0].nom).toBe('Vue A');
      expect(list[0].parametrage).toBe(JSON.stringify({ tri: 'Poste' }));
      repo.close();
    });
  });

  describe('updateNom', () => {
    it('create, updateNom, getById retourne le nouveau nom', () => {
      const repo = initVuesOffresRepository(':memory:');
      const id = repo.create('Ancien nom', {});
      repo.updateNom(id, 'Nouveau nom');
      const vue = repo.getById(id);
      expect(vue).not.toBeNull();
      expect(vue!.nom).toBe('Nouveau nom');
      expect(vue!.parametrage).toBe(JSON.stringify({}));
      repo.close();
    });
  });

  describe('deleteById', () => {
    it('create, deleteById, getById retourne null et listAll ne contient plus la vue', () => {
      const repo = initVuesOffresRepository(':memory:');
      const id = repo.create('Vue à supprimer', { x: 1 });
      expect(repo.getById(id)).not.toBeNull();
      expect(repo.listAll()).toHaveLength(1);
      repo.deleteById(id);
      expect(repo.getById(id)).toBeNull();
      expect(repo.listAll()).toEqual([]);
      repo.close();
    });
  });
});
