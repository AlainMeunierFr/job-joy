#### US-1.4 : Offres des emails LinkedIn

- **En tant que** utilisateur
- **Je souhaite** que les offres contenues dans les emails reçus de LinkedIn soient ajoutées dans la table « Offres »
- **Afin de** pouvoir les faire analyser par une IA

---

- **Critères d'acceptation** :

- **CA1 - Vérifier que la source LinkedIn est active** :
  - Rechercher la ligne dont la colonne « Nom » (table Sources) vaut « LinkedIn ».
  - Si le champ « actif » de cette source est à false : informer l'utilisateur et ne pas poursuivre le traitement des emails LinkedIn.
  - Si le champ « actif » est à true : poursuivre avec CA2.

- **CA2 - Extraire les offres depuis les emails et alimenter la table Offres** :
  - Récupérer la valeur du champ « emailExpéditeur » de la source LinkedIn (table Sources).
  - Utiliser le compte email et les **deux dossiers** configurés (paramètres Connexion) : dossier à analyser (lecture) et **dossier des emails traités** (archivage).
  - Lire les emails du dossier à analyser dont l'expéditeur contient cette valeur.
  - À partir du contenu (HTML) de ces emails, extraire pour chaque offre : URL, identifiant d'offre et toute information utile déjà présente dans l'email ; s'inspirer de la logique du script `ressources/AnalyseeMailLinkedin.js`.
  - Pour chaque offre extraite : **upsert** dans la table Offres sur la clé **(Source, Id offre)** : si une ligne existe déjà avec cette Source et cet Id offre, la mettre à jour (URL, DateAjout, Statut, etc.) ; sinon créer la ligne. Champs : Source = LinkedIn (lien vers la source), Id offre, URL, DateAjout = date/heure courante, Statut = « Annonce à récupérer ». Ainsi on évite les doublons.
  - **Une fois un email traité (offres extraites), le déplacer dans le dossier des emails traités** (archivage pour ne pas le retraiter).
- **Configuration Connexion (prérequis)** : la configuration du compte email doit comporter un **second champ** : « Dossier des emails traités » (ex. « Traité », « Offres traitées »), en plus du « Dossier à analyser ». Si non renseigné, le comportement (ne pas déplacer / ou utiliser une valeur par défaut) est à définir au sprint.

- **CA3 - Enrichir l'annonce si le texte est accessible en local** :
  - En local, tenter de récupérer le texte complet de l'annonce (page d'offre) à partir de l'URL : poste, entreprise, ville, département, salaire, date, etc.
  - Si le texte est récupéré avec succès : alimenter les champs correspondants de la table Offres (Texte de l'offre, Poste, Entreprise, Ville, Département, Salaire, DateOffre) et mettre à jour le statut de l'offre en conséquence (ex. « À analyser » ou valeur définie au sprint).
  - Si la récupération échoue (contraintes anti-crawler LinkedIn, authentification requise, ou autre) : laisser le statut « Annonce à récupérer » et consigner la limite de manière explicite (log ou message utilisateur) pour traçabilité.
  - *Point ouvert pour le sprint : nécessité ou non d'une authentification LinkedIn ; contraintes anti-crawler à prendre en compte.*

---

**Déclenchement (hors périmètre back-end de cette US)** : le traitement sera déclenché par un bouton « Lancer le traitement » sur le **tableau de bord**. Pour cette US, on implémente d’abord le traitement en **CLI** (ligne de commande) ; le bouton sera branché au TDD-front-end.

*Référence : `US3 - Analyse des emals Linkedin.txt` ; objectif Sprint 1 : `00 - Sprint goal et contexte.md`.*
