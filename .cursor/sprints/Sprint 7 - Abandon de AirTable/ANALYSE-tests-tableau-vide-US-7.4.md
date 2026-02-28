# Analyse : pourquoi les tests n’ont pas détecté le tableau vide (US-7.4)

## Ce qui a été constaté

- En conditions réelles (ou sans Airtable / sans offres), le tableau de bord s’affichait **vide**.
- La refactorisation US-7.3 / US-7.4 avait été considérée terminée alors que ce cas n’était pas couvert par les tests.

## Pourquoi les tests n’ont pas détecté le bug

1. **Aucun test de l’API GET tableau-synthese-offres**
   - Les tests existants couvrent :
     - `utils/tableau-synthese-offres.ts` : `construireTableauSynthese`, `produireTableauSynthese`, totaux, mergeCache, etc. avec des **données injectées** (sources + offres non vides).
     - `app/layout-html.test.ts` : contenu HTML du layout (colonnes, script, pas d’appel API).
   - Aucun test ne :
     - appelle `handleGetTableauSyntheseOffres`,
     - ne vérifie le comportement quand **Airtable est absent** (paramètres vides),
     - ne vérifie le comportement quand **il n’y a aucune offre** (liste offres vide).

2. **Logique métier testée avec des jeux de données “optimistes”**
   - `construireTableauSynthese` ne crée une ligne que pour :
     - les sources qui ont au moins une offre (clé dans `compteursParExpediteur`),
     - ou les sources de type “liste html” (sans offre).
   - Les tests fournissent toujours des **sources + offres non vides**, donc ce cas “0 offre, sources uniquement email” n’est jamais exécuté dans les tests.

3. **Comportement attendu US-7.4 non vérifié par un test**
   - US-7.4 exige « une ligne par source » qu’il y ait des offres ou non.
   - Aucun test ne formule explicitement :  
     « Quand les sources V2 ont N entrées et qu’il n’y a aucune offre (ou pas d’Airtable), la réponse du tableau contient N lignes. »

## Correction apportée (code)

- **Sans Airtable** : charger les sources V2 et renvoyer une ligne par source (à 0) au lieu de `lignes: []`.
- **Avec Airtable** : après agrégation, appeler `completerLignesParSourceV2(entries, lignesAgg, statutsOrdre)` pour ajouter une ligne pour toute source manquante (ex. sources email sans offre).

## Ce qu’il faut ajouter pour éviter la régression

- **Test d’API (ou d’intégration)** pour GET tableau-synthese-offres :
  - **Cas “sans Airtable”** : `dataDir` sans `parametres.json` (ou sans section Airtable valide) → la réponse doit contenir **au moins une ligne par source** (ex. `lignes.length === SOURCES_NOMS_CANONIQUES.length` ou ≥ 1), et non `lignes: []`.
  - **Cas “avec Airtable mais 0 offre”** (optionnel, plus lourd à mocker) : vérifier que `lignes.length` est égal au nombre de sources V2.

Cela aurait permis de considérer la refactorisation comme terminée **uniquement** une fois ce test vert, et d’éviter le bug du tableau vide.
