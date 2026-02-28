# language: fr
@us-7.6
Fonctionnalité: Stockage des offres dans SQLite (schéma et repository)
  En tant qu'utilisateur
  Je souhaite que les offres soient stockées dans un fichier SQLite avec un schéma aligné sur la table Offres Airtable
  Afin d'abandonner Airtable et d'avoir un point d'entrée unique (repository) pour tous les flux (relève, enrichissement, analyse IA, tableau de synthèse).

  # --- CA1 : Fichier et chemin (data/offres.sqlite) ---
  Scénario: La base SQLite des offres est créée au chemin prévu si elle n'existe pas
    Étant donné qu'aucune base offres n'existe au chemin data/offres.sqlite (ou équivalent en environnement de test)
    Quand le repository des offres est initialisé pour ce chemin (ou une base de test)
    Alors une base SQLite est disponible (fichier créé ou base en mémoire pour les tests)
    Et les opérations sur les offres peuvent s'exécuter

  # --- CA2 : Schéma — UID obligatoire et unique ---
  Scénario: Chaque offre enregistrée possède un UID obligatoire et unique
    Étant donné une base offres vide (ou en mémoire)
    Quand j'ajoute une offre avec Id offre "X1" et URL "https://exemple.com/offre/1"
    Alors l'offre est enregistrée avec un UID non vide
    Et l'UID est une clé unique (aucune autre ligne n'a le même UID)

  Scénario: L'unicité de l'UID est garantie entre plusieurs offres
    Étant donné une base offres vide
    Quand j'ajoute une offre avec Id offre "A" et URL "https://a.com/1"
    Et j'ajoute une offre avec Id offre "B" et URL "https://b.com/1"
    Alors les deux offres ont des UID différents
    Et chaque UID est non vide

  # --- CA3 : Attribution automatique de l'UID à l'insertion ---
  Scénario: Une nouvelle offre reçoit un UID automatiquement si non fourni
    Étant donné une base offres vide
    Quand j'ajoute une offre sans fournir d'UID (Id offre "O1", URL "https://exemple.com/o1")
    Alors l'offre est enregistrée avec un UID attribué automatiquement
    Et cet UID est non vide et stable (réutilisable pour mise à jour partielle)

  Scénario: Une offre peut être insérée avec un UID fourni (reprise Airtable)
    Étant donné une base offres vide
    Quand j'ajoute une offre avec UID "recABC123" et Id offre "O1" et URL "https://exemple.com/o1"
    Alors l'offre est enregistrée avec UID "recABC123"
    Et la lecture par UID "recABC123" retourne cette offre

  # --- CA4 : Schéma détaillé — colonnes métier alignées Airtable ---
  # Note : La liste exhaustive des colonnes (Id offre, source, Statut, URL, Poste, Résumé, scores, etc.)
  # est validée en TDD ; le BDD vérifie que les champs métier principaux sont persistés et relus.
  Scénario: Les champs métier principaux d'une offre sont persistés et relus correctement
    Étant donné une base offres vide
    Quand j'ajoute une offre avec Id offre "I1", source "APEC", Statut "À importer", URL "https://apec.com/o1", Poste "Dev", Résumé "Résumé court"
    Alors l'offre lue par Id offre "I1" (ou par URL) a Id offre "I1"
    Et elle a source "APEC"
    Et elle a Statut "À importer"
    Et elle a URL "https://apec.com/o1"
    Et elle a Poste "Dev"
    Et elle a Résumé "Résumé court"

  Scénario: Les champs scores et critères sont persistés (Score_Total, ScoreCritère1, CritèreRéhibitoire1, etc.)
    Étant donné une base offres vide
    Quand j'ajoute une offre avec Id offre "S1", URL "https://s.com/1", Score_Total 75, ScoreCritère1 20, CritèreRéhibitoire1 "Non"
    Alors l'offre lue a Score_Total 75
    Et elle a ScoreCritère1 20
    Et elle a CritèreRéhibitoire1 "Non"

  # --- CA5 : Repository / port — CRUD, upsert, requêtes ---
  Scénario: Upsert par Id offre — création si absent, mise à jour si présent
    Étant donné une base offres vide
    Quand j'effectue un upsert par Id offre "U1" et URL "https://u.com/1" avec Poste "Ingénieur"
    Alors une offre existe avec Id offre "U1" et Poste "Ingénieur"
    Quand j'effectue un upsert par Id offre "U1" et URL "https://u.com/1" avec Poste "Lead Dev"
    Alors l'offre avec Id offre "U1" a Poste "Lead Dev"
    Et il n'y a qu'une seule offre avec Id offre "U1"

  Scénario: Upsert par URL — une offre est identifiée par son URL pour upsert
    Étant donné une base offres vide
    Quand j'effectue un upsert par URL "https://wttj.com/offre/42" avec Id offre "W42", source "Welcome to the Jungle"
    Alors une offre existe avec URL "https://wttj.com/offre/42" et Id offre "W42"
    Quand j'effectue un upsert par URL "https://wttj.com/offre/42" avec Statut "Importée"
    Alors l'offre avec URL "https://wttj.com/offre/42" a Statut "Importée"
    Et il n'y a qu'une seule offre avec cette URL

  Scénario: Mise à jour partielle par UID — seul le champ fourni est modifié
    Étant donné une base offres contenant une offre avec UID "uid-1", Poste "Dev", Statut "À importer"
    Quand j'effectue une mise à jour partielle par UID "uid-1" avec Statut "Importée"
    Alors l'offre avec UID "uid-1" a Statut "Importée"
    Et elle conserve Poste "Dev"

  Scénario: Requêtes par statut — le repository permet de lister les offres par statut
    Étant donné une base offres contenant une offre avec Statut "À importer" et une offre avec Statut "Importée"
    Quand je demande les offres avec Statut "À importer"
    Alors la liste contient exactement l'offre dont le statut est "À importer"
    Et ne contient pas l'offre dont le statut est "Importée"
    Quand je demande les offres avec Statut "Importée"
    Alors la liste contient exactement l'offre dont le statut est "Importée"

  Scénario: Requêtes par source — le repository permet de lister les offres par source
    Étant donné une base offres contenant une offre avec source "APEC" et une offre avec source "Linkedin"
    Quand je demande les offres avec source "APEC"
    Alors la liste contient exactement l'offre dont la source est "APEC"
    Et ne contient pas l'offre dont la source est "Linkedin"

  Scénario: Lecture (get) par UID retourne l'offre correspondante
    Étant donné une base offres contenant une offre avec UID "recXYZ" et Poste "Data Engineer"
    Quand je demande l'offre par UID "recXYZ"
    Alors l'offre retournée a UID "recXYZ" et Poste "Data Engineer"

  Scénario: Suppression par UID retire l'offre de la base
    Étant donné une base offres contenant une offre avec UID "del-1"
    Quand je supprime l'offre avec UID "del-1"
    Alors l'offre avec UID "del-1" n'existe plus
    Et la lecture par UID "del-1" ne retourne aucune offre (ou erreur appropriée)

  # --- CA6 : Initialisation — base créée automatiquement ---
  Scénario: Aucune action manuelle n'est requise pour un nouvel install — la base est créée à l'init
    Étant donné un environnement où le fichier data/offres.sqlite n'existe pas (ou répertoire data vide)
    Quand l'application ou le repository initialise l'accès aux offres
    Alors la base offres est créée automatiquement (ou prête en mémoire pour les tests)
    Et aucune erreur n'est levée pour "fichier absent"

  # --- CA7 : Tests — pas de donnée réelle ---
  # Note : Le CA7 exige que les tests utilisent :memory: ou un fichier de test effaçable.
  # C'est une règle d'implémentation pour les step definitions / TDD, pas un comportement observable
  # en scénario BDD. Les steps "base vide" / "base en mémoire" couvrent l'intention sans scénario dédié.

  # --- Steps utilisés (pour step definitions) ---
  # Given:
  #   Étant donné qu'aucune base offres n'existe au chemin data/offres.sqlite (ou équivalent en environnement de test)
  #   Étant donné une base offres vide (ou en mémoire)
  #   Étant donné une base offres contenant une offre avec UID "..." [Poste "..."], Statut "...", source "..."
  #   Étant donné un environnement où le fichier data/offres.sqlite n'existe pas (ou répertoire data vide)
  # When:
  #   Quand le repository des offres est initialisé pour ce chemin (ou une base de test)
  #   Quand j'ajoute une offre avec Id offre "..." et URL "..." [sans fournir d'UID | avec UID "..."]
  #   Quand j'ajoute une offre avec Id offre "...", source "...", Statut "...", URL "...", Poste "...", Résumé "..."
  #   Quand j'ajoute une offre avec Id offre "...", URL "...", Score_Total ..., ScoreCritère1 ..., CritèreRéhibitoire1 "..."
  #   Quand j'effectue un upsert par Id offre "..." et URL "..." avec Poste "..." [ou Statut "..."]
  #   Quand j'effectue un upsert par URL "..." avec Id offre "...", source "..." [ou Statut "..."]
  #   Quand j'effectue une mise à jour partielle par UID "..." avec Statut "..."
  #   Quand je demande les offres avec Statut "..."
  #   Quand je demande les offres avec source "..."
  #   Quand je demande l'offre par UID "..."
  #   Quand je supprime l'offre avec UID "..."
  #   Quand l'application ou le repository initialise l'accès aux offres
  # Then:
  #   Alors une base SQLite est disponible (fichier créé ou base en mémoire pour les tests)
  #   Alors les opérations sur les offres peuvent s'exécuter
  #   Alors l'offre est enregistrée avec un UID non vide [ou avec UID "..."]
  #   Alors l'UID est une clé unique (aucune autre ligne n'a le même UID)
  #   Alors les deux offres ont des UID différents
  #   Alors chaque UID est non vide
  #   Alors l'offre lue par Id offre "..." (ou par URL) a Id offre "...", source "...", Statut "...", URL "...", Poste "...", Résumé "..."
  #   Alors l'offre lue a Score_Total ..., ScoreCritère1 ..., CritèreRéhibitoire1 "..."
  #   Alors une offre existe avec Id offre "..." et Poste "..." | avec URL "..." et Id offre "..."
  #   Alors l'offre avec Id offre "..." a Poste "..." | l'offre avec UID "..." a Statut "..." et conserve Poste "..."
  #   Alors il n'y a qu'une seule offre avec Id offre "..." | avec cette URL
  #   Alors la liste contient exactement l'offre dont le statut est "..." | dont la source est "..."
  #   Alors la liste ne contient pas l'offre dont le statut est "..." | dont la source est "..."
  #   Alors l'offre retournée a UID "..." et Poste "..."
  #   Alors l'offre avec UID "..." n'existe plus
  #   Alors la lecture par UID "..." ne retourne aucune offre (ou erreur appropriée)
  #   Alors la base offres est créée automatiquement (ou prête en mémoire pour les tests)
  #   Alors aucune erreur n'est levée pour "fichier absent"
  # And/Et: (variantes des assertions ci-dessus)
