# language: fr
@jtms @us-1.11
Fonctionnalité: Offres des emails Job That Make Sense
  En tant qu'utilisateur, je souhaite que les offres contenues dans les emails recus de Job That Make Sense
  soient ajoutees dans la table Offres afin de pouvoir les faire analyser par une IA.

  Contexte:
    Étant donné que la base Airtable est configurée avec les tables Sources et Offres
    Et que le modèle Sources utilise les champs "emailExpéditeur" (clé), "algo" et "actif"
    Et que le compte email et le dossier à analyser sont configurés
    Et que le dossier des emails traités est configuré

  # --- A) Audit source ---
  Scénario: Le matching Job That Make Sense se fait en comparaison exacte insensible à la casse
    Étant donné qu'aucune source d'expéditeur "jobs@makesense.org" n'existe dans "Sources"
    Et que le dossier à analyser contient un email d'expéditeur "Jobs@MakeSense.Org"
    Quand je lance l'audit du dossier email
    Alors l'expéditeur "jobs@makesense.org" est créé dans la table "Sources"
    Et la source créée porte l'algo "Job That Make Sense" avec le champ "actif" à true
    Et cet email est rattaché à la source "Job That Make Sense"

  Scénario: Une variante proche avec +alias n'est pas reconnue comme Job That Make Sense
    Étant donné que la source d'expéditeur "jobs@makesense.org" existe avec l'algo "Job That Make Sense" et le champ "actif" à true
    Et que le dossier à analyser contient un email d'expéditeur "jobs+alias@makesense.org"
    Quand je lance l'audit du dossier email
    Alors cet email n'est pas rattaché à la source "Job That Make Sense"
    Et l'audit signale une source inconnue pour cet expéditeur

  Scénario: Une source Job That Make Sense deja existante est mise à jour avec algo et actif conformes
    Étant donné que la source d'expéditeur "jobs@makesense.org" existe avec l'algo "inconnu" et le champ "actif" à false
    Quand je lance l'audit du dossier email
    Alors la source "jobs@makesense.org" est mise à jour avec l'algo "Job That Make Sense"
    Et le champ "actif" de cette source vaut true

  # --- B) Etape 1 plugin email ---
  Scénario: Le plugin email Job That Make Sense est branche et extrait les URLs depuis la fixture de reference
    Étant donné que la source d'expéditeur "jobs@makesense.org" existe avec l'algo "Job That Make Sense" et le champ "actif" à true
    Et que la fixture email "tests/exemples/jobs@makesense.org" contient des offres extractibles
    Et que les exemples "data/ressourcesjtms.js" et "data/JTMS" sont utilises comme reference de format
    Quand je lance la releve des offres depuis les emails Job That Make Sense
    Alors au moins une ligne est inseree dans la table Offres pour la source "Job That Make Sense"
    Et chaque ligne inseree contient une URL d'offre issue de la fixture "tests/exemples/jobs@makesense.org"

  Scénario: Une URL encodee est decodee en URL exploitable à l'etape 1
    Étant donné qu'un email Job That Make Sense eligible contient une URL encodee decodable
    Quand je lance la releve des offres depuis les emails Job That Make Sense
    Alors la ligne Offres creee contient l'URL decodee exploitable
    Et le statut initial de l'offre est "Annonce à récupérer"

  Scénario: En cas d'echec de decodage URL, le fallback conserve une URL exploitable pour l'etape 2
    Étant donné qu'un email Job That Make Sense eligible contient une URL encodee non decodable
    Quand je lance la releve des offres depuis les emails Job That Make Sense
    Alors une ligne est creee dans la table Offres pour cette offre
    Et le champ URL conserve la meilleure valeur exploitable disponible via fallback
    Et le statut initial de l'offre est "Annonce à récupérer"

  # --- C) Etape 2 plugin fetch ---
  Scénario: L'etape 2 enrichit une offre Job That Make Sense avec le texte de l'offre
    Étant donné qu'une offre Job That Make Sense en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Quand je lance l'etape 2 d'enrichissement des offres à récupérer
    Alors cette offre est mise à jour dans la table Offres
    Et le champ "Texte de l'offre" est renseigne

  Scénario: Le statut passe à "À analyser" quand les donnees enrichies sont suffisantes
    Étant donné qu'une offre Job That Make Sense en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Et que l'etape 2 recupere des donnees enrichies suffisantes pour l'analyse
    Quand je lance l'etape 2 d'enrichissement des offres à récupérer
    Alors le statut de cette offre dans la table Offres devient "À analyser"
    Et le champ "Texte de l'offre" est renseigne

  Scénario: Le statut final reste explicite en cas d'URL invalide
    Étant donné qu'une offre Job That Make Sense en statut "Annonce à récupérer" existe avec une URL invalide
    Quand je lance l'etape 2 d'enrichissement des offres à récupérer
    Alors le statut final de cette offre indique explicitement un echec de recuperation
    Et la cause "URL invalide" est tracable

  Scénario: Le statut final reste explicite en cas de blocage anti-crawler
    Étant donné qu'une offre Job That Make Sense en statut "Annonce à récupérer" existe avec une URL accessible mais protegee anti-crawler
    Quand je lance l'etape 2 d'enrichissement des offres à récupérer
    Alors le statut final de cette offre indique explicitement un echec lie à l'anti-crawler
    Et aucune transition incoherente de statut n'est appliquee
