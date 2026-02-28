# language: fr
@us-7.4
Fonctionnalité: Tableau de bord une ligne par source et nouvelles colonnes
  En tant qu'utilisateur
  Je souhaite que le tableau de bord affiche une ligne par source (nom canonique), avec les colonnes Création par email, Création par liste html, Email à importer, Fichier à importer, puis enrichissement et analyse
  Afin de voir l'état par plateforme et modifier les activations en un clic.

  Contexte:
    Étant donné que le fichier sources.json contient des entrées pour les sources canoniques
    Et que des offres sont liées à des sources (par email ou par chemin liste html résolu vers la source)

  # --- CA1 : Une ligne par source (nom canonique) ---
  Scénario: Le tableau affiche exactement une ligne par source (nom canonique)
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que des offres sont liées à des sources
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors le tableau affiche une ligne par source (nom canonique)
    Et chaque ligne correspond à une source de la liste canonique
    Et il n'y a pas deux lignes pour la même source

  # --- CA7 : Pas de colonne Adresse ; première colonne = Source ---
  Scénario: La première colonne du tableau est "Source" et il n'y a pas de colonne "Adresse"
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors la première colonne du tableau est "Source"
    Et le tableau n'affiche pas de colonne "Adresse"

  # --- CA2 : Colonnes Création par email et Création par liste html avec icônes ---
  Scénario: Le tableau affiche les colonnes "Création par email" et "Création par liste html" avec une icône par source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors le tableau affiche une colonne "Création par email"
    Et le tableau affiche une colonne "Création par liste html"
    Et pour chaque ligne (source), la cellule "Création par email" affiche une icône (❌, 😴, 🏃 ou ✅)
    Et pour chaque ligne (source), la cellule "Création par liste html" affiche une icône (❌, 😴, 🏃 ou ✅)

  Scénario: L'icône "Création par email" reflète l'état implémenté et activé pour la source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que la source "Linkedin" a creationEmail.activé true (implémenté en code)
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors pour la source "Linkedin" la cellule "Création par email" affiche l'icône ✅

  Scénario: L'icône "Création par email" affiche 😴 quand la source est implémentée mais désactivée
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que la source "Linkedin" a creationEmail.activé false (implémenté en code)
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors pour la source "Linkedin" la cellule "Création par email" affiche l'icône 😴

  # --- CA3 : Colonnes Email à importer et Fichier à importer agrégées par source ---
  Scénario: Le tableau affiche les colonnes "Email à importer" et "Fichier à importer" avec des valeurs par source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors le tableau affiche une colonne "Email à importer"
    Et le tableau affiche une colonne "Fichier à importer"
    Et pour chaque ligne (source), la cellule "Email à importer" affiche un nombre (agrégé sur les adresses email de cette source)
    Et pour chaque ligne (source), la cellule "Fichier à importer" affiche un nombre (agrégé sur le dossier liste html de cette source)

  Scénario: La colonne "Email à importer" affiche le total d'emails en attente agrégé par source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que le cache d'audit (ou l'état) indique 3 emails en attente pour la source "Linkedin" et 0 pour "APEC"
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors pour la source "Linkedin" la cellule "Email à importer" affiche "3"
    Et pour la source "APEC" la cellule "Email à importer" affiche "0"

  Scénario: La colonne "Fichier à importer" affiche le nombre de fichiers HTML en attente dans le dossier liste html de la source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et qu'il y a 2 fichiers HTML en attente dans le dossier liste html de la source "APEC"
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors pour la source "APEC" la cellule "Fichier à importer" affiche "2"

  # --- CA4 : Colonnes enrichissement et analyse (implémenté + activé + icône) ---
  Scénario: Le tableau affiche les colonnes enrichissement et analyse avec icône par source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors le tableau affiche une colonne pour la phase "enrichissement" (avec icône ❌, 😴, 🏃 ou ✅)
    Et le tableau affiche une colonne pour la phase "analyse" (avec icône ❌, 😴, 🏃 ou ✅)
    Et pour chaque ligne (source), les cellules enrichissement et analyse affichent une icône

  Scénario: L'icône enrichissement reflète l'état activé pour la source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que la source "Linkedin" a enrichissement.activé true
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors pour la source "Linkedin" la cellule enrichissement affiche l'icône ✅

  # --- CA5 : Clic sur coche/bonhomme bascule l'activation ; persistance dans sources.json ---
  Scénario: Un clic sur le contrôle d'activation (coche ou bonhomme) pour une phase bascule l'activation de cette source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que la source "Linkedin" a enrichissement.activé true
    Et que le tableau de bord est affiché
    Quand je clique sur le contrôle d'activation (coche ou bonhomme) de la phase "enrichissement" pour la source "Linkedin"
    Alors pour la source "Linkedin" l'activation de la phase "enrichissement" est désactivée (affichage 😴 ou équivalent)
    Et la modification est persistée dans sources.json (enrichissement.activé false pour "Linkedin")

  Scénario: Après bascule d'activation, la valeur est persistée dans sources.json
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que la source "APEC" a analyse.activé true
    Et que le tableau de bord est affiché
    Quand je clique sur le contrôle d'activation de la phase "analyse" pour la source "APEC"
    Alors la source "APEC" a analyse.activé false dans sources.json après rechargement

  Scénario: Un second clic sur le contrôle réactive la phase pour cette source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que la source "HelloWork" a creationListeHtml.activé false
    Et que le tableau de bord est affiché
    Quand je clique sur le contrôle d'activation de la phase "Création par liste html" pour la source "HelloWork"
    Alors pour la source "HelloWork" l'activation de la phase "Création par liste html" est activée (affichage ✅)
    Et la source "HelloWork" a creationListeHtml.activé true dans sources.json après rechargement

  # --- CA6 : Statuts et totaux agrégés par source ---
  Scénario: Les colonnes de statut et la ligne Totaux reflètent les données agrégées par source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que des offres sont liées aux sources avec des statuts (Annonce à récupérer, À analyser, etc.)
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors chaque ligne (source) affiche les décomptes de statut agrégés pour cette source
    Et une ligne "Totaux" (ou colonne Totaux) affiche les totaux agrégés par statut et le total général

  Scénario: Le total par ligne (source) correspond à la somme des offres de cette source
    Étant donné que les sources sont chargées depuis sources.json (une entrée par source)
    Et que la source "Linkedin" a 5 offres en base (tous statuts confondus)
    Quand j'affiche le tableau de bord (ou j'appelle l'API tableau-synthese-offres)
    Alors pour la ligne de la source "Linkedin" la cellule Totaux (ou total de la ligne) affiche "5"
