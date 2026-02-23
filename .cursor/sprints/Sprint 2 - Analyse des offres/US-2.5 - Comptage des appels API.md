#### US-2.5 : Comptage des appels API

- **En tant que** utilisateur de l'application
- **Je souhaite** que les appels aux API payantes ou limitées soient comptés
- **Afin de** suivre ma consommation et maîtriser mes coûts ou quotas

---

- **Critères d'acceptation** :

- **CA1 - Wrapper autour des appels API** :
  - Une couche (wrapper) entoure les appels aux API concernées et enregistre chaque appel.
  - Les APIs concernées sont : **Claude (Anthropic)** et **Airtable**.
  - Tout appel sortant vers ces APIs passe par ce wrapper ; aucun appel direct n'est effectué en production pour ces APIs.

- **CA2 - Contenu du log (format JSON)** :
  - Chaque appel enregistré contient les champs suivants, au format JSON :
    - **Api appelée** : identifiant de l'API (ex. « Claude », « Airtable »).
    - **DateTime** : date et heure de l'appel (format explicite à définir en implémentation, ex. ISO 8601).
    - **Succès ou échec** : indicateur booléen ou champ explicite (ex. `succes: true/false`).
    - **En cas d'échec uniquement** : le **code erreur** (ex. code HTTP ou code d'erreur fourni par l'API) ; **aucun message sensible** (pas de message d'erreur détaillé, pas de corps de réponse) ne doit être enregistré.

- **CA3 - Stockage du log** :
  - Les enregistrements sont stockés dans le dossier **`data/log-appels-api/`**.
  - Un **fichier par jour** au format **`AAAA-MM-JJ.json`** (ex. `2026-02-21.json`).
  - Les appels d'une même journée sont regroupés dans le fichier correspondant à cette date (création du fichier si nécessaire, ajout à la fin ou structure de tableau JSON selon implémentation).
  - Le dossier est créé automatiquement s'il n'existe pas.

- **CA4 - Tableau de bord « Consommation API »** :
  - Sur la page **Tableau de bord**, un nouveau **container** intitulé **« Consommation API »** est affiché.
  - Ce container contient un **tableau** avec :
    - **Une colonne par API** : au minimum Claude et Airtable (libellés explicites).
    - **Une ligne par jour** : chaque ligne correspond à une date pour laquelle des appels ont été enregistrés (ou pour laquelle l'utilisateur a demandé le calcul).
    - **Cellules** : chaque cellule affiche le **nombre d'appels** pour l'API de la colonne et le jour de la ligne.
  - Le tableau **n'est mis à jour que lorsque l'utilisateur clique sur le bouton « Calculer »** : avant ce clic, le tableau peut être vide ou afficher une valeur par défaut ; après le clic, les données sont lues depuis les fichiers dans `data/log-appels-api/` et le tableau est rafraîchi avec les totaux par jour et par API.

---

*Référence : Sprint 2 « Analyse des offres ». Données sources : fichiers JSON dans `data/log-appels-api/`.*
