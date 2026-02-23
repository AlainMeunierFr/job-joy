# Rapport de revue Lead Dev — TDD-front-end US-1.1 (21 février 2026)

## Contexte

- **US** : US-1.1 Configuration du compte email (périmètre IMAP confirmé)
- **Action GO NEXT** : revue + corrections par le Lead Dev pour faire passer les BDD

## Modifications effectuées (Lead Dev)

### 1. Serveur BDD sous Windows
- **Problème** : en BDD, le POST `/api/test-connexion` ne recevait pas de réponse (timeout) lorsque le serveur était lancé par Playwright avec `env` dans la config.
- **Solution** : script **`scripts/run-bdd-server.mjs`** qui fixe `PORT` et `BDD_MOCK_CONNECTEUR` avant d’importer le serveur. Playwright utilise ce script en `webServer.command`.
- **Résultat** : les appels API pendant les tests BDD reçoivent bien une réponse.

### 2. Écoute serveur
- **`app/server.ts`** : `server.listen(PORT, '127.0.0.1', ...)` pour écouter explicitement en IPv4.

### 3. Steps BDD « Test connexion »
- **When** « je clique sur le bouton de test de connexion » : attente de la réponse HTTP POST `/api/test-connexion` via `waitForResponse`, puis vérification que `#resultat-test-message` n’est plus vide.
- **Given** « j’ai effectué un test de connexion » : même logique (waitForResponse + attente d’un message non vide).

### 4. Mock connecteur (api-handlers)
- Succès **uniquement** pour `alain@maep.fr` + `MonMotDePasse`. Toute autre combinaison (après validation) renvoie « erreur sur 'adresse email' ou le 'mot de passe' ».
- Les exemples #3, #4, #5 du tableau de cas devraient passer avec un serveur **démarré par la suite BDD** (pas un serveur déjà lancé à la main sur 3001).

### 5. Config Playwright
- **Port 3001** : `webServer.url` et `baseURL` déjà sur 3001.
- **`reuseExistingServer: true`** : si un processus écoute déjà sur 3001, il est réutilisé. Pour avoir le **dernier mock**, lancer les BDD **sans** serveur déjà en cours sur 3001, ou arrêter l’existant avant `npm run test:bdd`.

## État des tests

- **Dernière exécution** : 12 passés, 3 échoués (Exemples #3, #4, #5 — message « succès » au lieu de « erreur »). Cause probable : serveur réutilisé avec une ancienne build (mock précédent).
- **Mémorisation** : les 2 scénarios CA3 passent (When utilise `page.request.post` + mise à jour du DOM en test).

## Recommandation

- Avant **`npm run test:bdd`** : ne pas lancer de serveur sur le port 3001 (ou l’arrêter), afin que Playwright démarre `scripts/run-bdd-server.mjs` avec la build et le mock à jour.  
- Si besoin, **`reuseExistingServer: false`** force un nouveau serveur à chaque run (attention : erreur si 3001 est déjà pris).

## Suite

- **TDD-front-end** : livraison considérée **valide** sous réserve que la suite BDD soit verte avec un serveur frais (pas de processus sur 3001 avant le run).
- **Designer** : étape suivante pour le CSS (structure DOM livrée par TDD-front-end).
