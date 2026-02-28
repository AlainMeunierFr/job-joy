# Tunnel US 2.3 – Construire le prompt de l'IA (clôture)

**Date** : 2026-02-23  
**Demande** : GO NEXT Tunnel (enchaîner BDD → TDD-back-end → TDD-front-end → Designer).

## Parcours

| Étape            | Agent           | Livrable |
|------------------|-----------------|----------|
| BDD             | BDD             | `tests/bdd/prompt-ia.feature` (zone Prompt, partie fixe/modifiable, boutons, persistance) |
| TDD-back-end    | TDD-back-end    | `types/parametres.ts` (promptIA), `utils/parametres-io.ts` (lire/ecrire partie modifiable), `utils/prompt-ia.ts` (PARTIE_FIXE, défaut, construirePromptComplet, injection placeholders), tests |
| TDD-front-end   | TDD-front-end   | GET/POST `/api/prompt-ia`, zone Prompt IA dans page Paramètres (partie fixe en details/pre, textarea 50 lignes, boutons), `tests/bdd/prompt-ia.steps.ts`, e2eID |
| Designer        | Designer        | CSS zone Prompt IA dans `content-styles.css` (pre lecture seule, textarea, actionsPromptIA) |

## Vérifications

- **Tests unitaires** : `utils/prompt-ia.test.ts` → 6 tests passent.
- **BDD** : 10 scénarios `prompt-ia.feature` passent (rapportés par TDD-front-end).

## Fichiers impactés (résumé)

- **types** : `parametres.ts` (promptIA).
- **utils** : `parametres-io.ts` (lirePartieModifiablePrompt, ecrirePartieModifiablePrompt), `prompt-ia.ts`, `prompt-ia.test.ts`, `index.ts`.
- **app** : `server.ts` (GET/POST /api/prompt-ia, options page), `page-html.ts` (zone Prompt IA), `content-styles.css` (Designer).
- **tests/bdd** : `prompt-ia.feature`, `prompt-ia.steps.ts`.

## Décision

**Tunnel US 2.3 terminé.** Prêt pour revue fonctionnelle et commit.
