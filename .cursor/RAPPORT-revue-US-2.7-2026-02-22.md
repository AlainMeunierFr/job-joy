# Revue Lead Dev – US-2.7 (refinements + tunnel)

**Date** : 2026-02-22  
**Cible** : US-2.7 Calcul du score total dans l'app  
**Étape** : US validée → BDD (mode tunnel)

## Modifications US intégrées

- **CA3** : Chaque nom de variable peut être **sélectionné** pour copier-coller (éviter fautes de frappe).
- **CA4** : Formule par défaut = **moyenne mathématique pondérée en excluant les 0** (numérateur / dénominateur avec ternaires ; forme exacte à l’implémentation).
- **CA5** : Bouton **« Ouvrir la doc »** ouvre l’URL math.js **dans un nouvel onglet** (type target _blank).

## Vérifications

- US lue et cohérente avec le Sprint 2.
- Critères testables et sans ambiguïté.
- Tunnel prévu : BDD → TDD-back-end → TDD-front-end → Designer (interface web).

## Suite

- Délégation à l’agent **BDD** pour rédaction des scénarios .feature (US-2.7).
---

## Revue livraison BDD (même session, mode tunnel)

- **Fichier créé** : `tests/bdd/formule-score-total.feature` (# language: fr, @us-2.7).
- **Couverture** : CA1 à CA6 couverts par scénarios (store mock d'offres, pas d'Airtable réel).
- **Steps** : liste fournie par l'agent pour les step definitions (Given/When/Then).
- **Prochaine étape** : plan de tests baby steps → délégation TDD-back-end.

---

## Tunnel exécuté (GO NEXT sans interruption)

### TDD-back-end
- **utils/formule-score-total.ts** : evaluerFormule (math.js), FORMULE_DEFAULT (moyenne pondérée excluant 0), scoreTotalEntier, construireScope, getDefaultFormuleDuScoreTotal, mergeFormuleDuScoreTotal, calculerScoreTotal. Export NOMS_SCORES, NOMS_COEFS.
- **types/parametres.ts** : FormuleDuScoreTotal, ParametresPersistes.formuleDuScoreTotal.
- **utils/parametres-io.ts** : lireFormuleDuScoreTotalOuDefaut, ecrireFormuleDuScoreTotal.
- **Tests** : formule-score-total.test.ts, parametres-io.test.ts (26 tests). Typecheck OK.

### TDD-front-end
- **app/page-html.ts** : Bloc « Formule du score total » (details) sous Paramétrage prompt de l'IA ; 8 coefficients, textarea formule, liste variables (sélectionnables), aide + lien « Ouvrir la doc » (target _blank), bouton Enregistrer.
- **app/server.ts** : lecture formuleDuScoreTotal pour page Paramètres ; API GET/POST /api/formule-score-total.
- **app/scripts/parametres.js** : enregistrement bloc, copie variable vers presse-papiers.
- **tests/bdd/formule-score-total.steps.ts** : step definitions pour formule-score-total.feature.
- **Tests** : app/page-html.formule-score-total.test.ts. Build OK.

### Designer
- **app/content-styles.css** : Section complète pour `.blocParametrage-formuleScoreTotal` (conteneur, coefficients en grille, zone formule, liste variables type chip avec user-select: all, aide, lien doc, bouton). Tokens et cohérence avec les autres blocs Paramètres.

### Note BDD
- `npm run test:bdd` : 2 échecs préexistants (configuration-claudecode-test, configuration-airtable), non liés à US-2.7. Les scénarios formule-score-total.feature s’exécutent.

---

## Clôture US-2.7

- **Livraison** : Back-end (utils + types), front-end (bloc Paramètres + API + script), BDD (feature + steps), Designer (CSS). Prêt pour intégration du calcul dans le flux « après analyse IA » (appel à calculerScoreTotal + écriture Score_Total dans Airtable) si non déjà branché.
