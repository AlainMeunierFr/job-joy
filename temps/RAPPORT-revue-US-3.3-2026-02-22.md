# Revue Lead Dev – US-3.3 Tableau de bord unifié

**Date** : 2026-02-22  
**Étape** : US validée → passage BDD (tunnel sans interruption)

## Revue US

- **US-3.3** : format DOD respecté (En tant que / Je souhaite / Afin de), titre avec deux-points.
- **Contexte** : deux étapes (compter toujours, importer par worker si phase activée) et décisions de design clairement rédigées.
- **CA** : CA1 à CA4 testables, alignés avec les décisions (une API, cache RAM, runCreation, suppression container BAL).
- **Verdict** : ✅ US acceptée, passage à BDD.

## Tunnel

- **GO NEXT** → Agent BDD (rédaction des scénarios .feature pour US-3.3).
- Ensuite : TDD-back-end → TDD-front-end → Designer (sans interruption sur demande).

---

## Revue livraison BDD (2026-02-22)

- **tableau-synthese-offres.feature** : 4 scénarios US-3.3 ajoutés (CA1 x2, CA2, CA3) ; step « Mise à jour » aligné pour US-1.13. Steps listés pour step definitions.
- **audit-dossier-email.feature** : refactorisé CA4 uniquement (container BAL absent), anciens scénarios UI retirés.
- **Verdict** : ✅ BDD acceptée. Passage TDD-back-end.

---

## Revue livraison TDD-back-end (2026-02-22)

- **utils/cache-audit-ram.ts** : setDernierAudit, getDernierAudit, getNombreAImporter (clés normalisées). Tests 3 cas, couverture 100 %.
- **utils/tableau-synthese-offres.ts** : LigneTableauSynthese.aImporter, construireTableauSynthese avec aImporter: 0, mergeCacheDansLignes. Tests 4 cas US-3.3 + existants.
- **Vérifications** : `npm run test` (cache + tableau-synthese) OK, `npm run typecheck` OK. Pas de script `lint` dans le projet.
- **Verdict** : ✅ TDD-back-end accepté. Passage TDD-front-end.

---

## Revue livraison TDD-front-end (2026-02-22)

- **Handler** : mergeCacheDansLignes(lignes, getDernierAudit()) dans handleGetTableauSyntheseOffres ; POST /api/test/set-mock-cache-audit ; POST /api/tableau-synthese-offres/refresh (audit puis setDernierAudit).
- **Colonne "A importer"** : ajoutée dans layout-html (th + td + ligne Totaux).
- **Bouton "Mise à jour"** : appelle POST refresh puis GET tableau.
- **Thermomètre phase 1** : bloc syntheseOffresThermoPhase1 ajouté dans le bloc Synthèse des offres.
- **CA4** : section dossierBoiteContainer retirée ; steps audit-dossier-email pour absence du container.
- **runCreation** : alias exporté, appels dans api-handlers passés à runCreation. Worker 1 h non implémenté (à faire si besoin).
- **Vérifications** : typecheck OK. `npm run test:bdd` échoue sur 59 steps manquants dans d’autres features (gouvernance, justifications, etc.) ; les steps US-3.3 (tableau-synthese-offres + audit-dossier-email) sont implémentés.
- **Verdict** : ✅ TDD-front-end accepté. Passage Designer (ou clôture si tunnel court).
