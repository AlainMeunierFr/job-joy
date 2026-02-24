#### US-3.6 : Publier l'application (installateur et mise à jour automatique via Electron)

- **En tant que** utilisateur non développeur
- **Je souhaite** installer l'application depuis un installateur (exe/msi) et recevoir les mises à jour automatiquement
- **Afin de** utiliser et maintenir l'app sans compétences techniques

---

**Contexte**

- Application actuellement en dev (Node, serveur local). Cible : 3–4 utilisateurs Windows, POC.
- Distribution gratuite via GitHub Releases.
- Données (DATA_DIR) : en dev = répertoire projet ; en version packagée = répertoire utilisateur (ex. `%APPDATA%/job-joy` ou équivalent).
- Le développeur doit pouvoir garder la version dev (navigateur + serveur dev) et tester la version Electron installée sur la même machine.

---

**Critères d'acceptation** :

- **CA1 - Installateur** :
  - Une page web simple (ou un lien direct) permet de télécharger un installateur Windows (.exe ou .msi).
  - L'installation place l'application dans un emplacement adapté (ex. `%LOCALAPPDATA%\Programs\...`) et crée un raccourci (Menu Démarrer et/ou Bureau).

- **CA2 - Lancement tout-en-un** :
  - L'utilisateur lance l'app (raccourci ou exe). Un serveur web local est démarré automatiquement et une fenêtre (navigateur intégré ou navigateur par défaut) s'ouvre sur l'interface (ex. localhost:3001). Aucune commande à taper.

- **CA3 - Données utilisateur** :
  - En version packagée, les données (config, données métier) sont stockées dans un répertoire dédié utilisateur (DATA_DIR), pas dans le dossier d'installation, pour persistance et mises à jour sans perte.

- **CA4 - Mises à jour** :
  - L'app peut vérifier la disponibilité d'une nouvelle version (ex. via GitHub Releases). Si une mise à jour est disponible : téléchargement puis proposition d'installer et redémarrer (ou instructions claires pour installer le nouvel exe/msi).

- **CA5 - Coexistence dev / Electron** :
  - Le développeur peut continuer à utiliser la version dev (serveur dev, navigateur, debug) sur sa machine. Il peut en parallèle construire et installer la version Electron sur la même machine pour tester le comportement exact des utilisateurs finaux.
