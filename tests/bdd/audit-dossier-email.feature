# language: fr
@us-3.3
Fonctionnalité: Absence du container Dossier de la boite aux lettres
  En tant qu'utilisateur du tableau de bord
  Je ne vois plus le container "Dossier de la boite aux lettres"
  Afin que le traitement des emails soit intégré au tableau de bord (Synthèse des offres) sans doublon.

  Contexte:
    Étant donné que le tableau de bord est affiché

  # CA4 US-3.3 : Le container BAL est supprimé ; l'audit et la mise à jour sont déclenchés depuis le bloc Synthèse des offres.
  Scénario: Le container "Dossier de la boite aux lettres" n'est pas présent sur la page
    Étant donné que le tableau de bord est affiché
    Quand j'observe la page du tableau de bord
    Alors le container "Dossier de la boite aux lettres" n'est pas présent
    Et le titre "Dossier de la boite aux lettres" n'est pas affiché
    Et le bouton "Auditer le dossier" n'est pas affiché
    Et le bouton "Lancer le traitement" n'est pas affiché
    Et le tableau de synthèse audit (emails par source) n'est pas affiché
    Et les sous-totaux archivés et subsistance ne sont pas affichés
