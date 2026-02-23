# language: fr
@us-1.7
Fonctionnalité: Tableau de synthèse des offres
  En tant qu'utilisateur du tableau de bord
  Je souhaite voir un tableau de synthèse des offres
  Afin de disposer d'une vue claire et exploitable par expéditeur, algorithmes et statut.

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
    | emailExpéditeur                    | algo étape 1 | algo étape 2 | actif | Annonce à récupérer | À traiter | Traité | Ignoré | À analyser |
    | jobs@linkedin.com                 | Linkedin     | Linkedin     | Oui   | 2                   | 0         | 0      | 0      | 1         |
    | notification@emails.hellowork.com | HelloWork    | HelloWork    | Oui   | 1                   | 0         | 0      | 0      | 0         |
    Quand le tableau de synthèse des offres est chargé
    Alors le tableau affiche les colonnes fixes dans l'ordre : email expéditeur, algo étape 1, algo étape 2, actif
    Et le tableau affiche une colonne par statut d'offre dans l'ordre de l'énum Airtable
    Et le tableau affiche les lignes suivantes
    | emailExpéditeur                    | algo étape 1 | algo étape 2 | actif | Annonce à récupérer | À traiter | Traité | Ignoré | À analyser |
    | jobs@linkedin.com                 | Linkedin     | Linkedin     | Oui   | 2                   | 0         | 0      | 0      | 1         |
    | notification@emails.hellowork.com | HelloWork    | HelloWork    | Oui   | 1                   | 0         | 0      | 0      | 0         |

  Scénario: Les colonnes statut utilisent toutes les valeurs de l'énum Airtable dans le même ordre
    Étant donné que le tableau de synthèse des offres est chargé avec au moins une offre
    Quand j'observe les en-têtes de colonnes du tableau de synthèse des offres
    Alors les colonnes statut sont présentes dans l'ordre : Annonce à récupérer, À traiter, Traité, Ignoré, À analyser
    Et une colonne existe pour chaque valeur de l'énum même si le nombre d'offres est zéro

  # --- CA3 : Tri des lignes ---
  Plan du Scénario: Les lignes sont triées d'abord par algo étape 2 puis par algo étape 1
    Étant donné que les sources et offres suivantes existent en base
    | emailExpéditeur | algo étape 1 | algo étape 2 | nb offres |
    | a@test.com      | HelloWork   | HelloWork   | 1         |
    | b@test.com      | Linkedin   | Linkedin   | 1         |
    | c@test.com      | Inconnu    | Inconnu    | 1         |
    Quand le tableau de synthèse des offres est chargé
    Alors les lignes sont ordonnées par algo étape 2 puis par algo étape 1
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
