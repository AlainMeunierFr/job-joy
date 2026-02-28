# US-7.6 — Schéma SQLite et stockage des offres

## Contexte

Aujourd’hui les offres sont stockées dans la table Airtable « Offres ». L’objectif du sprint est d’abandonner Airtable et d’utiliser SQLite pour les offres. Cette US pose les fondations : schéma et couche d’accès.

## Titre

Mettre en place le stockage des offres dans un fichier SQLite avec un schéma aligné sur la table Offres Airtable actuelle.

## Critères d’acceptation

1. **Fichier et chemin**  
   Un fichier SQLite est utilisé pour les offres. Le chemin est `data/offres.sqlite`.

2. **Schéma**  
   Le schéma de la base couvre tous les champs nécessaires aux usages actuels, alignés sur la table Offres Airtable (référence pour les types et les valeurs d'enumération : `airtable-driver-reel.ts` et `ChampsOffreAirtable`).  
   Une colonne dédiée sert d’**identifiant unique** (UID) pour chaque enregistrement, sur le même principe que l’identifiant interne des enregistrements Airtable (ex. clé primaire `id` TEXT, ou équivalent). Cette colonne est obligatoire et unique.

3. **Attribution automatique de l’UID**  
   Un trigger SQLite et/ou un automatisme applicatif garantit que chaque nouvelle ligne reçoit un UID automatiquement à l’insertion (si non fourni). Ainsi les offres créées par l’app (relève, etc.) ont toujours un identifiant stable ; la reprise depuis Airtable (US-7.8) pourra utiliser l’UID pour l’idempotence.

4. **Schéma détaillé (colonnes métier)**  
   Outre l’UID, le schéma inclut les champs métier suivants (référence Airtable) :
Id offre
source
méthode de création
Statut
URL
Verdict
Score_Total
Texte de l'offre
Poste
Résumé
Entreprise
Ville
Département
Salaire
DateOffre
DateAjout
CritèreRéhibitoire1
CritèreRéhibitoire2
CritèreRéhibitoire3
CritèreRéhibitoire4
ScoreCritère1
ScoreCritère2
ScoreCritère3
ScoreCritère4
ScoreCulture
ScoreLocalisation
ScoreSalaire
ScoreQualiteOffre
Adresse
Commentaire
Reprise

5. **Repository / port**  
   Les opérations CRUD sur les offres passent par un repository (ou driver) qui sera le point d’entrée unique pour tous les flux (relève, enrichissement, analyse IA, tableau de synthèse, histogramme). L’interface expose au minimum :
   . création/mise à jour (upsert par Id offre ou URL)
   . mise à jour partielle par id
   . requêtes par statut
   . requêtes par source.

6. **Initialisation**  
   La base SQLite est créée automatiquement si elle n’existe pas (script d’init). Aucune action manuelle requise pour un nouvel install.

7. **Tests**  
   Le comportement est validé par des tests automatisés. Aucune donnée réelle n’est requise : utilisation d’une base en mémoire (SQLite `:memory:`) ou d’un fichier de test effaçable.

## Hors périmètre (US suivantes)

- Branchement des flux métier (relève, enrichissement, etc.) sur ce repository → US-7.7.
- Reprise des données depuis Airtable vers SQLite → US-7.8.

## Ordre

US-7.6 doit être livrée avant 7.7 et 7.8 (les deux dépendent du schéma et du repository).
