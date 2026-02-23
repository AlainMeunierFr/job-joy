# language: fr
@wttj @us-1.10 @lane-b
Fonctionnalité: Offres des emails Welcome to the Jungle
  En tant qu'utilisateur, je souhaite que les offres contenues dans les emails reçus de Welcome to the Jungle
  soient ajoutées dans la table Offres afin de pouvoir les faire analyser par une IA.

  Contexte:
    Étant donné que la base Airtable est configurée avec les tables Sources et Offres
    Et que le modèle Sources utilise les champs "emailExpéditeur" (clé), "algo" et "actif"
    Et que le compte email et le dossier à analyser sont configurés
    Et que le dossier des emails traités est configuré

  # --- CA1 : Disponibilité de l'algo dans Sources ---
  Scénario: La valeur d'algo "Welcome to the Jungle" est disponible dans Sources
    Étant donné que la table "Sources" expose une liste de valeurs possibles pour le champ "algo"
    Quand je consulte les valeurs possibles du champ "algo" de la table "Sources"
    Alors la valeur "Welcome to the Jungle" est disponible

  # --- CA2 : Audit par expéditeur exact (casse ignorée) ---
  Scénario: Le matching Welcome to the Jungle se fait sur l'expéditeur exact en ignorant la casse
    Étant donné qu'aucune source d'expéditeur "alerts@welcometothejungle.com" n'existe dans "Sources"
    Et que le dossier à analyser contient un email d'expéditeur "Alerts@WelcomeToTheJungle.com"
    Quand je lance l'audit du dossier email
    Alors l'expéditeur "alerts@welcometothejungle.com" est créé dans la table "Sources"
    Et la source créée porte l'algo "Welcome to the Jungle" avec le champ "actif" à true
    Et cet email est rattaché à la source "Welcome to the Jungle"
    Et la source est reportée avec l'expéditeur "alerts@welcometothejungle.com", l'algo "Welcome to the Jungle" et "actif" à true

  Scénario: Un expéditeur partiellement similaire n'est pas reconnu comme WTTJ
    Étant donné que la source d'expéditeur "alerts@welcometothejungle.com" existe avec l'algo "Welcome to the Jungle" et le champ "actif" à true
    Et que le dossier à analyser contient un email d'expéditeur "alerts+jobs@welcometothejungle.com"
    Quand je lance l'audit du dossier email
    Alors cet email n'est pas rattaché à la source "Welcome to the Jungle"
    Et l'audit signale une source inconnue pour cet expéditeur

  # --- CA3 : Étape 1 plugin WTTJ (body email + décodage base64 URL) ---
  Scénario: Extraire une offre WTTJ depuis le body et décoder l'URL base64 vers une URL normale
    Étant donné que la source d'expéditeur "alerts@welcometothejungle.com" existe avec l'algo "Welcome to the Jungle" et le champ "actif" à true
    Et qu'un email WTTJ éligible contient dans son body une offre exploitable avec une URL encodée en base64 décodable
    Quand je lance la relève des offres depuis les emails Welcome to the Jungle
    Alors une ligne est créée dans la table Offres
    Et cette ligne contient au minimum les champs suivants
    """
    Source = lien vers la source Welcome to the Jungle
    Id offre = identifiant extrait du contenu email quand disponible
    URL = URL normale obtenue après décodage base64
    DateAjout = date et heure courantes au moment de l'insertion
    Statut = "Annonce à récupérer"
    """

  Scénario: Si le décodage base64 échoue, l'offre WTTJ est insérée avec l'URL encodée d'origine
    Étant donné que la source d'expéditeur "alerts@welcometothejungle.com" existe avec l'algo "Welcome to the Jungle" et le champ "actif" à true
    Et qu'un email WTTJ éligible contient une URL encodée en base64 non décodable
    Quand je lance la relève des offres depuis les emails Welcome to the Jungle
    Alors une ligne est créée dans la table Offres pour cette offre
    Et le champ URL conserve la valeur encodée d'origine
    Et le statut de l'offre est "Annonce à récupérer"

  # --- CA4 : Étape 2 worker WTTJ (enrichissement observable) ---
  Scénario: Le worker WTTJ renseigne le texte de l'offre à partir d'une offre à récupérer
    Étant donné qu'une offre Welcome to the Jungle en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Quand je lance l'étape 2 d'enrichissement des offres à récupérer
    Alors cette offre est mise à jour dans la table Offres
    Et le champ "Texte de l'offre" est renseigné
    Et les autres informations récupérables depuis la page de l'offre sont renseignées lorsqu'elles sont disponibles

  Scénario: Le statut d'une offre WTTJ peut passer à "À analyser" si les données enrichies sont suffisantes
    Étant donné qu'une offre Welcome to the Jungle en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Et que l'étape 2 récupère des données enrichies suffisantes pour l'analyse
    Quand je lance l'étape 2 d'enrichissement des offres à récupérer
    Alors le statut de cette offre dans la table Offres devient "À analyser"
    Et le champ "Texte de l'offre" est renseigné
