# language: fr
@us-3.5
Fonctionnalité: Réorganisation des traitements
  En tant qu'utilisateur
  Je souhaite que les traitements et l'ergonomie du tableau de bord soient réorganisés en trois blocs distincts (comptage emails, traitements payants, mise à jour manuelle)
  Afin de limiter la consommation d'API inutile et clarifier ce qui est gratuit (lecture seule), payant (traitement) et manuel (rafraîchissement).

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le tableau de bord est affiché

  # --- CA1 : Comportement au chargement de la page ---
  Scénario: Au chargement de la page une seule requête synthèse est envoyée et aucun polling n'est mis en place
    Étant donné que le serveur expose l'API de synthèse des offres
    Quand l'utilisateur ouvre la page du tableau de bord
    Alors exactement une requête est envoyée vers l'API de synthèse des offres
    Et aucun timer ni polling ne déclenche de nouvelle requête de synthèse après ce chargement

  # --- CA2 : Bloc 1 – Comptage des emails (lecture seule) ---
  Scénario: Le processus de comptage seul ne crée pas d'offres ni ne déplace les emails
    Étant donné que le tableau de bord est affiché
    Et que le flux de comptage (lecture seule) des emails à importer s'exécute
    Quand le comptage est terminé
    Alors aucune création d'offre en base n'a été déclenchée
    Et aucun déplacement ni archivage d'email n'a été déclenché

  # --- CA3 : Bloc 2 – Lancer les traitements (3 phases) ---
  Scénario: Le bouton "Lancer les traitements" est présent dans le bloc Traitements avec le libellé attendu
    Étant donné que le tableau de bord est affiché
    Et que le bloc "Traitements" est visible
    Quand j'observe les boutons du bloc Traitements
    Alors un bouton intitulé "Lancer les traitements" est affiché
    Et ce bouton remplace l'ancien libellé "Ouvrir, récupérer et analyser les annonces"

  Scénario: Le clic sur "Lancer les traitements" déclenche les trois phases enchaînées dans l'ordre
    Étant donné que le tableau de bord est affiché
    Et que les sources sont configurées pour le traitement
    Quand je clique sur le bouton "Lancer les traitements"
    Alors la phase 1 (création – lire emails, créer offres, archiver emails) s'exécute en premier
    Et la phase 2 (enrichissement – ouvrir offres, récupérer texte) s'exécute ensuite
    Et la phase 3 (analyse IA) s'exécute en dernier
    Et à la fin des trois phases aucun job récurrent ne reste actif

  Scénario: Pendant l'exécution des traitements les mises à jour du tableau sont chirurgicales
    Étant donné que le tableau de bord est affiché
    Et que je clique sur le bouton "Lancer les traitements"
    Quand les phases progressent (création, enrichissement, analyse IA)
    Alors le tableau reçoit des mises à jour ciblées (compteurs, statuts)
    Et aucune requête de rechargement complet de la synthèse n'est envoyée pendant la progression des phases

  # --- CA4 : Bloc 3 – Mise à jour à la demande ---
  Scénario: Le bouton "Mise à jour" déclenche un seul rafraîchissement du tableau
    Étant donné que le tableau de bord est affiché
    Et que le tableau de synthèse des offres a été chargé une première fois
    Quand je clique sur le bouton "Mise à jour" du bloc Synthèse des offres
    Alors exactement une nouvelle requête est envoyée vers l'API de synthèse des offres
    Et le tableau affiche les données à jour après la réponse

  Scénario: Aucun rafraîchissement automatique du tableau en arrière-plan
    Étant donné que le tableau de bord est affiché
    Et que le chargement initial du tableau est terminé
    Et que je n'ai pas cliqué sur "Mise à jour" ni sur "Lancer les traitements"
    Quand un délai suffisant s'écoule sans action utilisateur
    Alors aucune nouvelle requête de synthèse des offres n'est envoyée automatiquement

  # --- CA5 : Maquette / disposition en 3 blocs ---
  Scénario: La page affiche le container "Synthèse des offres" en première ligne
    Étant donné que le tableau de bord est affiché
    Quand j'observe la structure de la page
    Alors un container "Synthèse des offres" est visible sur toute la largeur
    Et ce container contient le tableau de synthèse des offres
    Et ce container contient le bouton "Mise à jour"
    Et ce container contient le bouton "Ouvrir Airtable"

  Scénario: La page affiche le container "Traitements" avec le bouton Lancer les traitements et les trois lignes de phase
    Étant donné que le tableau de bord est affiché
    Quand j'observe le bloc Traitements
    Alors le bloc "Traitements" est visible
    Et le bouton "Lancer les traitements" est présent dans ce bloc
    Et trois lignes de phase sont affichées (nom de la phase | thermomètre | élément en cours)

  Scénario: La page affiche le container "Consommation API" à droite du bloc Traitements
    Étant donné que le tableau de bord est affiché
    Quand j'observe la structure de la page
    Alors un container "Consommation API" est visible
    Et ce container affiche la consommation API (tableau ou indicateurs cohérents avec l'existant)
