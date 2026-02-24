# language: fr
Fonctionnalité: Publication de l'application (installateur et mise à jour Electron)
  En tant qu'utilisateur non développeur, je souhaite installer l'application depuis un installateur
  (exe/msi) et recevoir les mises à jour automatiquement, afin d'utiliser et maintenir l'app
  sans compétences techniques.

  Contexte: application cible 3–4 utilisateurs Windows, POC ; distribution gratuite via GitHub Releases.
  Données (DATA_DIR) : en dev = répertoire projet ; en version packagée = répertoire utilisateur
  (ex. %APPDATA%/analyse-offres).

  # --- CA1 : Installateur - disponibilité du téléchargement ---
  Scénario: Une page ou un lien permet de télécharger l'installateur Windows
    Étant donné que l'application est publiée (ex. release GitHub ou page de téléchargement)
    Quand l'utilisateur consulte la page des releases ou le lien de téléchargement
    Alors un lien vers un installateur Windows (.exe ou .msi) est disponible

  # --- CA1 : Installateur - emplacement et raccourcis après installation ---
  Scénario: Après installation, l'application est dans un emplacement adapté et un raccourci est créé
    Étant donné que l'installateur Windows a été exécuté avec succès
    Alors l'application est installée dans un répertoire adapté (ex. sous %LOCALAPPDATA%\Programs ou équivalent)
    Et un raccourci vers l'application est présent (Menu Démarrer et/ou Bureau)

  # --- CA2 : Lancement tout-en-un ---
  Scénario: L'utilisateur lance l'application packagée sans commande à taper
    Étant donné que l'application est installée (version packagée Electron)
    Quand l'utilisateur lance l'application (raccourci ou exe)
    Alors un serveur web local est démarré automatiquement
    Et une fenêtre s'ouvre affichant l'interface de l'application (ex. localhost avec port dédié)
    Et aucune commande en ligne de commande n'est requise

  Scénario: La fenêtre ouverte affiche l'interface utilisateur de l'application
    Étant donné que l'application packagée est lancée
    Quand la fenêtre de l'application est affichée
    Alors l'interface de l'application (page d'accueil ou tableau de bord) est visible
    Et l'application est accessible via une adresse locale (ex. localhost avec un port dédié)

  # --- CA3 : Données utilisateur (DATA_DIR) ---
  Scénario: En version packagée, les données utilisateur sont stockées dans le répertoire dédié (DATA_DIR)
    Étant donné que l'application packagée est lancée (version Electron)
    Quand l'application enregistre une donnée utilisateur (config ou donnée métier)
    Alors le fichier ou le répertoire est créé dans le répertoire dédié utilisateur (DATA_DIR)
    Et pas dans le répertoire d'installation de l'application

  Scénario: Un fichier de configuration créé au premier lancement est dans DATA_DIR
    Étant donné que l'application packagée est lancée pour la première fois ou après un enregistrement de config
    Quand l'application crée ou met à jour un fichier de configuration
    Alors ce fichier est présent dans le répertoire DATA_DIR (ex. %APPDATA%/analyse-offres ou équivalent)

  # --- CA4 : Mises à jour ---
  Scénario: L'application propose une mise à jour quand une version plus récente existe
    Étant donné que l'application installée est en version "<version_installée>"
    Et qu'une version plus récente "<version_disponible>" est disponible (mock ou métadonnée de release)
    Quand l'application vérifie les mises à jour
    Alors l'utilisateur est informé qu'une mise à jour est disponible
    Et l'application propose d'installer ou de télécharger la nouvelle version (ou des instructions claires)

    Exemples:
      | version_installée | version_disponible |
      | 1.0.0             | 1.1.0             |
      | 1.2.0             | 2.0.0             |

  # --- CA5 : Coexistence dev / Electron (comportement observable) ---
  Scénario: La version Electron utilise un répertoire de données distinct du répertoire projet
    Étant donné que la version de développement utilise le répertoire projet pour les données
    Quand l'utilisateur lance la version packagée (Electron) sur la même machine
    Alors la version Electron utilise le répertoire dédié utilisateur (DATA_DIR) pour les données
    Et non le répertoire du projet de développement

  # Note CA5 : La possibilité pour le développeur de "continuer à utiliser la version dev
  # en parallèle" relève du contexte machine et du manuel ; elle n'est pas décrite par un
  # scénario BDD automatisé supplémentaire ici.
