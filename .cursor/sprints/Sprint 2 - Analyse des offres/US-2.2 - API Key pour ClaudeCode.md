#### US-2.2 : API Key pour ClaudeCode

- **En tant que** utilisateur du logiciel
- **Je souhaite** renseigner et enregistrer l'API Key de ClaudeCode
- **Afin de** consommer des crédits (tokens) nécessaires à l'API qui score les offres

---

- **Critères d'acceptation** :

- **CA1 - Procédure ou tutoriel pour obtenir l'API Key** :
  - Une procédure (`CréationCompteClaudeCode.html`) décrit comment obtenir une API Key ClaudeCode et acheter des crédits (tokens).

- **CA2 - Stockage et affichage de l'API Key** :
  - L'API Key est stockée de manière sécurisée (chiffrement, persistance côté application, sans affichage en clair après enregistrement).
  - Dans l'interface, le champ de saisie de l'API Key est masqué (type mot de passe ou équivalent).
  - Si une API Key est déjà enregistrée : l'interface affiche un indicateur explicite (ex. « Déjà enregistrée » ou « Clé configurée ») sans afficher la valeur.
  - L'utilisateur peut remplacer la clé existante en saisissant une nouvelle valeur et en enregistrant les paramètres.

- **CA3 - Emplacement dans l'interface** :
  - La configuration ClaudeCode (champ API Key + lien ou accès au tutoriel si pertinent) apparaît sur la page **Paramètres**.
  - Elle est présentée dans une **section dédiée**, même esprit que la configuration Airtable et le paramétrage du compte email : titre de section lisible, champ(s) associé(s), possibilité d'enregistrement (bouton commun ou dédié selon le reste de la page).

---

*Référence : Sprint 2 « Analyse des offres » ; configuration nécessaire pour l'utilisation de l'API de scoring des offres.*
