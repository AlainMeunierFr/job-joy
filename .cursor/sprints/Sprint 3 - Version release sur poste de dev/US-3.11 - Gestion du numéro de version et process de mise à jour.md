#### US-3.11 : Gestion du numéro de version et process de mise à jour

- **En tant que** développeur ou mainteneur du projet Job-Joy (application Electron et page de téléchargement)
- **Je souhaite** disposer d'une source de vérité unique pour le numéro de version et d'un process clair pour publier une nouvelle release
- **Afin de** éviter les incohérences d'affichage (page téléchargement, installeur, « À propos ») et de publier des versions de façon reproductible (build, tag, release GitHub, notification éventuelle des utilisateurs)

---

- **Critères d'acceptation** :

- **CA1 – Source de vérité du numéro de version** :
  - Une et une seule source définit le numéro de version de l'application (ex. champ `version` dans `package.json`). Les autres emplacements (page de téléchargement, installeur, page « À propos », binaire) dérivent de cette source ou sont générés à partir d'elle au moment du build.
  - Le numéro de version est sur **4 niveaux** : **W.X.Y.Z** (aligné sur le tag Git `vW.X.Y.Z`).
  - Si un tag Git est utilisé en complément (ex. pour les releases), il est aligné sur cette source (ex. tag `v1.0.2.3` reflète la version dans `package.json`).

- **CA2 – Utilisation cohérente du numéro** :
  - La page de téléchargement (ex. `docs/telecharger.html` ou équivalent) affiche le même numéro de version que la source de vérité (ou une version récupérée automatiquement depuis cette source / depuis les releases).
  - L'installeur (exe/msi) ou le package Electron expose le même numéro de version (metadata produit, nom du fichier généré, ou équivalent).
  - La page ou section « À propos » dans l'application affiche le même numéro de version.

- **CA3 – Process de publication d'une nouvelle version** :
  - Un process documenté (README, doc dédiée ou checklist) décrit les étapes pour publier une nouvelle version : mise à jour du numéro à la source de vérité, build, création du tag Git (si applicable), création de la release GitHub (artefacts), et éventuellement notification des utilisateurs (lien release, annonce).
  - Les étapes sont reproductibles : un mainteneur peut suivre le process pour produire une release sans ambiguïté sur l'ordre des opérations (ex. tag après build réussi, artefacts attachés à la release).

- **CA4 – Vérification** :
  - Après une release, on peut vérifier que le numéro affiché sur la page de téléchargement, dans l'installeur (ou le binaire) et dans « À propos » est identique pour une même version livrée.

- **CA5 – Sémantique des 4 niveaux (W.X.Y.Z)** :
  - **W** (version majeure) : réservé aux grosses modifications.
  - **X** : réservé aux changements de schéma de données (mise à jour Airtable ou structure de `parametres.json`).
  - **Y** : au moins une nouvelle fonctionnalité.
  - **Z** (hotfix) : uniquement des corrections de bugs.
  - La décision du niveau à incrémenter reste humaine au moment de la release (pas d'automatisation de cette décision).

- **CA6 – Script d'incrément et création du tag** :
  - Un script (ex. CLI ou script PowerShell intégré au menu du projet) permet de préparer une nouvelle version pour la release.
  - Le script lit la version actuelle depuis la source de vérité (ex. `package.json`).
  - Le script propose au mainteneur de choisir le type de bump : `major` (W), `schema` (X), `feature` (Y) ou `hotfix` (Z) — via un sous-menu « Choix du type » lorsque l'utilisateur choisit de publier une version.
  - Selon le choix, le script incrémente le segment correspondant (W, X, Y ou Z) et remet à zéro tous les segments à droite (ex. bump `feature` sur `1.0.2.3` → `1.0.3.0`).
  - Le script met à jour la source de vérité et tous les autres emplacements où la version est utilisée (ex. `package.json` et tout fichier ou artefact qui en dérive ou doit rester synchronisé).
  - Le script effectue ensuite un **commit** (message explicite, ex. « Release v1.0.2.4 »), crée le tag Git `vW.X.Y.Z`, puis pousse le commit et le tag vers le dépôt distant (push).
  - Le process documenté (CA3) est mis à jour pour inclure l'usage de ce script dans les étapes de publication.

- **CA7 – Option « Publier une version » dans le menu du projet (ex. Menu.ps1)** :
  - Le menu du projet (ex. `Menu.ps1`) propose une option dédiée « Publier une version », distincte de l'option de sauvegarde sur GitHub (ex. option 6 « Sauvegarder sur GitHub »).
  - Lorsque l'utilisateur choisit « Publier une version », le script affiche le sous-menu « Choix du type » (major | schema | feature | hotfix), puis enchaîne bump, mise à jour de la source de vérité, commit, création du tag, push (commit + tag), comme décrit en CA6.
  - L'option de sauvegarde sur GitHub sans version (ex. option 6) reste inchangée : elle effectue uniquement add, commit et push, sans incrément de version, sans création de tag ni de release. Elle ne crée pas de version.
  - Testable : choisir l'option « Publier une version » puis un type (ex. hotfix) → la version en source de vérité est incrémentée correctement, un commit et un tag `vW.X.Y.Z` sont créés et poussés ; choisir l'option 6 (sauvegarde) → aucun tag ni bump n'est effectué.

- **CA8 – Lien avec la GitHub Release (optionnel)** :
  - Le process documenté peut prévoir, si le produit le retient, un lien avec la création d'une GitHub Release (ex. attacher le binaire .exe produit par le build, avant ou après l'exécution de l'option « Publier une version »). Ce point reste optionnel et peut être traité dans la documentation du process (CA3) ou par un outil externe.
