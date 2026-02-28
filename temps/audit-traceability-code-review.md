# Revue de code – Audit de traçabilité US ↔ code

## Périmètre

- Initialisation : `scripts/audit-traceability.js`
- Enrichissement (script + agent) : `scripts/audit-traceability-enrich.js`, `.cursor/commands/audit-code.md`
- Page web et filtres : `app/audit-html.ts`, `app/content-styles.css` (section .pageAudit)
- Données : `types/audit-traceability.ts`, chargement dans `app/server.ts`

---

## 1. Script d’initialisation (`audit-traceability.js`)

### Points positifs

- Séparation claire US → CA, Feature → Step, TU/TI → code avec `linkedIdsAmont` / `linkedIdsAval` dès la collecte.
- Extraction des titres de CA depuis les US (`**CAn – Titre**`) pour une description métier quand elle existe.
- Règle orphelin unique et documentée (coupe la chaîne) dans `computeOrphan`.
- `byType` cohérent avec les types du schéma.

### Problèmes et risques

1. **Incohérence des IDs US (1.1 vs 1.01)**  
   Les US lues depuis les fichiers ont un id `us:1.01` (nom de fichier `US-1.01`). Les features BDD et `FEATURE_TO_US` utilisent `1.1`, `1.3`, etc. On crée donc à la fois `us:1.01` (fichier) et `us:1.1` (feature), ce qui duplique des US et casse les liens (enrich script et IHM ciblent `us:1.01`).  
   **Correction** : normaliser l’id US issu des features pour qu’il soit au format « X.0Y » quand la partie mineure est un seul chiffre (ex. `1.1` → `1.01`), afin de réutiliser l’US déjà créée depuis le fichier.

2. **Pas de lien Feature → CA**  
   Les features sont reliées à une US, pas aux CA. Un CA n’a donc jamais de feature en aval dans le script ; il reste orphelin tant qu’aucun autre lien (ex. code/TU) ne pointe vers lui. Comportement cohérent avec la règle orphelin, mais à garder en tête pour l’agent (il ne peut pas « créer » un lien Feature→CA sans règle métier).

3. **Step sans lien vers le code**  
   Les steps ont `linkedIdsAval: []`. Aucun lien step → fichier .ts n’est déduit (il faudrait parser les imports dans les steps). Donc tous les steps sont orphelins côté script. L’agent peut éventuellement ajouter des liens, mais ce n’est pas demandé explicitement dans la commande.

4. **Gestion d’erreurs**  
   Pas de try/catch autour des `readFileSync` ; un fichier illisible ou un répertoire manquant peut faire planter le script. Acceptable en outil de dev, à documenter.

### Recommandations

- Ajouter une fonction `normalizeUsTag(tag)` (ex. `1.1` → `1.01`) et l’utiliser pour l’id US créé à partir de `usTag` (feature et `FEATURE_TO_US`).
- Optionnel : vérifier que `byType` ne contient pas de doublons (ex. `us:1.01` et `us:1.1` pour la même US).

---

## 2. Script d’enrichissement (`audit-traceability-enrich.js`)

### Points positifs

- Liens sémantiques explicites (code/TU/TI → US), avec mise à jour de `linkedIdsAmont` / `linkedIdsAval` et recalcul des orphelins.
- Même règle `computeOrphan` que le script d’initialisation.

### Problèmes et risques

1. **Dépendance au format d’id US**  
   `SEMANTIC_LINKS` utilise `us:1.01`, `us:1.02`, etc. Si le script d’audit crée aussi `us:1.1`, les liens vers `us:1.1` ne seront jamais ajoutés par l’enrich script. La normalisation des ids US dans le script d’audit règle ce point.

2. **Fichier attendu en nouveau format**  
   Le script suppose que le JSON a déjà `linkedIdsAmont` et `linkedIdsAval`. Si on relance l’option 7 (regénération à vide), le fichier est déjà au bon format. Si un ancien fichier sans migration était chargé, il plancherait. Documenter « à lancer après option 7 ou après migration ».

3. **Liste figée**  
   `SEMANTIC_LINKS` est une table statique ; tout nouveau fichier/commentaire US doit être ajouté à la main ou par l’agent (qui modifie le JSON, pas ce script). Cohérent avec le rôle « script déterministe + agent pour le reste ».

### Recommandations

- En en-tête du fichier, préciser : « Le JSON doit être au format linkedIdsAmont/linkedIdsAval (option 7 ou migration). »
- Après normalisation des ids US dans l’audit script, vérifier que toutes les clés de `SEMANTIC_LINKS` qui pointent vers des US utilisent le format normalisé (1.01, 1.02, …).

---

## 3. Migration (`audit-traceability-migrate.js`)

- Utile une seule fois pour l’ancien format. Comportement correct (détection déjà migré, split amont/aval, recalcul orphelin).
- Aucun changement nécessaire si on ne relance plus d’anciens JSON.

---

## 4. Commande agent (`.cursor/commands/audit-code.md`)

### Points positifs

- Schéma et règle orphelin rappelés. Consignes claires : enrichir liens, descriptions CA, recalcul orphelins, écrire le JSON.

### Problèmes et risques

1. **Ordre des opérations**  
   L’agent doit d’abord ajouter les liens (et descriptions CA), puis recalculer les orphelins. La commande ne dit pas explicitement « recalculer les orphelins après chaque modification des liens ». À préciser : « Après avoir mis à jour les liens et descriptions, recalculer `orphan` pour chaque artefact selon la règle coupe la chaîne. »

2. **Format de sortie**  
   Bien indiquer que les artefacts doivent conserver `linkedIdsAmont`, `linkedIdsAval`, `description`, `orphan` (pas de `linkedIds`).

### Recommandations

- Ajouter une phrase du type : « Après toute modification des liens ou descriptions, recalculer `orphan` pour tous les artefacts (spec sans aval → orphelin ; code/TU sans amont ou TU sans aval → orphelin). »

---

## 5. Page web (`audit-html.ts`) et styles

### Points positifs

- Données injectées en JSON dans la page, pas d’appel API supplémentaire pour l’affichage. Filtres (Tous / Orphelins / Non orphelins) et onglets par type. Colonnes Amont / Aval et indicateur Orphelin.
- Abréviations (`short()`) pour alléger l’affichage, `title` pour le détail au survol. Gestion du cas sans données.

### Problèmes et risques

1. **Robustesse du JSON**  
   Si le JSON est partiellement invalide (artefact sans `linkedIdsAmont`), le script utilise `a.linkedIdsAmont || []`, ce qui est correct.

2. **Accessibilité**  
   Les onglets ont `role="tab"` / `role="tabpanel"` et `aria-selected`. Pas de gestion clavier (flèches entre onglets). Amélioration possible plus tard.

3. **Filtre et onglet**  
   La variable `currentTab` est mise à jour au clic mais n’est pas utilisée pour le filtrage ; le filtre s’applique à tous les onglets via `renderAll()`. Comportement cohérent.

### Recommandations

- Aucun correctif obligatoire. Optionnel : indiquer dans l’UI le nombre d’orphelins par onglet (ex. « User Stories (3 orphelins) »).

---

## 6. Serveur et chargement des données

- `GET /audit` : lecture synchrone de `data/audit-traceability.json`, parsing, passage à `getPageAudit(auditData)`. En cas d’erreur de parsing, `auditData` reste `null` → message « Aucun audit disponible ». Correct.
- `GET /api/audit-traceability` : renvoie le fichier brut. Utile si on voulait consommer l’audit en client sans recharger la page ; non utilisé par l’IHM actuelle.

---

## 7. Synthèse et action prioritaire

| Composant              | Verdict   | Action prioritaire                                      |
|------------------------|-----------|---------------------------------------------------------|
| audit-traceability.js  | À corriger | Normaliser l’id US (1.1 → 1.01) pour les features       |
| audit-traceability-enrich.js | OK      | Documenter la dépendance au format (option 7 ou migration) |
| audit-code.md          | OK        | Préciser le recalcul des orphelins après modifications  |
| audit-html.ts          | OK        | —                                                       |
| server.ts              | OK        | —                                                       |
| types                  | OK        | —                                                       |

Après correction de la normalisation des ids US et regénération à vide (option 7) puis passage de l’agent, les orphelins devraient refléter correctement la chaîne spec ↔ code, sans doublons US et avec les liens sémantiques appliqués aux bons artefacts.
