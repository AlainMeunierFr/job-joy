# US-7.2 — Stocker les sources dans sources.json (même structure)

#### US-7.2 : Stocker les sources dans sources.json (même structure)

- **En tant que** utilisateur ou opérateur,
- **Je souhaite** que les sources soient lues et écrites dans un fichier local `.\data\sources.json` au lieu de la table Airtable Sources,
- **Afin de** supprimer les appels API Airtable pour les sources (coût tokens, bugs de doublons) tout en gardant le même modèle de données.

- **Critères d'acceptation** :
- **CA1 – Fichier sources.json** :
  - Le fichier `.\data\sources.json` (ou chemin relatif au répertoire de données configuré) contient la liste des sources.
  - Le schéma permet d'identifier chaque entrée de façon unique (ex. type + adresse) pour éviter les doublons à la lecture et à l'écriture.
  - Si le fichier est absent ou vide, il est initialisé avec les sources listées dans le code source et les propriétés sont activées en fonction des implémentations disponibles.

- **CA2 – Lecture des sources** :
  - Tout code qui lit aujourd'hui les sources depuis Airtable (listerSources, audit, traitement, tableau de bord) lit désormais depuis `sources.json`.
  - La forme des données exposées en mémoire (pour le reste de l'application) reste compatible avec l'existant (même structure d'objet : adresse, source, type, activations).

- **CA3 – Écriture des sources** :
  - Toute création ou mise à jour de source (audit, correction de source, création liste html) écrit dans `sources.json` au lieu d'appeler l'API Airtable.
  - Les modifications sont persistées immédiatement ; pas d'appel Airtable pour la table Sources.

- **CA4 – Table Airtable Sources non utilisée** :
  - Aucun appel API Airtable ne cible la table Sources pour lire ou écrire les sources.
  - L'identifiant de table Sources (dans les paramètres) n'est plus utilisé pour les sources.
  - L'identifiant de table Sources est supprimé de la configuration Airtable.
  - Les offres (table Offres) continuent de référencer la source par un « Sélecteur à simple valeur » dont les valeurs autorisées sont les noms canoniques énumérés dans le code source.

- **CA5 – Table Airtable Offres** :
  - Le code d'initialisation de la table « Offres » prévoit la création des colonnes « source » et « méthode de création ».
  - Les valeurs possibles pour la colonne « source » sont issues de l'énumération des noms canoniques de source + la valeur « manuelle ».
  - Les valeurs possibles pour la colonne « méthode de création » sont issues de l'énumération des types : email ; liste html ; manuelle.
  - La création d'offres via API Airtable doit désormais alimenter ces deux colonnes dans Airtable.

- **CA6 – Pas de régression fonctionnelle** :
  - Le tableau de bord affiche les mêmes lignes (une par adresse / chemin liste html) qu'avant.
  - L'audit, le traitement (création par email, création par liste html) et l'enrichissement utilisent les sources issues de `sources.json` sans changement de comportement métier observable.

---

## Notes techniques

- Définir le format exact de `sources.json` (ex. tableau d'objets avec id optionnel, adresse, source, type, activerCréation, activerEnrichissement, activerAnalyseIA).
- Gérer les accès concurrents (un seul processus écrit à la fois) si nécessaire.
- Migration one-shot : si des sources existent encore dans Airtable au moment du déploiement, prévoir un script ou une étape d'import initial vers `sources.json` (hors scope fonctionnel détaillé de cette US, mais à anticiper).
