# language: fr
Fonctionnalité: Configuration Airtable
  En tant qu'utilisateur, je souhaite configurer la base Airtable pour y stocker les offres
  afin de faciliter la navigation dans les données.

  Contexte:
    Étant donné que je suis sur la page de configuration Airtable

  # --- CA1 : Affichage du tutoriel et champ API Key ---
  Scénario: La page affiche le tutoriel de création de compte Airtable
    Alors la page affiche en HTML le contenu du tutoriel défini par le projet
    """
    Le contenu affiché est celui du fichier de tutoriel CreationCompteAirTable.html.
    """

  Scénario: La page propose un champ de saisie pour l'API Key Airtable
    Alors la page comporte un champ de saisie pour l'API Key Airtable

  Scénario: L'API Key est stockée dans parametres.json après enregistrement
    Étant donné que le champ API Key Airtable contient une clé valide
    Quand j'enregistre la configuration Airtable
    Alors le fichier ".\data\parametres.json" existe
    Et le fichier ".\data\parametres.json" contient l'objet AirTable avec la propriété "API Key"
    Et la valeur de la propriété "API Key" dans l'objet AirTable correspond à la clé enregistrée

  # --- CA6 : Stockage des identifiants base et tables après configuration réussie ---
  Scénario: Après configuration réussie, les identifiants sont stockés dans parametres.json
    Étant donné que le champ API Key Airtable contient une clé valide
    Quand je lance la configuration Airtable
    Et que la configuration s'effectue avec succès
    Alors le fichier ".\data\parametres.json" contient l'objet AirTable avec la propriété "Base"
    Et le fichier ".\data\parametres.json" contient l'objet AirTable avec la propriété "Sources"
    Et le fichier ".\data\parametres.json" contient l'objet AirTable avec la propriété "Offres"
    Et la propriété "Base" contient l'identifiant de la base Airtable
    Et la propriété "Sources" contient l'identifiant de la table Sources
    Et la propriété "Offres" contient l'identifiant de la table Offres

  # --- CA7 : Affichage du résultat (succès) ---
  Scénario: En cas de succès, le statut affiché est "AirTable prêt"
    Étant donné que le champ API Key Airtable contient une clé valide
    Quand je lance la configuration Airtable
    Et que la configuration s'effectue avec succès
    Alors le statut affiché est "AirTable prêt"

  Scénario: Après une configuration déjà réussie, le statut "AirTable prêt" reste cohérent
    Étant donné que la configuration Airtable a déjà été effectuée avec succès
    Et que je suis sur la page de configuration Airtable
    Alors le statut affiché est "AirTable prêt" ou un libellé équivalent

  # --- CA7 : Affichage du résultat (échec) ---
  Scénario: En cas d'erreur, le statut affiché est "Erreur avec AirTable" avec les informations d'erreur
    Étant donné que le champ API Key Airtable contient une clé invalide ou que l'API échoue
    Quand je lance la configuration Airtable
    Et qu'une erreur survient
    Alors le statut affiché est "Erreur avec AirTable"
    Et les informations disponibles sur l'erreur sont affichées de façon lisible

  Plan du Scénario: Message d'erreur selon le type d'échec
    Étant donné que je suis sur la page de configuration Airtable
    Et que "<contexte d'échec>"
    Quand je lance la configuration Airtable
    Alors le statut affiché est "Erreur avec AirTable"
    Et le message ou les informations d'erreur contiennent "<élément attendu>"

    Exemples:
      | contexte d'échec | élément attendu |
      | l'API Key est vide ou absente | indication sur la clé API |
      | l'API Key est invalide | indication d'erreur d'authentification ou d'API |
      | l'API Airtable est indisponible | indication d'erreur de connexion ou de service |
