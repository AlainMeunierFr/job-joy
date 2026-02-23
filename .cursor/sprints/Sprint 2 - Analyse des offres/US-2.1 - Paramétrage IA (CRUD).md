#### US-2.1 : Paramétrage IA (CRUD)

- **En tant que** chercheur d'emploi
- **Je souhaite** définir et enregistrer dans les paramètres toutes les données utiles pour personnaliser l'évaluation des offres par l'IA : rédhibitoires, scores incontournables, critères optionnels et informations générales
- **Afin de** pouvoir les exploiter plus tard pour construire le prompt et noter les offres selon mon profil (usage des données hors périmètre de cette US)

---

- **Critères d'acceptation** :

- **CA1 - Persistance** :
  - Une section dédiée du paramétrage (ex. dans `parametres.json` ou équivalent) stocke les quatre zones suivantes.
  - **Zone Rédhibitoires** : jusqu'à quatre paires textes libres (libellé du critère rédhibitoire, description du critère rédhibitoire). Chaque zone correspond à un critère rédhibitoire (description de ce qui doit faire rejeter l'offre).
  - **Zone Scores incontournables** : quatre zones de texte libres — localisation (ex. lieu de résidence, prêt à déménager, régions, télétravail/trajets), salaire (ex. fourchette, attentes), culture (ex. type d'entreprise, valeurs), qualité d'offre (ex. ce qui compte pour moi).
  - **Zone Scores optionnels** : jusqu'à quatre paires (libellé du critère, attente ou description / grille de scoring).
  - **Zone Autres ressources** : un chemin de répertoire sur le disque (optionnel) dans lequel l'application pourra lire des fichiers (CVs, lettres de motivation, etc.) pour alimenter le contexte candidat. Idéalement : lecture des fichiers dans ce répertoire (liste des fichiers et/ou contenu) pour que l'utilisateur vérifie ce qui sera pris en compte.
  - Les valeurs sont enregistrées et rechargées à l'ouverture des paramètres.

- **CA2 - Interface utilisateur** :
  - Une même logique de présentation pour les douze critères : un bloc avec un **titre** (une ligne) et une **zone de saisie** (3 lignes, avec ascenseur si le texte est plus grand).
  - **Critères rédhibitoires** (4 blocs) et **Scores optionnels** (4 blocs) : titre **saisissable** (l'utilisateur peut modifier le libellé du critère).
  - **Scores incontournables** (4 blocs : Localisation, Salaire, Culture, Qualité d'offre) : titre **non saisissable** (libellés fixes), mais même présentation que les autres (une ligne de titre + zone de saisie 3 lignes avec ascenseur).
  - **Autres ressources** : un bloc avec un titre (une ligne) et une zone de saisie de **12 lignes**, avec ascenseur si le texte est plus grand.
  - La sauvegarde des paramètres enregistre toutes les valeurs (bouton Enregistrer commun ou dédié).
  - Lorqu'une zone est vide, afficher un texte d'aide en gris, qui disparait dès qu'on commence à écrire (Ux qu'on retrouve souvant, assez standard)

- **CA3 - Comportement lorsque les zones sont vides** :
  - Si une zone ou un champ n'est pas renseigné, les valeurs sont enregistrées vides et rechargées vides à l'ouverture ; l'interface affiche les zones vides. Le chemin « Autres ressources » vide signifie qu'aucun répertoire n'est utilisé.

---

*Référence : Sprint 2 « Analyse des offres » ; thèmes 3, 4, 5 (stockage uniquement). Usage (injection dans le prompt) dans des US ultérieures.*
