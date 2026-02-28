# Revue BDD US 2.2 – Configuration ClaudeCode (API Key)

**Date** : 2026-02-21  
**Agent** : BDD  
**Livrable** : `tests/bdd/configuration-claudecode.feature`

## Vérifications

- **Syntaxe** : `# language: fr` en première ligne ; Contexte avec `Étant donné que je suis sur la page Paramètres` ; scénarios en Gherkin français.
- **Couverture US** : CA1 (tutoriel / accès), CA2 (champ masqué, indicateur « Déjà enregistrée », remplacement, stockage sécurisé), CA3 (section dédiée sur Paramètres, même esprit qu’Airtable/compte email) couverts par des scénarios.
- **Cohérence** : Même structure que `parametrage-ia.feature` et les autres features Paramètres (section intitulée, champs, bouton Enregistrer).
- **Steps** : Plusieurs steps nouveaux (Configuration ClaudeCode, API Key ClaudeCode) ; à implémenter dans les step definitions à l’étape TDD.

## Décision

**Validé.** Les scénarios BDD sont prêts. Les steps listés par l’agent BDD devront être implémentés en TDD (back-end puis front-end).

## Suite

Sur **GO NEXT** : proposer le plan de tests baby steps puis déléguer à l’agent **TDD-back-end** (stockage, chiffrement, API) puis **TDD-front-end** (section Paramètres, champ, tutoriel, bouton).
