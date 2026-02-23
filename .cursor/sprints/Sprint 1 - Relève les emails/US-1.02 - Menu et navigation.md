#### US-1.2 : Menu horizontal et navigation

- **En tant que** utilisateur
- **Je souhaite** un menu de navigation en en-tête pour accéder au Tableau de bord et aux Paramètres
- **Afin de** naviguer entre les différentes vues de l'application

---

**Critères d'acceptation**

**CA1 – Header et menu**
- Un **header fixe (sticky)** en haut de l'écran contient un **menu horizontal** avec deux entrées :
  - **Tableau de bord** : affiche la page tableau de bord
  - **Paramètres** : affiche la page de paramétrage du compte email (ex. US-1.1)
- Le menu reste visible au défilement (sticky).

**CA2 – Routes**
- **Tableau de bord** : accessible via l’URL `/tableau-de-bord`.
- **Paramètres** : accessible via l’URL `/parametres` (ou `/parametrage-compte-email` pour compatibilité).

**CA3 – Comportement de la racine (Home)**
- Lorsque l’utilisateur accède à la racine **/** (aucune page précisée dans l’URL) :
  - **Si les paramètres du compte sont vides ou invalides** (fichier absent, adresse ou dossier manquant) : redirection vers la page **Paramètres** (`/parametres`).
  - **Si les paramètres sont OK** (compte enregistré avec adresse email et dossier renseignés) : redirection vers la page **Tableau de bord** (`/tableau-de-bord`).
