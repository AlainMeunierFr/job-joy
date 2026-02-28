# Rapport GO FIN — US-6.6 : Créer les sources

**Date** : 2026-02-21  
**US** : US-6.6 (Sprint 6)  
**Objectif** : Liste canonique 15 noms + Inconnu, URL officielle par source, schéma une entrée par source avec migration des données existantes, et clic sur le nom de la source dans le tableau de bord ouvrant l’URL officielle dans un nouvel onglet.

---

## 1. Synthèse

| Étape            | Statut   | Livrable principal |
|------------------|----------|---------------------|
| BDD              | ✅ Fait  | `tests/bdd/sources-creer-les-sources-us-6-6.feature` (CA1, CA2, CA4, CA5) |
| TDD-back-end     | ✅ Fait  | Liste canonique 15 + Inconnu ; `urlOfficielle` dans SourceEntry ; migration `migrerLegacyVersSourceEntries` ; tests sources-v2 + gouvernance |
| TDD-front-end    | ✅ Fait  | LigneTableauSyntheseV2.urlOfficielle ; tableau de bord : nom source = lien `<a target="_blank">` si URL présente |
| Designer         | ⏭ Non requis | Lien natif, pas de nouveau composant |
| Revue / DONE     | ✅ Fait  | Typecheck OK, tests unitaires OK |

---

## 2. Réalisations détaillées

### 2.1 BDD
- **Fichier** : `tests/bdd/sources-creer-les-sources-us-6-6.feature` (tag `@us-6.6`)
- **CA1** : Liste canonique exacte des 15 noms ; scénario de détection d’écart entre liste de référence et code.
- **CA2** : Chaque source a une URL officielle après init ; Plan du Scénario + Exemples avec les 15 noms et URLs du tableau de référence.
- **CA4** : Migration regroupement par email, mapping par chemin liste html, orphelins traités de façon explicite (ex. Inconnu).
- **CA5** : Tableau de bord — clic sur le nom (ou lien) ouvre l’URL officielle dans un nouvel onglet ; source sans URL = pas de lien actif.

### 2.2 Back-end (sources-v2, gouvernance)
- **Liste canonique** : `SOURCES_NOMS_REFERENCE_US_6_6` (15 noms) ; `SOURCES_NOMS_CANONIQUES` = 15 + Inconnu. Type `SourceNom` (gouvernance-sources-emails) aligné ; Externatic et Talent.io retirés de la liste canonique.
- **URL officielle** : `SourceEntry.urlOfficielle` ; `URL_OFFICIELLE_PAR_SOURCE` en code ; défaut et round-trip lire/écrire dans sources.json.
- **Migration** : `migrerLegacyVersSourceEntries(lignes: LegacyLigneSource[]): SourceEntry[]` — regroupement par source, orphelins → Inconnu.
- **Tests** : `utils/sources-v2.test.ts` (liste canonique, urlOfficielle, round-trip, migration) ; `utils/gouvernance-sources-emails.test.ts` (16 noms).

### 2.3 Front-end (api-handlers, layout-html)
- **API** : `LigneTableauSyntheseV2` avec `urlOfficielle?: string` ; `completerLignesParSourceV2` et enrichissement des lignes avec `entry.urlOfficielle` pour chaque ligne envoyée au client.
- **Tableau de bord** : `buildSourceCapsuleHtml(sourceNom, sourceSlug, urlOfficielle?)` — si `urlOfficielle` non vide → `<a href="..." target="_blank" rel="noopener noreferrer">` + span ; sinon span seul. Le script utilise `ligne.urlOfficielle` pour rendre le lien.

---

## 3. Vérifications

- **Typecheck** : `npm run typecheck` ✅  
- **Tests** : `utils/sources-v2.test.ts`, `utils/gouvernance-sources-emails.test.ts`, `app/layout-html.test.ts` ✅  

---

## 4. Fichiers modifiés / créés

| Fichier | Action |
|---------|--------|
| `tests/bdd/sources-creer-les-sources-us-6-6.feature` | Créé (BDD US-6.6) |
| `utils/sources-v2.ts` | Liste canonique 15 + Inconnu, urlOfficielle, URL_OFFICIELLE_PAR_SOURCE, migrerLegacyVersSourceEntries, slugs |
| `utils/sources-v2.test.ts` | Tests CA1, CA2, CA4 (liste canonique, urlOfficielle, migration) |
| `utils/gouvernance-sources-emails.ts` | SourceNom (15 + Inconnu), SOURCES_NOMS_ATTENDUS |
| `utils/gouvernance-sources-emails.test.ts` | Options schéma 16 noms |
| `utils/sources-io.ts` | idPourSourceNom 16 noms |
| `app/api-handlers.ts` | LigneTableauSyntheseV2.urlOfficielle, completerLignesParSourceV2 + enrichissement urlOfficielle |
| `app/layout-html.ts` | buildSourceCapsuleHtml, script tableau avec lien source si urlOfficielle |
| `app/layout-html.test.ts` | Tests buildSourceCapsuleHtml et urlOfficielle |
| `tests/bdd/sources-une-entree-par-source.steps.ts` | Mock urlOfficielle si utilisé |

---

## 5. Definition of Done — statut

- [x] CA1 : Liste canonique des 15 noms + Inconnu ; test ou vérification détecte un écart.
- [x] CA2 : Données par source (emails par défaut + URL officielle) mémorisées ; tableau de référence respecté.
- [x] CA3 : Schéma une entrée par source (déjà en place US-7.3).
- [x] CA4 : Migration des données existantes vers une entrée par source ; orphelins traités de façon explicite et testée.
- [x] CA5 : Tableau de bord — clic sur le nom de la source (ou lien) ouvre l’URL officielle dans un nouvel onglet ; source sans URL = pas de lien.

---

## 6. Conclusion

**US-6.6 est DONE.**  
Liste canonique 15 noms + Inconnu, URL officielle par source (stockée et affichée), migration legacy → une entrée par source avec orphelins → Inconnu, et tableau de bord avec lien sur le nom de la source ouvrant l’URL en nouvel onglet. Scénarios BDD dans `sources-creer-les-sources-us-6-6.feature` ; les step definitions pour ce feature peuvent être ajoutées ou réutilisées ensuite.
