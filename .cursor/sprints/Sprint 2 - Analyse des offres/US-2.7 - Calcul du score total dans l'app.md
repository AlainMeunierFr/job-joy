# US-2.7 : Calcul du score total dans l'app

- **En tant que** utilisateur de l'application
- **Je souhaite** qu'un score total me soit proposé par défaut, calculé dans l'application à partir d'une formule paramétrable (évaluée avec math.js)
- **Afin de** identifier les meilleures offres sans avoir à définir moi-même une formule, tout en pouvant personnaliser la formule si besoin

---

## Critères d'acceptation

- **CA1 - Champ Score_Total dans Airtable**
  - Le champ **Score_Total** existe dans la table Offres (Airtable) et est de type **numérique**, **entier** (aucune décimale).
  - L'application peut lire et écrire ce champ pour chaque enregistrement d'offre.

- **CA2 - Paramétrage de la formule du score total**
  - Dans l'objet **parametres** (fichier ou structure de paramètres de l'app), un nouvel objet **formuleDuScoreTotal** est ajouté, contenant :
    - **coefScoreLocalisation** : entier ; valeur par défaut = 1
    - **coefScoreSalaire** : entier ; valeur par défaut = 1
    - **coefScoreCulture** : entier ; valeur par défaut = 1
    - **coefScoreQualiteOffre** : entier ; valeur par défaut = 1
    - **coefScoreOptionnel1** : entier ; valeur par défaut = 1
    - **coefScoreOptionnel2** : entier ; valeur par défaut = 1
    - **coefScoreOptionnel3** : entier ; valeur par défaut = 1
    - **coefScoreOptionnel4** : entier ; valeur par défaut = 1
    - **formule** : texte ; contient une expression **math.js** évaluée par l'app pour calculer le score total (voir CA3 et CA4).
  - Dans la page **Paramètres**, un **nouveau bloc de paramètres** est affiché **sous** le bloc « Paramétrage prompt de l'IA », avec le **titre** « Formule du score total ».
  - Dans ce bloc, l'utilisateur peut **configurer** les valeurs des coefficients ci-dessus et **éditer** le champ **formule** (zone de saisie texte). Les valeurs sont persistées dans **parametres** (formuleDuScoreTotal).

- **CA3 - Moteur de formule et variables documentées**
  - L'application **évalue** le champ **formule** avec **math.js** : la formule est **dynamique** (pas un simple affichage), l'utilisateur peut écrire une expression math.js (variables, opérateurs, ternaire pour exclure les 0, etc.).
  - Les **noms de variables** utilisables dans la formule sont **documentés dans l'interface** : une liste ou une infobulle à côté de la zone de formule indique les noms exacts. **Chaque nom de variable peut être sélectionné** (clic ou sélection) pour **copier-coller** dans la zone de formule, afin d'éviter les fautes de frappe. Variables à exposer :
    - Scores d'analyse : **ScoreLocalisation**, **ScoreSalaire**, **ScoreCulture**, **ScoreQualitéOffre**, **ScoreCritère1**, **ScoreCritère2**, **ScoreCritère3**, **ScoreCritère4**
    - Coefficients : **coefScoreLocalisation**, **coefScoreSalaire**, **coefScoreCulture**, **coefScoreQualiteOffre**, **coefScoreOptionnel1**, **coefScoreOptionnel2**, **coefScoreOptionnel3**, **coefScoreOptionnel4**
  - Ces noms sont alignés avec les champs de la table Offres et les clés de l'objet formuleDuScoreTotal (CA2).

- **CA4 - Formule par défaut unique**
  - Une **seule** formule par défaut (texte stocké dans le champ **formule**) sert à la fois de **comportement par défaut** de l'app et d'**exemple** pour qui veut la modifier. Il n'existe pas de mécanisme séparé (formule par défaut cachée vs texte d'exemple distinct).
  - La formule par défaut calcule la **moyenne mathématique pondérée** des scores **en excluant les scores à 0** (0 = non évalué) : au numérateur la somme des (coefficient × score) pour les scores > 0, au dénominateur la somme des coefficients correspondant aux scores > 0 ; si le dénominateur est 0, le score total est 0. Le résultat est ramené au même barème que les scores (ex. 0–10 ou 0–100 selon règle métier). La forme exacte de l'expression math.js (division, ternaires pour exclure les 0) est définie à l'implémentation et sert d'exemple éditable.

- **CA5 - Aide utilisateur**
  - L'utilisateur dispose d'une aide pour comprendre et adapter la formule. Au moins **un** des éléments suivants est présent dans le bloc « Formule du score total » :
    - Un **court texte** dans l'app expliquant le principe : variables disponibles + syntaxe math.js.
    - Un bouton **« Ouvrir la doc »** (ou équivalent) qui **ouvre l'URL de la documentation math.js dans un nouvel onglet** (comportement type lien target _blank).
  - Les deux peuvent être combinés.

- **CA6 - Calcul et enregistrement du score total**
  - Le **score total** est **calculé** par l'application en **évaluant** le champ **formule** avec **math.js**, en injectant comme variables les scores d'analyse fournis par l'IA (ScoreLocalisation, ScoreSalaire, ScoreCulture, ScoreQualitéOffre, ScoreCritère1 à 4) et les coefficients configurés (formuleDuScoreTotal).
  - Ce calcul est effectué **immédiatement après** la récupération des scores d'analyse par l'IA (sans étape intermédiaire qui écraserait le résultat).
  - Le résultat du calcul est **stocké** dans le champ **Score_Total** de l'offre (Airtable) ; la valeur est **entière** (arrondi ou troncature selon règle métier validée).

---

*Référence : Sprint 2 « Analyse des offres ». Liens : US-2.3 (prompt IA), champs Score* dans la table Offres (contexte 02 - Sprint goal et contexte.md). Moteur : math.js.*
