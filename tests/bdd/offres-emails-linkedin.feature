# language: fr
Fonctionnalité: Offres des emails LinkedIn
  En tant qu'utilisateur, je souhaite que les offres contenues dans les emails reçus de LinkedIn
  soient ajoutées dans la table Offres afin de pouvoir les faire analyser par une IA.

  Contexte:
    Étant donné que la base Airtable est configurée avec les tables Sources et Offres
    Et que le compte email et le dossier à analyser sont configurés
    Et que le dossier des emails traités est configuré

  # --- CA1 : Vérifier que la source LinkedIn est active ---
  Scénario: Si la source LinkedIn est inactive, l'utilisateur est informé et le traitement ne poursuit pas
    Étant donné que la source "LinkedIn" existe dans la table Sources avec le champ actif à false
    Quand je lance la relève des offres depuis les emails LinkedIn
    Alors l'utilisateur est informé que la source LinkedIn est inactive
    Et le traitement des emails LinkedIn ne poursuit pas
    Et aucune ligne n'est créée dans la table Offres pour cette relève

  Scénario: Si la source LinkedIn est active, le traitement poursuit avec l'extraction des offres
    Étant donné que la source "LinkedIn" existe dans la table Sources avec le champ actif à true
    Et que le champ emailExpéditeur de la source LinkedIn est configuré
    Et qu'il existe au moins un email dans le dossier configuré dont l'expéditeur contient la valeur emailExpéditeur
    Quand je lance la relève des offres depuis les emails LinkedIn
    Alors le traitement poursuit
    Et au moins une ligne est créée dans la table Offres

  Scénario: Si la source LinkedIn est absente de la table Sources, l'utilisateur est informé et le traitement ne poursuit pas
    Étant donné qu'aucune source nommée "LinkedIn" n'existe dans la table Sources
    Quand je lance la relève des offres depuis les emails LinkedIn
    Alors l'utilisateur est informé de l'absence ou de l'indisponibilité de la source LinkedIn
    Et le traitement ne poursuit pas
    Et aucune ligne n'est créée dans la table Offres pour cette relève

  # --- CA2 : Extraire les offres depuis les emails et alimenter la table Offres ---
  Scénario: Chaque offre extraite d'un email LinkedIn crée une ligne dans la table Offres avec les champs requis
    Étant donné que la source "LinkedIn" existe dans la table Sources avec le champ actif à true
    Et que le champ emailExpéditeur de la source LinkedIn vaut "jobs-noreply@linkedin.com"
    Et que le compte email et le dossier sont configurés
    Et qu'il existe un email dans le dossier dont l'expéditeur contient "jobs-noreply@linkedin.com" et dont le contenu permet d'extraire une offre avec une URL et un identifiant
    Quand je lance la relève des offres depuis les emails LinkedIn
    Alors la table Offres contient une ligne pour cette offre avec les champs suivants renseignés
    """
    Source = lien vers la source LinkedIn
    Id offre = identifiant extrait de l'email
    URL = URL de l'offre extraite
    DateAjout = date et heure courantes au moment de la création
    Statut = "Annonce à récupérer"
    """

  Scénario: Seuls les emails dont l'expéditeur contient la valeur emailExpéditeur de la source sont pris en compte
    Étant donné que la source "LinkedIn" existe dans la table Sources avec le champ actif à true
    Et que le champ emailExpéditeur de la source LinkedIn vaut "notifications@linkedin.com"
    Et qu'il existe des emails dans le dossier dont l'expéditeur ne contient pas "notifications@linkedin.com"
    Et qu'il existe un email dans le dossier dont l'expéditeur contient "notifications@linkedin.com" avec une offre extractible
    Quand je lance la relève des offres depuis les emails LinkedIn
    Alors seuls les emails dont l'expéditeur contient la valeur configurée sont utilisés pour extraire les offres
    Et la table Offres ne contient que les offres issues de ces emails

  Scénario: Aucune ligne Offres n'est créée s'il n'y a pas d'email éligible dans le dossier
    Étant donné que la source "LinkedIn" existe dans la table Sources avec le champ actif à true
    Et que le champ emailExpéditeur de la source LinkedIn est configuré
    Et qu'aucun email dans le dossier configuré n'a un expéditeur contenant la valeur emailExpéditeur
    Quand je lance la relève des offres depuis les emails LinkedIn
    Alors aucune nouvelle ligne n'est créée dans la table Offres pour cette relève

  Scénario: Un email traité est déplacé dans le dossier des emails traités
    Étant donné que la source "LinkedIn" existe dans la table Sources avec le champ actif à true
    Et que le champ emailExpéditeur de la source LinkedIn est configuré
    Et que le dossier des emails traités est configuré
    Et qu'il existe un email dans le dossier à analyser dont l'expéditeur contient la valeur emailExpéditeur et dont le contenu permet d'extraire au moins une offre
    Quand je lance la relève des offres depuis les emails LinkedIn
    Alors cet email n'est plus dans le dossier à analyser
    Et cet email se trouve dans le dossier des emails traités

  Scénario: Une offre déjà présente en base (même Source et Id offre) est mise à jour et non dupliquée
    Étant donné que la source "LinkedIn" existe dans la table Sources avec le champ actif à true
    Et que le champ emailExpéditeur de la source LinkedIn est configuré
    Et que la table Offres contient déjà une ligne pour la source LinkedIn et l'Id offre "12345"
    Et qu'il existe un email dans le dossier dont le contenu permet d'extraire une offre avec Id offre "12345" et une URL mise à jour
    Quand je lance la relève des offres depuis les emails LinkedIn
    Alors la table Offres contient une seule ligne pour la source LinkedIn et l'Id offre "12345"
    Et cette ligne a l'URL mise à jour (upsert, pas de doublon)

  # --- CA3 : Enrichir l'annonce si le texte est accessible en local ---
  Scénario: Si le texte complet de l'annonce est récupéré depuis l'URL, les champs Offres sont alimentés et le statut est mis à jour
    Étant donné que la table Offres contient une ligne avec Statut "Annonce à récupérer" et une URL d'offre LinkedIn
    Et que le texte complet de la page d'offre est accessible en local pour cette URL (poste, entreprise, ville, etc.)
    Quand je lance l'enrichissement des offres à récupérer
    Alors la ligne Offres correspondante a les champs renseignés à partir du texte récupéré
    """
    Texte de l'offre, Poste, Entreprise, Ville, Département, Salaire, DateOffre selon les données disponibles
    """
    Et le statut de cette offre n'est plus "Annonce à récupérer"
    Et le statut reflète que l'offre est prête pour analyse (ex. "À analyser" ou valeur définie au sprint)

  Scénario: Si la récupération du texte échoue (anti-crawler, authentification, etc.), le statut reste "Annonce à récupérer" et la limite est tracée
    Étant donné que la table Offres contient une ligne avec Statut "Annonce à récupérer" et une URL d'offre LinkedIn
    Et que la récupération du texte complet depuis cette URL échoue (contrainte anti-crawler, authentification requise ou autre)
    Quand je lance l'enrichissement des offres à récupérer
    Alors le statut de cette offre reste "Annonce à récupérer"
    Et la cause de l'échec ou la limite est consignée de manière explicite pour traçabilité (log ou message utilisateur)

  Scénario: Enrichissement sans échec ni succès explicite laisse le statut "Annonce à récupérer" avec traçabilité
    Étant donné que la table Offres contient une ligne avec Statut "Annonce à récupérer" et une URL d'offre LinkedIn
    Et que la récupération du texte depuis l'URL ne permet pas d'obtenir les champs attendus (réponse vide ou non exploitable)
    Quand je lance l'enrichissement des offres à récupérer
    Alors le statut de cette offre reste "Annonce à récupérer"
    Et une information de traçabilité indique que l'enrichissement n'a pas pu être effectué
