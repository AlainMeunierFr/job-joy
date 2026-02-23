# language: fr
Fonctionnalité: Prompt IA (partie fixe et partie modifiable)
  En tant que chercheur d'emploi, je souhaite que les paramètres IA configurés soient utilisés
  pour construire le prompt envoyé à l'IA, avec une partie fixe qui garantit un résultat
  exploitable pour la table Offres et une partie modifiable pour affiner le comportement,
  afin d'obtenir des évaluations d'offres de qualité tout en permettant aux spécialistes d'ajuster le texte si besoin.

  Contexte:
    Étant donné que je suis sur la page Paramètres

  # --- CA4 : Présence de la zone/section Prompt ---
  Scénario: La page Paramètres affiche une zone ou section dédiée au Prompt
    Alors la page comporte un container ou une section liée au "Prompt" ou "Prompt IA"
    Et cette zone permet d'accéder à la partie fixe et à la partie modifiable du prompt

  # --- CA4 : Accès à la partie fixe (lecture seule ou lien informatif) ---
  Scénario: Un moyen d'accéder à la partie fixe du prompt est présent
    Alors la zone Prompt comporte un élément informatif pour la partie fixe
    Et cet élément est un lien "Voir la partie fixe du prompt" ou une zone en lecture seule
    Et l'utilisateur ne peut pas modifier le contenu de la partie fixe via cette zone

  # --- CA4 : Zone de saisie partie modifiable (pleine largeur, ~50 lignes, ascenseur) ---
  Scénario: La partie modifiable est affichée dans une zone de texte dédiée
    Alors la zone Prompt comporte une zone de saisie pour la partie modifiable du prompt
    Et cette zone de saisie occupe une largeur significative (pleine largeur du bloc)
    Et la zone de saisie a une hauteur d'environ cinquante lignes
    Et la zone de saisie affiche un ascenseur lorsque le contenu dépasse

  # --- CA4 : Bouton "Proposer un prompt" ---
  Scénario: Un bouton permet de restaurer la valeur par défaut de la partie modifiable
    Alors la zone Prompt comporte un bouton "Proposer un prompt" ou équivalent
    Quand je clique sur le bouton "Proposer un prompt" de la zone Prompt
    Alors la zone de saisie de la partie modifiable est préremplie ou restaurée avec la valeur par défaut

  # --- CA4 : Bouton "Enregistrer" ---
  Scénario: La zone Prompt comporte un bouton Enregistrer aligné à droite
    Alors la zone Prompt comporte un bouton "Enregistrer"
    Et le bouton Enregistrer est positionné à droite du bloc (même esprit que les autres sections Paramètres)

  Scénario: Enregistrer sauvegarde la partie modifiable du prompt
    Étant donné que j'ai saisi du texte dans la zone de saisie de la partie modifiable du prompt
    Quand je clique sur le bouton Enregistrer de la zone Prompt
    Alors la partie modifiable saisie est enregistrée

  # --- CA4 : Rechargement de la partie modifiable à l'ouverture ---
  Scénario: À l'ouverture de la page Paramètres, la partie modifiable est rechargée depuis les paramètres
    Étant donné que la partie modifiable du prompt a été enregistrée avec un texte connu
    Quand je me rends sur la page Paramètres
    Alors la zone de saisie de la partie modifiable affiche le texte enregistré

  Scénario: Si aucune partie modifiable n'a été enregistrée, la valeur par défaut ou une zone vide est affichée
    Étant donné qu'aucune partie modifiable du prompt n'a été enregistrée
    Quand je me rends sur la page Paramètres
    Alors la zone de saisie de la partie modifiable affiche la valeur par défaut ou est vide

  # --- CA5 : Persistance (parametres.json) ---
  Scénario: La partie modifiable enregistrée est stockée dans le fichier de paramètres
    Étant donné que j'ai saisi un texte dans la partie modifiable du prompt
    Quand j'enregistre la zone Prompt
    Alors le fichier de paramétrage (parametres.json ou équivalent) contient une section dédiée au prompt IA
    Et cette section contient la partie modifiable (ex. promptIA ou partieModifiablePrompt)

  Scénario: Après enregistrement et rechargement, la partie modifiable affichée correspond à celle stockée
    Étant donné que j'ai enregistré une partie modifiable du prompt avec un texte connu
    Quand je me rends à nouveau sur la page Paramètres
    Alors la zone de saisie de la partie modifiable affiche le même texte que celui enregistré
