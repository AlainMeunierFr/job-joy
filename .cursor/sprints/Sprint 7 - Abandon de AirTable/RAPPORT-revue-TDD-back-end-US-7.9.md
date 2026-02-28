# Revue TDD-back-end — US-7.9 (Lister les offres)

**Date** : 2026-02-28  
**Livrable** : Repository vues offres SQLite (table `vues`), module `utils/repository-vues-offres-sqlite.ts`.

## Vérifications

| Critère | Résultat |
|--------|----------|
| **Tests** | 6 tests passent (`repository-vues-offres-sqlite.test.ts`) |
| **Couverture** | 100 % (statements, branches, functions, lines) sur le module |
| **Typecheck** | `npm run typecheck` OK |
| **ESLint** | Projet sans script `lint` dans `package.json` — non applicable (précédent projet) |
| **Périmètre** | Uniquement `utils/` ; aucun code dans `app/` ni `components/` |
| **Baby steps** | Init → create/getById → listAll → updateNom → deleteById, TDD strict respecté |

## Décision

**Validé.** Le livrable est conforme. Suite : délégation TDD-front-end (page Offres, RevoGrid, API liste offres + CRUD vues, step definitions BDD).
