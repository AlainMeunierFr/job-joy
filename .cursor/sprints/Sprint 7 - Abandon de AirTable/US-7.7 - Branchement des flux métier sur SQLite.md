# US-7.7 — Branchement des flux métier sur SQLite

## Contexte

L’US-7.6 a mis en place le schéma SQLite et le repository (ou driver) des offres. Cette US fait en sorte que tous les flux métier qui utilisaient Airtable pour les offres utilisent désormais ce stockage SQLite. Airtable n’est plus dans le chemin critique pour les offres.

## Titre

Faire utiliser le stockage SQLite par la relève, l’enrichissement, l’analyse IA, le tableau de synthèse et l’histogramme des scores à la place d’Airtable.

## Critères d’acceptation

1. **Relève**  
   Le flux de relève écrit les nouvelles offres dans SQLite via le port existant (`RelèveOffresDriver` / `creerOffres`), sans aucun appel à l’API Airtable pour les offres.

2. **Enrichissement**  
   Le flux d’enrichissement lit les offres à récupérer et met à jour les offres (texte, statut, etc.) dans SQLite via le port existant (`EnrichissementOffresDriver` : `getOffresARecuperer`, `updateOffre`), sans Airtable.

3. **Analyse IA**  
   Le flux d’analyse IA persiste Résumé, scores, critères rédhibitoires, statut, etc. dans SQLite via le même port (`updateOffre`), sans Airtable.

4. **Tableau de synthèse**  
   Le tableau de synthèse (dashboard) lit les offres depuis SQLite via le port existant (ex. `TableauSyntheseRepository.listerOffres`), sans Airtable.

5. **Histogramme des scores**  
   L’histogramme des scores (API / zone statistiques) lit les offres depuis SQLite (même source ou port dédié selon l’architecture), sans Airtable.

6. **Découplage Airtable**  
   Aucun code métier ne dépend directement d’Airtable pour les offres ; tout passe par les ports (drivers / repositories) implémentés sur SQLite. La configuration Airtable (base, offres) n’est plus requise pour le fonctionnement des offres (optionnellement conservée pour la reprise US-7.8).

7. **Tests**  
   Les tests existants ou ajoutés pour ces flux valident le comportement avec SQLite (mock, base de test ou `:memory:`). Aucun test ne dépend d’une base Airtable réelle pour les offres.

## Prérequis

- US-7.6 livrée (schéma SQLite et repository des offres).

## Hors périmètre

- Reprise des données depuis Airtable vers SQLite → US-7.8.
- Suppression définitive du code ou de la config Airtable (peut être fait dans cette US ou en nettoyage ultérieur, selon le choix du projet).

## Ordre

US-7.7 est livrée après 7.6 et avant ou en parallèle de 7.8 (reprise).
