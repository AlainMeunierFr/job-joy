### Sujet
#### Prompt
##### Résultat

Revue Lead Dev de la livraison **TDD-back-end** pour **US-1.8 (lane B)**.

Statut : **REFUSÉE (bloquants)**.

1) Bloquant — BDD non validable (steps manquants)
- Exécution : `npm run test:bdd`
- Résultat : échec immédiat avec `Missing step definitions: 91`.
- Impact : selon la règle de revue, la livraison TDD-back-end ne peut pas être acceptée sans passage BDD.

2) Bloquant — Règles métier US-1.8 non alignées avec les scénarios BDD HelloWork
- Le BDD exige explicitement une source HelloWork active :
  - `tests/bdd/offres-emails-hellowork.feature` (CA1/CA2 : plugin `HelloWork`, `actif=true`).
- Le code métier audit/source continue de mapper uniquement `Linkedin` ou `Inconnu` :
  - `utils/gouvernance-sources-emails.ts` (`PluginSource = 'Linkedin' | 'Inconnu'`, mapping expéditeur sans cas HelloWork).
  - `scripts/run-audit-sources.ts` (`pluginParExpediteur`: LinkedIn sinon Inconnu ; activation par défaut seulement LinkedIn).
- Impact : l’audit ne peut pas produire le comportement attendu par l’US pour les emails HelloWork.

3) Majeur — Contournement typé `as never` au lieu d’un modèle métier explicite
- Le support HelloWork est injecté avec des casts :
  - `utils/source-plugins.ts` (`'HelloWork' as never`)
  - `utils/gouvernance-sources-emails.test.ts` (sources/tests avec `'HelloWork' as never`)
- Impact : dette technique + incohérence du domaine (type `PluginSource` non aligné).

4) Majeur — DoD outillage non respectée côté lint
- `npm run lint` indisponible (`Missing script: "lint"`).
- Impact : le contrôle ESLint demandé par la revue Lead Dev n’est pas exécutable en l’état.

Décision Lead Dev :
- Retour en correction sur l’étape **TDD-back-end** de **US-1.8**.
- Attendu minimum pour nouvelle livraison :
  - Aligner le domaine source/audit sur `HelloWork` (type + mapping + activation attendue),
  - Supprimer les casts `as never` en modélisant l’plugin proprement,
  - Revalider le flux BDD pertinent (ou corriger la stratégie de steps manquants),
  - Fournir un point clair sur la commande lint (script ESLint ou règle de revue adaptée).
