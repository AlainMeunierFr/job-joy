# US-7.8 — Reprise des données Airtable vers SQLite

## Contexte

Après la mise en place du stockage SQLite (US-7.6) et le branchement des flux sur SQLite (US-7.7), les offres existantes restent dans Airtable. Cette US permet de les migrer une dernière fois : lecture via l’API Airtable (lecture seule), puis insertion dans la base SQLite locale. Une fois la reprise exécutée, l’utilisateur peut abandonner Airtable pour les offres.

## Titre

Permettre la reprise des offres existantes depuis Airtable vers SQLite via l’API Airtable (pagination) puis insertion dans SQLite.

## Critères d’acceptation

1. **Commande ou script**  
   Une commande ou un script dédié (CLI ou script npm, ex. `npm run import:offres-airtable-vers-sqlite`) effectue la reprise : lecture de toutes les offres depuis la table Airtable « Offres » via l’API Airtable.

2. **Pagination**  
   La pagination de l’API Airtable est gérée pour récupérer l’intégralité des enregistrements (pageSize + offset ou équivalent), sans limite arbitraire côté script.

3. **Mapping et insertion**  
   Chaque offre récupérée est insérée dans SQLite selon le schéma défini en US-7.6. Le mapping des champs Airtable vers les colonnes SQLite est documenté ou évident (mêmes noms / convention). Les champs absents ou invalides sont gérés (valeur par défaut, skip, ou règle documentée). L’**identifiant unique (UID)** de l’enregistrement Airtable (record ID, ex. `recXXXXXXXXXXXXXX`) est mappé vers la colonne UID SQLite définie en US-7.6.

4. **Idempotence fondée sur l’UID**  
   La reprise est idempotente grâce à l’UID : à chaque enregistrement Airtable est associé son record ID, utilisé comme UID dans SQLite. En cas de relance du script, les offres déjà importées sont reconnues par cet UID et mises à jour (ou ignorées) au lieu d’être dupliquées. Comportement concret : insertion ou remplacement selon l’UID (ex. `INSERT OR REPLACE` / `ON CONFLICT(id) DO UPDATE`), ou équivalent documenté.

5. **Gestion des erreurs**  
   En cas d’erreur (API Airtable indisponible, erreur réseau, erreur SQLite, fichier verrouillé), le comportement est défini et documenté (arrêt immédiat, log et reprise partielle, rollback, etc.).

6. **Lecture seule côté Airtable**  
   La reprise ne modifie pas les données Airtable (aucun PATCH/POST/DELETE vers Airtable ; lecture seule).

7. **Tests**  
   Les tests automatisés du script ou de la logique de reprise utilisent des mocks (réponses API Airtable simulées, base SQLite en mémoire ou fichier de test). Aucune donnée réelle Airtable n’est requise pour exécuter les tests.

## Prérequis

- US-7.6 livrée (schéma SQLite et repository).
- US-7.7 livrée ou en cours (le repository SQLite est le point d’insertion ; le script peut appeler le même repository ou une couche d’import dédiée).

## Hors périmètre

- Modification ou suppression des données dans Airtable.
- Reprise incrémentale (seules les nouvelles offres) : hors scope sauf si explicitement prévu (comportement documenté suffit).

## Ordre

US-7.8 peut être livrée après 7.6 ; idéalement après 7.7 pour que l’app utilise déjà SQLite et que la reprise remplisse la base utilisée en production.
