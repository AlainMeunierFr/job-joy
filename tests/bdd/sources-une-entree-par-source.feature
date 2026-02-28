# language: fr
@us-7.3
Fonctionnalité: Une entrée par source dans les données (sources.json)
  En tant qu'utilisateur
  Je souhaite que les données des sources soient organisées par source (une entrée par plateforme : Linkedin, APEC, etc.) avec une liste d'emails et les activations par phase
  Afin de refléter le modèle métier (une source = une plateforme avec plusieurs emails possibles) et préparer le tableau de bord « une ligne par source ».

  # --- CA1 : Schéma sources.json — structure une entrée par source ---
  Scénario: Le fichier sources.json contient des entrées avec identifiant source et les champs par phase
    Étant donné que le fichier sources.json a été initialisé (nouvel utilisateur)
    Quand je charge les sources depuis sources.json
    Alors chaque entrée possède un identifiant de source (nom canonique)
    Et chaque entrée possède creationEmail avec "activé" et "emails" (liste)
    Et chaque entrée possède creationListeHtml avec "activé"
    Et chaque entrée possède enrichissement avec "activé"
    Et chaque entrée possède analyse avec "activé"

  Scénario: L'emplacement liste html n'est pas stocké dans sources.json
    Étant donné que le fichier sources.json a été initialisé (nouvel utilisateur)
    Quand je charge les sources depuis sources.json
    Alors aucune entrée ne contient de champ stockant le chemin ou dossier "liste html"
    Et le chemin liste html pour une source est obtenu par dérivation en code (ex. nom canonique → dossier)

  # --- CA2 : Pas de migration — init comme nouvel utilisateur ---
  Scénario: L'initialisation applique le schéma comme pour un nouvel utilisateur (aucune reprise des paramètres existants)
    Étant donné qu'aucun fichier sources.json n'existe (ou qu'il est ignoré pour l'init)
    Quand l'initialisation des sources (sources.json) est exécutée
    Alors le fichier sources.json contient la structure d'initialisation par défaut (CA3)
    Et aucune donnée d'un éventuel ancien paramétrage n'est reprise

  # --- CA3 : Initialisation — toutes options activées, liste d'emails par source en code ---
  Scénario: Après initialisation, toutes les options sont activées par défaut pour chaque source
    Étant donné que l'initialisation des sources (sources.json) vient d'être exécutée
    Quand je charge les sources depuis sources.json
    Alors pour chaque entrée source, creationEmail.activé est true
    Et pour chaque entrée source, creationListeHtml.activé est true
    Et pour chaque entrée source, enrichissement.activé est true
    Et pour chaque entrée source, analyse.activé est true

  Scénario: L'initialisation fournit une liste d'emails par source définie en code (WTTJ, Linkedin, JTMS, HelloWork, Cadre Emploi)
    Étant donné que l'initialisation des sources (sources.json) vient d'être exécutée
    Quand je charge les sources depuis sources.json
    Alors la source "Welcome to the Jungle" (ou nom canonique équivalent) a une liste d'emails non vide définie en code
    Et la source "Linkedin" a une liste d'emails non vide définie en code
    Et la source "Job That Make Sense" (ou JTMS) a une liste d'emails non vide définie en code
    Et la source "HelloWork" a une liste d'emails non vide définie en code
    Et la source "Cadre Emploi" a une liste d'emails non vide définie en code

  # --- CA4 : API et services — structure une entrée par source ---
  Scénario: listSources retourne une entrée par source (nom canonique)
    Étant donné que le fichier sources.json contient des entrées pour les sources canoniques
    Quand j'appelle l'API ou le service listSources
    Alors la réponse contient exactement une entrée par nom de source canonique présent dans sources.json
    Et chaque entrée est identifiable par son nom canonique (identifiant source)

  Scénario: getSource(nom) retourne l'entrée correspondant au nom canonique
    Étant donné qu'une entrée pour la source "APEC" existe dans sources.json
    Quand j'appelle getSource (ou l'API équivalente) avec le nom "APEC"
    Alors la réponse contient l'entrée de la source "APEC"
    Et cette entrée contient creationEmail, creationListeHtml, enrichissement, analyse

  Scénario: updateSource(nom, patch) met à jour l'entrée de la source sans dupliquer
    Étant donné qu'une entrée pour la source "Linkedin" existe dans sources.json avec enrichissement.activé true
    Quand j'appelle updateSource (ou l'API équivalente) pour "Linkedin" avec enrichissement.activé false
    Alors la source "Linkedin" a enrichissement.activé false
    Et il n'existe toujours qu'une seule entrée pour la source "Linkedin"

  Scénario: Le tableau de bord (synthèse offres) utilise la structure une entrée par source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que des offres sont liées à des sources (par email ou par chemin liste html résolu vers la source)
    Quand j'affiche ou j'appelle l'API du tableau de bord (tableau-synthese-offres)
    Alors le tableau affiche une ligne par source (nom canonique)
    Et les décomptes (à importer, totaux, etc.) sont agrégés par source

  Scénario: L'audit des sources s'appuie sur la structure une entrée par source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Quand l'audit des sources (emails ou liste html) est exécuté
    Alors les résultats d'audit sont organisés par source (nom canonique)
    Et creation email et creation liste html utilisent creationEmail et creationListeHtml de chaque entrée

  # --- CA5 : Liste canonique des sources et dérivation nom ↔ dossier liste html ---
  Scénario: La liste des noms canoniques des sources est la source de vérité
    Étant donné que le module des sources est chargé
    Quand j'obtiens la liste canonique des noms de sources (ou que j'initialise sources.json)
    Alors les noms canoniques incluent au moins Linkedin, HelloWork, Welcome to the Jungle, Job That Make Sense, Cadre Emploi, APEC, Externatic, Talent.io, Inconnu
    Et toute entrée dans sources.json référence un de ces noms canoniques

  Scénario: Le chemin dossier liste html est dérivé du nom canonique de façon 1:1 en code
    Étant donné que le module des sources est chargé
    Quand je demande le chemin (dossier) liste html pour la source de nom canonique "APEC"
    Alors le chemin dérivé correspond à une forme 1:1 du nom (ex. "liste html/apec" ou équivalent défini en code)
    Et quand je demande le chemin liste html pour la source "Linkedin"
    Alors le chemin dérivé correspond à une forme 1:1 du nom (ex. "liste html/linkedin" ou équivalent)

  # --- CA6 : Pas de doublons — une seule entrée par source ---
  Scénario: Après chargement de sources.json, il n'existe pas deux entrées pour la même source
    Étant donné que le fichier sources.json a été chargé (ou migré)
    Quand je vérifie l'intégrité des sources (pas de doublons)
    Alors il n'y a pas deux entrées avec le même nom canonique de source
    Et le nombre d'entrées est au plus égal au nombre de noms canoniques distincts

  Scénario: Un sources.json contenant deux entrées pour la même source est rejeté ou corrigé au chargement
    Étant donné que le fichier sources.json contient deux entrées avec le même nom canonique "Linkedin"
    Quand je charge les sources depuis sources.json
    Alors le chargement échoue ou déduplique de sorte qu'il ne reste qu'une entrée pour "Linkedin"
    Et aucune opération métier ne s'exécute avec un état contenant des doublons pour la même source
