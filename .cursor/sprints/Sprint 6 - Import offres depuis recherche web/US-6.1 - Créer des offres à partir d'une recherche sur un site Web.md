# US-6.1 — Créer des offres à partir d'une recherche sur un site Web

- **En tant que** utilisateur,
- **Je souhaite** intégrer le résultat des recherches que j'ai réalisées via le site web de la plateforme,
- **Afin de** ne pas attendre de recevoir des alertes par email et d'exploiter des offres un peu plus anciennes.

---

## Critères d'acceptation

- **CA1 - Schéma Airtable (colonnes Adresse, type Source)** :
  - L'API Airtable ne permet pas de renommer les champs ; pour le moment l'utilisateur est le seul, il peut donc modifier le schéma de sa base de son côté.
  - **Offres** : le champ utilisé est « Adresse » (remplace l'ancien « EmailExpediteur » dans le code et la doc).
  - **Sources** : le champ utilisé est « Adresse » (idem).
  - **Sources.Type** : la valeur « liste html » doit exister (option de champ single-select) ; si elle n'existe pas, l'utilisateur la crée dans Airtable.

- **CA2 - Interface « import liste HTML »** :
  - Un dossier **« liste html »** est créé dans `.\data` (ou dans le répertoire de données utilisateur en Electron, ex. %APPDATA%\\…\\liste html). L'app (Node.js côté serveur) est autorisée à créer des dossiers : en dev comme sous Electron, le serveur a les droits d'écriture dans son répertoire de données.
  - L'utilisateur peut y créer un sous-dossier portant le nom du plugin (ex. `apec`).
  - L'utilisateur y dépose des fichiers issus de « Enregistrer sous » des pages de résultat de recherche.
  - La colonne **« À importer »** affiche le nombre de fichiers présents dans le dossier (en attente de traitement).
  - Après traitement d'un fichier, celui-ci est déplacé dans un sous-dossier **« traité »** (ex. `.\data\liste html\apec\traité`).
  - Quand la **mise à jour du tableau** est lancée (en même temps que la lecture du contenu de la BAL) :
    - Si elle n'existe pas, une entrée source est créée avec **Sources.Adresse** = chemin du dossier (ex. `.\data\liste html\apec`).
    - Son nom de plugin est le nom du dossier (ex. `apec`).

- **CA3 - Phase 1 (création) — général** :
  - Pattern stratégique commun à tous les plugins « import liste HTML » (le code pourra différer d'un plugin à l'autre) :
    - Lors de la phase de création, les fichiers HTML contenus dans le dossier sont parsés.
    - Seules les URL relatives à des offres sont extraites (pas toutes les URL du body).
    - Les offres sont généralement dans des listes répétitives ; une structure qui se répète est identifiée.
    - Pour chaque occurrence, les informations utiles sont extraites.

- **CA4 - Phase 1 (création) — plugin APEC** :
  - Pour l'APEC :
    - Une offre = une carte (avec ombre) ; toute la carte ouvre l'offre → l'URL de l'offre.
    - Logo de la source : non intégré.
    - Nom de la source : non intégré.
    - Champs à extraire : **Nom du poste**, **Courte description** (peut être ajoutée à « Texte de l'offre » ; si besoin, phase Enrichissement), **Salaire** (parfois « À négocier »), **Type de contrat** (CDI, etc. — non intégré), **Commune**, **Département** (à splitter), **Date de l'offre**.

- **CA5 - Phase Enrichissement — général** :
  - Ouvrir l'URL de l'offre et lire tout ce qui est utile dans la page.
  - Soit le site ne détecte pas un crawler et l'offre est directement lisible par du code (HTTP).
  - Soit il faut ouvrir un navigateur en tâche de fond (ex. Playwright).

- **CA6 - Phase Enrichissement — plugin APEC** :
  - Tester le comportement du site de l'APEC (HTTP direct ou navigateur en tâche de fond) et implémenter en conséquence.
