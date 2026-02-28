# Revue de code — Sources = JSON, Offres = chaîne

**Date :** 2025-02  
**Périmètre :** Règle « paramétrage workers = JSON ; écrire/chercher offres = chaîne colonne Airtable Offres ».

---

## 1. OK / Conforme

| Fichier | Vérification |
|---------|--------------|
| `utils/parametrages-complets.ts` | Airtable OK sans `sources` (apiKey, base, offres uniquement). Tableau de bord accessible sans ID table Sources. |
| `utils/airtable-driver-reel.ts` | Crée uniquement table Offres ; colonnes `source` (single select) et `Méthode de création` ; pas de table Sources. |
| `utils/airtable-releve-driver.ts` | getSourceLinkedIn → `{ found: false }` ; listerSources → [] ; creerSource throw ; mettreAJourSource no-op ; creerOffres écrit `source` (string) + Méthode de création. |
| `scripts/run-traitement.ts` | createCompositeReleveDriver exporté ; pas de sourcesId ; sources depuis JSON. |
| `scripts/releve-offres-linkedin-cli.ts` | Utilise createCompositeReleveDriver(DATA_DIR, { apiKey, baseId, offresId }). |
| `app/page-html.ts` | tablesAirtableCreees basé sur `airtable.offres` uniquement. |

---

## 2. À corriger (fait dans cette revue)

### 2.1 Types et config Airtable

- **`types/parametres.ts`** : La propriété `sources?: string` et le commentaire « ID de la table Sources » restent pour compat lecture (run-enrichissement/analyse-ia passent encore `airtable.sources`). **Action :** commentaire mis à jour (legacy, non utilisé).
- **`utils/parametres-airtable.ts`** : Lecture/écriture de `sources` conservée pour compat ; pas de changement fonctionnel.

### 2.2 Message utilisateur

- **`utils/relève-offres-linkedin.ts`** : Message d’erreur « table Sources » alors que la source de vérité est data/sources.json. **Action :** remplacer par « sources (data/sources.json) ».

### 2.3 Tests driver relève

- **`utils/airtable-releve-driver.test.ts`** :
  - `listerSources` : le test attendait des enregistrements Airtable ; le driver retourne maintenant `[]`. **Action :** attendre `[]`.
  - `creerSource` : le driver lance une erreur ; le test attendait un POST réussi. **Action :** attendre throw avec message contenant « data/sources.json ».
  - `mettreAJourSource` : le driver ne fait plus d’appel API ; le test assertait sur le body. **Action :** vérifier uniquement que l’appel résout sans throw.
  - `creerSource auto-ajoute option` : utilisait `sourcesId` (supprimé) et le comportement « 5 appels ». **Action :** remplacer par un test « creerSource lance une erreur (sources = JSON) ».

---

## 3. À traiter plus tard (enrichissement / analyse IA)

### 3.1 Driver enrichissement

- **`utils/airtable-enrichissement-driver.ts`** :
  - Utilise encore **table Airtable Sources** quand `sourcesId` est fourni (`fetchSourcesAvecCheckbox`, `fetchSourcesActives`). Règle cible : paramétrage = JSON.
  - Utilise **`CHAMP_LIEN_SOURCE = 'Adresse'`** et **`getLinkedSourceId`** (lien Sources → Offres). En base actuelle, Offres a **`source`** (chaîne), pas de lien « Adresse ». Donc :
    - Sans `sourcesId` : getOffresARecuperer / getOffresAAnalyser retournent toutes les offres (Statut = …), pas de filtre par source.
    - Avec `sourcesId` (ancienne base avec table Sources) : les formules `{Adresse} = "email"` et le filtre par `getLinkedSourceId` ne correspondent plus au schéma « source = chaîne ».

**Recommandation :** Faire évoluer le driver enrichissement pour :
- Lire les sources actives depuis **data/sources.json** (ou driver V2 injecté), pas depuis une table Airtable.
- Filtrer les offres par le champ **`source`** (string) en cohérence avec les noms de sources du JSON (plus de lien « Adresse »).

### 3.2 Workers background

- **`scripts/run-enrichissement-background.ts`** et **`scripts/run-analyse-ia-background.ts`** :
  - Appellent `resolveSourcesId(airtable.apiKey, baseId, airtable.sources)`. Si `airtable.sources` est vide (cas normal), ils récupèrent l’ID table Sources via le schéma Airtable (table nommée « sources »). Donc sur une base sans table Sources, `sourcesId` est `undefined` et le driver retourne toutes les offres (pas de filtre par source).
  - À terme : ne plus dépendre de `sourcesId` ; injecter la liste des sources actives depuis **sources.json** (ou adapter le driver comme ci‑dessus).

### 3.3 BDD / autres

- **`tests/bdd/*.steps.ts`** : Plusieurs steps parlent encore de « table Sources » (gouvernance, tableau-synthese, offres-emails-linkedin, configuration-airtable). À adapter ou marquer obsolètes selon la sémantique voulue (ex. « la source X existe » = dans sources.json).
- **`scripts/import-offres-airtable-reprise.ts`** : Commentaire sur map email → record ID table Sources ; à revoir si le script reste utilisé avec le nouveau modèle (source = chaîne).

---

## 4. Résumé

- **Conforme** : paramétrage complet, driver réel, driver relève, composite, CLI relève, page paramètres.
- **Corrigé** : message relève, commentaire type `sources`, tests driver relève (listerSources, creerSource, mettreAJourSource, creerSource auto-ajoute).
- **À faire** : driver enrichissement (sources depuis JSON, filtre Offres par champ `source` string) ; workers background (ne plus dépendre de table Sources) ; BDD steps et script reprise si besoin.
