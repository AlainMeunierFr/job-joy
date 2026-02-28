# language: fr
@us-6.6
Fonctionnalité: Créer les sources (liste canonique, URL officielles, migration, tableau de bord)
  En tant qu'utilisateur
  Je souhaite que les sources soient créées à l'avance selon la liste canonique avec URL officielle et migration des données existantes
  Afin de disposer de toutes les sources, d'ouvrir le site d'une source depuis le tableau de bord, et d'avoir des données migrées vers le schéma une entrée par source.

  # --- CA1 US-6.6 : Liste canonique exacte des 15 noms et détection d'écart ---
  Scénario: La liste canonique des noms de sources contient exactement les 15 noms de référence
    Étant donné que le module des sources (ou la liste canonique en code) est disponible
    Quand j'obtiens la liste canonique des noms de sources
    Alors la liste contient exactement les noms suivants :
      """
      Linkedin, HelloWork, APEC, Cadre Emploi, Welcome to the Jungle, Job That Make Sense, Indeed, France Travail, LesJeudis, Michael Page, Robert Walters, Hays, Monster, Glassdoor, Makesense
      """
    Et le nombre de noms dans la liste canonique est 15

  Scénario: Un écart entre la liste canonique de référence et le code est détectable
    Étant donné que la liste canonique de référence est définie (les 15 noms de l'US-6.6)
    Quand une vérification (test ou statique) compare la liste canonique du code à cette liste de référence
    Alors tout nom de la liste de référence absent du code est signalé comme écart
    Et tout nom présent dans le code qui n'est pas dans la liste de référence peut être signalé (selon la règle métier)
    Et la vérification échoue ou alerte si au moins un écart est détecté

  # --- CA2 US-6.6 : URL officielle pour chaque source ---
  Scénario: Chaque source de la liste canonique a une URL officielle mémorisée après initialisation
    Étant donné que l'initialisation des sources (sources.json) vient d'être exécutée
    Quand je charge les sources depuis sources.json
    Alors chaque entrée (une par nom canonique) possède un champ URL officielle (ou équivalent)
    Et aucune entrée de la liste canonique n'a d'URL officielle vide ou absente pour les 15 noms

  Plan du Scénario: Les URL officielles correspondent au tableau de référence pour les sources suivantes
    Étant donné que les sources sont chargées depuis une initialisation ou sources.json à jour
    Quand je récupère l'URL officielle de la source "<nom>"
    Alors l'URL officielle est "<url>"

    Exemples:
      | nom | url |
      | Linkedin | https://www.linkedin.com/jobs |
      | HelloWork | https://www.hellowork.com |
      | APEC | https://www.apec.fr |
      | Cadre Emploi | https://www.cadremploi.fr |
      | Welcome to the Jungle | https://www.welcometothejungle.com/fr |
      | Job That Make Sense | https://jobs.makesense.org/fr |
      | Indeed | https://www.indeed.fr |
      | France Travail | https://www.francetravail.fr |
      | LesJeudis | https://www.lesjeudis.com |
      | Michael Page | https://www.michaelpage.fr |
      | Robert Walters | https://www.robertwalters.fr |
      | Hays | https://www.hays.fr |
      | Monster | https://www.monster.fr |
      | Glassdoor | https://www.glassdoor.fr |
      | Makesense | https://makesense.org |

  # --- CA4 US-6.6 : Migration des données existantes et orphelins ---
  Scénario: La migration regroupe les entrées par email vers une entrée par source
    Étant donné que des données existantes contiennent des entrées par adresse email (ancien schéma)
    Et que ces emails sont associables à des noms canoniques (ex. offres@alertes.cadremploi.fr → Cadre Emploi)
    Quand la migration des sources vers le schéma une entrée par source est exécutée
    Alors le fichier (ou le store) sources.json contient une entrée par source concernée
    Et les adresses email sont regroupées dans la liste d'emails de la source correspondante
    Et les activations conservées sont mappées lorsqu'elles peuvent l'être

  Scénario: La migration mappe les entrées par chemin liste html vers la source correspondante
    Étant donné que des données existantes contiennent des entrées par chemin ou dossier liste html (ancien schéma)
    Et que ces chemins sont dérivables vers un nom canonique (ex. liste html/cadre-emploi → Cadre Emploi)
    Quand la migration des sources vers le schéma une entrée par source est exécutée
    Alors les entrées par chemin liste html sont associées à l'entrée de la source correspondante
    Et il ne reste qu'une entrée par source dans le résultat

  Scénario: Les entrées orphelines sont traitées de façon définie lors de la migration
    Étant donné que des données existantes contiennent des entrées orphelines (source inconnue ou sans correspondance dans la liste canonique)
    Quand la migration des sources vers le schéma une entrée par source est exécutée
    Alors les entrées orphelines sont traitées selon une règle explicite (ex. rattachées à "Inconnu" ou conservées avec un nom dérivé)
    Et le comportement appliqué aux orphelins est observable et cohérent (pas de perte silencieuse ni de doublon non défini)
    Et ce comportement est couvert par un test ou un scénario

  # --- CA5 US-6.6 : Tableau de bord — clic sur le nom ou le lien ouvre l'URL dans un nouvel onglet ---
  Scénario: Un clic sur le nom de la source dans le tableau de bord ouvre l'URL officielle dans un nouvel onglet
    Étant donné que je suis sur la page du tableau de bord (tableau-synthese-offres ou équivalent)
    Et que les sources sont chargées avec des URL officielles (ex. Cadre Emploi avec https://www.cadremploi.fr)
    Quand je clique sur le nom de la source "Cadre Emploi" (ou sur le lien dédié associé à cette source)
    Alors l'URL officielle de la source "Cadre Emploi" est ouverte dans un nouvel onglet du navigateur
    Et la cible du lien est _blank (ou équivalent) pour ouvrir dans un nouvel onglet

  Scénario: Chaque source de la liste affichée dispose d'un lien ouvrant son URL officielle
    Étant donné que je suis sur la page du tableau de bord avec la liste des sources (une ligne par source)
    Et que les sources canoniques ont une URL officielle mémorisée
    Quand je parcours les lignes du tableau correspondant aux sources
    Alors chaque ligne (ou nom de source) propose un moyen d'ouvrir l'URL officielle (lien ou clic)
    Et l'action ouvre l'URL dans un nouvel onglet

  Scénario: Une source sans URL n'affiche pas de lien actif ou le clic ne déclenche pas d'ouverture
    Étant donné que je suis sur la page du tableau de bord
    Et qu'une source (ex. "Inconnu" ou source sans URL) n'a pas d'URL officielle définie
    Quand cette source est affichée dans le tableau
    Alors le nom de la source n'est pas un lien cliquable ouvrant une URL, ou le clic ne fait rien
    Et aucun nouvel onglet n'est ouvert pour cette source
