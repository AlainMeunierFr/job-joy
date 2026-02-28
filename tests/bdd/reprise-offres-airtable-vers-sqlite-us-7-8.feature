# language: fr
@us-7.8
Fonctionnalité: Reprise des offres existantes depuis Airtable vers SQLite
  En tant qu'utilisateur
  Je souhaite migrer une dernière fois les offres depuis Airtable vers SQLite via l'API Airtable (lecture seule) puis insertion dans SQLite
  Afin d'abandonner Airtable pour les offres tout en conservant l'existant.

  Contexte:
    Les steps mockent l'API Airtable (réponses simulées) et utilisent un repository SQLite de test (base en mémoire ou fichier éphémère).
    Aucune donnée réelle Airtable n'est requise.

  # --- CA1 : Commande ou script ---
  Scénario: Une commande ou un script dédié effectue la reprise des offres Airtable vers SQLite
    Étant donné que l'API Airtable (mock) expose la table "Offres" avec au moins une offre (record ID "recReprise1")
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise (ex. npm run import:offres-airtable-vers-sqlite ou commande CLI dédiée) avec la base de test
    Alors le script s'exécute sans erreur (code de sortie 0 ou équivalent)
    Et au moins une offre est présente dans le repository SQLite de test
    Et cette offre provient de la table Airtable "Offres" (lue via l'API mockée)

  Scénario: Le script lit toutes les offres depuis la table Airtable "Offres" via l'API
    Étant donné que l'API Airtable (mock) expose la table "Offres" avec exactement 3 offres
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Alors le repository SQLite de test contient exactement 3 offres
    Et chaque offre a un UID égal au record ID Airtable correspondant

  # --- CA2 : Pagination ---
  Scénario: La pagination de l'API Airtable est gérée pour récupérer l'intégralité des enregistrements
    Étant donné que l'API Airtable (mock) expose la table "Offres" avec 150 enregistrements répartis sur plusieurs pages (pageSize 100)
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Alors le script effectue au moins 2 appels à l'API Airtable (ou utilise offset/page suivante)
    Et le repository SQLite de test contient exactement 150 offres
    Et aucune limite arbitraire côté script n'a tronqué les résultats

  Scénario: Une seule page suffit quand le nombre d'offres est inférieur à la taille de page
    Étant donné que l'API Airtable (mock) expose la table "Offres" avec 10 enregistrements (une seule page)
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Alors le script récupère les 10 offres (un ou plusieurs appels selon implémentation)
    Et le repository SQLite de test contient exactement 10 offres

  # --- CA3 : Mapping et insertion ---
  Scénario: Le record ID Airtable est mappé vers la colonne UID SQLite
    Étant donné que l'API Airtable (mock) expose une offre avec record ID "recABC123XYZ" et champs Poste "Ingénieur", URL "https://exemple.com/o1"
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Alors une offre existe dans le repository SQLite avec UID "recABC123XYZ"
    Et la lecture par UID "recABC123XYZ" retourne une offre avec Poste "Ingénieur" et URL "https://exemple.com/o1"

  Scénario: Les champs métier Airtable sont mappés vers les colonnes SQLite (mêmes noms ou convention documentée)
    Étant donné que l'API Airtable (mock) expose une offre avec Id offre "I1", source "APEC", Statut "À importer", URL "https://apec.com/1", Poste "Dev", Résumé "Résumé Airtable"
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Alors l'offre insérée en SQLite a Id offre "I1"
    Et elle a source "APEC"
    Et elle a Statut "À importer"
    Et elle a URL "https://apec.com/1"
    Et elle a Poste "Dev"
    Et elle a Résumé "Résumé Airtable"

  Scénario: Les champs absents ou invalides sont gérés (valeur par défaut, skip ou règle documentée)
    Étant donné que l'API Airtable (mock) expose une offre avec record ID "recIncomplet" et URL "https://incomplet.com/1" mais sans champ Poste (absent)
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Alors l'offre est insérée en SQLite avec UID "recIncomplet"
    Et le champ Poste est soit une valeur par défaut (ex. chaîne vide), soit l'offre est insérée selon la règle documentée (skip ou autre)

  # --- CA4 : Idempotence fondée sur l'UID ---
  Scénario: Une relance du script met à jour les offres déjà importées par UID au lieu de créer des doublons
    Étant donné que l'API Airtable (mock) expose une offre avec record ID "recIdem1", Poste "Dev", Statut "À importer"
    Et que le repository SQLite de test contient déjà une offre avec UID "recIdem1" et Poste "Ancien poste" et Statut "Importée"
    Quand j'exécute le script de reprise avec la base de test
    Alors il n'y a qu'une seule offre avec UID "recIdem1" dans le repository SQLite
    Et cette offre a Poste "Dev" et Statut "À importer" (valeurs issues de la relecture Airtable, mise à jour)
    Et aucun doublon n'a été créé

  Scénario: Plusieurs relances successives conservent une seule ligne par UID
    Étant donné que l'API Airtable (mock) expose exactement 2 offres avec record ID "recA" et "recB"
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Et j'exécute une deuxième fois le script de reprise avec la même base de test
    Et j'exécute une troisième fois le script de reprise avec la même base de test
    Alors le repository SQLite de test contient exactement 2 offres (une pour "recA", une pour "recB")
    Et les données reflètent la dernière lecture Airtable (mise à jour par UID)

  # --- CA5 : Gestion des erreurs ---
  Scénario: En cas d'API Airtable indisponible, le comportement est défini et documenté (ex. arrêt immédiat et message)
    Étant donné que l'API Airtable (mock) simule une indisponibilité (erreur 503 ou connexion refusée)
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Alors le script ne crée pas d'offres en SQLite (ou arrête après la première erreur)
    Et un message d'erreur ou un code de sortie non nul indique l'échec
    Et le comportement (arrêt immédiat, log, reprise partielle, rollback) est documenté

  Scénario: En cas d'erreur SQLite (ex. fichier verrouillé ou base inaccessible), le comportement est défini et documenté
    Étant donné que l'API Airtable (mock) expose au moins une offre
    Et que le repository SQLite de test est inaccessible (verrouillé ou chemin invalide selon mock)
    Quand j'exécute le script de reprise avec cette base
    Alors le script n'insère pas de données de manière incohérente (ou effectue un rollback si documenté)
    Et un message d'erreur ou un code de sortie non nul indique l'échec
    Et le comportement est documenté

  # --- CA6 : Lecture seule côté Airtable ---
  Scénario: La reprise n'effectue aucun PATCH, POST ou DELETE vers Airtable
    Étant donné que l'API Airtable (mock) enregistre tous les appels HTTP reçus (GET, PATCH, POST, DELETE)
    Et que la table "Offres" (mock) expose au moins une offre
    Et que le repository SQLite de test est vide
    Quand j'exécute le script de reprise avec la base de test
    Alors aucun appel PATCH vers Airtable n'a été effectué
    Et aucun appel POST vers Airtable (écriture) n'a été effectué
    Et aucun appel DELETE vers Airtable n'a été effectué
    Et seuls des appels GET (lecture) ont été effectués vers l'API Airtable

  # --- CA7 : Tests — mocks, pas de donnée réelle ---
  # Note : Tous les scénarios ci-dessus utilisent un mock pour l'API Airtable et un repository SQLite de test
  # (base en mémoire ou fichier éphémère). Aucune donnée réelle Airtable n'est requise pour exécuter les tests.

  # --- Steps utilisés (pour step definitions) ---
  # Given:
  #   Étant donné que l'API Airtable (mock) expose la table "Offres" avec [au moins une offre (record ID "...") | exactement N offres | 150 enregistrements répartis sur plusieurs pages (pageSize 100) | 10 enregistrements (une seule page)]
  #   Étant donné que l'API Airtable (mock) expose une offre avec record ID "..." et champs Poste "...", URL "..." [et Id offre "...", source "...", Statut "...", Résumé "..."]
  #   Étant donné que l'API Airtable (mock) expose une offre avec record ID "..." et URL "..." mais sans champ Poste (absent)
  #   Étant donné que l'API Airtable (mock) simule une indisponibilité (erreur 503 ou connexion refusée)
  #   Étant donné que l'API Airtable (mock) enregistre tous les appels HTTP reçus (GET, PATCH, POST, DELETE)
  #   Étant donné que le repository SQLite de test est [vide | contient déjà une offre avec UID "..." et Poste "..." et Statut "..."]
  #   Étant donné que le repository SQLite de test est inaccessible (verrouillé ou chemin invalide selon mock)
  # When:
  #   Quand j'exécute le script de reprise (ex. npm run import:offres-airtable-vers-sqlite ou commande CLI dédiée) avec la base de test
  #   Quand j'exécute le script de reprise avec la base de test
  #   Quand j'exécute une [deuxième | troisième] fois le script de reprise avec la même base de test
  # Then:
  #   Alors le script s'exécute sans erreur (code de sortie 0 ou équivalent)
  #   Alors au moins une offre est présente dans le repository SQLite de test
  #   Alors cette offre provient de la table Airtable "Offres" (lue via l'API mockée)
  #   Alors le repository SQLite de test contient exactement N offres
  #   Alors chaque offre a un UID égal au record ID Airtable correspondant
  #   Alors le script effectue au moins 2 appels à l'API Airtable (ou utilise offset/page suivante)
  #   Alors aucune limite arbitraire côté script n'a tronqué les résultats
  #   Alors une offre existe dans le repository SQLite avec UID "..."
  #   Alors la lecture par UID "..." retourne une offre avec Poste "..." et URL "..."
  #   Alors l'offre insérée en SQLite a Id offre "...", source "...", Statut "...", URL "...", Poste "...", Résumé "..."
  #   Alors l'offre est insérée en SQLite avec UID "..." et le champ Poste est [valeur par défaut | selon règle documentée]
  #   Alors il n'y a qu'une seule offre avec UID "..." dans le repository SQLite
  #   Alors cette offre a Poste "..." et Statut "..." (valeurs issues de la relecture Airtable, mise à jour)
  #   Alors aucun doublon n'a été créé
  #   Alors les données reflètent la dernière lecture Airtable (mise à jour par UID)
  #   Alors le script ne crée pas d'offres en SQLite (ou arrête après la première erreur)
  #   Alors un message d'erreur ou un code de sortie non nul indique l'échec
  #   Alors le comportement (arrêt immédiat, log, reprise partielle, rollback) est documenté
  #   Alors le script n'insère pas de données de manière incohérente (ou effectue un rollback si documenté)
  #   Alors aucun appel PATCH / POST / DELETE vers Airtable n'a été effectué
  #   Alors seuls des appels GET (lecture) ont été effectués vers l'API Airtable
  # And/Et: (variantes des assertions ci-dessus)
