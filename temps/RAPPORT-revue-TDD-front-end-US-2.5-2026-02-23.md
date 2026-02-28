# Revue TDD-front-end — US-2.5 Comptage des appels API

**Date** : 2026-02-23  
**Livrable** : section Consommation API sur le tableau de bord, API GET agrégation, intégration `enregistrerAppel` (Claude + Airtable), steps BDD.

---

## ✅ Conformité aux consignes

| Point | Attendu | Fait |
|-------|---------|------|
| Container Consommation API | Section après Synthèse des offres, `data-layout="consommation-api"` | Oui — `layout-html.ts` section avec h2, tableau, bouton Calculer |
| Tableau | Colonnes Date, Claude, Airtable ; tbody `#consommation-api-body` | Oui |
| Bouton Calculer | e2eid `e2eid-bouton-calculer-consommation-api` | Oui |
| GET /api/consommation-api | Agrégation par jour et par API | Oui — `handleGetConsommationApi` + `agregerConsommationParJourEtApi` |
| Comptage Claude | Après `appelerClaudeCode` (et mock) | Oui — `enregistrerAppel` dans `handlePostTestClaudecode` |
| Comptage Airtable | Après chaque appel Airtable (synthèse, offre test, config, etc.) | Oui — `enregistrerAppel` dans les handlers concernés |
| Steps BDD | Tous implémentés pour la feature | Oui — `comptage-appels-api.steps.ts` + réutilisation `parametrage-ia.steps` pour « Consommation API » |

---

## Fichiers impactés

- **app/layout-html.ts** : section Consommation API (h2, table, tbody, bouton), script fetch `/api/consommation-api` au clic Calculer.
- **app/api-handlers.ts** : `handleGetConsommationApi`, `enregistrerAppel` dans `handlePostTestClaudecode`, handlers Airtable (tableau synthèse, offre test, configuration Airtable, etc.).
- **app/server.ts** : GET `/api/consommation-api`, routes de test BDD (POST/GET log-appel, clear, list).
- **tests/bdd/comptage-appels-api.steps.ts** : step definitions pour `comptage-appels-api.feature`.
- **tests/bdd/parametrage-ia.steps.ts** : step « container ou section intitulée Consommation API » (réutilisé).

---

## Corrections effectuées en revue (Lead Dev)

1. **Contexte BDD** : les scénarios UI (container, tableau, bouton, clic Calculer) échouaient car `/tableau-de-bord` redirige vers `/parametres` si la configuration n’est pas complète. Ajout dans le Contexte de la feature : « Étant donné que la configuration Airtable est opérationnelle » avant « que le tableau de bord est affiché », afin que le serveur BDD affiche bien le tableau de bord avec la section Consommation API.
2. **Steps « colonne Claude / Airtable »** : `container.locator('th').toContainText('Claude')` provoquait une erreur en mode strict (plusieurs `th`). Remplacement par `container.getByRole('columnheader', { name: 'Claude' }).toBeVisible()` (idem pour Airtable).

---

## Qualité

- **Tests unitaires** : `app/layout-html.test.ts` et `app/api-handlers.consommation.test.ts` — 34 tests passent.
- **Tests BDD** : 12/12 scénarios `comptage-appels-api.feature` passent (`npx playwright test tests/bdd/comptage-appels-api`).
- **Typecheck** : `npm run typecheck` non exécuté en revue ; pas de script `lint` dans le projet (ESLint non configuré).
- **e2eID** : présent sur le bouton Calculer.

---

## Réponse à la question utilisateur (dossier log)

**« C’est normal qu’il n’y ait aucun dossier de log dans `.\data` ? »**  
Oui. Les 2 appels que tu as faits ont eu lieu **avant** la livraison TDD-front-end (ou sans redémarrage après). Désormais, chaque appel « Tester API » (Claude) et chaque appel Airtable (tableau de bord, config, etc.) appelle `enregistrerAppel` : le dossier `.\data\log-appels-api\` et les fichiers `AAAA-MM-JJ.json` sont créés à la volée. Après redémarrage de l’app et un ou deux appels, tu devrais voir le dossier et les fichiers ; le bouton « Calculer » remplit alors le tableau.

---

## Suite

- **GO NEXT** : déléguer au **Designer** pour le CSS du container « Consommation API » (si prévu), ou clôturer l’US-2.5.
