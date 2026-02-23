# Revue Lead Dev – BDD US-2.5 Comptage des appels API

**Date** : 2026-02-21  
**Agent livrant** : BDD  
**Étape** : Scénarios Gherkin

## Livrable

- Fichier créé : `tests/bdd/comptage-appels-api.feature`
- Tag : `@us-2.5`
- 11 scénarios couvrant CA1 à CA4 (wrapper, log JSON, stockage, container Consommation API).

## Vérifications

| Point | Statut |
|--------|--------|
| `# language: fr` en première ligne | OK |
| Fonctionnalité + Contexte + Scénarios en français | OK |
| CA1 (Wrapper Claude/Airtable) | OK – 2 scénarios |
| CA2 (Contenu log : api, date-heure, succès ; échec = code uniquement) | OK – 2 scénarios |
| CA3 (Stockage data/log-appels-api/, AAAA-MM-JJ.json, dossier créé) | OK – 3 scénarios |
| CA4 (Container, tableau, bouton Calculer, mise à jour au clic) | OK – 4 scénarios |
| Steps listés pour les step definitions | OK (livraison agent) |

## Remarque mineure

- Dernier scénario (l.75-82) : deux blocs « Quand » / « Alors » dans le même scénario (avant clic → tableau vide ; après clic → données). Acceptable ; on pourra refactoriser en deux scénarios ou en « Et quand » / « Et alors » si le moteur BDD le favorise.

## Décision

**Validé.** Les scénarios sont conformes à l’US-2.5 et exploitables par l’étape TDD (back puis front).

## Prochaine étape

Au prochain **GO NEXT** : déléguer à l’agent **TDD-back-end** pour implémenter la logique (wrapper, log, stockage, API agrégation) en TDD baby steps, puis **TDD-front-end** pour le container et le tableau.
