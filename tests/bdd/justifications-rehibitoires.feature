# language: fr
@us-3.2
Fonctionnalité: Justifications des arbitrages réhibitoires
  En tant qu'utilisateur (candidat ou recruteur)
  Je souhaite récupérer l'argument qui justifie chaque arbitrage réhibitoire (true/false) sur une offre
  Afin de comprendre pourquoi un critère a été jugé rédhibitoire ou non.

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le paramétrage IA définit au moins un critère rédhibitoire

  # --- CA4 : Exposition API — les réponses qui exposent les données d'analyse incluent les justifications ---
  Scénario: La réponse de l'API de test d'analyse inclut les justifications des réhibitoires lorsqu'elles sont présentes
    Étant donné que l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse contenant des justifications pour les réhibitoires configurés
    Et que le champ "Texte d'offre à tester" contient un texte
    Quand j'appelle l'API de test d'analyse ClaudeCode (POST /api/test-claudecode)
    Alors la réponse contient les champs Réhibitoire1 à RéhibitoireN (string justification) pour chaque réhibitoire configuré
    Et chaque justification est une chaîne de caractères (texte court)

  Scénario: Lorsque les données d'une offre analysée sont exposées par l'application, les justifications des réhibitoires sont incluses
    Étant donné qu'une offre analysée existe en base avec des justifications renseignées pour au moins un réhibitoire
    Quand je récupère les données de cette offre via l'API (détail offre, liste ou synthèse)
    Alors la réponse inclut les champs de justification (JustificationRéhibitoire1 à JustificationRéhibitoire4) pour les réhibitoires configurés
    Et les valeurs de justification correspondent à celles enregistrées pour cette offre

  # --- CA5 : Interface utilisateur — affichage des justifications à côté de chaque réhibitoire ---
  Scénario: À côté de chaque critère rédhibitoire affiché (true/false), la justification est visible
    Étant donné que l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse contenant des justifications pour les réhibitoires configurés
    Et que le champ "Texte d'offre à tester" contient un texte
    Et que je suis sur la page Paramètres
    Quand je clique sur le bouton "Tester API" de la section Configuration ClaudeCode
    Alors la zone de résultat du test ClaudeCode affiche le résultat de l'analyse
    Et pour chaque critère rédhibitoire affiché (Réhibitoire1 à N), la justification associée est affichée à côté ou en dessous du booléen

  Scénario: Les justifications sont affichées en texte lisible sans balises HTML brutes
    Étant donné que l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse contenant une justification avec du texte explicatif
    Et que le champ "Texte d'offre à tester" contient un texte
    Et que je suis sur la page Paramètres
    Quand je clique sur le bouton "Tester API" de la section Configuration ClaudeCode
    Alors la zone de résultat du test ClaudeCode affiche les justifications en texte lisible
    Et aucune balise HTML brute n'est visible dans le texte des justifications

  Scénario: L'ordre des justifications correspond à l'ordre des critères rédhibitoires (1 à 4)
    Étant donné que l'API ClaudeCode est mockée pour renvoyer un résultat d'analyse avec des justifications distinctes pour Réhibitoire1, Réhibitoire2, Réhibitoire3 et Réhibitoire4
    Et que le paramétrage IA définit quatre critères rédhibitoires
    Et que je suis sur la page Paramètres
    Quand je clique sur le bouton "Tester API" de la section Configuration ClaudeCode
    Alors la zone de résultat affiche les critères rédhibitoires dans l'ordre (1 puis 2 puis 3 puis 4)
    Et chaque justification est affichée à côté du bon critère (justification 1 avec réhibitoire 1, etc.)
