# language: fr
@us-2.7
Fonctionnalité: Formule du score total
  En tant qu'utilisateur de l'application
  Je souhaite qu'un score total me soit proposé par défaut, calculé à partir d'une formule paramétrable (math.js)
  Afin d'identifier les meilleures offres sans définir moi-même une formule, tout en pouvant la personnaliser si besoin.

  Contexte:
    Étant donné que je suis sur la page Paramètres

  # --- CA1 : Champ Score_Total (lecture/écriture par l'app, mock) ---
  Scénario: L'application peut écrire le champ Score_Total pour une offre après calcul
    Étant donné un store mock d'offres contenant une offre avec des scores IA renseignés (ScoreLocalisation, ScoreSalaire, etc.)
    Et que la formule du score total est configurée dans les paramètres
    Quand l'application calcule et enregistre le score total pour cette offre
    Alors le store mock reçoit une mise à jour pour cette offre avec le champ Score_Total
    Et la valeur de Score_Total est un entier

  Scénario: L'application peut lire le champ Score_Total pour une offre
    Étant donné un store mock d'offres contenant une offre avec le champ Score_Total renseigné à une valeur entière
    Quand l'application charge ou consulte les données de cette offre
    Alors la valeur Score_Total est disponible pour l'offre (lecture)

  # --- CA2 : Paramétrage formuleDuScoreTotal (objet, bloc UI, persistance) ---
  Scénario: La page Paramètres affiche un bloc "Formule du score total" sous le bloc Paramétrage prompt de l'IA
    Alors la page comporte un container ou une section intitulée "Formule du score total"
    Et ce bloc est affiché sous le bloc "Paramétrage prompt de l'IA"

  Scénario: Le bloc Formule du score total permet de configurer les huit coefficients
    Alors le bloc Formule du score total comporte des champs pour les coefficients : coefScoreLocalisation, coefScoreSalaire, coefScoreCulture, coefScoreQualiteOffre, coefScoreOptionnel1, coefScoreOptionnel2, coefScoreOptionnel3, coefScoreOptionnel4
    Et chaque coefficient est modifiable par l'utilisateur

  Scénario: Le bloc Formule du score total comporte une zone de saisie pour la formule
    Alors le bloc Formule du score total comporte une zone de saisie texte pour le champ formule
    Et l'utilisateur peut éditer le contenu de cette zone

  Scénario: Les valeurs des coefficients et de la formule sont persistées dans parametres (formuleDuScoreTotal)
    Étant donné que j'ai modifié au moins un coefficient et la formule dans le bloc Formule du score total
    Quand j'enregistre le bloc Formule du score total (bouton Enregistrer ou équivalent)
    Alors le fichier de paramétrage (parametres.json ou équivalent) contient l'objet formuleDuScoreTotal
    Et formuleDuScoreTotal contient les huit coefficients et le champ formule avec les valeurs saisies

  Scénario: À l'ouverture des Paramètres, les valeurs enregistrées du bloc Formule du score total sont rechargées
    Étant donné que le bloc Formule du score total a été enregistré avec des valeurs connues pour au moins un coefficient et la formule
    Quand je me rends sur la page Paramètres
    Alors les champs du bloc Formule du score total affichent les valeurs enregistrées (coefficients et formule)

  Scénario: Les coefficients ont pour valeur par défaut 1
    Étant donné qu'aucun paramètre formuleDuScoreTotal n'a encore été enregistré
    Quand je me rends sur la page Paramètres
    Alors chaque champ coefficient du bloc Formule du score total affiche la valeur 1 (ou équivalent par défaut)

  # --- CA3 : Variables documentées et sélectionnables pour copier-coller ---
  Scénario: Les noms de variables (scores et coefficients) sont documentés dans le bloc Formule du score total
    Alors le bloc Formule du score total affiche ou indique la liste des noms de variables utilisables dans la formule
    Et cette liste inclut les scores : ScoreLocalisation, ScoreSalaire, ScoreCulture, ScoreQualitéOffre, ScoreCritère1, ScoreCritère2, ScoreCritère3, ScoreCritère4
    Et cette liste inclut les coefficients : coefScoreLocalisation, coefScoreSalaire, coefScoreCulture, coefScoreQualiteOffre, coefScoreOptionnel1, coefScoreOptionnel2, coefScoreOptionnel3, coefScoreOptionnel4

  Scénario: Chaque nom de variable peut être sélectionné pour copier-coller dans la zone formule
    Alors chaque nom de variable affiché dans le bloc Formule du score total est sélectionnable (clic ou sélection)
    Et la sélection permet de copier le nom exact dans le presse-papiers pour le coller dans la zone de formule

  # --- CA4 : Formule par défaut unique (moyenne pondérée en excluant les 0) ---
  Scénario: Une seule formule par défaut est fournie (comportement par défaut et exemple éditable)
    Étant donné qu'aucune formule personnalisée n'a été enregistrée
    Quand je me rends sur la page Paramètres
    Alors le bloc Formule du score total affiche une formule par défaut dans la zone formule
    Et cette formule est la même que celle utilisée par l'application pour le calcul par défaut (pas de mécanisme séparé caché)

  Scénario: La formule par défaut calcule une moyenne pondérée en excluant les scores à 0
    Étant donné un store mock d'offres contenant une offre avec des scores IA partiels (certains à 0, d'autres non)
    Et que la formule du score total utilisée est la formule par défaut (moyenne pondérée excluant les 0)
    Quand l'application calcule le score total pour cette offre
    Alors le résultat ne prend en compte que les scores strictement supérieurs à 0 (numérateur et dénominateur)
    Et le score total stocké est un entier (barème cohérent avec les scores individuels)

  Scénario: Si tous les scores IA sont à 0, le score total stocké est 0
    Étant donné un store mock d'offres contenant une offre avec tous les scores IA à 0
    Et que la formule du score total est configurée
    Quand l'application calcule le score total pour cette offre
    Alors le champ Score_Total de l'offre contient la valeur 0

  # --- CA5 : Aide utilisateur (texte et/ou lien doc math.js) ---
  Scénario: Le bloc Formule du score total comporte une aide pour l'utilisateur
    Alors le bloc Formule du score total comporte au moins un des éléments suivants : un court texte expliquant les variables et la syntaxe math.js, ou un bouton ou lien "Ouvrir la doc" (ou équivalent)

  Scénario: Le bouton ou lien "Ouvrir la doc" ouvre l'URL de la documentation math.js dans un nouvel onglet
    Étant donné que le bloc Formule du score total comporte un élément "Ouvrir la doc" (bouton ou lien)
    Quand je clique sur "Ouvrir la doc"
    Alors l'URL de la documentation math.js est ouverte dans un nouvel onglet (comportement target _blank)

  # --- CA6 : Calcul et enregistrement du score total après les scores IA ---
  Scénario: Le score total est calculé immédiatement après la récupération des scores IA et stocké dans Score_Total
    Étant donné un store mock d'offres contenant une offre sans score total
    Et que les scores IA pour cette offre viennent d'être récupérés (ScoreLocalisation, ScoreSalaire, etc.)
    Et que la formule du score total est configurée dans les paramètres
    Quand l'application finalise le traitement des scores IA pour cette offre (sans étape intermédiaire écrasant le résultat)
    Alors la formule est évaluée avec math.js en injectant les scores IA et les coefficients
    Et le résultat du calcul est stocké dans le champ Score_Total de l'offre
    Et la valeur stockée est entière (arrondi ou troncature selon règle métier)

  Scénario: Le score total stocké est toujours un entier
    Étant donné un store mock d'offres contenant une offre avec des scores IA produisant un résultat décimal après évaluation de la formule
    Quand l'application calcule et enregistre le score total pour cette offre
    Alors le champ Score_Total contient une valeur entière (pas de décimales)
