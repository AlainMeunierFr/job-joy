# language: fr
@us-8.1
Fonctionnalité: Configuration API IA - Test
  En tant qu'utilisateur, je souhaite vérifier que les paramétrages de l'API Mistral (API IA) sont corrects,
  afin de quitter les paramétrages en sérénité.

  Contexte:
    Étant donné que je suis sur la page Paramètres

  # --- CA1 : Champ "Texte d'offre à tester" (textarea) ---
  Scénario: La section API IA propose un champ Texte d'offre à tester
    Alors la page comporte un container ou une section intitulée "API IA"
    Et la section API IA comporte un champ ou une zone intitulée "Texte d'offre à tester"
    Et ce champ est une zone de texte multiligne (textarea)

  # --- CA2 : Bouton récupérer offre pour test (meilleur score) si au moins une offre en base ---
  Scénario: Lorsqu'aucune offre Airtable n'est disponible, le bouton récupérer offre pour test n'est pas affiché
    Étant donné qu'aucune offre Airtable n'est disponible en base
    Quand je me rends sur la page Paramètres
    Alors la section API IA n'affiche pas le bouton récupérer offre pour test

  Scénario: Lorsqu'au moins une offre Airtable est disponible, le bouton récupérer offre pour test est affiché
    Étant donné qu'au moins une offre Airtable est disponible en base
    Quand je me rends sur la page Paramètres
    Alors la section API IA affiche un bouton récupérer offre pour test

  Scénario: Au clic sur récupérer offre pour test, tous les champs (texte et métadonnées) sont remplis avec l'offre qui a le meilleur score
    Étant donné qu'au moins une offre Airtable est disponible en base avec un texte connu
    Et que je suis sur la page Paramètres
    Quand je clique sur le bouton récupérer offre pour test de la section API IA
    Alors le champ "Texte d'offre à tester" contient le texte d'une offre récupérée en base

  # --- CA3 : Bouton "Tester API" et affichage résultat ou erreur (appel API Mistral) ---
  Scénario: La section API IA comporte un bouton Tester API
    Alors la section API IA comporte un bouton "Tester API"

  Scénario: Au clic sur Tester API avec erreur API, le code erreur est affiché
    Étant donné que l'API Mistral est mockée pour renvoyer une erreur avec un code connu
    Et que le champ "Texte d'offre à tester" contient un texte
    Et que je suis sur la page Paramètres
    Quand je clique sur le bouton "Tester API" de la section API IA
    Alors un message ou une zone affiche le code erreur renvoyé par l'API
    Et l'utilisateur peut identifier qu'il s'agit d'une erreur (et non du résultat de l'analyse)

  Scénario: Au clic sur Tester API avec succès, le résultat est affiché de manière lisible
    Étant donné que l'API Mistral est mockée pour renvoyer un résultat d'analyse valide
    Et que le champ "Texte d'offre à tester" contient un texte
    Et que je suis sur la page Paramètres
    Quand je clique sur le bouton "Tester API" de la section API IA
    Alors un message ou une zone affiche le résultat de l'analyse de manière lisible
    Et le résultat n'est pas affiché en JSON brut

  # --- CA4 : Tous les éléments dans la section API IA ---
  Scénario: Les éléments de test (champ texte, boutons Récupérer et Tester API) sont dans la section API IA
    Étant donné qu'au moins une offre Airtable est disponible en base
    Quand je me rends sur la page Paramètres
    Alors la page comporte un container ou une section intitulée "API IA"
    Et la section API IA comporte un champ ou une zone intitulée "Texte d'offre à tester"
    Et la section API IA comporte un bouton "Tester API"
    Et la section API IA comporte un bouton "Pour tester, récupérer les informations de l'offre qui a le meilleur score"
    Et ces éléments (champ et boutons) sont contenus dans la section API IA de la page Paramètres
