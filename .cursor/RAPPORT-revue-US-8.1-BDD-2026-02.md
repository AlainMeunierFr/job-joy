# Revue BDD – US-8.1 Implémenter Mistral

**Date** : 2026-02  
**Étape** : BDD (refactor scénarios existants)  
**Livrable** : Refactor des fichiers `.feature` ClaudeCode → API IA / Mistral.

## Verdict : **Accepté**

Les deux fichiers `.feature` ont été refactorisés conformément à l’US-8.1 (CA1–CA4). Aucun nouveau scénario ; libellés et références uniquement.

## Modifications constatées

### `configuration-claudecode.feature`
- **Fonctionnalité** : « Configuration API IA » ; description « API Key Mistral (API IA) ».
- **Tutoriel** : CréationCompteMistral.html (plus ClaudeCode).
- **Section** : « API IA » partout ; « API Key » / « API Key Mistral » selon le step.
- **CA2** : Scénarios « container ouvert par défaut si clé absente » et « container fermé par défaut si clé présente » ajoutés.
- **Stockage** : « section ou propriété dédiée à l’API IA », clé chiffrée.

### `configuration-claudecode-test.feature`
- **Fonctionnalité** : « Configuration API IA - Test » ; « API Mistral (API IA) ».
- **Section** : « API IA » partout ; « l’API Mistral est mockée » dans les Given.

## Suite

- Les **step definitions** (`configuration-claudecode.steps.ts`, `justifications-rehibitoires.steps.ts`) et le **code applicatif** utilisent encore ClaudeCode (sélecteurs, endpoints, paramètres). Ils devront être adaptés en **TDD-back-end** puis **TDD-front-end** pour que les scénarios passent.
- **Prochaine étape** : TDD-back-end (paramètres Mistral, module d’appel API Mistral, suppression ClaudeCode).
