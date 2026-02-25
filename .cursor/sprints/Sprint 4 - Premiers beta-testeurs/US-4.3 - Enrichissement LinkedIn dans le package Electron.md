# US-4.3 — Enrichissement LinkedIn fonctionnel dans le package Electron

**En tant que** beta testeur de l'app qui ne dispose que du package Electron (sans environnement de dev)  
**Je souhaite** que l'enrichissement LinkedIn fonctionne  
**Afin de** bénéficier des services de l'app pour cette source.

---

## Contexte

- L'enrichissement LinkedIn (étape 2 : récupération du texte des offres) s'appuie aujourd'hui sur **Playwright** : le serveur Node lance un navigateur Chromium/Edge via `chromium.launch()` pour charger la page LinkedIn et en extraire le contenu.
- En **dev** : Playwright peut télécharger/utiliser ses binaires (ex. `npx playwright install`). Ça fonctionne.
- En **package Electron** : le serveur tourne dans un processus enfant (spawn par Electron), avec un `cwd` égal au chemin de l'app packagée. Les **binaires Playwright** (Chromium) ne sont pas inclus dans l'installateur et ne sont pas au bon endroit → l'enrichissement LinkedIn échoue pour le beta testeur.

## Critères d'acceptation

- **CA1** : Lorsque l'app est lancée depuis le package Electron (installateur), le worker d'enrichissement peut récupérer le contenu des pages d'offres LinkedIn (et idéalement Cadre emploi, même logique) sans que l'utilisateur ait à installer Playwright ou un navigateur à part.
- **CA2** : Comportement en dev (npm run dev / node dist/app/server.js) inchangé : on peut continuer à utiliser Playwright tel quel si les binaires sont présents.
- **CA3** : Pas de régression sur les autres sources d'enrichissement (HelloWork, WTTJ, JTMS, etc.) qui n'utilisent pas Playwright.

## Piste technique recommandée : réutiliser le Chromium d'Electron

Au lieu de lancer un **second** navigateur (Playwright), utiliser le **Chromium déjà embarqué dans Electron** pour charger la page LinkedIn et en extraire le contenu :

1. **Côté Electron (main)** : exposer un petit serveur HTTP local (ex. port 3099, localhost uniquement) ou un canal IPC depuis le renderer, pour recevoir une requête du type « fetch LinkedIn URL ».
2. **Dans le main** : créer une **fenêtre cachée** (`BrowserWindow` avec `show: false`), charger l’URL LinkedIn dans cette fenêtre, exécuter la même logique d’extraction (fermeture des popups, clic « Voir plus », extraction des blocs texte) via `webContents.executeJavaScript()` ou en réutilisant la logique actuelle de `linkedin-page-fetcher` (à adapter pour un contexte Electron).
3. **Côté serveur Node** : détecter le mode « app packagée Electron » (ex. présence de `JOB_JOY_USER_DATA` + variable dédiée type `JOB_JOY_ELECTRON_FETCH_URL` passée par Electron au spawn). Si en mode Electron, appeler l’endpoint local Electron (ex. `POST http://127.0.0.1:3099/fetch-linkedin`) au lieu d’appeler `chromium.launch()`. Sinon, garder le comportement Playwright actuel.

**Avantages** : pas de double binaire Chromium, pas besoin de livrer Playwright dans l’installateur, expérience beta testeur immédiate.

**Variante** : livrer les binaires Playwright dans l’installateur (extraResources electron-builder) et pointer `executablePath` vers ce chemin en mode packagé. Plus lourd (~200 Mo+) et plus fragile (chemins, mises à jour Playwright).

---

*Référence : `utils/linkedin-page-fetcher.ts`, `utils/cadreemploi-page-fetcher.ts`, `electron/main.cjs`, `app/server.ts` (DATA_DIR / env au spawn).*
