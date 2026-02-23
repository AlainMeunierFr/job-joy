<!-- Pas de H1 ni H2 dans les fichiers journal -->

### GO NEXT — Revue lane B (US-1.8 HelloWork)

#### Prompt
GO NEXT : revue de la livraison TDD-front-end pour US-1.8 (Analyse des emails HelloWork). Consignes passées en RAM (Task), plus de mise à jour des fichiers de consignes (ex. go-next.md).

#### Résultat
- **Revue** : Livraison acceptée. Correctif Lead Dev : erreur TypeScript sur la route `POST /api/test/set-mock-sources` (body `plugin: string` vs `PluginSource`) — import de `PluginSource` et cast explicite dans `app/server.ts`.
- **BDD** : 7 scénarios `offres-emails-hellowork.feature` passent (`npx playwright test --grep "HelloWork|hellowork|Offres des emails"`).
- **Lane B** : marquée **done** dans `US-en-cours.json`. Pas de passage Designer (aucune nouvelle page UI).
- Source de vérité des lanes = `.cursor/sprints/US-en-cours.json` ; délégation via Task avec prompt en RAM.

---

### Serveur nodemon — boucle de « crash » (EADDRINUSE)

#### Prompt
Le serveur « plante » en boucle ; message « [nodemon] app crashed - waiting for file changes before starting... » puis redémarrage. Après exécution de l’option « tuer les process sur 3001 et relancer », le port est signalé libre mais le serveur affiche encore « port déjà utilisé ».

#### Résultat
- **Diagnostic** : (1) Redémarrage trop rapide → l’ancien processus n’avait pas le temps de libérer le port (arrêt brutal sans fermeture du socket). (2) Port en **TIME_WAIT** après un kill → Windows garde le port un moment ; un démarrage immédiat peut encore voir le port « occupé » alors qu’aucun process n’apparaît en écoute.
- **Modifications** :
  - **Arrêt propre** : gestion de `SIGTERM` et `SIGINT` dans `app/server.ts` → `server.close()` puis `process.exit(0)` pour libérer le port correctement.
  - **Message EADDRINUSE** : handler `server.on('error')` avec message explicite et indication (taskkill / netstat) au lieu du seul stack trace Node.
  - **Délai nodemon** : `--delay 2500` ajouté dans le script `dev` de `package.json` pour laisser le temps au processus précédent de quitter avant relance.
  - **Réutilisation du port** : `server.listen({ port, host, reuseAddress: true })` dans `app/server.ts` pour pouvoir réécouter immédiatement sur le même port (SO_REUSEADDR) même en TIME_WAIT.

---

### GO US — US-1.9 (Analyse des emails Welcome to the Jungle)

#### Prompt
GO US pour US-1.9 à partir du fichier « US-1.9 - Analyse des emails Welcome to the Jungle.txt ».

#### Résultat
- **Agent US** invoqué via Task (prompt en RAM). US reformulée au format DOD.
- **Fichier créé** : `.cursor/sprints/Sprint 1 - Relève les emails/US-1.9 - Analyse des emails Welcome to the Jungle.md` (remplace le .txt).
- **Contenu** : En tant que utilisateur / Je souhaite (offres emails Welcome to the Jungle dans table Offres) / Afin de (analyse par IA). CA1 init sources Airtable (énumération Plugin), CA2 audit (expéditeur `alerts@welcometothejungle.com` → plugin « Welcome to the Jungle », actif), CA3 étape 1 plug-in (body email, exemples `tests/exemples/alerts@welcometothejungle.com`, décodage URL base64), CA4 étape 2 worker (enrichissement, référence `data/ressources/AnalyseeMailWelcometoTheJungle.js`). Plugin affichage « Welcome to the Jungle », plug-in « WelcomeToTheJungle » (PascalCase).
- **Revue Lead Dev** : US acceptée. Rappel : à l’implémentation, ajouter `WelcomeToTheJungle` au type `PluginSource` et à la gouvernance (`utils/gouvernance-sources-emails.ts`).

---

### Journal Agent 2 (demande utilisateur)

#### Prompt
Écrire dans `.cursor/journaux` un fichier « Journal Agent 2.md » avec l’export de nos changements pour la rétrospective.

#### Résultat
- Fichier `.cursor/journaux/Journal Agent 2.md` créé avec l’export structuré (Sujet / Prompt / Résultat) des thèmes de la session.
