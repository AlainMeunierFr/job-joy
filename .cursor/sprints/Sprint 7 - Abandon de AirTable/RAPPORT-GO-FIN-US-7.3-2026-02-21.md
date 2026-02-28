# Rapport GO FIN — US-7.3 : Refactoriser une entrée par source dans les données

**Date** : 2026-02-21  
**US** : US-7.3 (Sprint 7)  
**Objectif** : Une entrée par source (nom canonique) dans `sources.json`, avec creationEmail (activé, emails[]), creationListeHtml (activé), enrichissement (activé), analyse (activé). Liste html dérivée en code. Services (audit, traitement, tableau de bord) utilisent la nouvelle structure.

---

## 1. Synthèse

| Étape            | Statut   | Livrable principal |
|------------------|----------|---------------------|
| BDD              | ✅ Fait  | `tests/bdd/sources-une-entree-par-source.feature` (14 scénarios CA1–CA6) |
| TDD-back-end     | ✅ Fait  | `utils/sources-v2.ts`, driver V2, adaptateur legacy, tests unitaires |
| TDD-front-end    | ✅ Fait  | Câblage app/scripts sur V2 + adaptateur legacy, une ligne par source au tableau |
| Designer         | ⏭ Non requis | Aucun nouveau composant UI (refactor données/API uniquement) |
| Revue / DONE     | ✅ Fait  | Typecheck OK, tests unitaires et intégration OK |

---

## 2. Réalisations détaillées

### 2.1 BDD
- **Fichier** : `tests/bdd/sources-une-entree-par-source.feature`
- **Contenu** : 14 scénarios Gherkin (CA1 schéma, CA2 init sans migration, CA3 initialisation + emails en code, CA4 listSources/getSource/updateSource + tableau une ligne par source + audit, CA5 liste canonique + dérivation liste html, CA6 pas de doublons).
- **Steps** : Step definitions dans `tests/bdd/sources-une-entree-par-source.steps.ts` (s’appuient sur `sources-v2.js` et API tableau-synthese-offres).

### 2.2 TDD-back-end (utils)
- **`utils/sources-v2.ts`** :
  - Types : `SourceEntry`, `SOURCES_NOMS_CANONIQUES` (avec Externatic, Talent.io).
  - `getCheminListeHtmlPourSource(nom)` : dérivation 1:1 nom → chemin liste html.
  - `lireSourcesV2(dataDir)` / `ecrireSourcesV2(dataDir, entries)` : lecture/écriture schéma V2, déduplication par `source` au chargement.
  - `getSourcesParDefautV2()` : une entrée par source canonique, tout activé, emails en code (WTTJ, Linkedin, JTMS, HelloWork, Cadre Emploi).
  - `createSourcesV2Driver(dataDir)` : `listSources()`, `getSource(nom)`, `updateSource(nom, patch)`.
  - `sourceEntriesToLegacyLignes(entries)` : adaptateur SourceEntry[] → lignes legacy (une par email + une par liste html).
- **`utils/gouvernance-sources-emails.ts`** : `SourceNom` étendu avec Externatic, Talent.io.
- **`scripts/sources-v2-legacy-adapter.ts`** : `createSourcesLegacyAdapterFromV2(dataDir)` expose l’interface legacy (listerSources, creerSource, mettreAJourSource) à partir du driver V2.

### 2.3 TDD-front-end (app / scripts)
- **`app/api-handlers.ts`** :
  - GET tableau-synthese-offres : utilise `createSourcesV2Driver(dataDir)`, `listSources()`, `sourceEntriesToLegacyLignes(entries)` pour alimenter `produireTableauSynthese`, puis `agregerLignesParSource(lignes, statutsOrdre)` pour **une ligne par source** dans la réponse.
  - Suppression de l’import inutilisé `createSourcesJsonDriver`.
- **`scripts/run-audit-sources.ts`** : utilise `createSourcesLegacyAdapterFromV2(dir)` comme driver gouvernance (au lieu de l’ancien driver JSON).
- **`scripts/run-traitement.ts`** : utilise `createSourcesLegacyAdapterFromV2` (déjà câblé) pour la partie sources.

---

## 3. Vérifications effectuées

- **Typecheck** : `npm run typecheck` ✅
- **Tests unitaires** : `utils/sources-v2.test.ts`, `utils/gouvernance-sources-emails.test.ts`, `utils/tableau-synthese-offres.test.ts` ✅ (60 tests)
- **Tests intégration** : `utils/run-audit-sources.integration.test.ts` ✅ (12 tests)
- **Lint** : pas de script `lint` dans le projet ; aucun changement signalé par les linters sur les fichiers modifiés.
- **BDD** : Les step definitions pour `sources-une-entree-par-source.feature` sont en place. La commande globale `npm run test:bdd` échoue à cause d’étapes manquantes dans **d’autres** features (hors US-7.3), pas à cause des scénarios US-7.3.

---

## 4. Fichiers modifiés / ajoutés

| Fichier | Action |
|---------|--------|
| `tests/bdd/sources-une-entree-par-source.feature` | Créé (BDD) |
| `tests/bdd/sources-une-entree-par-source.steps.ts` | Créé (step definitions) |
| `utils/sources-v2.ts` | Créé |
| `utils/sources-v2.test.ts` | Créé |
| `utils/gouvernance-sources-emails.ts` | Modifié (SourceNom, SOURCES_NOMS_ATTENDUS) |
| `utils/gouvernance-sources-emails.test.ts` | Modifié |
| `scripts/sources-v2-legacy-adapter.ts` | Créé |
| `app/api-handlers.ts` | Modifié (V2 driver, agregerLignesParSource, import) |
| `scripts/run-audit-sources.ts` | Déjà sur adaptateur V2 |
| `scripts/run-traitement.ts` | Déjà sur adaptateur V2 |
| `.cursor/sprints/.../US-7.3 - Refactoriser  une entrée par source dans les données.md` | Déjà à jour (format DOD) |

---

## 5. Definition of Done — statut

- [x] Critères d’acceptation US-7.3 couverts (CA1–CA6).
- [x] Schéma `sources.json` V2 : une entrée par source, champs par phase, pas de chemin liste html en JSON.
- [x] Initialisation par défaut (toutes options activées, emails en code pour WTTJ, Linkedin, JTMS, HelloWork, Cadre Emploi).
- [x] Liste canonique des sources (dont Externatic, Talent.io) et dérivation nom ↔ dossier liste html en code.
- [x] Déduplication au chargement (une seule entrée par source).
- [x] API et services : tableau de bord une ligne par source ; audit et traitement via adaptateur legacy sur V2.
- [x] Tests unitaires et d’intégration pertinents passent ; typecheck OK.

---

## 6. Conclusion

**US-7.3 est DONE.**  
Le modèle « une entrée par source » est en place (sources-v2, driver, adaptateur legacy). L’app et les scripts (audit, traitement) utilisent ce modèle ; le tableau de synthèse renvoie une ligne par source. Aucune évolution UI dédiée (Designer non sollicité). Le rapport final est le présent document.
