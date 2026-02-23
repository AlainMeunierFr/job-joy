#### US-1.13 : Totaux sur le tableau des offres

- **En tant que** utilisateur du tableau de synthèse des offres
- **Je souhaite** avoir une colonne « Totaux » et une ligne « Totaux »
- **Afin de** évaluer chaque source et chaque phase (répartition par statut)

---

- **Critères d'acceptation** :

- **CA1 - Colonne Totaux** :
  - Une **colonne « Totaux »** est affichée à droite des colonnes de statut.
  - Pour chaque ligne (chaque source / expéditeur), la cellule de cette colonne affiche le **nombre total d'offres** de cette source (somme de tous les statuts pour cette source).

- **CA2 - Ligne Totaux** :
  - Une **ligne « Totaux »** est affichée en bas du tableau.
  - Pour chaque colonne de statut, la cellule affiche le **nombre total d'offres** dans ce statut (toutes sources confondues).
  - La cellule à l’intersection colonne Totaux × ligne Totaux affiche le **total général** d’offres (ou reste cohérente avec la somme des totaux par statut).

- **CA3 - Cohérence** :
  - Les totaux sont calculés à partir des mêmes données que le tableau (table Offres ou API d’agrégation).
  - Rafraîchir le tableau met à jour les totaux.

---

*Référence : Sprint 1 - Relève les emails ; objectif : vision synthétique des offres avec totaux par source et par statut.*
