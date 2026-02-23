# language: fr
Fonctionnalité: Configuration ClaudeCode (API Key)
  En tant qu'utilisateur du logiciel, je souhaite renseigner et enregistrer l'API Key de ClaudeCode
  afin de consommer des crédits (tokens) nécessaires à l'API qui score les offres.

  Contexte:
    Étant donné que je suis sur la page Paramètres

  # --- CA1 : Procédure ou tutoriel pour obtenir l'API Key ---
  Scénario: La page Paramètres affiche un accès au tutoriel pour obtenir une API Key ClaudeCode
    Alors la page comporte un container ou une section intitulée "Configuration ClaudeCode"
    Et cette section comporte un lien ou un accès au tutoriel définissant comment obtenir une API Key ClaudeCode et acheter des crédits (tokens)

  Scénario: Le contenu du tutoriel provient du fichier CréationCompteClaudeCode.html
    Alors la section Configuration ClaudeCode affiche en HTML le contenu du tutoriel défini par le projet
    """
    Le contenu affiché est celui du fichier CréationCompteClaudeCode.html.
    """

  # --- CA2 : Champ API Key masqué et indicateur si déjà enregistrée ---
  Scénario: La section Configuration ClaudeCode comporte un champ de saisie pour l'API Key en mode masqué
    Alors la section Configuration ClaudeCode comporte un champ de saisie pour l'API Key ClaudeCode
    Et ce champ est de type mot de passe ou équivalent (saisie masquée)

  Scénario: Lorsqu'aucune API Key n'est enregistrée, le champ est vide et aucun indicateur "Clé configurée" n'est affiché
    Étant donné qu'aucune API Key ClaudeCode n'est enregistrée
    Et que je suis sur la page Paramètres
    Alors la section Configuration ClaudeCode comporte le champ API Key vide ou affichant un placeholder
    Et la section n'affiche pas l'indicateur "Déjà enregistrée" ou "Clé configurée"

  Scénario: Lorsqu'une API Key est déjà enregistrée, un indicateur explicite est affiché sans la valeur
    Étant donné qu'une API Key ClaudeCode a déjà été enregistrée
    Quand je me rends sur la page Paramètres
    Alors la section Configuration ClaudeCode affiche un indicateur "Déjà enregistrée" ou "Clé configurée"
    Et la valeur de l'API Key n'est pas affichée en clair sur la page

  Scénario: L'utilisateur peut remplacer la clé existante en saisissant une nouvelle valeur et en enregistrant
    Étant donné qu'une API Key ClaudeCode a déjà été enregistrée
    Et que je suis sur la page Paramètres
    Quand je saisis une nouvelle valeur dans le champ API Key ClaudeCode
    Et que je clique sur le bouton Enregistrer de la section Configuration ClaudeCode
    Alors la nouvelle API Key est enregistrée
    Et un indicateur "Déjà enregistrée" ou "Clé configurée" est affiché sans la valeur

  # --- CA2 : Stockage sécurisé ---
  Scénario: L'API Key est stockée de manière sécurisée après enregistrement
    Étant donné que le champ API Key ClaudeCode contient une clé valide
    Quand j'enregistre la configuration ClaudeCode
    Alors le fichier de paramétrage (parametres.json ou équivalent) contient une section ou propriété dédiée à ClaudeCode
    Et la valeur de l'API Key n'est pas stockée en clair dans le fichier (chiffrement ou masquage)

  Scénario: Après enregistrement, la clé n'est jamais affichée en clair sur l'interface
    Étant donné que j'ai enregistré une API Key ClaudeCode
    Quand je me rends sur la page Paramètres
    Alors le champ API Key ClaudeCode est vide ou masqué
    Et aucun élément de la page n'affiche la valeur de l'API Key en clair

  # --- CA3 : Section dédiée sur la page Paramètres (même esprit qu'Airtable et compte email) ---
  Scénario: La page Paramètres affiche une section dédiée "Configuration ClaudeCode"
    Alors la page comporte un container ou une section intitulée "Configuration ClaudeCode"
    Et cette section comporte au moins un champ associé (API Key) et une possibilité d'enregistrement

  Scénario: La section Configuration ClaudeCode comporte un bouton Enregistrer
    Alors la section Configuration ClaudeCode comporte un bouton "Enregistrer"
    Et le bouton Enregistrer permet d'enregistrer l'API Key saisie

  Scénario: La section Configuration ClaudeCode est présentée dans le même esprit que Configuration Airtable et Paramétrage du compte email
    Alors la page Paramètres comporte une section intitulée "Configuration ClaudeCode"
    Et cette section a un titre lisible, le champ API Key et l'accès au tutoriel
    Et un bouton ou moyen d'enregistrement est présent dans la section
