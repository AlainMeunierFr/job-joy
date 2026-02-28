# Rapport de revue Lead Dev — TDD-back-end US-6.1 (livrable pause)

**Date** : 2026-02-21  
**US** : US-6.1 — Créer des offres à partir d'une recherche sur un site Web  
**Agent** : TDD-back-end  
**Périmètre** : Phase 1 APEC (extraction URL) + CLI sans Airtable (pause pour validation avec l'utilisateur).

## Verdict : **Accepté**

## Points vérifiés

- **Utils** : `liste-html-paths.ts`, `apec-liste-html-parser.ts`, `lire-fichiers-html-en-attente.ts` ; extraction limitée aux href contenant `/emploi/detail-offre/` (cartes APEC).
- **CLI** : `scripts/import-liste-html-apec-cli.ts` ; affiche les URL extraites (numérotées), aucun appel Airtable. Script npm : `cli:import-liste-html-apec`.
- **Tests** : 15 tests passent (liste-html-paths, apec-liste-html-parser, lire-fichiers-html-en-attente).
- **Build** : `npm run build` OK.
- **Contrainte pause** : aucune écriture Airtable, aucun déplacement vers "traité" dans cette livraison (conforme).

## Suite (après validation utilisateur)

- Tester en ligne de commande avec l'utilisateur : déposer des "Enregistrer sous" de pages de recherche APEC dans `data/liste html/apec`, lancer `npm run cli:import-liste-html-apec`, vérifier que les URL affichées sont correctes.
- Une fois les URL validées : reprise du tunnel (déplacement des fichiers vers "traité", intégration Airtable/sources, etc.) sur GO NEXT.
