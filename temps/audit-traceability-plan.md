# Plan d’implémentation – Audit de traçabilité US ↔ code

## Étapes

1. **Schéma et persistance**
   - Format : chaque artefact a `linkedIdsAmont`, `linkedIdsAval`, `orphan`. Orphelin = coupe la chaîne (spec sans aval, impl sans amont ; voir `types/audit-traceability.ts`).
   - Fichier persistant : `data/audit-traceability.json`. Migration ancien format (`linkedIds`) : `node scripts/audit-traceability-migrate.js`.

2. **Script déterministe (Node)**
   - Lister les artefacts : US, CA, Feature BDD, Step, TU, TI, fichiers code.
   - Liens non ambigus : US↔CA, Feature↔US (tags), Feature↔Step (nom), TU/TI↔code (imports), Step↔code (imports).
   - Produire `data/audit-traceability-draft.json` (ou directement `audit-traceability.json` si pas de phase LLM).

3. **API et route**
   - `GET /api/audit-traceability` : retourne le JSON (404 si absent).
   - `GET /audit` : page HTML (layout commun) qui consomme l’API et affiche l’IHM.

4. **IHM web**
   - Un onglet par type d’artefact (US, CA, Feature, Step, TU, TI, Code).
   - Par artefact : ID, Nom, Description, **Associés en amont**, **Associés en aval**, Orphelin (oui/non).
   - Filtre : Orphelins / Non orphelins / Tous.
   - Si pas de JSON : message « Aucun audit disponible. Lancez l’audit depuis Menu.ps1 (option 7) puis la commande /audit-code dans Cursor. »

5. **Menu app + Menu.ps1**
   - En mode dev : afficher l’entrée « Audit du code » dans le menu (lien vers `/audit`). Mode dev = lorsque le serveur utilise `data/` du projet (pas en mode packagé Electron).
   - Menu.ps1 : option 7 « Audit du code (traçabilité US ↔ code) » → lance le script de brouillon, indique à l’utilisateur d’exécuter `/audit-code` dans Cursor pour compléter (LLM) et sauvegarder.

6. **Commande /audit-code et LLM**
   - Fichier `.cursor/commands/audit-code.md` : prompt pour compléter l’audit à partir du brouillon (liens sémantiques, orphelins), puis écrire `data/audit-traceability.json`.
   - Optionnel : agent dédié dans `.cursor/agents/` pour limiter les hallucinations (instructions strictes, citer les preuves).

## Fichiers créés/modifiés

- `types/audit-traceability.ts` – schéma (linkedIdsAmont, linkedIdsAval, orphan)
- `scripts/audit-traceability-migrate.js` – migration ancien → nouveau format
- `scripts/audit-traceability.js` – génération (amont/aval, orphelin)
- `scripts/audit-traceability-enrich.js` – liens sémantiques + recalcul orphelins
- `data/audit-traceability.json` – persistance (généré)
- `app/server.ts` – routes GET /audit, GET /api/audit-traceability
- `app/audit-html.ts` ou contenu inline – page HTML de l’audit
- `app/layout-html.ts` – lien « Audit du code » en dev
- `Menu.ps1` – option 7
- `.cursor/commands/audit-code.md` – prompt
