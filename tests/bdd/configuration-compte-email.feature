# language: fr
Fonctionnalité: Configuration du compte email
  En tant qu'utilisateur, je souhaite configurer mon compte mail (identifiant, mot de passe)
  et le dossier de travail afin que l'application puisse compter les emails à analyser.

  Contexte:
    Étant donné que je suis sur la page de paramétrage du compte email

  # --- CA1 : Page de paramétrage ---
  Scénario: La page de paramétrage affiche le champ adresse email
    Alors la page comporte un champ de saisie pour l'adresse email

  Scénario: La page de paramétrage affiche le champ mot de passe masqué et l'icône œil
    Alors la page comporte un champ mot de passe à saisie masquée
    Et la page comporte un bouton ou une icône permettant d'afficher temporairement le mot de passe en clair

  Scénario: La page de paramétrage affiche la zone de saisie du dossier dans la boîte mail
    Alors la page comporte une zone de saisie pour le dossier dans la boîte mail

  Scénario: La page comporte les boutons Tester connexion, Annuler et Enregistrer
    Alors la page comporte un bouton "Tester connexion"
    Et la page comporte un bouton "Annuler"
    Et la page comporte un bouton "Enregistrer"

  # --- CA1 : Rechargement des paramètres au chargement ---
  Scénario: Au chargement, les paramètres sauvegardés sont affichés, le mot de passe non
    Étant donné que le compte a été enregistré avec l'adresse "alain@maep.fr" et un chemin valide
    Quand je me rends sur la page de paramétrage
    Alors le champ adresse email affiche "alain@maep.fr"
    Et le champ chemin du dossier affiche le chemin enregistré
    Et le champ mot de passe est vide

  # --- CA1 : Icône œil ---
  Scénario: L'icône œil permet d'afficher puis masquer le mot de passe
    Étant donné que je suis sur la page de paramétrage
    Et que le champ mot de passe contient "MonMotDePasse"
    Quand je clique sur l'icône d'affichage du mot de passe
    Alors le mot de passe est affiché en clair
    Quand je clique à nouveau sur l'icône d'affichage du mot de passe
    Alors le mot de passe est masqué

  # --- CA2 : Bouton Tester connexion et résultats (tableau identique à l'US) ---
  Plan du Scénario: Tester connexion selon le tableau de cas
    Étant donné que le champ adresse email contient "<adresse email>"
    Et que le champ mot de passe contient "<mot de passe>"
    Et que le champ chemin du dossier contient "<dossier>"
    Quand je clique sur le bouton Tester connexion
    Alors le résultat du test est "<résultat attendu>"

    Exemples:
      | adresse email | mot de passe | dossier | résultat attendu |
      | vide | quelconque | quelconque | erreur: le champ 'adresse email' est requis |
      | quelconque | vide | quelconque | erreur: le champ 'mot de passe' est requis |
      | invalide | valide | valide | erreur: erreur sur 'adresse email' ou le 'mot de passe' |
      | valide | invalide | valide | erreur: erreur sur 'adresse email' ou le 'mot de passe' |
      | invalide | invalide | valide | erreur: erreur sur 'adresse email' ou le 'mot de passe' |
      | valide | valide | vide | erreur: préciser le chemin vers le dossier à analyser |
      | valide | valide | invalide | erreur: le chemin vers le dossier à analyser n'existe pas |
      | alain@maep.fr | MonMotDePasse | valide | succès: paramétrages corrects - X emails à analyser |

  Scénario: Le résultat du test est présenté de façon lisible
    Étant donné que j'ai effectué un test de connexion (quel qu'en soit le résultat)
    Alors le résultat est présenté avec les libellés ou colonnes attendus
    """
    adresse email | Mot de passe [masqué] | Dossier | Type de message | Message
    """

  # --- CA3 : Mémorisation dans .\data\compte.json ---
  Scénario: Mémorisation des paramètres dans compte.json après enregistrement
    Étant donné que le champ adresse email contient "alain@maep.fr"
    Et que le champ mot de passe contient "MonMotDePasse"
    Et que le champ chemin du dossier contient un chemin valide
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors le fichier ".\data\compte.json" existe
    Et le fichier ".\data\compte.json" contient l'adresse email enregistrée
    Et le fichier ".\data\compte.json" contient le chemin du dossier enregistré

  Scénario: Après enregistrement un message confirme et les paramètres restent affichés
    Étant donné que le champ adresse email contient "alain@maep.fr"
    Et que le champ mot de passe contient "MonMotDePasse"
    Et que le champ chemin du dossier contient un chemin valide
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors un message confirme l'enregistrement
    Et le champ adresse email affiche "alain@maep.fr"
    Et le champ chemin du dossier affiche le chemin saisi

  Scénario: Le mot de passe n'est pas stocké en clair dans compte.json
    Étant donné que le champ mot de passe contient "MonMotDePasse"
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors le fichier ".\data\compte.json" existe
    Et la valeur du mot de passe stockée dans ".\data\compte.json" n'est pas "MonMotDePasse" en clair
    Et le mot de passe est stocké de façon sécurisée (hachage reconnu, non obsolète)

  # --- CA3 : Bouton Annuler ---
  Scénario: Le bouton Annuler remet les valeurs sauvegardées
    Étant donné que le compte a été enregistré avec l'adresse "autre@test.fr" et un chemin valide
    Et que je suis sur la page de paramétrage
    Quand je modifie l'adresse email en "modifie@test.fr"
    Et que je modifie le chemin du dossier
    Et que je clique sur le bouton Annuler
    Alors le champ adresse email affiche "autre@test.fr"
    Et le champ chemin du dossier affiche le chemin enregistré
    Et le champ mot de passe est vide
