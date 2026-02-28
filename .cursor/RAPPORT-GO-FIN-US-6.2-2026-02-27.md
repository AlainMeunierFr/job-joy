# Rapport GO FIN — US-6.2 (Sources email configurées et liste html par sous-dossier)

**Date** : 2026-02-27

## Tunnel exécuté

1. **BDD** — Scénarios Gherkin rédigés dans `tests/bdd/sources-email-configurees-liste-html.feature` (CA2 audit, CA3 liste html / plugin).
2. **TDD-back-end** — Implémentation des CA1, CA2, CA3 livrée et vérifiée.

## Revue Lead Dev

### BDD
- Feature cohérente avec US-6.2. Titre corrigé : « import html » → « liste html ».

### TDD-back-end
- **CA2 (audit)** : `run-audit-sources.ts` — boucle email ne crée plus de source ; `if (!sourceExistante) continue;` ; synthèse uniquement pour expéditeurs déjà dans `listerSources()`. OK.
- **CA2 (traitement)** : `gouvernance-sources-emails.ts` — expéditeur absent de la map → `continue` (pas de création). OK.
- **CA3** : `audit-sources-liste-html.ts` — `pluginPourSlugListeHtml(slug)` (apec → APEC, sinon Inconnu) ; `PluginSource` et `PLUGINS_SOURCES_AIRTABLE` étendus avec `APEC`. OK.
- **CA1 (Adresse)** : `airtable-releve-driver.ts`, `airtable-driver-reel.ts`, `airtable-ensure-enums.ts`, `airtable-enrichissement-driver.ts` — champ Airtable « Adresse » utilisé à la place de « email expéditeur » ; structures internes conservent `emailExpéditeur`. OK.

### Tests
- 57 tests passent (run-audit-sources.integration, audit-sources-liste-html, gouvernance-sources-emails, airtable-releve-driver, airtable-driver-reel).
- 27 tests passent (tableau-synthese-offres, airtable-enrichissement-driver).

## Non fait dans ce GO FIN

- **Step definitions BDD** pour `sources-email-configurees-liste-html.feature` : à implémenter (TDD front-end ou étape dédiée) pour exécuter les scénarios.
- **CA1** : si la base Airtable de l’utilisateur a encore la colonne « email expéditeur », il faut la renommer en « Adresse » (côté Airtable) pour correspondre au code.

## Statut

**GO FIN US-6.2** : tunnel BDD + TDD-back-end terminé. Livrable prêt pour step definitions et tests E2E si besoin.
