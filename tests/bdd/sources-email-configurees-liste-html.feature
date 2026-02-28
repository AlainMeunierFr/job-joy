# language: fr
@us-6.2
Fonctionnalité: Sources email configurées à l'avance et liste html par sous-dossier
  En tant qu'utilisateur
  Je souhaite que seules les sources que j'ai configurées soient prises en compte pour les emails, et que les sources « liste html » soient créées automatiquement à partir des sous-dossiers
  Afin d'éviter la création intempestive de sources à partir de la boîte mail et de simplifier la configuration de la liste html.

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le répertoire de données (DATA_DIR) est disponible

  # --- CA2 (US-6.2) : Emails — audit ne crée jamais de source depuis la boîte ; synthèse uniquement pour expéditeurs déjà en Sources ---
  Scénario: Mise à jour du tableau avec des expéditeurs inconnus n'entraîne aucune création de source
    Étant donné que la table Sources ne contient aucune source dont l'Adresse correspond à "nouveau@domaine-inconnu.test" ou "autre@domaine-inconnu.test"
    Et que la boîte mail (dossier à traiter) contient des emails dont les expéditeurs sont "nouveau@domaine-inconnu.test" et "autre@domaine-inconnu.test"
    Quand la mise à jour du tableau (audit et lecture du dossier email) est lancée
    Alors aucune nouvelle source n'est créée à partir de ces expéditeurs
    Et la table Sources ne contient pas de ligne avec Adresse "nouveau@domaine-inconnu.test"
    Et la table Sources ne contient pas de ligne avec Adresse "autre@domaine-inconnu.test"
    Et ces expéditeurs n'apparaissent pas dans la synthèse (tableau de synthèse des offres ou décompte par source)

  Scénario: Mise à jour du tableau avec des expéditeurs déjà en Sources les affiche dans la synthèse avec le bon décompte
    Étant donné qu'une source avec Adresse "connu@source-configurée.test" et type "email" existe dans la table Sources
    Et qu'une source avec Adresse "autre-connu@source-configurée.test" et type "email" existe dans la table Sources
    Et que la boîte mail contient 3 emails de "connu@source-configurée.test" et 1 email de "autre-connu@source-configurée.test" (non encore traités)
    Quand la mise à jour du tableau (audit et lecture du dossier email) est lancée
    Alors aucune nouvelle source n'est créée
    Et la synthèse affiche une ligne (ou un décompte) pour la source dont Adresse est "connu@source-configurée.test"
    Et le décompte "À importer" (ou équivalent) pour cette source reflète le nombre d'emails en attente (ex. 3)
    Et la synthèse affiche une ligne (ou un décompte) pour la source dont Adresse est "autre-connu@source-configurée.test"
    Et le décompte "À importer" (ou équivalent) pour cette source reflète 1

  # --- CA3 (US-6.2) : Liste html — plugin de la source créée = nom du dossier si un plugin correspondant existe, sinon Inconnu ---
  # La création automatique de source pour un sous-dossier (Adresse = "liste html/slug") est déjà couverte par import-offres-liste-html.feature.
  # Ce scénario décrit le comportement attendu lorsque le nom du sous-dossier ne correspond à aucun plugin connu.
  Scénario: Un sous-dossier liste html dont le nom ne correspond à aucun plugin connu crée une source avec plugin "Inconnu"
    Étant donné que le dossier "liste html/mon-dossier-custom" existe sous le répertoire de données (avec ou sans fichiers)
    Et qu'aucun plugin connu par l'application ne correspond au nom "mon-dossier-custom"
    Et qu'aucune source avec Adresse "liste html/mon-dossier-custom" n'existe dans la table Sources
    Quand la mise à jour du tableau (audit liste html et lecture) est lancée
    Alors une source est créée avec Adresse "liste html/mon-dossier-custom"
    Et cette source a Type "liste html"
    Et le champ plugin de cette source vaut "Inconnu"

  Scénario: Un sous-dossier liste html dont le nom correspond à un plugin connu crée une source avec ce plugin
    Étant donné que le dossier "liste html/apec" existe sous le répertoire de données
    Et qu'un plugin nommé "apec" (ou de slug "apec") est connu par l'application
    Et qu'aucune source avec Adresse "liste html/apec" n'existe dans la table Sources
    Quand la mise à jour du tableau (audit liste html et lecture) est lancée
    Alors une source est créée avec Adresse "liste html/apec"
    Et cette source a Type "liste html"
    Et le champ plugin de cette source correspond au plugin connu (ex. "apec")
