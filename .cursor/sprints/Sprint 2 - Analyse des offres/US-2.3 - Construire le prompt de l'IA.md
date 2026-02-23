#### US-2.3 : Construire le prompt de l'IA

- **En tant que** chercheur d'emploi
- **Je souhaite** que les paramètres IA que j'ai configurés (US-2.1) soient utilisés pour construire le prompt envoyé à l'IA, avec une **partie fixe** qui garantit un résultat exploitable pour la table Offres et une **partie modifiable** pour affiner le comportement
- **Afin de** obtenir des évaluations d'offres de qualité sans effort, tout en permettant aux spécialistes du prompt d'ajuster le texte si besoin

---

- **Critères d'acceptation** :

- **CA1 - Deux parties distinctes du prompt** :
  - Le prompt envoyé à l'IA est composé de **deux parties concaténées** :
    1. **Partie fixe (non modifiable)** : définie dans le code source, non éditable par l'utilisateur. Elle garantit que la réponse de l'IA respecte un format exploitable pour compléter la table Offres (champs, structure JSON, etc.).
    2. **Partie modifiable** : stockée dans les paramètres (ex. `parametres.json`), éditable par l'utilisateur. Elle précise le rôle de l'agent, le ton, les consignes d'évaluation et injecte les critères configurés (rédhibitoires, scores incontournables, optionnels, autres ressources).
  - L'application propose une **valeur par défaut de haute qualité** pour la partie modifiable, afin que la majorité des utilisateurs obtiennent un bon résultat sans avoir à la modifier. Les utilisateurs avancés (prompt engineering) peuvent la personnaliser.

- **CA2 - Partie fixe : contenu et format de réponse (référence à titre informatif)** :
  - La partie fixe est en lecture seule dans le code ; elle peut être **affichée à titre informatif** dans l'interface (zone non éditable ou lien « Voir la partie fixe du prompt ») pour que l'utilisateur comprenne ce que le système garantit.
  - Elle impose à l'IA de :
    - Corriger, améliorer ou compléter à partir du texte de l'offre les champs déjà renseignés en phase 1 : **Poste, Entreprise, Ville, Département** (à déduire de la ville si non précisé), **Salaire, DateOffre**.
    - Produire un **résumé centré sur les centres d'intérêt du candidat** (Résumé_IA), pour servir de base à la lettre de motivation.
    - Répondre en **JSON** avec exactement les champs suivants (lorsque l'information a pu être retrouvée ou générée) :
      - Poste, Entreprise, Ville, Département, Date_offre, Résumé_IA
      - Réhibitoire1 à Réhibitoire4 (si configurés) : booléen
      - ScoreLocalisation, ScoreSalaire, ScoreCulture, ScoreQualitéOffre : note de 1 à 20
      - ScoreOptionnel1 à ScoreOptionnel4 (si configurés) : note de 1 à 20
  - Ce format assure que le résultat peut être utilisé pour **compléter la table Offres** sans transformation métier supplémentaire.

- **CA3 - Partie modifiable : contenu par défaut et personnalisation** :
  - La partie modifiable est fournie avec une **valeur par défaut** (dans le code ou une ressource) de qualité professionnelle : rôle de l'agent (veille emploi pour le candidat), ton attendu du résumé (ex. positif / factuel / neutre selon score), éléments à mentionner (ce qui correspond au profil, incertain, points de vigilance), et injection des libellés/descriptions configurés pour les rédhibitoires et les scores.
  - L'utilisateur peut **modifier** cette partie (zone de saisie dédiée dans les paramètres) et **enregistrer** sa version ; elle est alors utilisée pour toutes les évaluations suivantes.
  - Si l'utilisateur n'a rien modifié, la valeur par défaut est utilisée.

- **CA4 - Zone « Prompt » dans la page Paramètres** :
  - Dans la section « Paramétrage IA » (ou une section dédiée « Prompt » sur la page Paramètres), une zone contient :
    - Un moyen d'accéder à la **partie fixe** en lecture seule (affichage informatif ou lien).
    - La **partie modifiable** dans une zone de texte pleine largeur, hauteur d'environ 50 lignes avec ascenseur.
    - Un bouton **« Proposer un prompt »** (ou équivalent) qui restaure ou préremplit la partie modifiable avec la valeur par défaut.
    - Un bouton **« Enregistrer »** (aligné à droite, même esprit que les autres blocs Paramètres) pour sauvegarder la partie modifiable.
  - La partie modifiable est rechargée à l'ouverture de la page Paramètres (depuis `parametres.json` ou équivalent).

- **CA5 - Intégration technique** :
  - La **partie modifiable** du prompt est stockée dans le fichier de paramètres (ex. `parametres.json`), dans une section dédiée (ex. `promptIA` ou `partieModifiablePrompt`).
  - La **partie fixe** reste dans le code source (ou une ressource non modifiable) et n'est jamais écrasée par l'utilisateur.

---

**Référence (partie fixe — à implémenter telle quelle dans le code)**  
*Le texte ci-dessous décrit le contrat que la partie fixe impose à l'IA ; il peut être affiché à titre informatif dans l'interface.*

- Contrainte de tâche : à partir du texte de l'offre, corriger / améliorer / compléter les champs Poste, Entreprise, Ville, Département (déduire si besoin), Salaire, DateOffre ; produire un résumé (Résumé_IA) centré sur les centres d'intérêt du candidat.
- Contrainte de format : répondre en JSON avec les champs listés en CA2 (Poste, Entreprise, Ville, Département, Date_offre, Résumé_IA, Réhibitoire1..4 si configurés, ScoreLocalisation, ScoreSalaire, ScoreCulture, ScoreQualitéOffre, ScoreOptionnel1..4 si configurés), avec les types indiqués (booléens pour rédhibitoires, notes 1–20 pour les scores).

---

*Référence : Sprint 2 « Analyse des offres » ; thèmes 1 à 5. US-2.1 fournit les données (rédhibitoires, scores, autres ressources) injectées dans la partie modifiable.*
