# language: fr
@us-6.1
Fonctionnalité: Créer des offres à partir d'une recherche sur un site Web (liste html)
  En tant qu'utilisateur
  Je souhaite intégrer le résultat des recherches réalisées via le site web de la plateforme
  Afin de ne pas dépendre des alertes email et d'exploiter des offres plus anciennes.

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le répertoire de données (DATA_DIR) est disponible

  # --- CA1 : Schéma Airtable (Adresse, Type "liste html") ---
  # Note : Le renommage des champs dans Airtable et la création manuelle de l'option "liste html"
  # dans Sources.Type relèvent de l'utilisateur ; pas de scénario BDD pour cela.
  Scénario: Une source créée depuis un dossier liste html a le type "liste html" et Adresse égale au chemin relatif
    Étant donné que le dossier "liste html/apec" existe et contient au moins un fichier HTML en attente
    Et qu'aucune source avec Adresse "liste html/apec" n'existe dans la table Sources
    Quand la mise à jour du tableau (audit et lecture) est lancée
    Alors une source est créée avec Sources.Adresse égal au chemin relatif (ex. "liste html/apec")
    Et cette source a Sources.Type "liste html"
    Et cette source a plugin égal au nom du dossier (ex. "apec")

  Scénario: Les offres issues de la liste html sont liées à la source via le champ Adresse (et non EmailExpediteur)
    Étant donné qu'une source avec Adresse "liste html/apec" et type "liste html" existe
    Et que le dossier "liste html/apec" contient un fichier HTML dont le parser extrait une offre avec une URL
    Quand je lance la phase de création (liste html) pour le plugin apec
    Alors une ligne est créée dans la table Offres pour cette offre
    Et cette ligne est liée à la source dont Adresse est "liste html/apec"
    Et le champ Adresse (ou l'identifiant de source utilisé pour les offres) reflète cette source

  # --- CA2 : Interface « liste html » — dossier et colonne À importer ---
  Scénario: Le dossier "liste html" existe sous le répertoire de données et peut contenir des sous-dossiers par plugin
    Étant donné que l'application est opérationnelle (serveur ou Electron)
    Quand j'observe le système de fichiers du répertoire de données
    Alors un dossier "liste html" existe sous le répertoire de données (DATA_DIR/liste html ou .\data\liste html en dev)
    Et l'utilisateur peut y créer un sous-dossier portant le nom du plugin (ex. "apec")

  Scénario: La colonne "À importer" affiche le nombre de fichiers HTML en attente dans le dossier du plugin
    Étant donné qu'une source avec Adresse "liste html/apec" et type "liste html" existe
    Et que le dossier "liste html/apec" contient exactement 3 fichiers HTML (hors sous-dossier "traité")
    Quand le tableau de synthèse des offres est chargé (ou la mise à jour du tableau est exécutée)
    Alors la ligne correspondant à cette source (Adresse "liste html/apec") affiche dans la colonne "À importer" la valeur "3"

  Scénario: Après traitement d'un fichier HTML, le fichier est déplacé dans le sous-dossier "traité"
    Étant donné qu'une source avec Adresse "liste html/apec" existe avec Activer la création true
    Et que le dossier "liste html/apec" contient un fichier "recherche-1.html" (en attente)
    Et que le sous-dossier "traité" existe ou est créé sous "liste html/apec"
    Quand je lance la phase de création (liste html) pour le plugin apec
    Alors le fichier "recherche-1.html" n'est plus dans "liste html/apec" à la racine
    Et le fichier "recherche-1.html" se trouve dans "liste html/apec/traité"

  Scénario: À la mise à jour du tableau, une source est créée avec Adresse égal au chemin du dossier et plugin au nom du dossier
    Étant donné que le dossier "liste html/apec" existe (avec ou sans fichiers)
    Et qu'aucune source avec Adresse "liste html/apec" n'existe
    Quand je lance la mise à jour du tableau (en même temps que la lecture du contenu de la BAL)
    Alors une entrée source est créée avec Sources.Adresse égal au chemin du dossier (ex. "liste html/apec")
    Et le champ plugin de cette source vaut "apec" (nom du dossier)

  # --- CA3 : Phase création — général (parser HTML, URL offres, structure répétée) ---
  Scénario: Lors de la phase de création, les fichiers HTML du dossier sont parsés et seules les URL d'offres sont extraites
    Étant donné qu'une source avec Adresse "liste html/apec" existe avec Activer la création true
    Et que le dossier "liste html/apec" contient un fichier HTML contenant des liens dont certains pointent vers des offres et d'autres non
    Quand je lance la phase de création (liste html) pour le plugin apec
    Alors seules les URL relatives à des offres sont utilisées pour créer des lignes Offres
    Et les autres URL du corps de la page ne génèrent pas de ligne Offres

  Scénario: Pour chaque occurrence d'une structure répétitive (ex. carte offre), une ligne Offres est créée avec les infos extraites
    Étant donné qu'une source avec Adresse "liste html/apec" existe avec Activer la création true
    Et que le dossier "liste html/apec" contient un fichier HTML avec une structure répétée (ex. cartes) dont 2 occurrences sont des offres avec URL
    Quand je lance la phase de création (liste html) pour le plugin apec
    Alors 2 lignes sont créées dans la table Offres
    Et chaque ligne correspond à une occurrence (une offre) avec au moins l'URL de l'offre renseignée

  # --- CA4 : Phase création — plugin APEC (carte = offre, champs) ---
  Scénario: Pour l'APEC, une offre correspond à une carte et l'URL de l'offre est celle ouverte par la carte
    Étant donné qu'une source avec Adresse "liste html/apec" existe avec Activer la création true
    Et que le dossier "liste html/apec" contient un fichier HTML de recherche APEC avec une carte d'offre pointant vers une URL d'offre
    Quand je lance la phase de création (liste html) pour le plugin apec
    Alors une ligne Offres est créée avec l'URL égale à l'URL de la page d'offre (celle ouverte par la carte)

  Scénario: Pour l'APEC, les champs extraits en phase création incluent poste, description, salaire, type contrat, commune, département, date
    Étant donné qu'une source avec Adresse "liste html/apec" existe avec Activer la création true
    Et que le dossier "liste html/apec" contient un fichier HTML APEC avec une carte offrant les champs : nom du poste, courte description, salaire, type de contrat, commune, département, date de l'offre
    Quand je lance la phase de création (liste html) pour le plugin apec
    Alors la ligne Offres créée a les champs renseignés selon les données extraites de la carte
    """
    Poste (nom du poste), Courte description (ou Texte de l'offre si fusion), Salaire, Type de contrat, Commune, Département, DateOffre (date de l'offre)
    """
    Et le Département est dérivé du split si la source fournit commune et département ensemble

  # --- CA5 : Phase Enrichissement — général (ouvrir URL, HTTP ou navigateur) ---
  Scénario: Lors de l'enrichissement, l'URL de l'offre est ouverte et le contenu utile est lu (HTTP ou navigateur)
    Étant donné que la table Offres contient une ligne avec Statut "Annonce à récupérer" et une URL d'offre (source import HTML)
    Et que le contenu de cette URL est accessible (HTTP direct ou via navigateur en tâche de fond)
    Quand je lance l'enrichissement des offres à récupérer
    Alors l'application ouvre l'URL de l'offre (requête HTTP ou ouverture navigateur)
    Et le contenu utile de la page est lu et utilisé pour enrichir les champs de l'offre

  Scénario: Si le site bloque le crawler HTTP, l'application peut utiliser un navigateur en tâche de fond pour récupérer le contenu
    Étant donné que la table Offres contient une ligne avec Statut "Annonce à récupérer" et une URL d'offre (source import HTML)
    Et que la requête HTTP directe vers cette URL ne renvoie pas le contenu utile (détection crawler)
    Quand je lance l'enrichissement des offres à récupérer
    Alors l'application peut ouvrir un navigateur en tâche de fond (ex. Playwright) pour charger l'URL
    Et le contenu obtenu via le navigateur est utilisé pour enrichir l'offre

  # --- CA6 : Phase Enrichissement — plugin APEC ---
  Scénario: L'enrichissement des offres APEC (import HTML) remplit les champs à partir de la page d'offre
    Étant donné que la table Offres contient une ligne avec Statut "Annonce à récupérer", une URL d'offre APEC et une source de type "liste html"
    Et que le contenu de la page d'offre APEC est accessible (HTTP ou navigateur selon le comportement du site)
    Quand je lance l'enrichissement des offres à récupérer
    Alors les champs de cette offre (Texte de l'offre, Poste, Salaire, Commune, Département, DateOffre, etc.) sont renseignés à partir de la page
    Et le statut de l'offre n'est plus "Annonce à récupérer"

  Scénario: Si la récupération du contenu APEC échoue (anti-crawler non contournable), le statut reste "Annonce à récupérer" avec traçabilité
    Étant donné que la table Offres contient une ligne avec Statut "Annonce à récupérer" et une URL d'offre APEC
    Et que la récupération du contenu (HTTP et navigateur) échoue ou ne renvoie pas de données exploitables
    Quand je lance l'enrichissement des offres à récupérer
    Alors le statut de cette offre reste "Annonce à récupérer"
    Et la cause ou la limite est consignée (log ou message) pour traçabilité
