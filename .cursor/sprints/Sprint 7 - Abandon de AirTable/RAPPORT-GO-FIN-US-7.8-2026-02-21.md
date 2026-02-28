# Rapport GO FIN — US-7.8 : Reprise des données Airtable vers SQLite

**Date** : 2026-02-21  
**US** : US-7.8 (Sprint 7 — Abandon de AirTable)  
**Mode** : GO FIN.

---

## 1. Synthèse

| Étape            | Statut   | Livrable principal |
|------------------|----------|---------------------|
| BDD              | ✅ Fait  | tests/bdd/reprise-offres-airtable-vers-sqlite-us-7-8.feature |
| TDD-back-end     | ✅ Fait  | utils/reprise-offres-airtable-vers-sqlite.ts, scripts/import-offres-airtable-vers-sqlite.ts, upsert par UID dans repository |
| Revue Lead Dev   | ✅ Fait  | Livraison cohérente avec US-7.8 |

**Done** : Script de reprise opérationnel ; lecture Airtable (pagination), mapping vers SQLite, idempotence par UID (record ID Airtable = id SQLite). Commande : `npm run import:offres-airtable-vers-sqlite` (option `--dry-run`).

---

## 2. Réalisations

- **utils/reprise-offres-airtable-vers-sqlite.ts** : reprendreOffresAirtableVersSqlite({ apiKey, baseId, offresId, repository, fetchFn? }) ; pagination (pageSize 100, offset) ; mapping champs Airtable → OffreRow ; id = record.id pour idempotence ; retour { ok, message } en erreur.
- **utils/repository-offres-sqlite.ts** : upsert par id si fourni (mise à jour si ligne existe), sinon par id_offre/URL.
- **scripts/import-offres-airtable-vers-sqlite.ts** : lecture config Airtable (parametres.json), init repository data/offres.sqlite, appel reprise ; --dry-run.
- **package.json** : script import:offres-airtable-vers-sqlite.
- **Tests** : reprise-offres-airtable-vers-sqlite.test.ts (mock fetch, pagination, mapping, idempotence, erreur 503, lecture seule).

---

## 3. Tunnel GO FIN 7.6 / 7.7 / 7.8

Les trois US sont livrées. Vérifications recommandées côté utilisateur : `npm run typecheck`, `npm run test`, `npm run import:offres-airtable-vers-sqlite -- --dry-run` (avec config Airtable renseignée pour la reprise réelle).
