# Préparatif GitHub pour US-3.6 (Electron + Releases)

À faire **en avance** (ou dès la première release) pour que l’installateur et les mises à jour fonctionnent.

## 1. Rien d’obligatoire avant de coder

- **Releases** : activées par défaut sur tout repo GitHub.
- **Télécharger un .exe** : tu peux créer une release à la main, uploader le fichier .exe/.msi en “asset”, et partager le lien. Aucune config GitHub supplémentaire n’est nécessaire pour “télécharger un exe”.

## 2. Ce qui sera utile quand tu activeras les mises à jour (electron-updater)

- **Repo public** : electron-updater peut interroger GitHub Releases sans token. Aucune préparation.
- **Repo privé** : il faudra un **token GitHub** (Personal Access Token) avec au minimum `repo` (accès aux releases). Tu le configureras côté build ou dans l’app (variable d’environnement ou config) pour que l’app packagée puisse voir les releases. À faire au moment d’implémenter CA4.

## 3. Optionnel mais recommandé : build automatique (GitHub Actions)

- **Objectif** : à chaque tag (ex. `v1.0.0`), une action build l’exe Electron et le publie en asset de la release.
- **Préparatif** : rien côté “paramètres” GitHub. Il suffit d’ajouter un workflow dans le repo (ex. `.github/workflows/release-electron.yml`) qui se déclenche sur `push` de tag `v*`, build avec electron-builder, et upload l’artifact sur la release. On peut le prévoir dans l’US (TDD ou script de release).

## 4. Page de téléchargement (docs/telecharger.html)

- La page « Télécharger pour Windows » (version + lien vers le .exe/.msi) est dans **docs/telecharger.html**.
- Avec **GitHub Pages** (Settings → Pages → Source : dossier **/docs**), l’URL est simple : `https://TON_USER.github.io/job-joy/telecharger.html` (pas de « docs » dans l’URL).
- Dans le fichier, remplacer **GITHUB_REPO** par ton dépôt (ex. `'AlainMeunierFr/job-joy'`).

## 5. Résumé

| Besoin                         | Préparatif GitHub |
|--------------------------------|-------------------|
| Télécharger un exe (manuel)    | Aucun             |
| Page de téléchargement         | docs/telecharger.html ; GitHub Pages source /docs → URL simple |
| Mises à jour (repo public)     | Aucun             |
| Mises à jour (repo privé)      | Token PAT `repo`  |
| Build auto sur tag (optionnel) | Workflow Actions  |

Tu peux partir sans rien configurer sur GitHub et ajouter token + workflow quand tu attaqueras CA4 et la release.
