# US-4.6 — Embarquer dans Electron tous les prérequis techniques pour l'enrichissement

- **En tant que** beta testeur utilisant l'application installée via le package Electron (sans environnement de dev),
- **Je souhaite** que tous les prérequis techniques nécessaires à l'enrichissement des offres soient inclus dans l'installateur,
- **Afin de** pouvoir lancer l'étape d'enrichissement (récupération du contenu des pages d'offres) pour toutes les sources supportées, sans installer ni configurer moi-même de navigateur ni de binaires supplémentaires.

---

## Périmètre et précisions

- **Sources concernées** : toutes les sources d'enrichissement supportées par l'app. En pratique :
  - **LinkedIn** et **Cadre emploi** : nécessitent aujourd'hui un navigateur (Playwright) → en package Electron, les binaires Playwright ne sont pas disponibles par défaut, d'où l'échec pour le beta testeur.
  - **Autres sources** (HelloWork, WTTJ, JTMS, etc.) : récupération par HTTP → déjà fonctionnelles en package si le réseau est correct ; pas de prérequis « navigateur » à embarquer.
- **« Tous les prérequis techniques »** : ici, ce qui doit être **livré avec l'app** pour que l'enrichissement fonctionne en package :
  - capacité à charger des pages web et en extraire le contenu pour les sources qui en ont besoin (ex. réutilisation du Chromium d'Electron, ou binaires Playwright livrés dans l'installateur) ;
  - pas de dépendance à une installation manuelle (ex. `npx playwright install`) par l'utilisateur.
- **Hors périmètre** : clés API, configuration compte (email, Airtable, etc.) restent à la charge de l'utilisateur ; l'US ne porte que sur les **prérequis techniques livrés dans le package Electron**.

---

## Critères d'acceptation

- **CA1 - Enrichissement LinkedIn en package Electron** :
  - Lorsque l'app est lancée depuis le package Electron (après installation par l'installateur), l'enrichissement des offres LinkedIn peut récupérer le contenu des pages d'offres sans que l'utilisateur ait à installer Playwright ou un navigateur séparé.

- **CA2 - Enrichissement Cadre emploi en package Electron** :
  - Dans les mêmes conditions (app lancée depuis le package Electron), l'enrichissement des offres Cadre emploi peut récupérer le contenu des pages d'offres sans installation supplémentaire par l'utilisateur.

- **CA3 - Autres sources d'enrichissement** :
  - Les sources d'enrichissement qui n'utilisent pas de navigateur (HelloWork, WTTJ, JTMS, etc.) continuent de fonctionner en package Electron sans régression.

- **CA4 - Comportement en dev inchangé** :
  - En environnement de dev (ex. `npm run dev` ou `node dist/app/server.js`), le comportement de l'enrichissement reste inchangé ; on peut continuer à utiliser Playwright tel quel si les binaires sont présents.

- **CA5 - Aucune action technique requise pour le beta testeur** :
  - Le beta testeur n'a pas à exécuter de commande d'installation de binaires (ex. `npx playwright install`) ni à configurer de chemin vers un navigateur pour que l'enrichissement LinkedIn et Cadre emploi fonctionne depuis le package Electron.

---

## Lien avec US-4.3

US-4.3 propose une **piste de solution** (réutiliser le Chromium d'Electron pour LinkedIn, éventuellement Cadre emploi). US-4.6 exprime le **besoin produit** avec des CA sur LinkedIn, Cadre emploi, autres sources et environnement de dev. L'implémentation peut s'appuyer sur la piste US-4.3 ou sur une autre approche (ex. livraison des binaires Playwright dans l'installateur).
