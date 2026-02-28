# language: fr
@us-7.7
Fonctionnalité: Branchement des flux métier sur SQLite (offres)
  En tant qu'utilisateur
  Je souhaite que la relève, l'enrichissement, l'analyse IA, le tableau de synthèse et l'histogramme des scores utilisent le stockage SQLite des offres
  Afin d'abandonner Airtable pour les offres et d'avoir un point d'entrée unique (repository SQLite).

  # --- CA1 : Relève — creerOffres écrit dans SQLite ---
  Scénario: Le flux de relève écrit les nouvelles offres dans SQLite quand le backend offres est configuré sur SQLite
    Étant donné que le backend offres est configuré sur SQLite (repository en mémoire ou base de test)
    Et que la source "Linkedin" existe et est active pour la création
    Et qu'aucune offre avec URL "https://linkedin.com/offre/relève-1" n'existe en base offres
    Quand je lance la relève (creerOffres) avec une offre d'URL "https://linkedin.com/offre/relève-1" et source "Linkedin"
    Alors une offre est présente dans le repository SQLite avec URL "https://linkedin.com/offre/relève-1"
    Et le résultat de creerOffres indique au moins une offre créée (ou déjà présente si upsert)
    Et aucun appel à l'API Airtable pour les offres n'est effectué

  Scénario: Plusieurs offres de relève sont enregistrées dans SQLite en une fois
    Étant donné que le backend offres est configuré sur SQLite (repository en mémoire)
    Et que la source "APEC" existe pour la création
    Quand je lance la relève (creerOffres) avec les offres d'URL "https://apec.com/o1" et "https://apec.com/o2" pour la source "APEC"
    Alors le repository SQLite contient exactement 2 offres avec ces URL (ou 2 créées selon upsert)
    Et les données affichées ou retournées par le flux correspondent au contenu du repository SQLite

  # --- CA2 : Enrichissement — getOffresARecuperer et updateOffre utilisent SQLite ---
  Scénario: Le flux d'enrichissement lit les offres à récupérer depuis SQLite et met à jour dans SQLite
    Étant donné que le backend offres est configuré sur SQLite (repository en mémoire)
    Et que le repository contient une offre avec Statut "Annonce à récupérer" et URL "https://exemple.com/offre-enrich"
    Quand je lance l'enrichissement (getOffresARecuperer puis updateOffre après récupération)
    Alors getOffresARecuperer retourne au moins cette offre (depuis SQLite)
    Et après updateOffre la même offre a un Statut différent de "Annonce à récupérer" dans le repository SQLite
    Et le champ "Texte de l'offre" (ou champs enrichis) est mis à jour dans SQLite
    Et aucun appel à l'API Airtable pour les offres n'est effectué

  # --- CA3 : Analyse IA — updateOffre persiste Résumé, scores, statut dans SQLite ---
  Scénario: Le flux d'analyse IA persiste Résumé, scores et statut dans SQLite
    Étant donné que le backend offres est configuré sur SQLite (repository en mémoire)
    Et que le repository contient une offre avec UID "uid-analyse-1" et Statut "À analyser"
    Quand je lance l'analyse IA (updateOffre) pour cette offre avec Résumé "Résumé IA", Score_Total 7 et Statut "À traiter"
    Alors l'offre avec UID "uid-analyse-1" dans le repository SQLite a Résumé "Résumé IA"
    Et elle a Score_Total 7
    Et elle a Statut "À traiter"
    Et aucun appel à l'API Airtable pour les offres n'est effectué

  # --- CA4 : Tableau de synthèse — listerOffres depuis SQLite ---
  Scénario: Le tableau de synthèse lit les offres depuis SQLite quand le backend offres est sur SQLite
    Étant donné que le backend offres est configuré sur SQLite (repository en mémoire)
    Et que les sources "source-a@test.com" (plugin A) et "source-b@test.com" (plugin B) existent
    Et que le repository SQLite contient 2 offres avec source "A" et Statut "À traiter" et 1 offre avec source "B" et Statut "Importée"
    Quand j'appelle l'API GET "tableau-synthese-offres"
    Alors la réponse a le statut 200
    Et les lignes du tableau de synthèse reflètent les offres du repository SQLite (comptages par source et statut cohérents)
    Et la somme des offres affichées correspond au nombre d'offres en base SQLite pour ces sources
    Et aucun appel à l'API Airtable pour les offres n'est effectué

  Scénario: Sans configuration Airtable mais avec SQLite offres, le tableau de synthèse affiche les données SQLite
    Étant donné que le backend offres est configuré sur SQLite (repository en mémoire)
    Et que la configuration Airtable (base, offres) n'est pas renseignée ou est vide
    Et que le repository SQLite contient au moins une offre avec source "Linkedin" et Statut "À importer"
    Quand j'appelle l'API GET "tableau-synthese-offres"
    Alors la réponse a le statut 200
    Et le tableau contient des lignes avec des compteurs cohérents avec le repository SQLite
    Et aucune erreur "Configuration Airtable manquante" n'est renvoyée pour la lecture des offres

  # --- CA5 : Histogramme des scores — lecture offres depuis SQLite ---
  Scénario: L'histogramme des scores lit les offres depuis SQLite quand le backend offres est sur SQLite
    Étant donné que le backend offres est configuré sur SQLite (repository en mémoire)
    Et que le repository SQLite contient 3 offres avec Score_Total 2, 5 et 8 (population histogramme)
    Quand j'appelle l'API GET "histogramme-scores-offres"
    Alors la réponse a le statut 200
    Et la réponse JSON contient "ok" à true
    Et la réponse JSON contient un tableau "buckets" avec 10 éléments
    Et le champ "total" de la réponse vaut 3
    Et les comptages par plage (buckets) correspondent aux scores 2, 5 et 8 dans SQLite
    Et aucun appel à l'API Airtable pour les offres n'est effectué

  Scénario: Sans configuration Airtable mais avec SQLite offres, l'histogramme utilise les données SQLite
    Étant donné que le backend offres est configuré sur SQLite (repository en mémoire)
    Et que la configuration Airtable n'est pas renseignée
    Et que le repository SQLite contient 1 offre avec Score_Total 6
    Quand j'appelle l'API GET "histogramme-scores-offres"
    Alors la réponse a le statut 200
    Et la réponse JSON contient "ok" à true
    Et le champ "total" vaut 1
    Et au moins un bucket a un comptage non nul (plage contenant 6)

  # --- CA6 : Découplage Airtable ---
  # Note : Le CA6 exige qu'aucun code métier ne dépende directement d'Airtable pour les offres ;
  # tout passe par les ports (drivers/repositories) implémentés sur SQLite. C'est un critère
  # d'architecture et de revue de code, pas un comportement observable utilisateur en scénario BDD.
  # Les steps "aucun appel à l'API Airtable pour les offres" ci-dessus illustrent l'intention observable.

  # --- CA7 : Tests — pas de donnée réelle ---
  # Note : Le CA7 exige que les tests utilisent mock, base de test ou :memory:. C'est une règle
  # pour les step definitions (initialiser le repository SQLite en mémoire, pas de base Airtable réelle).
  # Les steps "repository en mémoire" / "base de test" couvrent cette intention.

  # --- Steps utilisés (pour step definitions) ---
  # Given:
  #   Étant donné que le backend offres est configuré sur SQLite (repository en mémoire ou base de test)
  #   Étant donné que la source "..." existe [et est active pour la création]
  #   Étant donné qu'aucune offre avec URL "..." n'existe en base offres
  #   Étant donné que le repository contient une offre avec Statut "..." et URL "..."
  #   Étant donné que le repository contient une offre avec UID "..." et Statut "..."
  #   Étant donné que les sources "..." et "..." existent
  #   Étant donné que le repository SQLite contient N offres avec [source "..." et Statut "..." | Score_Total ...]
  #   Étant donné que la configuration Airtable (base, offres) n'est pas renseignée [ou est vide]
  # When:
  #   Quand je lance la relève (creerOffres) avec une offre d'URL "..." et source "..."
  #   Quand je lance la relève (creerOffres) avec les offres d'URL "..." et "..." pour la source "..."
  #   Quand je lance l'enrichissement (getOffresARecuperer puis updateOffre après récupération)
  #   Quand je lance l'analyse IA (updateOffre) pour cette offre avec Résumé "...", Score_Total N et Statut "..."
  #   Quand j'appelle l'API GET "tableau-synthese-offres"
  #   Quand j'appelle l'API GET "histogramme-scores-offres"
  # Then:
  #   Alors une offre est présente dans le repository SQLite avec URL "..."
  #   Alors le résultat de creerOffres indique au moins une offre créée (ou déjà présente si upsert)
  #   Alors aucun appel à l'API Airtable pour les offres n'est effectué
  #   Alors le repository SQLite contient exactement N offres avec ces URL
  #   Alors les données affichées ou retournées par le flux correspondent au contenu du repository SQLite
  #   Alors getOffresARecuperer retourne au moins cette offre (depuis SQLite)
  #   Alors après updateOffre la même offre a un Statut différent de "..." dans le repository SQLite
  #   Alors le champ "Texte de l'offre" (ou champs enrichis) est mis à jour dans SQLite
  #   Alors l'offre avec UID "..." dans le repository SQLite a Résumé "...", Score_Total N, Statut "..."
  #   Alors la réponse a le statut 200
  #   Alors les lignes du tableau de synthèse reflètent les offres du repository SQLite
  #   Alors la somme des offres affichées correspond au nombre d'offres en base SQLite
  #   Alors le tableau contient des lignes avec des compteurs cohérents avec le repository SQLite
  #   Alors aucune erreur "Configuration Airtable manquante" n'est renvoyée pour la lecture des offres
  #   Alors la réponse JSON contient "ok" à true | "buckets" avec 10 éléments | "total" à N
  #   Alors les comptages par plage (buckets) correspondent aux scores dans SQLite
  #   Alors au moins un bucket a un comptage non nul
  # And/Et: (variantes des assertions ci-dessus)
