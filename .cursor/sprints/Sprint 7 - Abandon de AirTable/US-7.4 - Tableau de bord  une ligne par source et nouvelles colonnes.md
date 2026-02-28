# US-7.4 — Tableau de bord : une ligne par source et nouvelles colonnes

#### US-7.4 : Tableau de bord une ligne par source et nouvelles colonnes

- **En tant que** utilisateur,
- **Je souhaite** que le tableau de bord affiche **une ligne par source** (nom canonique), avec les colonnes « Création par email », « Création par liste html », « Email à importer », « Fichier à importer », puis phase 2 et phase 3,
- **Afin de** voir l'état par plateforme et modifier les activations en un clic.

- **Critères d'acceptation** :
- **CA1 - Une ligne par source** :
  - Le tableau de bord affiche exactement une ligne par **source** (nom canonique). Les sources sont celles définies dans la liste canonique.

- **CA2 - Colonnes « Création par email » et « Création par liste html »** :
  - Une colonne **« Création par email »** : pour chaque source, affiche l'état (implémenté oui/non + activé + icône : ❌ / 😴 / 🏃 / ✅) pour la phase 1 email. L'implémenté vient du code (registry), l'activé de `sources.json` (creationEmail.activé).
  - Une colonne **« Création par liste html »** : idem pour la phase 1 liste html (implémenté depuis le code, activé depuis creationListeHtml.activé).
  - Comportement des icônes : non implémenté = ❌ ; implémenté mais désactivé = 😴 ; implémenté et en cours = 🏃 ; implémenté et activé = ✅.

- **CA3 - Colonnes « Email à importer » et « Fichier à importer »** :
  - **« Email à importer »** : pour chaque source, affiche le nombre d'emails en attente (agrégé sur toutes les adresses email de cette source).
  - **« Fichier à importer »** : pour chaque source, affiche le nombre de fichiers HTML en attente dans le dossier `liste html/<nom source>`.

- **CA4 - Colonnes phase « enrichissement » et phase « analyse »** :
  - Les colonnes pour la phase « enrichissement » et la phase « analyse » restent présentes, avec la même sémantique (implémenté + activé + icône). Une ligne = une source ; les comptes (ex. « À compléter ») peuvent être agrégés par source.

- **CA5 - Modification des activations depuis le tableau de bord** :
  - Un clic sur la coche verte ou le bonhomme qui dort (ou un contrôle équivalent) permet de basculer l'activation de la phase concernée (création email, création liste html, enrichissement, analyse IA) pour cette source.
  - La modification est persistée dans `sources.json` (creationEmail.activé, creationListeHtml.activé, enrichissement.activé, analyse.activé). Pas d'appel Airtable.

- **CA6 - Statuts et totaux** :
  - Les colonnes de statuts (ex. « A compléter », « À analyser », etc.) et la ligne de totaux reflètent les données agrégées par source.

- **CA7 - Colonne en moins** :
  - La colonne « Adresse » est supprimée. La première colonne du tableau est « Source ».

---

## Notes techniques (implémentation)

- Adapter le layout (ou équivalent) pour construire les lignes à partir de la liste des sources (une entrée par source) et des agrégats (emails à importer, fichiers à importer, statuts).
- Exposer une API ou un handler pour « patch activation » (source, phase, activé) qui met à jour `sources.json` via le driver V2 (updateSource).
