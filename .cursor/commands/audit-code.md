# Audit du code — compléter l'analyse sémantique

Tu as lancé l’option 7 du Menu.ps1 : le script a produit `data/audit-traceability.json` (artefacts avec `linkedIdsAmont` / `linkedIdsAval`, orphelins recalculés).

**Schéma (ne pas modifier)** : chaque artefact a `linkedIdsAmont`, `linkedIdsAval`, `orphan`. Orphelin = coupe la chaîne (US/CA/Feature/Step sans aval ; TU/TI sans amont ou sans aval ; Code sans amont).

**À faire :**

1. **Lire** `data/audit-traceability.json` (et si présent `data/audit-traceability-draft.json`).
2. **Enrichir** les liens de façon sémantique quand c’est pertinent :
   - commentaires du type `// US-1.1`, `// CA2` → ajouter la US/CA en **amont** du fichier code (donc dans `linkedIdsAmont` du code, et le code dans `linkedIdsAval` de la US) ;
   - nommage de fichiers/fonctions qui évoquent une US ou une feature ;
   - TU/TI qui testent un module sans lien explicite → proposer un lien en **amont** (US/CA) pour le TU/TI si le domaine est clair.
3. **Enrichir les descriptions des CA** : pour tout artefact de type `ca` dont la `description` est encore générique (« Critère d'acceptation X de US-Y »), la remplacer par une phrase métier explicite. S’inspirer du fichier US correspondant (`.cursor/sprints/.../US-X.Y - Titre.md` : titre après **CA n –** ou **CA n -**) ou du contenu des features/scénarios BDD qui couvrent ce CA. Une ligne courte suffit (ex. « Page de paramétrage », « Bouton Tester connexion », « Menu Tableau de bord masqué si config incomplète »).
4. **Revoir les orphelins** : après toute modification des liens ou des descriptions, recalculer `orphan` pour chaque artefact (règle « coupe la chaîne » : US/CA/Feature/Step sans aval → orphelin ; TU/TI sans amont ou sans aval → orphelin ; Code sans amont → orphelin).
5. **Écrire** le résultat dans `data/audit-traceability.json`. Conserver le schéma : `generatedAt`, `artefacts` (avec `linkedIdsAmont`, `linkedIdsAval`, `orphan`, `description`), `byType`.

Sois conservateur : ne crée pas de lien sans indice (fichier, commentaire, nom). En cas de doute, laisse l’artefact tel quel. Tu peux ajouter une phrase dans `description` pour expliquer un lien sémantique ajouté.

Après enregistrement, consulter : **http://127.0.0.1:3001/audit** (onglets par type, colonnes Associés en amont / en aval, filtre orphelins).
