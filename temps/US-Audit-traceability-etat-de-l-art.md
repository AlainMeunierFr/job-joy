# US – Audit de traçabilité spec ↔ code (état de l’art)

**Référence** : synthèse des échanges sur l’audit de traçabilité (types d’artefacts, types de liens, listing par script, enrichissement par prompt IA, fichier par artefact, orphelins de fichiers).

- **En tant que** développeur ou lead
- **Je souhaite** disposer d’un audit de traçabilité qui relie la spécification (US, CA, features BDD) au code (fichiers, TU, TI)
- **Afin de** visualiser la chaîne spec ↔ code, identifier les orphelins (artefacts qui coupent la chaîne), lister les fichiers sans artefact (candidats au nettoyage), et alimenter les décisions (couverture, dette, priorisation)

---

## Critères d’acceptation

**CA1 – Types d’artefacts**

- Les types d’artefacts sont définis et persistés dans un schéma unique (ex. `types/audit-traceability.ts`).
- Types retenus : **US** (user stories), **CA** (critères d’acceptation), **Feature** (fichier `.feature` BDD), **Step** (fichier `.steps.ts` associé), **Scenario** (réservé), **TU** (test unitaire), **TI** (test d’intégration), **Code** (fichier source app/utils).
- Chaque artefact a un **id** stable, un **type**, un **nom**, une **description**, deux listes de liens (**amont** / **aval**) et un indicateur **orphelin** (coupe la chaîne ou non).

**CA2 – Types de liens entre artefacts**

- Les liens sont classés en **non ambigus** (déterministes, sans IA) et **ambigus** (nécessitant une analyse sémantique ou un prompt IA).
- **Liens non ambigus** (détectables par le script) :
  - US ↔ CA : déduits du fichier US (structure **CA n**, CA listés dans l’US).
  - Feature ↔ US : tag `@us-X.Y` dans le `.feature` ou table de mapping feature → US.
  - Feature ↔ Step : même base de nom (ex. `tableau-synthese-offres.feature` ↔ `tableau-synthese-offres.steps.ts`).
  - TU / TI ↔ Code : déduits des **imports** dans le fichier de test (fichiers importés = code en aval du test ; le test en aval du code).
  - Step ↔ Code : en principe déductible des imports dans le fichier `.steps.ts` (non implémenté à ce jour).
- **Liens ambigus** (enrichissement sémantique, idéalement via prompt IA) :
  - Code ↔ US/CA : commentaires dans le code (ex. `// US-1.1`, `// CA2`) — **pas forcément à jour**.
  - Code ↔ US/CA : nommage des fichiers, fonctions ou variables — **pas forcément explicite**.
  - Code ↔ US/CA : analyse du **comportement** du code (ce qu’il fait) — interprétation, à confier à un LLM ou à un agent avec consignes strictes (citer les preuves, être conservateur).
- La direction des liens est explicite : **amont** = côté spec (US, CA, feature), **aval** = côté implémentation (step, code, TU, TI). Un même lien est enregistré en amont d’un artefact et en aval de l’autre (ex. code a US en amont, US a code en aval).

**CA3 – Lister les artefacts via un script**

- Un script déterministe (ex. Node : `scripts/audit-traceability.js`) parcourt les répertoires sources (sprints US, `tests/bdd`, `app`, `utils`).
- Il **liste** tous les artefacts (US depuis `.cursor/sprints/.../US-*.md`, CA déduits du contenu des US, features et steps depuis `tests/bdd/*.feature` et `*.steps.ts`, TU/TI et code depuis les arborescences app/utils).
- Il **remplit les liens non ambigus** (US↔CA, Feature↔US, Feature↔Step, TU/TI↔code) avec la direction amont/aval.
- Il **extrait** les descriptions métier quand c’est possible (ex. titre des CA depuis **CA n – Titre** dans le fichier US).
- Il **calcule** l’indicateur orphelin pour chaque artefact (règle « coupe la chaîne » : spec sans aval → orphelin ; impl sans amont ou TU/TI sans aval → orphelin).
- Le résultat est **persisté** dans un fichier JSON (ex. `data/audit-traceability.json`) avec un schéma fixe : `generatedAt`, `artefacts`, `byType`.

**CA4 – Lancer un prompt IA pour trouver les liens entre artefacts**

- Un **prompt** (ex. commande `/audit-code` ou fichier `.cursor/commands/audit-code.md`) est exécuté après la génération du brouillon par le script.
- Le prompt demande au LLM / agent de : **lire** le JSON d’audit ; **enrichir** les liens de façon sémantique (commentaires code, nommage, comportement) en ajoutant des liens **amont** (code/TU/TI → US/CA) lorsque les preuves sont suffisantes ; **enrichir** les descriptions des CA encore génériques à partir des fichiers US ou des features ; **recalculer** l’indicateur orphelin après toute modification ; **écrire** le résultat dans le même fichier sans modifier le schéma.
- Les consignes du prompt imposent d’être **conservateur** : ne pas inventer de lien sans indice (fichier, commentaire, nom) ; en cas de doute, laisser l’artefact tel quel.
- Optionnel : un **script d’enrichissement** (ex. `scripts/audit-traceability-enrich.js`) peut appliquer une table figée de liens sémantiques (code/TU/TI → US) issus d’une revue manuelle ou d’une sortie précédente du LLM, puis recalculer les orphelins.

**CA5 – Consultation et exploitation**

- Une **page web** (ex. `GET /audit`) affiche les artefacts par type (onglets), avec pour chaque artefact : ID, Nom, Description, **Associés en amont**, **Associés en aval**, Orphelin (oui/non).
- Des **filtres** permettent d’afficher tous les artefacts, uniquement les orphelins, ou uniquement les non orphelins.
- Les taux (ex. % de CA avec au moins un lien vers une feature ou du code) se **calculent en exploitation** à partir des champs amont/aval et orphelin, sans modifier le schéma de persistance.

**CA6 – Chaque artefact associé à son fichier (nom et chemin)**

- Un projet n’est qu’un assemblage de fichiers texte ; tout artefact provient d’au moins un fichier (ou en est déduit à partir d’un fichier).
- Chaque artefact est **associé à son fichier** : **nom** et **chemin** (relatif à la racine du projet) sont persistés (ex. champs `filePath` et/ou `fileName` dans le schéma, ou structure dédiée).
- Exemples : une US → chemin du fichier `.cursor/sprints/.../US-1.01 - Titre.md` ; un CA → même fichier US que la US parente ; une feature → `tests/bdd/tableau-synthese-offres.feature` ; un fichier code → `app/server.ts`, `utils/prompt-ia.ts`.
- Cela permet d’afficher et de filtrer par fichier, et de croiser avec la liste des fichiers du projet pour identifier les **fichiers sans aucun artefact**.

**CA7 – Scanner tous les fichiers du projet et configurer les ignore (orphelins de fichiers)**

- Le script (ou un module dédié) **scanne tous les fichiers du projet** (ou les répertoires configurés) pour établir la liste des fichiers présents sur le disque.
- Les artefacts déjà listés sont associés à leurs fichiers (CA6). On en déduit la liste des **fichiers qui ne contiennent aucun artefact** : scripts, MD, config, etc. qui « traînent » et pourraient être supprimés ou déplacés (**orphelins d’artefacts** = fichiers sans artefact).
- Une **configuration d’ignore** permet d’exclure du scan (et/ou de l’affichage des orphelins) certains chemins : par exemple les dossiers dont le nom commence par `.` (ex. `.data`, `.cursor`, `.git`), `node_modules`, `dist`, ou tout motif configurable (ex. liste de répertoires ou patterns à ignorer).
- Les ignore sont **configurables** (fichier de config, ex. dans le script ou `data/audit-ignore.json` / section du projet) pour ne pas explorer les dossiers exclus (performance et pertinence). La liste des fichiers orphelins (sans artefact) est produite en tenant compte de ces ignore.

---

**Note** : orphelin = artefact qui coupe la chaîne (pas de chemin continu spec ↔ code qui passe par lui). **Orphelin de fichier** = fichier du projet qui n’est associé à aucun artefact de l’audit. Définition détaillée des artefacts dans `types/audit-traceability.ts` et dans la commande `/audit-code`.
