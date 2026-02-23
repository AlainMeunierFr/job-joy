# Product Goal

De nombreuses plateformes publient des offres d'emploi. La qualité de ces offres est très variable : environ **5 %** sont très intéressantes, **5 %** moyennement, et **90 %** sans intérêt. Les titres de poste (Job title) sont souvent vagues et les employeurs utilisent des intitulés racoleurs pour des postes moins attractifs.

**En tant que** chercheur d'emploi  
**Je souhaite** que toutes les notifications reçues par email et classées dans un dossier dédié soient importées dans une base de données (une ligne par offre) et évaluées par une IA (Claude Code API) selon des critères paramétrables  
**Afin de** me concentrer uniquement sur les offres intéressantes.

---

# Sprint 1 — Relève les emails

## Objectif du sprint

Mettre en place la chaîne : **connexion email → extraction des offres depuis les alertes (par source) → format unifié → base de données**, avec les paramétrages nécessaires.

## Flux cible (à terme)

1. **Connexion** : se connecter à la boîte email (paramètres : adresse, accès, dossier de travail).
2. **Par source (émetteur de l’alerte)** :
   - Récupérer les emails dans le dossier selon un filtre (ex. expéditeur).
   - Extraire des emails les **URL des offres**.
   - Décoder localement (avec l’IP publique de l’utilisateur) les URL au format « anti-crawler » si nécessaire.
   - Extraire le **texte de l’annonce** (poste, entreprise, ville, département, salaire, date, etc.).
   - Archiver l’email dans un dossier « traité ».
3. **Format unifié (toutes sources)** :
   - Soumettre les informations de l’annonce à la **Claude API** (audit selon critères paramétrables).
   - Archiver le résultat de l’audit (base de données).
4. **Paramétrages** :
   - Adresse email à analyser.
   - Paramètres d’accès à la base (lecture des paramètres, stockage des offres).

## Contexte technique actuel

- **Base de données** : Airtable (tables **Sources** et **Offres**). Paramètres en variables d’environnement (`.env`).
- **Scripts « en attendant »** : des scripts JS en local permettent d’analyser des pages « Enregistrer sous HTML » de moteurs de recherche de sites d’annonces (APEC, Cadremploi, Externatic, JTMS, Mantiks, WTTJ). Ils extraient les offres et les poussent vers Airtable. Ils servent de relais tant que les notifications par email ne sont pas branchées.
- **Parsers email existants** (à réutiliser / adapter) :
  - **LinkedIn** (`ressources/AnalyseeMailLinkedin.js`) : parse le HTML de l’email, extrait IDs, URL, titre, entreprise, lieu (regex sur `jobs/view/<id>/`, `jobcard_body`). Les annonces complètes pourront être lues en local (contournement anti-crawler) ; point ouvert : connexion avec identifiant LinkedIn si nécessaire.
  - **HelloWork** (`ressources/AnalyseeMailHelloWork.js`) : extrait les URLs de tracking (`emails.hellowork.com/clic/...`), décode le base64 pour obtenir l’ID d’offre, construit l’URL canonique, récupère la page offre (ou marque Obsolète si 404/410), extrait la description depuis `AgentIaJsonOffre`.

## User Stories du sprint (référence)

- **US1** : Configurer le compte mail (login, mot de passe, dossier de travail) ; test de connexion ; mémorisation (ex. `data/compte.json`, mot de passe haché).
- **US2** : Configurer Airtable (tuto, API Key, création tables Sources et Offres via API, création dynamique des sources en audit/traitement, variables d’environnement, statut « AirTable prêt » / erreur).
- **US3** : Offres des emails LinkedIn → table Offres (source active, filtre expéditeur, extraction URL/infos, lecture annonce en local, champs Poste, Entreprise, Ville, etc.).
- **US4** : Offres des emails HelloWork → table Offres (même logique : source active, filtre, extraction, Statut « A analyser »).

## Points à préciser au fil du sprint

- Lecture du texte d’annonce LinkedIn en local : besoin ou non de s’authentifier ? Contraintes anti-crawler.
- Autres sources d’alertes email à prévoir (naming, filtres, format des URL).
