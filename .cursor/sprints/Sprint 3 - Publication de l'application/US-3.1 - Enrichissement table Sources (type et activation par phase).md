#### US-3.1 : Enrichissement de la table Sources (type de source et activation par phase)

- **En tant qu’** utilisateur
- **Je souhaite** que la table Sources permette un type de source et l’activation par phase
- **Afin d’** avoir un meilleur contrôle, par source, des différentes phases du processus

---

**Contexte – Workflow en 3 phases**

Le processus est en trois étapes :

1. **Phase 1 – Création** : avoir une source qui contient des URL d’offres → créer des offres en base de données.
2. **Phase 2 – Enrichissement** : ouvrir l’URL pour lire l’offre complète et récolter un maximum d’informations.
3. **Phase 3 – Analyse** : soumettre l’offre à l’IA (évaluation, résumé, scores).

La colonne **actif** actuelle devient **« Activer la création »** (phase 1). Il faut ajouter deux options pour les deux autres phases : **« Activer l’enrichissement »** et **« Activer l’analyse par IA »**.

*Note : la migration des bases Airtable existantes est faite à la main (hors scope). Le code ne gère que la création de bases vierges et le comportement applicatif avec le nouveau schéma.*

---

- **Critères d'acceptation** :

- **CA1 – Schéma / création de base Airtable (base vierge)** :

- Le code qui crée une base Airtable vierge crée la table Sources avec les champs suivants :
  - **emailExpéditeur** : Texte sur une seule ligne.
  - **plugin** : Sélection unique (liste existante : Linkedin, Inconnu, HelloWork, etc.).
  - **type** : Sélection unique avec les choix : `email`, `liste html`, `liste csv` (les deux derniers pour usage futur).
  - **Activer la création** : Case à cocher (remplace **actif** ; activer la création d’offres à partir de cette source, quel que soit le type).
  - **Activer l’enrichissement** : Case à cocher.
  - **Activer l’analyse par IA** : Case à cocher.
- Le fichier de tests `airtable-driver-reel.test.ts` contient des tests qui vérifient le body envoyé à l’API lors de la création de la table Sources ; ces tests sont adaptés pour attendre ce schéma (type + 3 checkboxes, sans `actif`).

- **CA2 – Données Sources dans tout le code** :

- Partout où une source est lue ou écrite (relève, tableau de synthèse, audit, API), le code utilise **type** (email / liste html / liste csv) et les 3 booléens **activerCreation**, **activerEnrichissement**, **activerAnalyseIA** à la place de **actif**. Les structures de données (ex. source en mémoire, ligne du tableau de synthèse) et les appels API sont alignés sur ce schéma.
- Fichiers concernés (à titre indicatif) : `utils/gouvernance-sources-emails.ts`, `utils/tableau-synthese-offres.ts`, `utils/airtable-releve-driver.ts`.

- **CA3 – API Airtable (drivers, lecture/écriture Sources)** :

- Le driver de relève (table Sources) lit et écrit les champs **type** et les 3 checkboxes (Activer la création, Activer l’enrichissement, Activer l’analyse par IA) avec les noms de colonnes Airtable retenus ; **actif** n’est plus utilisé.
- **listerSources**, **creerSource**, **mettreAJourSource** exposent et acceptent les nouveaux champs.
- Le driver d’enrichissement (ex. `airtable-enrichissement-driver.ts`) :
  - Pour la **création** (relève) : ne considère comme « actives » que les sources avec **Activer la création** = true.
  - Pour **getOffresARecuperer** : ne retourne que les offres dont la source a **Activer l’enrichissement** = true.
  - Pour **getOffresAAnalyser** : ne retourne que les offres dont la source a **Activer l’analyse par IA** = true.
- Optionnel : décider si des lookups supplémentaires (ex. 3 phases) sont ajoutés de Sources vers Offres dans `airtable-ensure-enums.ts` ; si non, aucun changement requis dans cette étape.

- **CA4 – Plugins / relève et gouvernance** :

- **run-traitement** (worker de création) : utilise **Activer la création** (et non plus **actif**) pour déterminer les sources à traiter ; le patch **mettreAJourSource** accepte les 3 booléens (et **type**).
- **gouvernance-sources-emails.ts** : **traiterEmailsSelonStatutSource** et tout usage de **actif** sont remplacés par **activerCreation** ; le schéma de validation reflète les 3 checkboxes.
- **run-audit-sources** : l’affichage et la mise à jour des sources utilisent les 3 checkboxes.
- **À la création d’une source** (lors du relève d’emails ou de l’audit), les trois cases **Activer la création**, **Activer l’enrichissement**, **Activer l’analyse par IA** sont renseignées **automatiquement** en fonction de ce que le plugin correspondant implémente : **Activer la création** = true si le plugin dispose d’un parseur email (phase 1) ; **Activer l’enrichissement** = true si le plugin a l’étape 2 implémentée (ex. `stage2Implemented`) ; **Activer l’analyse par IA** = true par défaut (ou selon un futur indicateur par plugin si besoin).

- **CA5 – Tableau de bord – Synthèse des offres** :

- Dans le tableau « Synthèse des offres » :
  - La colonne **Phase 1** est renommée **création**.
  - La colonne **Phase 2** est renommée **enrichissement**.
  - Une colonne **analyse** est ajoutée (même logique d’affichage : implémenté / désactivé / activé selon **activerAnalyseIA** et **phase3Implemented**).
- Les lignes du tableau reçoivent les 3 indicateurs d’activation (activerCreation, activerEnrichissement, activerAnalyseIA) depuis **listerSources** ; **enrichirPhasesImplementation** (ou équivalent) fournit **phase3Implemented** pour la phase analyse.
- L’index de la première colonne de statut (ex. **firstStatutCol**) est incrémenté de 1 (5 → 6) pour tenir compte de la nouvelle colonne fixe « analyse ».
- L’API **GET /api/tableau-synthese-offres** et les mocks (ex. **bddMockSourcesStore**) renvoient les 3 booléens au lieu de **actif**.

- **CA6 – Workers (enrichissement, analyse IA)** :

- **run-enrichissement-background** : s’appuie sur le driver qui filtre déjà par **Activer l’enrichissement** = true ; aucune évolution fonctionnelle supplémentaire si le driver respecte CA3.
- **run-analyse-ia-background** : les offres traitées par l’IA sont limitées à celles dont la source a **Activer l’analyse par IA** = true (filtrage dans le driver **getOffresAAnalyser** ou après récupération).

- **CA7 – Tests (unitaires, intégration, BDD)** :

- Tous les tests qui mockent ou assertent sur **actif** ou sur les libellés « Phase 1 » / « Phase 2 » sont mis à jour :
  - **SourcePourTableau** / **LigneTableauSynthese** : utilisation des 3 booléens (activerCreation, activerEnrichissement, activerAnalyseIA).
  - Colonnes fixes du tableau de synthèse : **création**, **enrichissement**, **analyse** ; step BDD « colonnes fixes dans l’ordre » mis à jour ; index des colonnes statut (ex. 6 + i au lieu de 5 + i) corrigés dans les steps qui ciblent les cellules.
  - Tests d’intégration (ex. configuration Airtable, run-traitement) : fixtures Sources avec les 3 checkboxes au lieu de **actif**.

- **CA8 – Autres scripts / CLI** :

- **audit-sources-cli** : affiche les 3 phases (Activer la création, Activer l’enrichissement, Activer l’analyse par IA) au lieu d’une seule colonne **actif**.
- **poc-enrichissement-cli** (si applicable) : toute référence à **actif** ou à l’état de la source utilise les 3 indicateurs de phase.

- **CA9 – Cohérence globale (récap)** :

- Aucun angle mort : tous les usages de **actif** et de « Phase 1 » / « Phase 2 » dans le code (hors migration manuelle) sont traités : création de base vierge, drivers, gouvernance, tableau de bord, workers, tests, scripts CLI / audit.
- La sémantique est claire : **Activer la création** = ancien **actif** (générique à tout type de source) ; **Activer l’enrichissement** et **Activer l’analyse par IA** = deux nouvelles options indépendantes.

---

*Référence : Sprint 3 « Publication de l’application » ; préalable à la mise à disposition auprès des beta-testeurs pour un contrôle fin des phases par source.*
