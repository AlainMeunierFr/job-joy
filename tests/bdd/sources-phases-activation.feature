# language: fr
@us-3.1
Fonctionnalité: Activation des sources par phase (création, enrichissement, analyse)
  En tant qu'utilisateur
  Je souhaite que la table Sources permette un type de source et l'activation par phase
  Afin d'avoir un meilleur contrôle, par source, des différentes phases du processus.

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle

  # --- CA3 / CA5 : API tableau de synthèse — champs type et 3 booléens ---
  Scénario: L'API GET tableau-synthese-offres renvoie type et les trois indicateurs d'activation par phase
    Étant donné que les sources suivantes existent en base
    | emailExpéditeur   | plugin   | type  | Activer la création | Activer l'enrichissement | Activer l'analyse par IA |
    | jobs@linkedin.com | Linkedin | email | true                | true                     | true                     |
    | autre@test.com    | Inconnu  | email | true                | false                    | false                    |
    Quand j'appelle l'API GET /api/tableau-synthese-offres
    Alors la réponse contient pour chaque source les champs "type", "activerCreation", "activerEnrichissement", "activerAnalyseIA"
    Et la source "jobs@linkedin.com" a activerCreation true, activerEnrichissement true, activerAnalyseIA true
    Et la source "autre@test.com" a activerCreation true, activerEnrichissement false, activerAnalyseIA false

  # --- CA3 : API Sources — lecture/écriture des 3 checkboxes et type ---
  Scénario: L'API permet de créer une source avec type et les trois cases à cocher
    Étant donné qu'aucune source "nouveau@test.com" n'existe
    Quand je crée une source avec emailExpéditeur "nouveau@test.com", plugin "Inconnu", type "email", Activer la création true, Activer l'enrichissement true, Activer l'analyse par IA false
    Alors une source "nouveau@test.com" existe avec type "email", activerCreation true, activerEnrichissement true, activerAnalyseIA false

  Scénario: L'API permet de mettre à jour une source avec les trois cases à cocher
    Étant donné qu'une source "update@test.com" existe avec Activer la création true, Activer l'enrichissement true, Activer l'analyse par IA true
    Quand je mets à jour la source "update@test.com" avec Activer l'enrichissement false
    Alors la source "update@test.com" a activerCreation true, activerEnrichissement false, activerAnalyseIA true

  # --- CA3 : Driver enrichissement — filtrage par phase ---
  Scénario: getOffresARecuperer ne retourne que les offres dont la source a Activer l'enrichissement coché
    Étant donné qu'une source "avec-enrich@test.com" a Activer l'enrichissement true et une offre en statut "Annonce à récupérer"
    Et qu'une source "sans-enrich@test.com" a Activer l'enrichissement false et une offre en statut "Annonce à récupérer"
    Quand j'appelle getOffresARecuperer (ou l'API équivalente)
    Alors les offres retournées contiennent l'offre de la source "avec-enrich@test.com"
    Et les offres retournées ne contiennent pas l'offre de la source "sans-enrich@test.com"

  Scénario: getOffresAAnalyser ne retourne que les offres dont la source a Activer l'analyse par IA coché
    Étant donné qu'une source "avec-ia@test.com" a Activer l'analyse par IA true et une offre en statut "À analyser"
    Et qu'une source "sans-ia@test.com" a Activer l'analyse par IA false et une offre en statut "À analyser"
    Quand j'appelle getOffresAAnalyser (ou l'API équivalente)
    Alors les offres retournées contiennent l'offre de la source "avec-ia@test.com"
    Et les offres retournées ne contiennent pas l'offre de la source "sans-ia@test.com"

  # --- CA4 : Gouvernance — traitement phase 1 utilise Activer la création ---
  Scénario: Le worker de création (run-traitement) ne traite que les sources avec Activer la création coché
    Étant donné qu'une source "active@test.com" a Activer la création true
    Et qu'une source "inactive@test.com" a Activer la création false
    Et que des emails des deux sources sont présents dans le dossier à traiter
    Quand le traitement des emails (relève / création) est lancé
    Alors les emails de la source "active@test.com" sont traités pour la phase création
    Et les emails de la source "inactive@test.com" ne sont pas traités pour la phase création

  # --- CA4 : À la création d'une source, les 3 cases sont renseignées automatiquement selon le plugin ---
  Scénario: À la création d'une source lors du relève ou de l'audit, les 3 cases sont renseignées selon le plugin
    Étant donné qu'un email d'expéditeur "noreply@linkedin.com" est présent dans le dossier à traiter
    Et qu'aucune source "linkedin.com" n'existe dans Airtable
    Et que le plugin Linkedin dispose d'un parseur email (phase 1) et de l'étape enrichissement (phase 2) implémentée
    Quand une source "linkedin.com" est créée (relève ou audit)
    Alors la source a Activer la création true (car parseur email disponible)
    Et la source a Activer l'enrichissement true (car étape 2 implémentée)
    Et la source a Activer l'analyse par IA true (par défaut)

  # --- CA4 / CA8 : Audit des sources — affichage et mise à jour des 3 checkboxes ---
  Scénario: L'écran d'audit des sources affiche les trois phases (Activer la création, Activer l'enrichissement, Activer l'analyse par IA)
    Étant donné que je suis sur l'écran d'audit des sources (run-audit-sources)
    Quand j'observe le tableau des sources
    Alors le tableau affiche une colonne "Activer la création" ou équivalent
    Et le tableau affiche une colonne "Activer l'enrichissement" ou équivalent
    Et le tableau affiche une colonne "Activer l'analyse par IA" ou équivalent

  Scénario: L'utilisateur peut modifier les trois cases à cocher depuis l'écran d'audit des sources
    Étant donné qu'une source "edit@test.com" est affichée dans l'audit des sources avec Activer l'enrichissement true
    Quand je décoche "Activer l'enrichissement" pour la source "edit@test.com" dans l'audit
    Et j'enregistre les modifications
    Alors la source "edit@test.com" a Activer l'enrichissement false en base

  # --- CA8 : CLI audit-sources ---
  Scénario: Le CLI audit-sources affiche les trois phases au lieu d'une seule colonne actif
    Étant donné que la base Airtable contient au moins une source
    Quand j'exécute la commande audit-sources-cli
    Alors la sortie affiche une indication pour "Activer la création" ou "création"
    Et la sortie affiche une indication pour "Activer l'enrichissement" ou "enrichissement"
    Et la sortie affiche une indication pour "Activer l'analyse par IA" ou "analyse"
    Et la sortie n'affiche pas une colonne unique "actif" comme seule information d'activation
