# language: fr
Fonctionnalité: Paramétrage prompt de l'IA (CRUD)
  En tant que chercheur d'emploi, je souhaite définir et enregistrer dans les paramètres
  toutes les données utiles pour personnaliser l'évaluation des offres par l'IA :
  rédhibitoires, scores incontournables, critères optionnels et autres ressources,
  afin de les exploiter plus tard pour construire le prompt et noter les offres selon mon profil.

  Contexte:
    Étant donné que je suis sur la page Paramètres

  # --- CA2 : Présence du container et des zones ---
  Scénario: La page Paramètres affiche un container "Paramétrage prompt de l'IA"
    Alors la page comporte un container ou une section intitulée "Paramétrage prompt de l'IA"

  Scénario: La section Paramétrage prompt de l'IA comporte la zone Rédhibitoires avec quatre blocs
    Alors la section Paramétrage prompt de l'IA comporte la zone "Rédhibitoires"
    Et la zone Rédhibitoires comporte quatre blocs critère (titre et zone de saisie)

  Scénario: La section Paramétrage prompt de l'IA comporte la zone Scores incontournables avec quatre blocs
    Alors la section Paramétrage prompt de l'IA comporte la zone "Scores incontournables"
    Et la zone Scores incontournables comporte quatre blocs : Localisation, Salaire, Culture, Qualité d'offre

  Scénario: La section Paramétrage prompt de l'IA comporte la zone Scores optionnels avec quatre blocs
    Alors la section Paramétrage prompt de l'IA comporte la zone "Scores optionnels"
    Et la zone Scores optionnels comporte quatre blocs critère (titre et zone de saisie)

  Scénario: La section Paramétrage prompt de l'IA comporte la zone Autres ressources
    Alors la section Paramétrage prompt de l'IA comporte la zone "Autres ressources"
    Et la zone Autres ressources comporte un bloc avec un titre et une zone de saisie

  # --- CA2 : Structure des blocs (titre 1 ligne, zone 3 lignes avec ascenseur) ---
  Scénario: Chaque bloc des douze critères a un titre sur une ligne et une zone de saisie de trois lignes avec ascenseur
    Alors chaque bloc de la zone Rédhibitoires a un titre sur une ligne et une zone de saisie d'environ trois lignes avec ascenseur
    Et chaque bloc de la zone Scores incontournables a un titre sur une ligne et une zone de saisie d'environ trois lignes avec ascenseur
    Et chaque bloc de la zone Scores optionnels a un titre sur une ligne et une zone de saisie d'environ trois lignes avec ascenseur

  # --- CA2 : Titres saisissables (Rédhibitoires et Scores optionnels) ---
  Scénario: Les titres des blocs Rédhibitoires et Scores optionnels sont saisissables
    Alors le titre du premier bloc Rédhibitoires est un champ ou une zone modifiable par l'utilisateur
    Et le titre du premier bloc Scores optionnels est un champ ou une zone modifiable par l'utilisateur

  # --- CA2 : Titres non saisissables (Scores incontournables) ---
  Scénario: Les titres des blocs Scores incontournables sont fixes et non saisissables
    Alors les quatre blocs Scores incontournables ont pour titres fixes "Localisation", "Salaire", "Culture", "Qualité d'offre"
    Et ces titres ne sont pas modifiables par l'utilisateur

  # --- CA2 : Zone Autres ressources (12 lignes) ---
  Scénario: Le bloc Autres ressources a une zone de saisie d'environ douze lignes avec ascenseur
    Alors le bloc Autres ressources comporte une zone de saisie d'environ douze lignes
    Et la zone de saisie Autres ressources affiche un ascenseur si le contenu dépasse

  # --- CA2 : Bouton Enregistrer ---
  Scénario: La section Paramétrage prompt de l'IA comporte un bouton Enregistrer qui enregistre toutes les valeurs
    Alors la section Paramétrage prompt de l'IA comporte un bouton "Enregistrer"
    Étant donné que j'ai saisi des valeurs dans au moins une zone du Paramétrage prompt de l'IA
    Quand je clique sur le bouton Enregistrer de la section Paramétrage prompt de l'IA
    Alors toutes les valeurs saisies dans le Paramétrage prompt de l'IA sont enregistrées

  # --- CA2 : Placeholder (texte d'aide en gris qui disparaît à la saisie) ---
  Scénario: Une zone vide affiche un texte d'aide en gris
    Étant donné qu'une zone du Paramétrage prompt de l'IA est vide
    Alors cette zone affiche un texte d'aide (placeholder) en gris ou atténué

  Scénario: Dès qu'on commence à écrire dans une zone, le texte d'aide disparaît
    Étant donné qu'une zone du Paramétrage prompt de l'IA est vide et affiche le texte d'aide
    Quand je saisis du texte dans cette zone
    Alors le texte d'aide n'est plus affiché dans cette zone

  # --- CA1 : Persistance (parametres.json ou équivalent) ---
  Scénario: Les valeurs du Paramétrage prompt de l'IA sont enregistrées dans la section dédiée du paramétrage
    Étant donné que j'ai saisi des valeurs dans les zones Rédhibitoires, Scores incontournables, Scores optionnels et Autres ressources
    Quand j'enregistre le Paramétrage prompt de l'IA
    Alors le fichier de paramétrage (parametres.json ou équivalent) contient la section dédiée au Paramétrage prompt de l'IA
    Et cette section contient les zones Rédhibitoires, Scores incontournables, Scores optionnels et Autres ressources

  Scénario: À l'ouverture des paramètres, les valeurs enregistrées du Paramétrage prompt de l'IA sont rechargées et affichées
    Étant donné que le Paramétrage prompt de l'IA a été enregistré avec des valeurs connues pour au moins un critère rédhibitoire et un score incontournable
    Quand je me rends sur la page Paramètres
    Alors les valeurs enregistrées du Paramétrage prompt de l'IA sont affichées dans les zones correspondantes

  # --- CA3 : Zones vides enregistrées et rechargées ---
  Scénario: Les valeurs vides sont enregistrées et rechargées vides
    Étant donné que toutes les zones du Paramétrage prompt de l'IA sont vides
    Quand j'enregistre le Paramétrage prompt de l'IA
    Alors le fichier de paramétrage contient la section Paramétrage prompt de l'IA avec des valeurs vides ou absentes pour ces zones
    Quand je me rends à nouveau sur la page Paramètres
    Alors les zones du Paramétrage prompt de l'IA sont affichées vides

  Scénario: Une zone partiellement remplie : les zones vides restent vides après enregistrement et rechargement
    Étant donné que j'ai saisi une valeur uniquement dans le premier critère Rédhibitoires
    Et que les autres zones du Paramétrage prompt de l'IA sont restées vides
    Quand j'enregistre le Paramétrage prompt de l'IA
    Et que je me rends à nouveau sur la page Paramètres
    Alors le premier critère Rédhibitoires affiche la valeur enregistrée
    Et les autres zones du Paramétrage prompt de l'IA sont affichées vides

  Scénario: Le chemin Autres ressources vide signifie qu'aucun répertoire n'est utilisé
    Étant donné que la zone Autres ressources est vide
    Quand j'enregistre le Paramétrage prompt de l'IA
    Alors la valeur enregistrée pour Autres ressources est vide ou absente
    Et l'application interprète l'absence de chemin comme "aucun répertoire utilisé"
