# Revue tunnel US-3.6 – Publication application (Electron)

**Date** : 2026-02-24  
**Mode** : tunnel sans interruption (US → BDD → TDD-back-end → TDD-front-end)

## US-3.6

- **Titre** : Publier l'application (installateur et mise à jour automatique via Electron)
- **Ajustements US** : titre et CA5 ("construire" au lieu de "builder") appliqués. Conforme DOD.

## BDD

- **Fichier** : `tests/bdd/publication-application-electron.feature`
- **CA** : CA1 (installateur), CA2 (lancement), CA3 (DATA_DIR), CA4 (mises à jour), CA5 (coexistence) couverts par scénarios. Steps listés pour step definitions.

## TDD-back-end

- **utils/data-dir.ts** : getDataDir(options), DataDirOptions. Règles isPackaged + userDataDir. Tests 9, couverture 100 % (statements/lines/functions).
- **Verdict** : accepté.

## TDD-front-end

- **app/server.ts** : DATA_DIR via getDataDir ; si ANALYSE_OFFRES_USER_DATA → userData, sinon cwd/data. mkdirSync.
- **electron/main.cjs** : lance serveur avec env, attend /api/health, ouvre BrowserWindow sur localhost:PORT.
- **package.json** : main, scripts build:electron / start:electron, electron + electron-builder, config build (nsis).
- **tests/bdd/publication-application-electron.steps.ts** : steps automatisés (DATA_DIR, interface visible) + stubs pour installateur/fenêtre/mises à jour.
- **electron/README.md** : doc dev vs Electron.
- **Verdict** : accepté.

## Suite

- **Designer** : non requis pour US-3.6 (pas de nouveau type de contenu UI).
- **CA4 (mises à jour)** : electron-updater et GitHub Releases à brancher en phase suivante si besoin.
- **Préparatif GitHub** : voir `.cursor/sprints/Sprint 3 - Publication de l'application/PREPARATIF-GITHUB-US-3.6.md`.
