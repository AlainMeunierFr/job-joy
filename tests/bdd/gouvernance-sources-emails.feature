# language: fr
Fonctionnalité: Gouvernance des sources email pour le traitement des offres
  En tant que responsable de l'automatisation du relevé d'emails
  je veux qu'une source existe pour chaque adresse email du dossier de traitement
  afin de savoir si chaque email peut être analysé ou non.

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le dossier email à traiter est configuré
    Et que le dossier "Traité" est configuré

  # --- CA1 : Migration Airtable Sources ---
  Scénario: Migration du modèle de source vers le champ Statut
    Étant donné qu'une migration des sources est exécutée
    Quand la table Sources est préparée pour cette version
    Alors le champ "actif" n'est plus utilisé
    Et le champ "Statut" est un choix unique avec les valeurs "Inconnu", "Inactif" et "Actif"

  Scénario: Initialisation des sources avec la seule source connue par le code
    Étant donné qu'aucune source n'existe encore dans Airtable
    Quand l'initialisation des sources est exécutée
    Alors seule la source nommée "@linkedin" est créée
    Et le statut de la source "@linkedin" est "Actif"
    Et aucune autre source n'est créée à l'initialisation

  # --- CA2 : Audit du dossier BAL ---
  Plan du Scénario: Audit du dossier selon l'existence de la source
    Étant donné qu'un email du dossier à traiter a pour expéditeur "<email expéditeur>"
    Et que la source "<nom source>" est "<présence source>" dans Airtable
    Quand je clique sur le bouton "Auditer le dossier"
    Alors le résultat d'audit est "<résultat audit>"

    Exemples:
      | email expéditeur               | nom source          | présence source | résultat audit                                                                 |
      | jobs-noreply@linkedin.com      | @linkedin           | existante       | la source existante est conservée sans création                                |
      | alertes@unknown-source.test     | unknown-source.test | absente      | une source "unknown-source.test" est créée avec emailExpéditeur complet et statut "Inconnu" |

  # --- CA3 : Auto-correction des statuts incohérents ---
  Plan du Scénario: Statut corrigé vers Inconnu quand aucun parseur ne supporte la source
    Étant donné qu'une source "<nom source>" existe avec le statut "<statut initial>"
    Et qu'aucun parseur connu par le code ne supporte la source "<nom source>"
    Et qu'un email de cette source est présent dans le dossier à traiter
    Quand le traitement des emails est lancé
    Alors le statut de la source "<nom source>" devient "Inconnu"
    Et aucun traitement métier n'est exécuté pour cet email
    Et cet email n'est pas déplacé vers "Traité"

    Exemples:
      | nom source           | statut initial |
      | unknown-source.test  | Actif          |
      | unknown-source.test  | Inactif        |

  # --- CA4 : Statut Inconnu ---
  Scénario: Source absente pendant le traitement, création en Inconnu et capture HTML
    Étant donné qu'un email d'expéditeur "noreply@nouvelle-source.test" est présent dans le dossier à traiter
    Et qu'aucune source "nouvelle-source.test" n'existe dans Airtable
    Quand le traitement des emails est lancé
    Alors une source "nouvelle-source.test" est créée avec emailExpéditeur "noreply@nouvelle-source.test"
    Et le statut de cette source est "Inconnu"
    Et jusqu'à 3 fichiers HTML de cette source sont capturés dans "tests/exemples/nouvelle-source.test/"
    Et cet email n'est pas déplacé vers "Traité"

  # --- CA5 / CA6 / CA7 : Règles de traitement selon le statut ---
  Plan du Scénario: Effet du statut de source sur le traitement et le déplacement
    Étant donné qu'une source "<nom source>" existe avec le statut "<statut source>"
    Et que la disponibilité du parseur pour "<nom source>" est "<disponibilité parseur>"
    Et qu'un email de cette source est présent dans le dossier à traiter
    Quand le traitement des emails est lancé
    Alors le traitement métier est "<exécution traitement>"
    Et l'email est "<déplacement>"

    Exemples:
      | nom source       | statut source | disponibilité parseur | exécution traitement      | déplacement                |
      | linkedin.com     | Actif         | disponible            | exécuté                  | déplacé vers "Traité"      |
      | linkedin.com     | Inactif       | disponible            | non exécuté              | conservé hors "Traité"     |
      | linkedin.com     | Inconnu       | disponible            | non exécuté              | conservé hors "Traité"     |
      | unknown.test     | Actif         | indisponible          | non exécuté (statut corrigé en "Inconnu") | conservé hors "Traité" |
