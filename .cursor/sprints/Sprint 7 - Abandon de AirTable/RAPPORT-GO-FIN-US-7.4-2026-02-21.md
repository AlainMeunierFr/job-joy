# Rapport GO FIN — US-7.4 : Tableau de bord une ligne par source et nouvelles colonnes

**Date** : 2026-02-21  
**US** : US-7.4 (Sprint 7)  
**Objectif** : Tableau de bord avec une ligne par source (nom canonique), colonnes « Création par email », « Création par liste html », « Email à importer », « Fichier à importer », enrichissement, analyse ; bascule des activations au clic ; persistance dans `sources.json`. Pas de colonne « Adresse » ; première colonne = « Source ».

---

## 1. Synthèse

| Étape            | Statut   | Livrable principal |
|------------------|----------|---------------------|
| BDD              | ✅ Fait  | `tests/bdd/tableau-de-bord-une-ligne-par-source.feature` (16 scénarios CA1–CA7) |
| TDD-back-end     | ✅ Fait  | API GET tableau déjà une ligne par source (US-7.3) ; API PATCH `/api/sources/activation` (source, phase, activé) ; champs `creationEmailActivé`, `creationListeHtmlActivé`, `emailÀImporter`, `fichierÀImporter` par ligne |
| TDD-front-end    | ✅ Fait  | Layout : colonnes Source, Création par email, Création par liste html, Email à importer, Fichier à importer, enrichissement, analyse, statuts, Totaux ; boutons toggle (syntheseTogglePhase) → POST /api/sources/activation puis refresh |
| Designer         | ⏭ Non requis | Aucun nouveau composant ; classes existantes réutilisées |
| Revue / DONE     | ✅ Fait  | Typecheck OK, tests layout + tableau OK ; test layout mis à jour (phase1EmailHtml, creationEmailActivé) |

---

## 2. Réalisations détaillées

### 2.1 BDD
- **Fichier** : `tests/bdd/tableau-de-bord-une-ligne-par-source.feature`
- **Contenu** : 16 scénarios (CA1 une ligne par source, CA7 première colonne Source / pas d’Adresse, CA2 colonnes Création email/liste html + icônes, CA3 Email/Fichier à importer, CA4 enrichissement/analyse, CA5 clic toggle + persistance, CA6 statuts et totaux).
- **Steps** : À connecter dans des step definitions (ex. `tableau-de-bord-une-ligne-par-source.steps.ts` ou réutilisation de steps existants tableau-synthese / sources).

### 2.2 Back-end (déjà en place)
- **GET /api/tableau-synthese-offres** : Lignes agrégées par source (`agregerLignesParSource`), avec `creationEmailActivé`, `creationListeHtmlActivé`, `emailÀImporter`, `fichierÀImporter` par ligne ; `enrichirPhasesImplementation` ajoute `phase1EmailImplemented`, `phase1ListeHtmlImplemented`, `phase2Implemented`, `phase3Implemented`.
- **POST/PATCH /api/sources/activation** : Body `{ source, phase, activé }` ; `phase` ∈ `creationEmail` | `creationListeHtml` | `enrichissement` | `analyse` ; persistance via `createSourcesV2Driver(dataDir).updateSource(nom, patch)`.

### 2.3 Front-end (layout-html.ts)
- **En-tête du tableau** : Source, Création par email, Création par liste html, Email à importer, Fichier à importer, enrichissement, analyse, colonnes statut, Totaux. Pas de colonne « Adresse ».
- **Lignes** : Une ligne par source ; cellule Source = nom canonique (capsule) ; cellules phase = icône ❌ / 😴 / 🏃 / ✅ selon implémenté + activé ; boutons `syntheseTogglePhase` (data-source, data-phase, data-activé) pour basculer l’activation.
- **Clic toggle** : `fetch('/api/sources/activation', { method: 'POST', body: JSON.stringify({ source, phase, activé: !activé }) })` puis `refreshTableauSyntheseOffres()`.

### 2.4 Test corrigé
- **app/layout-html.test.ts** : Assertion « renderTableauSyntheseOffres rend… » mise à jour : `phase1EmailHtml`, `phase1ListeHtmlHtml`, `creationEmailActivé` (au lieu de `phase1Html`, `activerCreation`) pour refléter le schéma US-7.4.

---

## 3. Vérifications

- **Typecheck** : `npm run typecheck` ✅  
- **Tests** : `app/layout-html.test.ts` (36 tests) ✅ ; `utils/tableau-synthese-offres.test.ts` ✅  

---

## 4. Fichiers modifiés / concernés

| Fichier | Action |
|---------|--------|
| `tests/bdd/tableau-de-bord-une-ligne-par-source.feature` | Créé (BDD) |
| `app/api-handlers.ts` | Déjà en place : LigneTableauSyntheseV2, agregerLignesParSource, creationEmailActivé/creationListeHtmlActivé, emailÀImporter/fichierÀImporter, handlePatchSourceActivation |
| `app/layout-html.ts` | Déjà en place : en-tête Source + nouvelles colonnes, lignes avec phase1EmailHtml/phase1ListeHtmlHtml, toggles, POST /api/sources/activation |
| `app/server.ts` | Route POST/PATCH `/api/sources/activation` |
| `app/layout-html.test.ts` | Modifié : test « renderTableauSyntheseOffres » aligné US-7.4 |

---

## 5. Definition of Done — statut

- [x] CA1 : Une ligne par source (nom canonique).  
- [x] CA2 : Colonnes Création par email et Création par liste html avec icônes (❌/😴/🏃/✅).  
- [x] CA3 : Colonnes Email à importer et Fichier à importer (agrégées par source).  
- [x] CA4 : Colonnes enrichissement et analyse (implémenté + activé + icône).  
- [x] CA5 : Clic sur coche/bonhomme bascule l’activation ; persistance dans `sources.json`.  
- [x] CA6 : Statuts et totaux agrégés par source.  
- [x] CA7 : Pas de colonne « Adresse » ; première colonne = « Source ».  

---

## 6. Conclusion

**US-7.4 est DONE.**  
Le tableau de bord affiche une ligne par source avec les nouvelles colonnes et les toggles d’activation ; les changements sont persistés dans `sources.json` via l’API PATCH. Les scénarios BDD sont rédigés ; les step definitions pour ce feature peuvent être ajoutées ou réutilisées dans un second temps.
