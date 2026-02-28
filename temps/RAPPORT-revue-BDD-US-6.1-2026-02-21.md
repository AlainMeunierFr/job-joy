# Rapport de revue Lead Dev — BDD US-6.1

**Date** : 2026-02-21  
**US** : US-6.1 — Créer des offres à partir d'une recherche sur un site Web  
**Agent** : BDD  
**Fichier livré** : `tests/bdd/import-offres-liste-html.feature`

## Verdict : **Accepté**

## Points vérifiés

- Fichier unique créé dans `tests/bdd/`, aucun code produit.
- `# language: fr` en première ligne ; tag `@us-6.1`.
- CA1 à CA6 couverts : CA1 (source Adresse + Type "Import html", lien Offres via Adresse) avec note hors BDD pour le renommage manuel ; CA2 (dossier liste html, colonne À importer, déplacement vers traité, création de source) ; CA3 (parsing, URL offres uniquement, structure répétée) ; CA4 (APEC carte = offre, champs) ; CA5 (HTTP ou navigateur) ; CA6 (enrichissement APEC, échec + traçabilité).
- Gherkin conforme (Contexte, Scénario, Étant donné, Quand, Alors) ; DocString pour liste de champs.
- Steps listés pour les step definitions.

## Suite

Étape suivante : **TDD-back-end** (après validation utilisateur ou GO NEXT).
