# Revue Lead Dev — US-3.14 (Gestion des erreurs réseau et service indisponible)

**Date** : 2026-02-25  
**Statut** : ✅ US acceptée

## Vérifications

- **Format DOD** : En tant que / Je souhaite / Afin de présents et cohérents.
- **Critères d'acceptation** : CA1 à CA5 rédigés, testables (message clair, pas de crash, mapping commun, périmètre Airtable/IMAP/Microsoft/Claude, retry optionnel).
- **Pas de code** : livrable US uniquement.

## Décision

- US-3.14 validée. Passage à TDD-back-end.
- **Tunnel** : livrable = domaine uniquement (utils). BDD optionnel, non requis. **TDD-back-end** : helper `messageErreurReseau` + usage dans les points d'appel (configuration-airtable, connecteur-imap, auth-microsoft/connecteur-graph, appeler-claudecode).

## Suite

Délégation à **TDD-back-end** en autonomie (plan de tests baby steps inclus dans le prompt).

---

# Revue Lead Dev — Livraison TDD-back-end US-3.14

**Date** : 2026-02-25  
**Statut** : ✅ Acceptée

## Vérifications effectuées

- **CA1 (message utilisateur clair)** : `utils/erreur-reseau.ts` avec `MESSAGE_ERREUR_RESEAU` et `messageErreurReseau(err)` ; ECONNREFUSED, ETIMEDOUT, ENOTFOUND, « fetch failed », AbortError → message commun. ✅
- **CA2 (pas de crash)** : configuration-airtable, connecteur-imap, auth-microsoft, connecteur-graph, appeler-claudecode retournent un résultat structuré ; aucun `throw` laissé remonter. ✅
- **CA3 (mapping commun)** : tous les points d’appel utilisent `messageErreurReseau` / `MESSAGE_ERREUR_RESEAU`. ✅
- **CA4 (périmètre)** : Airtable, IMAP, Microsoft Graph, Claude couverts. ✅
- **CA5 (retry optionnel)** : 1 retry (délai 1,5 s) pour `executerConfigurationAirtable` en cas d’erreur réseau uniquement. ✅
- **Tests** : `utils/erreur-reseau.test.ts`, `configuration-airtable.test.ts`, `appeler-claudecode.test.ts` — 19 tests passent. Couverture du helper et des cas réseau. ✅
- **Typecheck** : `npm run typecheck` OK. ✅
- **Lint** : pas de script `npm run lint` dans le projet (non bloquant). ✅
- **Suite complète** : les échecs restants sont dans `enrichissement-offres.test.ts` (ordre des clés dans les appels à `updateOffre`), antérieurs à cette US. ✅

## Décision

Livraison TDD-back-end US-3.14 **acceptée**. US-3.14 considérée **done** (tunnel domaine + CLI : US → TDD-back-end).
