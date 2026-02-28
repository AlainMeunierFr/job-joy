# Revue Lead Dev – US-2.5 Comptage des appels API

**Date** : 2026-02-21  
**Agent livrant** : US  
**Étape** : User Story rédigée

## Livrable

- Fichier : `.cursor/sprints/Sprint 2 - Analyse des offres/US-2.5 - Comptage des appels API.md`
- Contenu : US-2.5 avec En tant que / Je souhaite / Afin de et 4 thèmes de critères d’acceptation (CA1–CA4).

## Vérifications

| Point | Statut |
|--------|--------|
| Format DOD (titre H4, sections obligatoires) | OK |
| CA1 – Wrapper Claude + Airtable | OK |
| CA2 – Log JSON (api, DateTime, succès, code erreur si échec) | OK |
| CA3 – Stockage `data/log-appels-api/`, un fichier/jour `AAAA-MM-JJ.json` | OK |
| CA4 – Container « Consommation API », tableau (colonne = API, ligne = jour), bouton « Calculer » | OK |
| Critères testables et sans ambiguïté | OK |

## Décision

**Validé.** Aucune correction demandée. L’US est prête pour l’étape BDD (scénarios Gherkin).

## Prochaine étape

Au prochain **GO NEXT** : déléguer à l’agent **BDD** pour rédiger les scénarios .feature de l’US-2.5 (sans code, uniquement les fichiers dans `tests/bdd/`).
