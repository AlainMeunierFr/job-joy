# language: fr
Fonctionnalité: Configuration API IA
  En tant qu'utilisateur du logiciel, je souhaite renseigner et enregistrer l'API Key Mistral (API IA)
  afin de consommer des crédits (tokens) nécessaires à l'API qui score les offres.

  Contexte:
    Étant donné que je suis sur la page Paramètres

  # --- CA1 : Procédure ou tutoriel pour obtenir l'API Key ---
  Scénario: La page Paramètres affiche un accès au tutoriel pour obtenir une API Key Mistral
    Alors la page comporte un container ou une section intitulée "API IA"
    Et cette section comporte un lien ou un accès au tutoriel définissant comment obtenir une API Key Mistral et acheter des crédits (tokens)

  Scénario: Le contenu du tutoriel provient du fichier CréationCompteMistral.html
    Alors la section API IA affiche en HTML le contenu du tutoriel défini par le projet
    """
    Le contenu affiché est celui du fichier CréationCompteMistral.html.
    """

  # --- CA2 : Champ API Key masqué et indicateur si déjà enregistrée ; container ouvert/fermé par défaut ---
  Scénario: La section API IA comporte un champ de saisie pour l'API Key en mode masqué
    Alors la section API IA comporte un champ de saisie pour l'API Key
    Et ce champ est de type mot de passe ou équivalent (saisie masquée)

  Scénario: Lorsqu'aucune API Key Mistral n'est enregistrée, le champ est vide et le container est ouvert par défaut
    Étant donné qu'aucune API Key Mistral n'est enregistrée
    Et que je suis sur la page Paramètres
    Alors la section API IA comporte le champ API Key vide ou affichant un placeholder
    Et le champ API Key a un placeholder indiquant qu'aucune clé n'est enregistrée (ex. sk-…)
    Et le container API IA est ouvert par défaut

  Scénario: Lorsqu'une API Key Mistral est déjà enregistrée, le placeholder indique l'enregistrement et le container est fermé par défaut
    Étant donné qu'une API Key Mistral a déjà été enregistrée
    Quand je me rends sur la page Paramètres
    Alors le champ API Key a le placeholder "API Key correctement enregistrée"
    Et la valeur de l'API Key n'est pas affichée en clair sur la page
    Et le container API IA est fermé par défaut

  Scénario: L'utilisateur peut remplacer la clé existante en saisissant une nouvelle valeur et en enregistrant
    Étant donné qu'une API Key Mistral a déjà été enregistrée
    Et que je suis sur la page Paramètres
    Quand je saisis une nouvelle valeur dans le champ API Key
    Et que je clique sur le bouton Enregistrer de la section API IA
    Alors la nouvelle API Key est enregistrée
    Et le champ API Key a le placeholder "API Key correctement enregistrée" sans afficher la valeur

  # --- CA2 : Stockage sécurisé (chiffrement) ---
  Scénario: L'API Key est stockée de manière sécurisée après enregistrement
    Étant donné que le champ API Key contient une clé valide
    Quand j'enregistre la configuration API IA
    Alors le fichier de paramétrage (parametres.json ou équivalent) contient une section ou propriété dédiée à l'API IA
    Et la valeur de l'API Key n'est pas stockée en clair dans le fichier (chiffrement ou masquage)

  Scénario: Après enregistrement, la clé n'est jamais affichée en clair sur l'interface
    Étant donné que j'ai enregistré une API Key Mistral
    Quand je me rends sur la page Paramètres
    Alors le champ API Key est vide ou masqué
    Et aucun élément de la page n'affiche la valeur de l'API Key en clair

  # --- CA3 : Section dédiée sur la page Paramètres (même esprit qu'Airtable et compte email) ---
  Scénario: La page Paramètres affiche une section dédiée "API IA"
    Alors la page comporte un container ou une section intitulée "API IA"
    Et cette section comporte au moins un champ associé (API Key) et une possibilité d'enregistrement

  Scénario: La section API IA comporte un bouton Enregistrer
    Alors la section API IA comporte un bouton "Enregistrer"
    Et le bouton Enregistrer permet d'enregistrer l'API Key saisie

  Scénario: La section API IA est présentée dans le même esprit que Configuration Airtable et Paramétrage du compte email
    Alors la page Paramètres comporte une section intitulée "API IA"
    Et cette section a un titre lisible, le champ API Key et l'accès au tutoriel
    Et un bouton ou moyen d'enregistrement est présent dans la section
