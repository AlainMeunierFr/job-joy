# US-7.9 — Lister les offres

## Contexte

Suite aux US 7.6 à 7.8, les offres sont maintenant dans SQLite et plus dans Airtable. L'utilisateur a toutefois besoin de visualiser les offres (création, enrichissement, analyse). La cible technique est la librairie **RevoGrid** (https://rv-grid.com/guide/) : les CA s'appuient sur ses capacités natives (tri, filtres, ordre des colonnes) plutôt que de calquer uniquement l'ergonomie Airtable.

---

#### US-7.9 : Lister les offres

- **En tant que** utilisateur,
- **Je souhaite** disposer d'une page qui liste les offres dans un tableau interactif,
- **Afin de** consulter le résultat de la création, de l'enrichissement et de l'analyse du logiciel.

- **Critères d'acceptation** :
- **CA1 - Page « Offres »** :
  - Une nouvelle page « Offres » est créée.
  - Le bouton du menu pour y accéder est placé après « Tableau de bord » et avant « Paramètres ».
  - Ce bouton n'est visible que si la base contient au moins une offre.

- **CA2 - Affichage avec RevoGrid** :
  - La librairie RevoGrid est utilisée pour afficher toutes les colonnes et toutes les lignes des offres (données issues de SQLite).
  - L'implémentation respecte les usages recommandés de la librairie (documentation https://rv-grid.com/guide/).
  - Lorsque le nombre de colonnes dépasse la largeur de l'écran, un ascenseur horizontal est disponible.
  - Lorsque le nombre d'offres dépasse la hauteur de l'écran, un ascenseur vertical est disponible (ou défilement natif du grid). En v1, on évite une pagination « 1, 2, 3… » en bas ; un chargement unique ou dynamique selon les capacités de RevoGrid est privilégié (volume attendu typique : quelques centaines à 2000 lignes).

- **CA3 - Ordre des colonnes** :
  - L'utilisateur peut modifier l'ordre des colonnes (par glisser-déposer sur les en-têtes ou par le mécanisme natif proposé par RevoGrid).

- **CA4 - Filtre des lignes** :
  - L'utilisateur peut filtrer les lignes affichées (filtre multicritère). L'interface s'appuie sur les capacités natives de RevoGrid (ex. filtre par colonne ou zone de filtre au-dessus du tableau) pour configurer le filtre sans sur-spécifier un UX type Airtable.

- **CA5 - Tri des lignes** :
  - L'utilisateur peut trier les lignes (tri sur une ou plusieurs colonnes). L'interface s'appuie sur les capacités natives de RevoGrid (ex. clic sur l'en-tête pour trier, ou configuration de tri multicritère si disponible).

- **CA6 - Vues sauvegardées** :
  - Une zone latérale (côté gauche) affiche la liste des vues sauvegardées.
  - En l'absence de vue (état initial ou après suppression de toutes les vues), la vue courante utilise des paramètres par défaut : colonnes dans l'ordre par défaut, toutes affichées, sans filtre, sans tri.
  - L'utilisateur peut à tout moment cliquer sur « Créer une vue » : il attribue un nom et les paramètres correspondant aux CA3, CA4 et CA5 (ordre des colonnes, filtre, tri) sont sauvegardés.
  - L'utilisateur peut renommer ou supprimer une vue.
  - L'utilisateur peut cliquer sur une vue pour la charger : les paramètres CA3 à CA5 sont alors appliqués au tableau.
  - Le stockage repose sur une table « vues » dans la base SQLite, avec : UID (masqué), Nom, Json de paramétrage (ordre colonnes, filtre, tri).

---
