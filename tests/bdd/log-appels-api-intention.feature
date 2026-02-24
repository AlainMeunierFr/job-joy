# language: fr
@us-3.4
Fonctionnalité: Log appels API avec intention métier
  En tant qu'utilisateur ou mainteneur
  Je souhaite que chaque entrée de log d'appel API comporte une intention métier
  Afin de diagnostiquer l'origine des appels et retrouver le contexte (méthode, API).

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le tableau de bord est affiché

  # --- CA2 : Log JSON avec intention ---
  Scénario: Un appel enregistré avec une intention produit une entrée de log contenant cette intention
    Étant donné qu'aucun log d'appels API n'existe pour la date "2026-02-24"
    Quand un appel API "Claude" est enregistré avec succès pour la date "2026-02-24" avec l'intention "Analyse IA lot"
    Alors un fichier de log existe dans "data/log-appels-api/" pour la date "2026-02-24"
    Et ce fichier contient au moins un enregistrement avec le champ intention "Analyse IA lot"

  Scénario: Un appel peut être enregistré sans intention
    Étant donné qu'aucun log d'appels API n'existe pour la date "2026-02-24"
    Quand un appel API "Airtable" est enregistré avec succès pour la date "2026-02-24" sans intention
    Alors un fichier de log existe dans "data/log-appels-api/" pour la date "2026-02-24"
    Et ce fichier contient au moins un enregistrement avec l'API "Airtable"
    Et cet enregistrement ne contient pas de champ intention ou a une intention vide

  # --- CA4 : Agrégation par intention (exposée via API ou consommation) ---
  Scénario: La consommation pour une date donnée expose les totaux par intention
    Étant donné que des logs d'appels existent pour la date "2026-02-24" avec 2 appels d'intention "Analyse IA lot" et 1 appel d'intention "Synthèse Airtable"
    Quand j'appelle l'API GET /api/consommation-api
    Alors la réponse contient pour la date "2026-02-24" les totaux par intention
    Et le total pour l'intention "Analyse IA lot" vaut 2
    Et le total pour l'intention "Synthèse Airtable" vaut 1

  # --- CA5 : Rétrocompatibilité ---
  Scénario: Un fichier de log sans champ intention reste lisible et l'agrégation par API fonctionne
    Étant donné qu'un fichier de log existe pour la date "2026-02-23" contenant des enregistrements sans champ intention
    Quand je lis le fichier de log pour la date "2026-02-23"
    Alors au moins un enregistrement du fichier contient le champ identifiant l'API (ex. "Claude")
    Quand j'appelle l'API GET /api/consommation-api
    Alors la réponse contient des données d'agrégation pour la date "2026-02-23"

  Scénario: L'agrégation par intention ignore les entrées sans intention
    Étant donné que des logs d'appels existent pour la date "2026-02-24" avec une entrée avec intention "Analyse IA" et une entrée sans intention
    Quand j'appelle l'API GET /api/consommation-api
    Alors la réponse contient pour la date "2026-02-24" les totaux par intention
    Et le total pour l'intention "Analyse IA" vaut 1
    Et les entrées sans intention ne contribuent pas aux totaux par intention
