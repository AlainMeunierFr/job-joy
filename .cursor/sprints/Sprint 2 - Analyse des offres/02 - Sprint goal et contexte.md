# Product Goal

La base de données AirTable contient des offres importées à un format unifié. Il faut maintenant se donner les moyens de configurer un bon prompt qui permettra de les évaluer.

**En tant que** chercheur d'emploi  
**Je souhaite** que les offres soient évaluées par une IA (Claude Code API) selon des critères paramétrables  
**Afin de** me concentrer uniquement sur les offres intéressantes.

# les nouveaux champs à alimenter
- Voici la liste des champs de la table "Offres" qui fait l'objet de ce sprint
. Poste
. Entreprise
. Ville
. Département
. Salaire
. DateOffre
. Résumé
. CritèresRéhibitoire1
. CritèresRéhibitoire2
. CritèresRéhibitoire3
. CritèresRéhibitoire4
. ScoreQualitéOffre
. ScoreLocalisation
. ScoreCulture
. ScoreSalaire
. ScoreCritère1
. ScoreCritère2
. ScoreCritère3
. ScoreCritère4

# Thèmes 1 : correction, amélioration, finalisation phase 1
- voici les champs qui peuvent avoir été renseignés en phase 1 et que la phase 2 peut aider à corriger, améliorer, finaliser
. Poste
. Entreprise
. Ville
. Département -> si ce n'est pas précisé, déduire le département à partir de la ville
. Salaire
. DateOffre

# Thèmes 2 : Résumé
- les offres sont longues. La phase 2 permet de constuire un résumé, centré sur les centres d'intérêt du candidat (l'expérience à montré que ça faisait une bonne base pour la lettre de motivation)
. Résumé

# Thèmes 3 : Réhibitoire
- malque soit le score obtenu sur d'autres critères, certaines information lues dans l'offre peuvent amener à la rejeter (ex : secteur de l'armement...)
. CritèresRéhibitoire1
. CritèresRéhibitoire2
. CritèresRéhibitoire3
. CritèresRéhibitoire4

# Thèmes 4 : critères incontournables
- 4 critères semblent incontournables.
. ScoreQualitéOffre
. ScoreLocalisation
. ScoreCulture
. ScoreSalaire

# Thèmes 5 : critères optionnels
- 4 critères optionnels peuvent éventuellement être ajoutés
. ScoreCritère1
. ScoreCritère2
. ScoreCritère3
. ScoreCritère4
