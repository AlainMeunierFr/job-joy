#### US-1.3 : Configurer Airtable

- **En tant que** utilisateur
- **Je souhaite** configurer la base Airtable pour y stocker les offres
- **Afin de** faciliter la navigation dans les données

---

**Critères d'acceptation**

**CA1 – Inviter l'utilisateur à créer son compte Airtable**
- L'application affiche en HTML le tutoriel dont le contenu est celui du fichier `.\data\ressources\CréationCompteAirTable.html`.
- L'application propose un champ de saisie pour stocker l'API Key Airtable.
- L'API Key est stockée dans l'objet `AirTable` , propriété `API Key` dans le fichier `.\data\parametres.json`

**CA2 – Créer la base "Analyse offres" via l'API**
- La base "Analyse offres" est créée via l'API Airtable

**CA3 – Créer la table "Sources" via l'API**
- La table "Sources" est créée dans la base "Analyse offres" via l'API Airtable avec les champs suivants :
  - **emailExpéditeur** : Texte sur une seule ligne
  - **algo** : Sélection unique (`Linkedin`, `Inconnu`)
  - **actif** : Case à cocher

**CA4 – Créer la table "Offres" via l'API**
- La table "Offres" est créée dans la base "Analyse offres" via l'API Airtable avec les champs suivants :
  - **Source** : Lien vers la table "Sources"
  - **Id offre** : Texte sur une seule ligne
  - **URL** : Texte sur une seule ligne
  - **Texte de l'offre** : Texte long
  - **Poste**, **Entreprise**, **Ville**, **Département**, **Salaire** : Texte sur une seule ligne
  - **DateOffre**, **DateAjout** : Date
  - **Statut** : Sélection unique
  - **Résumé** : Texte long
  - **CritèreRéhibitoire1** à **CritèreRéhibitoire4** : case à cocher
  - **ScoreCritère1** à **ScoreCritère4**, **ScoreCulture**, **ScoreLocalisation**, **ScoreSalaire**, **ScoreQualiteOffre** : Nombre
  - **Score_Total**, **Verdict** : formules (définies côté Airtable ou via API selon capacité API)

**CA5 – Alimenter la table "Sources"**
- Les sources sont créées dynamiquement pendant l'audit et le traitement des emails (plus d'import CSV).

**CA6 – Récupérer et stocker les paramètres nécessaires**
- L'identifiant (Id) de la base Airtable est stocké dans l'objet `AirTable` , propriété `Base` dans le fichier `.\data\parametres.json`
- L'identifiant (Id) de la table "Sources" est stocké dans l'objet `AirTable` , propriété `Sources` dans le fichier `.\data\parametres.json`
- L'identifiant (Id) de la table "Offres" est stocké dans l'objet `AirTable` , propriété `Offres` dans le fichier `.\data\parametres.json`

**CA7 – Afficher le résultat du traitement**
- Si la configuration Airtable (création des tables, paramètres) s'est déroulée correctement : un **statut** explicite est affiché : « AirTable prêt » (ou libellé équivalent).
- En cas d'erreur : le **statut** affiché est « Erreur avec AirTable » et les informations disponibles sur l'erreur (retour API ou message technique) sont affichées de façon lisible pour l'utilisateur.
