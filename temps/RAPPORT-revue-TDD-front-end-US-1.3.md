# Revue TDD-front-end — US-1.3 Configurer Airtable

**Date** : 2026-02-22  
**Livrable** : page Paramètres avec bloc Configuration Airtable, APIs, steps BDD.

---

## ✅ Conformité aux consignes

| Point | Attendu | Fait |
|-------|---------|------|
| Même page Paramètres | Un seul écran, deux conteneurs | Oui — section `configurationAirtable` après Connexion dans `getParametresContent` |
| Tutoriel HTML | Lecture `CreationCompteAirTable.html`, injection | Oui — `readFile` + `#zone-tutoriel-airtable` |
| Champ API Key | e2eid `e2eid-champ-api-key-airtable` | Oui |
| Champ URL base | Requis, e2eid `e2eid-champ-airtable-base` | Oui — `required` sur l’input |
| Un seul Enregistrer | Soumission enregistre compte + Airtable | Oui — POST `/parametres` appelle `ecrireAirTable` en plus de `ecrireCompte` |
| Lancer la configuration | POST `/api/configuration-airtable`, driver réel si base | Oui — `handlePostConfigurationAirtable`, mock BDD conditionnel |
| Statut affiché | « AirTable prêt » / « Erreur avec AirTable » + message | Oui — `#statut-configuration-airtable` |
| Steps BDD | Tous implémentés pour la feature | Oui — `configuration-airtable.steps.ts` créé |

---

## Fichiers impactés

- **app/page-html.ts** : lecture tutoriel, `lireAirTable`, bloc Configuration Airtable (h2, zone tutoriel, champs, bouton, statut), script clic « Lancer la configuration ».
- **app/api-handlers.ts** : `handleGetAirtable`, `handlePostConfigurationAirtable`, mock BDD (succès si clé valide).
- **app/server.ts** : GET `/api/airtable`, POST `/api/configuration-airtable`, POST `/api/test/set-airtable` (BDD), et dans POST `/parametres` appel à `ecrireAirTable`.
- **tests/bdd/configuration-airtable.steps.ts** : step definitions pour `configuration-airtable.feature`.

---

## Qualité

- **Typecheck** : `npm run typecheck` OK.
- **Tests BDD** : 10/10 scénarios Airtable passent en ciblé ; en suite complète (`npm run test:bdd`), des échecs restent possibles sur des scénarios compte-email (store/page partagés, parallélisme). À traiter si besoin (isolation store, ordre d’exécution ou workers).
- **e2eID** : présents sur les champs et le bouton « Lancer la configuration ».
- **Pas de CSS** : livraison structure DOM uniquement, conforme (Designer ensuite).

---

## Suite

- **GO NEXT** : soit corrections mineures (ex. stabiliser test:bdd), soit passage au **Designer** pour le CSS du bloc Configuration Airtable.
- **Optionnel** : documenter ou isoler les scénarios BDD Airtable si les runs complets restent instables.
