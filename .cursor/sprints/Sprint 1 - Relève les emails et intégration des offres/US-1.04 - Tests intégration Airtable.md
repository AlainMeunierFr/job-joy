# US-1.3 — Stratégie des tests (unitaires vs intégration Airtable)

## État actuel : tests unitaires uniquement

Les tests Airtable existants sont des **tests unitaires** avec **mocks** :

- **`utils/parametres-airtable.test.ts`** : lecture/écriture de la section `airtable` dans `parametres.json` ; répertoire temporaire (`mkdtempSync`) à chaque test, pas d’appel API.
- **`utils/configuration-airtable.test.ts`** : le **driver est mocké** — une fausse implémentation de `AirtableConfigDriver` qui retourne des IDs fixes (`baseId: 'base123'`, etc.) ou lance une erreur. Aucun appel à l’API Airtable.

Donc aujourd’hui : **pas de tests d’intégration** (pas de vraie base, pas de vraie API).

---

## Objectif : tests d’intégration avec une base dédiée

Pour valider le flux réel (création base → tables) sans toucher à une base “production”, il faut des **tests d’intégration** qui :

1. Utilisent une **base de test** sous un **autre nom** que la base métier (ex. **« Analyse offres - TEST »** ou **« Test - Analyse offres »**).
2. **En début de test** (setup) : **supprimer** une base de test du même nom si elle existe (nettoyage d’un run précédent qui aurait échoué avant le teardown).
3. **En fin de test** (teardown) : **supprimer** la base de test créée pendant le run.

Ainsi : environnement propre au début, pas de résidu à la fin, et pas de mélange avec la base “Analyse offres” réelle.

---

## Contrainte API Airtable — bases Free uniquement

On n’utilise que des **bases Free**. La création de base via API n’est pas utilisée : l’utilisateur **crée la base à la main** dans Airtable et colle son **URL** (ou son ID) dans `parametres.json` > `airtable.base`. Le driver crée uniquement les tables Sources/Offres.

- **Suppression de base** : la REST API ne propose pas d’endpoint “delete base” ; les tests d’intégration doivent être lancés **à la main** (option dans `Menu.ps1`).

---

## Stratégie proposée

### Option A — Si “delete base” existe (ou apparaît plus tard)

- **Nom de la base de test** : constant, ex. `NOM_BASE_TEST = 'Analyse offres - TEST'`.
- **Avant les tests d’intégration** (`beforeAll` ou `beforeEach`) :
  - (Si l’API le permet un jour : lister les bases, supprimer une base de test existante.)
- **Exécution** : créer la base `NOM_BASE_TEST`, créer les tables, vérifier les IDs et les paramètres.
- **Après** (`afterEach` / `afterAll`) : supprimer la base créée (même logique qu’au début).

Condition : disposer d’un moyen (API ou script) pour supprimer une base par ID ou par nom.

### Option B — Nom unique par run (tests sans delete)

- **Nom unique par run** : ex. `'Analyse offres - TEST ' + Date.now()`. Chaque run crée une nouvelle base.
- **Fin de test** : **pas de suppression** (API indisponible) — la base reste pour **exploration manuelle** après le test.
- Nettoyage éventuel des anciennes bases de test : à la main dans l’UI Airtable.

### Option C — Base créée à la main (flux retenu)

- **Comportement** : l’utilisateur crée une base Free dans Airtable, colle son URL dans `airtable.base`. Le driver crée les tables dans cette base.
- Une seule branche de code ; pas de workspaceId.

### Suppression uniquement au début (quand l’API le permettra)

- Si un jour l’API expose un “delete base” : faire la **suppression uniquement au début** du test (nettoyage d’un run précédent qui aurait échoué). **Ne pas supprimer à la fin** : la base reste disponible pour **explorer le résultat** après le test.

---

## Organisation recommandée dans le repo

- **Garder** les tests unitaires actuels (mocks, pas d’API) dans `utils/*.test.ts` — exécutés par défaut avec `npm run test`.
- **Ajouter** des tests d’intégration Airtable dans un fichier dédié, par exemple :
  - `utils/configuration-airtable.integration.test.ts`, ou
  - `tests/integration/configuration-airtable.integration.test.ts`
- **Exécution conditionnelle** : les lancer seulement si une variable d’environnement est présente (ex. `AIRTABLE_API_KEY` ou `RUN_AIRTABLE_INTEGRATION=1`), pour ne pas exiger de clé API en CI standard ni appeler l’API par défaut.

Exemple de structure (Jest) :

```ts
const runIntegration = Boolean(process.env.AIRTABLE_API_KEY);

(runIntegration ? describe : describe.skip)('configuration Airtable (intégration)', () => {
  const NOM_BASE_TEST = 'Analyse offres - TEST';

  beforeAll(async () => {
    // Si API delete disponible : supprimer une base existante nommée NOM_BASE_TEST
  });

  afterAll(async () => {
    // Supprimer la base créée pendant les tests (même nom ou ID stocké)
  });

  it('crée la base, les tables et écrit les IDs dans parametres.json', async () => {
    // Driver réel, executerConfigurationAirtable avec ce driver, assertions sur parametres + API
  });
});
```

---

## Récapitulatif

| Aspect | Décision |
|--------|----------|
| **Tests actuels** | Unitaires avec mocks (répertoire temporaire + driver mocké). |
| **Base de test** | Nom distinct : « Analyse offres - TEST » (ou nom unique par run si pas de delete). |
| **Début de test** | Supprimer une base de test du même nom si elle existe (quand l’API le permet) ; sinon nom unique par run. |
| **Fin de test** | **Pas de suppression** ; la base reste pour exploration après le test. |
| **Si pas de delete** | Nom unique par run ; nettoyage des anciennes bases de test à la main dans l’UI. |
| **Où** | Fichier dédié (`.integration.test.ts`). |
| **Quand** | Lancés **à la main** (pas pendant le build/CI), ex. via `Menu.ps1` ; nécessitent `AIRTABLE_API_KEY` et `airtable.base` (URL ou ID de la base). |

Flux retenu : bases Free, base créée à la main, URL/ID dans `airtable.base`.

---

## Implémentation (avant front-end)

- **Driver réel** : `utils/airtable-driver-reel.ts` — `createAirtableDriverReel({ baseId })`. Base créée à la main ; le driver crée les tables Sources/Offres (POST meta/bases/{baseId}/tables).
- **Tests d’intégration (schéma)** : `utils/configuration-airtable.integration.test.ts` — exécutés seulement si `AIRTABLE_API_KEY` et **`airtable.baseTest`** (ou `AIRTABLE_BASE_TEST_URL`) sont définis. Ils utilisent **uniquement** `baseTest`, jamais `base` : la base de production n’est pas touchée. Objectif : valider en continu que le schéma (création tables Sources/Offres) fonctionne pour de nouveaux utilisateurs. Créer une base vide dédiée dans Airtable et mettre son URL dans `baseTest`.
- **CLI / app** : utilisent **`airtable.base`** uniquement (base de production). Pas de `baseTest`.
- **Lancer les tests d'intégration** :
  - Remplir **`data/parametres.json`** (section `airtable` : `apiKey`, `base` = URL ou ID de la base), puis :
    ```powershell
    npm run test:integration:airtable
    ```
  - Ou en variables d’environnement (PowerShell : `$env:AIRTABLE_API_KEY = "patXXX..."` ; `$env:AIRTABLE_BASE_URL = "https://airtable.com/appXXX/..."`).
- **Tester le flux en CLI** : `npm run cli:configuration-airtable` (avec `parametres.json` rempli).
- **Menu.ps1** : option pour lancer les tests d’intégration Airtable à la main.
