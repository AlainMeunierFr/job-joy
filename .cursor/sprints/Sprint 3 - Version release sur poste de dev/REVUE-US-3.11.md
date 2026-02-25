# Revue Lead Dev — US-3.11 (Gestion du numéro de version et process de mise à jour)

**Date** : 2026-02-22  
**Statut** : ✅ US acceptée

## Vérifications

- **Format DOD** : En tant que / Je souhaite / Afin de présents et cohérents.
- **Critères d'acceptation** : CA1 à CA8 rédigés, testables (source de vérité, affichage cohérent, process documenté, vérification, sémantique W.X.Y.Z, script d'incrément, option menu distincte de la sauvegarde, lien GitHub Release optionnel).
- **Pas de code** : livrable US uniquement, conforme au rôle de l'agent US.

## Décision

- US-3.11 validée. Passage à l’étape suivante.
- **Tunnel** : livrable = outillage (script bump + menu) + doc. BDD optionnel (non requis pour cette US). **TDD-back-end** : logique d’incrément de version (W.X.Y.Z) dans le domaine + script utilisable par Menu.ps1.

## Suite

Délégation à **TDD-back-end** en autonomie (plan de tests baby steps inclus dans le prompt).

---

## Revue TDD-back-end (2026-02-22)

- **utils/bump-version.ts** : bumpVersion(current, type) + parseVersion, conforme au plan de tests. Couverture 100 % (statements/lines/funcs), branches ~93 %.
- **utils/bump-version.test.ts** : 8 tests, tous passants.
- **scripts/bump-version-cli.ts** : lit/écrit package.json, pas de git (conforme CA6).
- **package.json** : version en 4 segments, script cli:bump-version ajouté.
- **ESLint** : pas de script `lint` dans le projet (non bloquant pour cette livraison).
- **Livrable accepté.** Suite : intégration dans Menu.ps1 (option « Publier une version »).

---

## Intégration Menu.ps1 (Lead Dev, même jour)

- **Option 8** « Publier une version » ajoutée au menu (distincte de l’option 6).
- Sous-menu « Choix du type » : 1=major, 2=schema, 3=feature, 4=hotfix.
- Enchaînement : build → `node dist/scripts/bump-version-cli.js <type>` → git add → commit « Release vW.X.Y.Z » → tag vW.X.Y.Z → git push + push tag.
- Option 6 inchangée (sauvegarde sans version). CA7 et CA6 couverts.
