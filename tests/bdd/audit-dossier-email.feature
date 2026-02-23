# language: fr
Fonctionnalité: Audit du dossier email avant traitement
  En tant qu'utilisateur du tableau de bord
  je veux auditer le dossier email sans lancer le traitement
  afin d'obtenir une synthèse fiable avant toute action de relève.

  Contexte:
    Étant donné que le compte email est configuré
    Et que le dossier à analyser est configuré

  Scénario: Construire le tableau de synthèse par source à partir de 7 emails
    Étant donné que le dossier à analyser contient les emails suivants
    """
    1) alerte@emails.hellowork.com
    2) jobs@linkedin.com
    3) alerte@emails.hellowork.com
    4) alerte@emails.hellowork.com
    5) alerte@wttj.com
    6) jobs@linkedin.com
    7) jobs@linkedin.com
    """
    Et que la source "jobs@linkedin.com" est reconnue avec l'plugin "linkedin" et le statut actif "Oui"
    Et que les sources "alerte@emails.hellowork.com" et "alerte@wttj.com" ne sont pas reconnues
    Quand je clique sur le bouton "Auditer le dossier de la boite aux lettres"
    Alors le tableau de synthèse affiche les colonnes suivantes
    """
    emailExpéditeur | plugin | actif | nbEmails
    """
    Et le tableau de synthèse affiche les lignes suivantes
    """
    jobs@linkedin.com | linkedin | Oui | 3
    alerte@emails.hellowork.com | inconnu | Non | 3
    alerte@wttj.com | inconnu | Non | 1
    """
    Et la valeur nbEmails correspond exactement au nombre d'emails présents dans le dossier pour chaque source

  Scénario: L'audit reste strictement séparé du traitement et de la relève
    Étant donné que le dossier à analyser contient 7 emails
    Quand je clique sur le bouton "Auditer le dossier de la boite aux lettres"
    Alors aucun email n'est déplacé vers le dossier d'archivage
    Et aucun email n'est marqué comme traité
    Et la relève des offres n'est pas lancée
    Et le traitement des emails n'est pas lancé

  Scénario: Afficher les sous-totaux prévisionnels sous le tableau de synthèse
    Étant donné que l'audit du dossier a produit la synthèse suivante
    """
    jobs@linkedin.com | linkedin | Oui | 3
    alerte@emails.hellowork.com | inconnu | Non | 3
    alerte@wttj.com | inconnu | Oui | 1
    """
    Quand l'audit est affiché
    Alors un sous-total "emailsÀArchiver" est affiché avec la valeur "4"
    Et un sous-total "emailsÀAnalyser" est affiché avec la valeur "3"
    Et ces sous-totaux sont présentés comme prévisionnels tant que le traitement n'est pas lancé

  Scénario: Respecter l'ordre IHM des actions audit et traitement
    Étant donné que l'écran d'audit du dossier email est affiché
    Quand j'observe l'ordre des composants de l'interface
    Alors le bouton "Auditer le dossier de la boite aux lettres" est affiché au-dessus du tableau de synthèse
    Et le bouton "Lancer le traitement" est affiché sous les sous-totaux
