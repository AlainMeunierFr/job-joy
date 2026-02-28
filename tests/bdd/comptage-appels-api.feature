# language: fr
@us-2.5
Fonctionnalité: Comptage des appels API
  En tant qu'utilisateur de l'application
  Je souhaite que les appels aux API payantes ou limitées soient comptés
  Afin de suivre ma consommation et maîtriser mes coûts ou quotas.

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le tableau de bord est affiché

  # --- CA1 : Wrapper autour des appels API (Mistral et Airtable) ---
  Scénario: Un appel API Mistral enregistré produit une entrée dans le fichier de log du jour
    Étant donné qu'aucun log d'appels API n'existe pour la date "2026-02-23"
    Quand un appel API "Mistral" est enregistré avec succès pour la date "2026-02-23"
    Alors un fichier de log existe dans "data/log-appels-api/" pour la date "2026-02-23"
    Et ce fichier contient au moins un enregistrement avec l'API "Mistral"

  Scénario: Un appel API Airtable enregistré produit une entrée dans le fichier de log du jour
    Étant donné qu'aucun log d'appels API n'existe pour la date "2026-02-23"
    Quand un appel API "Airtable" est enregistré avec succès pour la date "2026-02-23"
    Alors un fichier de log existe dans "data/log-appels-api/" pour la date "2026-02-23"
    Et ce fichier contient au moins un enregistrement avec l'API "Airtable"

  # --- CA2 : Contenu du log (format JSON, champs requis, pas de donnée sensible en échec) ---
  Scénario: Chaque enregistrement de log contient l'API appelée, la date-heure et le statut succès
    Étant donné qu'un appel API "Mistral" a été enregistré avec succès pour la date "2026-02-23"
    Quand je lis le fichier de log pour la date "2026-02-23"
    Alors au moins un enregistrement du fichier contient le champ identifiant l'API (ex. "Mistral")
    Et cet enregistrement contient un champ date-heure (ex. format ISO 8601)
    Et cet enregistrement indique le succès (ex. succes: true ou champ équivalent)

  Scénario: En cas d'échec, l'enregistrement contient uniquement le code erreur et aucun message sensible
    Étant donné qu'un appel API "Airtable" a été enregistré en échec avec le code erreur "429" pour la date "2026-02-23"
    Quand je lis le fichier de log pour la date "2026-02-23"
    Alors au moins un enregistrement du fichier indique l'échec (ex. succes: false)
    Et cet enregistrement contient le code erreur "429"
    Et cet enregistrement ne contient pas de message d'erreur détaillé ni de corps de réponse

  # --- CA3 : Stockage (dossier data/log-appels-api/, un fichier par jour AAAA-MM-JJ.json) ---
  Scénario: Les enregistrements sont stockés dans un fichier par jour au format AAAA-MM-JJ.json
    Étant donné qu'un appel API a été enregistré pour la date "2026-02-23"
    Quand je liste les fichiers dans "data/log-appels-api/"
    Alors un fichier nommé "2026-02-23.json" existe dans ce dossier

  Scénario: Le dossier data/log-appels-api est créé automatiquement s'il n'existe pas
    Étant donné que le dossier "data/log-appels-api/" n'existe pas
    Quand un premier appel API est enregistré pour la date "2026-02-23"
    Alors le dossier "data/log-appels-api/" existe
    Et un fichier "2026-02-23.json" existe dans ce dossier

  Scénario: Les appels de plusieurs jours sont répartis dans un fichier par jour
    Étant donné qu'un appel API a été enregistré pour la date "2026-02-22"
    Et qu'un appel API a été enregistré pour la date "2026-02-23"
    Quand je liste les fichiers dans "data/log-appels-api/"
    Alors le fichier "2026-02-22.json" existe
    Et le fichier "2026-02-23.json" existe

  # --- CA4 : Tableau de bord « Consommation API » (container, tableau, bouton Calculer) ---
  Scénario: La page Tableau de bord affiche un container "Consommation API"
    Alors la page comporte un container ou une section intitulée "Consommation API"

  Scénario: Le container Consommation API contient un tableau avec une colonne par API (Mistral, Airtable)
    Alors le container Consommation API comporte un tableau
    Et le tableau comporte au moins une colonne "Mistral"
    Et le tableau comporte au moins une colonne "Airtable"

  Scénario: Le container Consommation API comporte un bouton "Calculer"
    Alors le container Consommation API comporte un bouton "Calculer"

  Scénario: Le tableau affiche une ligne par jour et le nombre d'appels par API après clic sur Calculer
    Étant donné que des logs d'appels existent dans "data/log-appels-api/" pour la date "2026-02-21" avec 2 appels Mistral et 3 appels Airtable
    Quand je clique sur le bouton "Calculer" du container Consommation API
    Alors le tableau Consommation API affiche une ligne pour la date "2026-02-21"
    Et la cellule pour la date "2026-02-21" et l'API "Mistral" affiche "2"
    Et la cellule pour la date "2026-02-21" et l'API "Airtable" affiche "3"

  Scénario: Le tableau n'est mis à jour qu'au clic sur le bouton Calculer
    Étant donné que des logs d'appels existent dans "data/log-appels-api/" pour la date "2026-02-20" avec 1 appel Mistral
    Et que le tableau de bord est affiché sans avoir encore cliqué sur "Calculer"
    Quand j'observe le tableau Consommation API
    Alors le tableau peut être vide ou ne pas afficher les données du 2026-02-20
    Quand je clique sur le bouton "Calculer" du container Consommation API
    Alors le tableau Consommation API affiche une ligne pour la date "2026-02-20"
    Et la cellule pour la date "2026-02-20" et l'API "Mistral" affiche "1"
