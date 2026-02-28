# language: fr
@us-1.7
Fonctionnalité: Tableau de synthèse des offres
  En tant qu'utilisateur du tableau de bord
  Je souhaite voir un tableau de synthèse des offres
  Afin de disposer d'une vue claire et exploitable par expéditeur, plugins et statut.

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le tableau de bord est affiché

  # --- CA1 : Conteneur distinct du tableau des emails ---
  Scénario: Le tableau de synthèse des offres est dans un conteneur dédié distinct du tableau des emails
    Étant donné que le tableau de bord affiche le tableau de synthèse des emails
    Et que le tableau de synthèse des offres contient des données
    Quand j'observe la page du tableau de bord
    Alors le tableau de synthèse des offres est dans un conteneur distinct du tableau de synthèse des emails
    Et les deux tableaux sont visuellement séparés (titres, emplacements ou sections différents)

  # --- CA2 : Structure du tableau ---
  Scénario: Le tableau affiche une ligne par expéditeur avec les colonnes fixes et les colonnes statut
    Étant donné que les sources et offres suivantes existent en base
    | emailExpéditeur                    | plugin étape 1 | plugin étape 2 | Annonce à récupérer | À analyser | À traiter | Candidaté | Refusé | Traité | Ignoré | Expiré | Autre |
    | jobs@linkedin.com                 | Linkedin     | Linkedin     | 2                   | 1         | 0      | 0         | 0      | 0      | 0      | 0      | 0     |
    | notification@emails.hellowork.com | HelloWork    | HelloWork    | 1                   | 0         | 0      | 0         | 0      | 0      | 0      | 0      | 0     |
    Quand le tableau de synthèse des offres est chargé
    Alors le tableau affiche les colonnes fixes dans l'ordre : Adresse, plugin, création, enrichissement, analyse
    Et le tableau affiche une colonne par statut d'offre dans l'ordre de l'énum Airtable
    Et le tableau affiche les lignes suivantes
    | emailExpéditeur                    | plugin étape 1 | plugin étape 2 | création | enrichissement | analyse | Annonce à récupérer | À analyser | À traiter | Candidaté | Refusé | Traité | Ignoré | Expiré | Autre |
    | jobs@linkedin.com                 | Linkedin     | Linkedin     | ✅       | ✅             | ✅      | 2                   | 1         | 0      | 0         | 0      | 0      | 0      | 0      | 0     |
    | notification@emails.hellowork.com | HelloWork    | HelloWork    | ✅       | ✅             | ✅      | 1                   | 0         | 0      | 0         | 0      | 0      | 0      | 0      | 0     |

  Scénario: Les colonnes statut utilisent toutes les valeurs de l'énum Airtable dans le même ordre
    Étant donné que le tableau de synthèse des offres est chargé avec au moins une offre
    Quand j'observe les en-têtes de colonnes du tableau de synthèse des offres
    Alors les colonnes statut sont présentes dans l'ordre : Annonce à récupérer, À analyser, À traiter, Candidaté, Refusé, Traité, Ignoré, Expiré, Autre
    Et une colonne existe pour chaque valeur de l'énum même si le nombre d'offres est zéro

  # --- CA3 : Tri des lignes ---
  Plan du Scénario: Les lignes sont triées d'abord par plugin étape 2 puis par plugin étape 1
    Étant donné que les sources et offres suivantes existent en base
    | emailExpéditeur | plugin étape 1 | plugin étape 2 | nb offres |
    | a@test.com      | HelloWork   | HelloWork   | 1         |
    | b@test.com      | Linkedin   | Linkedin   | 1         |
    | c@test.com      | Inconnu    | Inconnu    | 1         |
    Quand le tableau de synthèse des offres est chargé
    Alors les lignes sont ordonnées par plugin étape 2 puis par plugin étape 1
    Et la première ligne affichée correspond à l'expéditeur "<premier expéditeur>"

    Exemples:
      | premier expéditeur |
      | a@test.com        |

  # --- CA4 : Expéditeur sans offre n'apparaît pas ---
  Scénario: Un expéditeur sans offre n'apparaît pas dans le tableau
    Étant donné qu'une source "sans-offre@test.com" existe dans la table Sources
    Et qu'aucune offre n'est liée à cette source
    Quand le tableau de synthèse des offres est chargé
    Alors la ligne correspondant à "sans-offre@test.com" n'apparaît pas dans le tableau

  Scénario: Seuls les expéditeurs ayant au moins une offre sont affichés
    Étant donné que la source "avec-offres@test.com" a 3 offres en base
    Et que la source "sans-offres@test.com" n'a aucune offre
    Quand le tableau de synthèse des offres est chargé
    Alors le tableau affiche une ligne pour "avec-offres@test.com"
    Et le tableau n'affiche pas de ligne pour "sans-offres@test.com"

  # --- CA5 : Largeur constante des colonnes statut ---
  Scénario: Les colonnes statut affichent zéro quand aucune offre n'a ce statut
    Étant donné qu'une source "unique@test.com" a 2 offres en statut "Annonce à récupérer" et 0 dans les autres statuts
    Quand le tableau de synthèse des offres est chargé
    Alors la cellule (unique@test.com × "Annonce à récupérer") affiche "2"
    Et la cellule (unique@test.com × "À traiter") affiche "0"
    Et la cellule (unique@test.com × "Traité") affiche "0"
    Et la cellule (unique@test.com × "Ignoré") affiche "0"
    Et la cellule (unique@test.com × "À analyser") affiche "0"
    Et la cellule (unique@test.com × "Autre") affiche "0"

  # --- US-1.13 : Totaux (colonne et ligne) ---
  # CA1 : Colonne Totaux à droite des colonnes de statut ; par ligne = total d'offres de cette source
  @us-1.13
  Scénario: La colonne Totaux est à droite des colonnes de statut et affiche le total par source
    Étant donné que les sources et offres suivantes existent en base
    | emailExpéditeur                    | plugin étape 1 | plugin étape 2 | Annonce à récupérer | À analyser | À traiter | Candidaté | Refusé | Traité | Ignoré | Expiré | Autre |
    | jobs@linkedin.com                 | Linkedin     | Linkedin     | 2                   | 1         | 0      | 0         | 0      | 0      | 0      | 0      | 0     |
    | notification@emails.hellowork.com | HelloWork    | HelloWork    | 1                   | 0         | 0      | 0         | 0      | 0      | 0      | 0      | 0     |
    Quand le tableau de synthèse des offres est chargé
    Alors une colonne "Totaux" est affichée à droite des colonnes de statut
    Et pour la ligne de la source "jobs@linkedin.com" la cellule Totaux affiche "4"
    Et pour la ligne de la source "notification@emails.hellowork.com" la cellule Totaux affiche "1"

  # CA2 : Ligne Totaux en bas ; par colonne statut = total dans ce statut ; cellule Totaux×Totaux = total général
  @us-1.13
  Scénario: La ligne Totaux est en bas du tableau et affiche les totaux par statut et le total général
    Étant donné que les sources et offres suivantes existent en base
    | emailExpéditeur                    | plugin étape 1 | plugin étape 2 | Annonce à récupérer | À analyser | À traiter | Candidaté | Refusé | Traité | Ignoré | Expiré | Autre |
    | jobs@linkedin.com                 | Linkedin     | Linkedin     | 2                   | 1         | 0      | 0         | 0      | 0      | 0      | 0      | 0     |
    | notification@emails.hellowork.com | HelloWork    | HelloWork    | 1                   | 0         | 0      | 0         | 0      | 0      | 0      | 0      | 0     |
    Quand le tableau de synthèse des offres est chargé
    Alors une ligne "Totaux" est affichée en bas du tableau
    Et la cellule de la ligne Totaux pour la colonne "Annonce à récupérer" affiche "3"
    Et la cellule de la ligne Totaux pour la colonne "À traiter" affiche "1"
    Et la cellule de la ligne Totaux pour la colonne "À analyser" affiche "1"
    Et la cellule Totaux×Totaux affiche "5"

  # CA3 : Totaux calculés depuis les mêmes données ; rafraîchir met à jour les totaux
  @us-1.13
  Scénario: Rafraîchir le tableau met à jour les totaux
    Étant donné que les sources et offres suivantes existent en base
    | emailExpéditeur   | plugin étape 1 | plugin étape 2 | Annonce à récupérer | À traiter | Traité | Ignoré | À analyser |
    | first@source.com  | PluginA        | PluginA        | 1                   | 0         | 0      | 0      | 0         |
    Quand le tableau de synthèse des offres est chargé
    Alors pour la ligne de la source "first@source.com" la cellule Totaux affiche "1"
    Et la cellule Totaux×Totaux affiche "1"
    Étant donné que les données du tableau de synthèse sont mises à jour en base avec les comptages suivants
    | emailExpéditeur   | plugin étape 1 | plugin étape 2 | Annonce à récupérer | À traiter | Traité | Ignoré | À analyser |
    | first@source.com  | PluginA        | PluginA        | 2                   | 1         | 0      | 0      | 0         |
    Quand je clique sur le bouton "Mise à jour" du bloc Traitements
    Alors pour la ligne de la source "first@source.com" la cellule Totaux affiche "3"
    Et la cellule Totaux×Totaux affiche "3"

  # --- US-3.3 : Tableau de bord unifié ---
  # CA1 : Colonne "A importer" dans la Synthèse des offres (une API, cache RAM)
  @us-3.3
  Scénario: Le tableau Synthèse des offres affiche une colonne "A importer" avec les valeurs du cache audit
    Étant donné que les sources et offres suivantes existent en base
    | emailExpéditeur                    | plugin étape 1 | plugin étape 2 | Annonce à récupérer | À analyser | À traiter |
    | jobs@linkedin.com                 | Linkedin     | Linkedin     | 2                   | 1         | 0      |
    | notification@emails.hellowork.com | HelloWork    | HelloWork    | 1                   | 0         | 0      |
    Et que le cache RAM du dernier audit contient les nombres à importer suivants
    | emailExpéditeur                    | A importer |
    | jobs@linkedin.com                 | 3          |
    | notification@emails.hellowork.com | 0          |
    Quand le tableau de synthèse des offres est chargé
    Alors le tableau affiche une colonne "A importer"
    Et la cellule (jobs@linkedin.com × "A importer") affiche "3"
    Et la cellule (notification@emails.hellowork.com × "A importer") affiche "0"
    Et les données du tableau (lignes et colonne "A importer") proviennent d'une seule API

  @us-3.3
  Scénario: La colonne "A importer" affiche zéro quand le cache audit n'a pas encore été exécuté pour une source
    Étant donné que la source "nouvelle@source.com" a 1 offre en base
    Et que le cache RAM du dernier audit ne contient pas d'entrée pour "nouvelle@source.com"
    Quand le tableau de synthèse des offres est chargé
    Alors la cellule (nouvelle@source.com × "A importer") affiche "0"

  # CA2 : Bouton "Mise à jour" déclenche audit puis rafraîchissement côté serveur
  @us-3.3
  Scénario: Le bouton "Mise à jour" déclenche l'audit puis le rafraîchissement et le tableau se met à jour
    Étant donné que les sources et offres suivantes existent en base
    | emailExpéditeur   | plugin étape 1 | plugin étape 2 | Annonce à récupérer | À traiter |
    | source@test.com   | PluginA        | PluginA        | 1                   | 0         |
    Et que le tableau de synthèse des offres est chargé
    Et que le cache RAM du dernier audit contient pour "source@test.com" le nombre à importer "0"
    Quand je clique sur le bouton "Mise à jour" du bloc Traitements
    Alors le serveur exécute l'audit puis le rafraîchissement des statuts
    Et le tableau affiche la colonne "A importer" et les statuts cohérents avec le résultat de cet enchaînement
    Et la cellule (source@test.com × "A importer") reflète le résultat du dernier audit

  # CA3 US-3.3 / US-3.5 : Thermomètres dans le bloc Traitements (réorganisation US-3.5)
  @us-3.3
  @us-3.5
  Scénario: Les thermomètres des trois phases sont affichés dans le bloc Traitements
    Étant donné que le tableau de bord est affiché
    Et que le bloc "Traitements" est visible
    Quand j'observe la zone des phases dans le bloc Traitements
    Alors un thermomètre de progression de la phase 1 (création) est affiché
    Et un thermomètre pour la phase 2 (enrichissement) est affiché
    Et un thermomètre pour la phase 3 (analyse IA) est affiché
