# language: fr
@hellowork @us-1.8
Fonctionnalité: Offres des emails HelloWork
  En tant qu'utilisateur, je souhaite que les offres contenues dans les emails reçus de HelloWork
  soient ajoutées dans la table Offres afin de pouvoir les faire analyser par une IA.

  Contexte:
    Étant donné que la base Airtable est configurée avec les tables Sources et Offres
    Et que le compte email et le dossier à analyser sont configurés
    Et que le dossier des emails traités est configuré

  # --- CA1 : Ajouter HelloWork à la liste des plugins côté Airtable ---
  Scénario: Initialiser la source HelloWork dans Airtable
    Étant donné qu'aucun expéditeur d'email "notification@emails.hellowork.com" n'existe dans "Sources"
    Quand l'initialisation des sources est exécutée
    Alors l'expéditeur "notification@emails.hellowork.com" est créé dans la table "Sources"
    Et son plugin est "HelloWork"
    Et son champ "actif" vaut true

  # --- CA2 : Audit strict par expéditeur + activation ---
  Scénario: Le matching se fait sur l'expéditeur exact en ignorant la casse
    Étant donné que la source d'expéditeur "notification@emails.hellowork.com" existe avec l'plugin "HelloWork" et le champ "actif" à true
    Et que le dossier à analyser contient un email d'expéditeur "Notification@Emails.HelloWork.com"
    Quand je lance l'audit du dossier email
    Alors cet email est rattaché à la source "HelloWork"
    Et la source est reportée avec l'expéditeur "notification@emails.hellowork.com", l'plugin "HelloWork" et "actif" à true

  Scénario: Un expéditeur seulement partiellement similaire n'est pas reconnu comme HelloWork
    Étant donné que la source d'expéditeur "notification@emails.hellowork.com" existe avec l'plugin "HelloWork" et le champ "actif" à true
    Et que le dossier à analyser contient un email d'expéditeur "notification@emails.hellowork.com.fake-domain.test"
    Quand je lance l'audit du dossier email
    Alors cet email n'est pas rattaché à la source "HelloWork"
    Et l'audit signale une source inconnue pour cet expéditeur

  # --- CA3 : Étape 1 plugin HelloWork (lecture body + extraction + décodage URL) ---
  Scénario: Extraire une offre HelloWork depuis le body et insérer les champs minimum dans Offres
    Étant donné que la source d'expéditeur "notification@emails.hellowork.com" existe avec l'plugin "HelloWork" et le champ "actif" à true
    Et qu'un email HelloWork éligible contient dans son body une offre exploitable
    Quand je lance la relève des offres depuis les emails HelloWork
    Alors une ligne est créée dans la table Offres
    Et cette ligne contient au minimum les champs suivants
    """
    Source = lien vers la source HelloWork
    Id offre = identifiant extrait du contenu HelloWork quand disponible
    URL = URL de l'offre (décodée si possible)
    DateAjout = date et heure courantes au moment de l'insertion
    Statut = "Annonce à récupérer"
    """

  Scénario: En cas d'URL encodée base64 non décodable, l'offre est quand même insérée avec l'URL encodée
    Étant donné que la source d'expéditeur "notification@emails.hellowork.com" existe avec l'plugin "HelloWork" et le champ "actif" à true
    Et qu'un email HelloWork éligible contient une URL encodée en base64 non décodable
    Quand je lance la relève des offres depuis les emails HelloWork
    Alors une ligne est créée dans la table Offres pour cette offre
    Et le champ URL conserve la valeur encodée d'origine
    Et le statut de l'offre est "Annonce à récupérer"

  # --- CA4 : Étape 2 worker standard après résolution URL ---
  Scénario: Le worker étape 2 enrichit l'offre HelloWork avec le texte et les données récupérables
    Étant donné qu'une offre HelloWork en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Quand je lance l'étape 2 d'enrichissement des offres à récupérer
    Alors cette offre est mise à jour dans la table Offres
    Et le champ "Texte de l'offre" est renseigné
    Et les autres informations récupérables depuis la page de l'offre sont renseignées lorsqu'elles sont disponibles

  Scénario: Le statut peut passer à "À analyser" quand les données enrichies sont suffisantes
    Étant donné qu'une offre HelloWork en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Et que l'étape 2 récupère des données enrichies suffisantes pour l'analyse
    Quand je lance l'étape 2 d'enrichissement des offres à récupérer
    Alors le statut de cette offre dans la table Offres devient "À analyser"
    Et le champ "Texte de l'offre" est renseigné
