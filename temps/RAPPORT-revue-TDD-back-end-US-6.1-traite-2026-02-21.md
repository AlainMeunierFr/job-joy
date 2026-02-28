# Rapport de revue Lead Dev — TDD-back-end US-6.1 (déplacement vers traité)

**Date** : 2026-02-21  
**US** : US-6.1  
**Mode** : GO FIN  

## Verdict : **Accepté**

- `utils/liste-html-traite.ts` : ensureTraiteDir, deplacerFichierVersTraite.
- `utils/apec-liste-html-parser.ts` : extraireUrlsApecDepuisDossierDirEtDeplacer, extraireUrlsApecDepuisDossierEtDeplacer.
- CLI utilise la version « extraire et déplacer » par défaut.
- 16 tests passent (liste-html-traite + apec-liste-html-parser).

## Suite

Délégation suivante : création des sources « Import html » à l’audit + colonne « À importer ».
