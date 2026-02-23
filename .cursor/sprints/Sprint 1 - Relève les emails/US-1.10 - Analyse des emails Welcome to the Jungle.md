#### US-1.9 : Analyse des emails Welcome to the Jungle

- **En tant que** utilisateur
- **Je souhaite** que les offres contenues dans les emails reçus de Welcome to the Jungle soient ajoutées dans la table « Offres »
- **Afin de** pouvoir les faire analyser par une IA

---

- **Critères d'acceptation** :

- **CA1 - Init sources Airtable** :
  - Ajouter « Welcome to the Jungle » à l'énumération de la colonne « Sources.Algo » (ou liste des valeurs Algo) sur Airtable.

- **CA2 - Audit des emails Welcome to the Jungle** :
  - Lorsqu'un email a pour expéditeur « alerts@welcometothejungle.com », l'insérer dans les sources avec l'algo « Welcome to the Jungle » et l'activer (actif = true).

- **CA3 - Étape 1 (plug-in) : extraction depuis le body de l'email** :
  - Implémenter l'étape 1 du traitement pour le plug-in « WelcomeToTheJungle » : lire le body de l'email et en extraire un maximum d'informations pour alimenter la table « Offres ».
  - S'appuyer en priorité sur les exemples dans le dossier `tests/exemples/alerts@welcometothejungle.com`.
  - Le code dans `data/ressources/wttj.js` traite des pages « Enregistrer sous » du site (pas des emails) : s'en inspirer si des points communs sont identifiés ; aucun rapport n'est garanti.
  - L'URL d'offre dans l'email est encodée en base64 ; la décoder pour obtenir l'URL normale (résolution nécessaire pour l'étape 2).

- **CA4 - Étape 2 (worker) : enrichissement des offres** :
  - Implémenter l'étape 2 pour le plug-in « WelcomeToTheJungle » : une fois l'URL résolue (décodage base64) à l'étape 1, exécuter l'enrichissement des offres comme pour les autres sources.
  - S'appuyer sur le code existant dans `data/ressources/AnalyseeMailWelcometoTheJungle.js`.

---

*Référence : contexte Sprint 1 « Relève les emails » ; US-1.09 - Analyse des emails HelloWork.md.*
