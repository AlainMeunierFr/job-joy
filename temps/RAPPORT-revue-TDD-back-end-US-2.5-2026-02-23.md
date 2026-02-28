# Revue Lead Dev – TDD-back-end US-2.5 Comptage des appels API

**Date** : 2026-02-23  
**Agent livrant** : TDD-back-end  
**Étape** : Logique métier (utils)

## Livrable

- **`utils/log-appels-api.ts`** : `assurerDossierLogAppels`, `enregistrerAppel`, `lireLogsDuJour`, `agregerConsommationParJourEtApi` ; types `EntreeLogAppel`, `OptionsEnregistrerAppel`.
- **`utils/log-appels-api.test.ts`** : 15 tests unitaires (baby steps 1–7 + cas limites).
- **`utils/index.ts`** : exports ajoutés.

## Vérifications

| Point | Statut |
|--------|--------|
| Tests Jest (log-appels-api.test.ts) | OK – 15 passed |
| Couverture utils/log-appels-api.ts | OK – 100 % (statements, branches, functions, lines) |
| TypeScript (npm run typecheck) | OK |
| Aucun code dans app/ | OK |
| TDD strict (utils uniquement) | OK |

## Décision

**Validé.** Le back-end métier pour le comptage des appels API est en place. Les step definitions BDD pourront s’appuyer sur ces fonctions (dataDir injectable, dateISO optionnelle pour les tests).

## Prochaine étape

Au prochain **GO NEXT** : déléguer à l’agent **TDD-front-end** pour le container « Consommation API » sur le tableau de bord (HTML, bouton « Calculer », appel API d’agrégation, affichage du tableau) et l’intégration du wrapper des appels Claude/Airtable côté app (enregistrement des appels via `enregistrerAppel`).
