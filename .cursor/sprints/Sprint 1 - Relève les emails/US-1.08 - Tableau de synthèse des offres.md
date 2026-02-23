#### US-1.7 : Tableau de synthèse des offres

- **En tant que** utilisateur du tableau de bord
- **Je souhaite** que le tableau de bord me présente un tableau de synthèse des offres
- **Afin de** avoir une vision claire et synthétique de leur état (répartition par expéditeur et par statut)

---

- **Critères d'acceptation** :

- **CA1 - Conteneur distinct du tableau des emails** :
  - Le tableau de synthèse des offres est affiché dans un **conteneur séparé** du tableau de synthèse des emails (US-1.5).
  - Les deux tableaux sont visuellement distincts et ne se confondent pas (titres, emplacements ou sections différents).

- **CA2 - Structure du tableau de synthèse des offres** :
  - Une **ligne** par expéditeur (email de la source ayant produit les offres, ex. `jobs@linkedin.com`, `alerte@emails.hellowork.com`).
  - Une **colonne** par valeur de statut d'offre (ex. « Annonce à récupérer », « À analyser » — selon les valeurs définies dans la table Offres).
  - Chaque **cellule** à l'intersection (expéditeur × statut) affiche le **nombre d'offres** de cet expéditeur ayant ce statut.

- **CA3 - Comportement observable** :
  - Le tableau affiche les données issues de la table Offres (ou de l'API qui les agrège).
  - Les lignes sans offre (0 partout) peuvent être affichées ou masquées selon une règle définie au sprint.
  - Les colonnes de statut correspondent aux valeurs effectivement présentes dans les offres (ou à la liste complète des statuts connus du système).

---

**Note** : Ce tableau est distinct du « tableau de synthèse des emails » (US-1.5) qui agrège les emails par expéditeur (nbEmails, algo, actif). Ici, on agrège les **offres** par expéditeur et par statut.

*Référence : Sprint 1 - Relève les emails ; objectif : vision synthétique des offres sur le tableau de bord.*
