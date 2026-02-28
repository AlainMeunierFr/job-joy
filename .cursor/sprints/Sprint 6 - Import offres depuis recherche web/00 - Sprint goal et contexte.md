# Sprint 6 — Import offres depuis recherche web

## Sprint goal

Permettre à l'utilisateur d'intégrer des offres à partir de pages de résultat de recherche sauvegardées depuis des sites de plateformes (ex. APEC), en plus du canal email, pour ne pas dépendre des alertes email et exploiter des offres un peu plus anciennes.

## Contexte

- Nouveau type de source : **Import HTML** (liste de pages HTML déposées dans un dossier dédié).
- Migration du schéma Airtable : colonne `EmailExpediteur` renommée en `Adresse` (Sources et Offres).
- Premier plugin concerné : **APEC** (phase création + enrichissement à tester).

## Pause US-6.1 après le back-end (phase 1 APEC)

- **Pas de GO FIN** pour cette US : on enchaîne avec des revues utilisateur jusqu’à un point de pause convenu.
- **Pause prévue** : après la livraison TDD-back-end de la **phase 1 (création) pour APEC** (parsing HTML, extraction des URL d’offres).
- **Objectif de la pause** : tester avec l’utilisateur, **en ligne de commande**, que les URL extraites à la phase 1 pour APEC sont correctes.
- **Contrainte** : **aucune injection dans Airtable** pendant ce test — uniquement afficher / lister les URL extraites (ex. script CLI ou sortie console) pour validation manuelle.
- Une fois les URL validées, reprise du tunnel (suite TDD-back-end si besoin, puis TDD-front-end, etc.).


# US-6.4 à US-6.8 — Sources en JSON (découpage Elephant Carpaccio)

Document regroupant le **contexte d’origine** (abandon Airtable pour les sources) et les **cinq User Stories** découpées pour limiter le risque.

---

## Contexte et genèse : pourquoi abandonner Airtable pour les sources

Lors de l’audit d’architecture et des problèmes rencontrés, les points suivants ont conduit à abandonner la table **Sources** dans Airtable :

1. **Doublons à chaque redémarrage**  
   Des sources apparaissaient en double (ex. « liste html/mantiks » plusieurs fois). Le nombre de doublons était égal au nombre de fois où le serveur avait été relancé. La cause identifiée : un **bug dans les critères de recherche Airtable** avant création (la vérification « cette source existe déjà ? » ne fonctionnait pas correctement).

2. **Coût API disproportionné**  
   La table Sources dans Airtable consommait beaucoup de tokens API pour un usage limité : lecture/écriture des sources et des activations.

3. **Données réellement modifiables**  
   Les seules données que l’utilisateur a besoin de modifier sur les sources sont les **activations** (création, enrichissement, analyse IA). Ces modifications peuvent être faites depuis le tableau de bord (clic sur la coche verte / le bonhomme qui dort).

**Décision** : sérialiser les sources dans un fichier local **`.\data\sources.json`** et ne plus utiliser Airtable pour la table Sources. Les activations sont modifiables via le tableau de bord et persistées dans ce fichier.

Par la suite, le modèle a été précisé : abandon du terme technique « plugin » au profit de **« source »** (une source = une plateforme), et une structure cible « une entrée par source » avec liste d’emails, activations par phase, etc. Pour ne pas tout faire en une seule US trop ambitieuse, le découpage **Elephant Carpaccio** ci-dessous propose cinq US successives.

---

## Stratégie de découpage (Elephant Carpaccio)

| # | US | Contenu | Risque |
|---|-----|--------|--------|
| 6.4 | Renommer "plugin" en "source" | Renommage partout (code, UI, données) sans changer structure ni comportement. | Faible |
| 6.5 | Sources dans sources.json (même structure) | Remplacer Airtable Sources par `data/sources.json` en gardant la même structure logique (une ligne = une adresse ou un chemin liste html). | Moyen |
| 6.6 | Refactoriser : une entrée par source | Nouveau schéma : une entrée par source (Linkedin, APEC, …) avec liste d’emails, activations par phase. Migration des données existantes. | Moyen |
| 6.7 | Tableau de bord : une ligne par source + nouvelles colonnes | Une ligne = une source ; colonnes « Création par email », « Création par liste html », « Email à importer », « Fichier à importer », puis phase 2, phase 3 ; clic coche/bonhomme → persistance dans sources.json. | Moyen |
| 6.8 | Liste html : dossiers et entrées systématiques par source | Créer tous les sous-dossiers `liste html/<nom source>` et une entrée liste html par source (liste canonique). | Faible |
