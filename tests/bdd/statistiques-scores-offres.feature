# language: fr
@us-statistiques-scores
Fonctionnalité: Statistiques des scores
  En tant qu'utilisateur du tableau de bord
  Je souhaite voir un histogramme des scores des offres
  Afin de visualiser la répartition des offres par plage de score (population : Score_Total ≠ 0 ou Statut = Expiré).

  Contexte:
    Étant donné que la configuration Airtable est opérationnelle
    Et que le tableau de bord est affiché

  # --- CA1 : Bloc « Statistiques des scores » (centre, layout 3 colonnes) ---
  Scénario: La page Tableau de bord affiche un bloc "Statistiques des scores"
    Étant donné que le tableau de bord est affiché
    Alors la page comporte un bloc "Statistiques des scores"

  Scénario: Le bloc Statistiques des scores contient un titre, une intro, une zone graphique et un bouton Calculer
    Étant donné que le tableau de bord est affiché
    Alors le bloc "Statistiques des scores" comporte le titre "Statistiques des scores"
    Et le bloc "Statistiques des scores" comporte un texte d'intro mentionnant les offres avec score ou statut Expiré
    Et le bloc "Statistiques des scores" comporte une zone graphique (canvas) pour l'histogramme
    Et le bloc "Statistiques des scores" comporte un bouton "Calculer"

  # --- CA2 : API GET /api/histogramme-scores-offres ---
  Scénario: L'API histogramme-scores-offres retourne 10 plages (buckets) et un total
    Étant donné que la configuration Airtable est opérationnelle
    Quand j'appelle l'API GET "histogramme-scores-offres"
    Alors la réponse a le statut 200
    Et la réponse JSON contient un tableau "buckets" avec 10 éléments
    Et la réponse JSON contient un champ "total" de type nombre

  Scénario: Sans configuration Airtable, l'API histogramme-scores-offres retourne ok false et buckets vides
    Étant donné que la configuration Airtable n'est pas renseignée
    Quand j'appelle l'API GET "histogramme-scores-offres"
    Alors la réponse a le statut 200
    Et la réponse JSON contient "ok" à false
    Et la réponse JSON contient un tableau "buckets" vide
    Et la réponse JSON contient "total" à 0
