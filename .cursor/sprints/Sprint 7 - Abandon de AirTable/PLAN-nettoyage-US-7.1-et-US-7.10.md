# Plan de nettoyage US-7.1 (plugin → source) et US-7.10 (Airtable hors reprise)

**Objectif** : plus aucune mention « plugin » ou « Airtable » dans l’IHM, le code lisible (noms, commentaires) et les feuilles de style, sauf ce qui est strictement nécessaire pour la reprise de données (fichier JSON + script de reprise).

---

## Partie 1 — US-7.1 : plugin → source (à corriger)

### 1.1 À nettoyer — App

| Fichier | Action |
|--------|--------|
| `app/page-html.ts` | Remplacer `getListePluginsPourAvantPropos` → `getListeSourcesPourAvantPropos`, `listePlugins` → `listeSources`, `tablePluginsHtml` → `tableSourcesHtml`, classe `introParametrageListePlugins` → `introParametrageListeSources`, commentaire HTML `INJECT_LISTE_PLUGIN` → `INJECT_LISTE_SOURCES`. |
| `app/server.ts` | Supprimer `plugin?: string` du type de réponse ; n’exposer que `source`. Supprimer `(s.source ?? s.plugin)` → utiliser uniquement `s.source`. |
| `app/api-handlers.ts` | Renommer import / usage : `createSourcePluginsRegistry` → `createSourceRegistry` (et adapter dans `utils/source-plugins.ts`). |
| `app/content-styles.css` | Commentaire « Capsule plugin (style type Airtable) » → « Capsule source » (ou équivalent). `.introParametrageListePlugins` → `.introParametrageListeSources` (partout). |

### 1.2 À nettoyer — Utils (code + commentaires, esprit DDD)

| Fichier | Action |
|--------|--------|
| `utils/source-plugins.ts` | `getListePluginsPourAvantPropos` → `getListeSourcesPourAvantPropos`. `LigneListePlugin` → `LigneListeSource`. `createSourcePluginsRegistry` → `createSourceRegistry`. `SourcePluginsRegistry` → `SourceRegistry`. Interfaces `SourceEmailPlugin` / `SourceListeHtmlPlugin` / `SourceOfferFetchPlugin` → noms sans « Plugin » (ex. `SourceEmail`, `SourceListeHtml`, `SourceOfferFetch`). Variables `*Plugin` → `*Source` (ex. `linkedinEmailPlugin` → `linkedinEmailSource`). Commentaires : remplacer « plugin » par « source » quand il s’agit du concept métier. |
| `utils/source-plugins.test.ts` | Titre / descriptions : « source plugins registry » → « source registry » ; noms de tests sans « plugin » (concept métier). |
| `utils/sources-io.ts` | `getListePluginsPourAvantPropos` → `getListeSourcesPourAvantPropos`. Commentaire « getListePluginsPourAvantPropos » → « getListeSourcesPourAvantPropos ». |
| `utils/index.ts` | `getListeHtmlPluginDir` : si exporté, renommer en `getListeHtmlSourceDir` ou garder alias documenté « source ». |
| `utils/liste-html-paths.ts` | Commentaires « plugin » → « source ». `getListeHtmlPluginDir` → alias vers `getListeHtmlSourceDir` (déjà existant) ou suppression de l’alias. `listerDossiersPluginListeHtml` → `listerDossiersSourceListeHtml`. Paramètre `pluginSlug` → `sourceSlug` (ou garder slug si considéré technique). |
| `utils/liste-html-paths.test.ts` | `listerDossiersPluginListeHtml` → `listerDossiersSourceListeHtml`. Noms de tests et commentaires : « plugin » → « source ». |
| `utils/apec-liste-html-parser.ts` | Commentaires « dossier plugin » → « dossier source ». Paramètres `pluginSlug` / `pluginDir` → `sourceSlug` / `sourceDir`. |
| `utils/liste-html-traite.ts` | Commentaires « pluginDir » → « sourceDir » (ou « dossier source »). Paramètre `pluginDir` → `sourceDir`. |
| `utils/liste-html-traite.test.ts` | Variable `pluginDir` → `sourceDir`. |
| `utils/lire-fichiers-html-en-attente.ts` | Paramètre `pluginDir` → `sourceDir`. |
| `utils/airtable-ensure-enums.ts` | Commentaires « Sources.plugin » / « ensurePluginChoice » → « source » / libellé équivalent. |
| `utils/airtable-enrichissement-driver.ts` | `fields.plugin` → `fields.source` (et commentaire associé). |
| `utils/airtable-enrichissement-driver.test.ts` | Données de test `plugin: '...'` → `source: '...'`. |
| `utils/run-traitement.integration.test.ts` | Données `plugin: '...'` → `source: '...'`. |
| `utils/gouvernance-sources-emails.test.ts` | Libellés de tests « plugin » → « source » (ex. « plugin=Inconnu » → « source=Inconnu »). |
| `utils/tableau-synthese-offres.test.ts` | « plugin étape 1/2 » → « source étape 1/2 ». |
| `utils/fetcher-contenu-offre.test.ts` | « pas de plugin » → « pas de source » ; « délègue au plugin X » → « délègue à la source X ». |
| `utils/default-activation-source.test.ts` | `createSourcePluginsRegistry` → `createSourceRegistry`. |
| Fichiers `*-offer-fetch-plugin.ts` (.test) | Commentaires « Plugin » (concept métier) → « Source ». Les noms de fichiers peuvent rester si on considère « plugin » au sens extension technique ; sinon renommer en `*-offer-fetch-source.ts`. Idem pour le type `SourceOfferFetchPlugin` une fois renommé dans `source-plugins.ts`. |

### 1.3 Non-nettoyage explicite (US-7.1)

- **Fichiers** `*-offer-fetch-plugin.ts` : conserver le nom de fichier si le projet considère « plugin » au sens **extension technique** (composant réutilisable). Seuls le code interne et les commentaires doivent utiliser « source » pour le concept métier.
- **Répertoire / chemins** : pas de renommage des dossiers physiques « liste html » déjà en place.

---

## Partie 2 — US-7.10 : Airtable (supprimer IHM et mentions, garder reprise)

### 2.1 À nettoyer — IHM et styles

| Fichier | Action |
|--------|--------|
| `app/page-html.ts` | Supprimer tout le bloc Paramètres « API AirTable » : le `<details>` avec titre « API AirTable », champs « URL de la base Airtable » et « API Key Airtable », bouton « Lancer la configuration », zone tutoriel Airtable, statut « AirTable prêt ». Supprimer les variables et conditions qui ne servent qu’à ce bloc (`airtable`, `hasApiKey`, `airtableBase`, `airtableTables`, `tablesAirtableCreees`, `statutAirtableInitial`, `airtableIncomplet`, `airtableOuvert`, `tutorielAirtableHtml` pour ce bloc). Ne plus ouvrir / afficher ce bloc. Adapter la logique d’ouverture des blocs (intro, etc.) pour ne plus dépendre de « airtable incomplet ». Supprimer les liens « Voir le changelog » / « formulaire de ticket » vers airtable.com si considérés comme liés à la config Airtable (sinon à traiter à part). |
| `app/page-html.ts` | Conserver les appels à `lireAirTable(dataDir)` **uniquement** si encore utilisés pour une logique non-UI (ex. offre test, tableau synthèse). Sinon les retirer de la page (voir 2.2). |
| `app/content-styles.css` | Supprimer ou renommer les sélecteurs et commentaires liés à la configuration Airtable : `.blocParametrage-airtable`, `.configurationAirtable`, `.zoneTutorielAirtable`, `.actions-configuration-airtable`, `.statutConfigurationAirtable`, commentaires « Configuration Airtable », « Airtable ». Supprimer ou adapter `.boutonOuvrirAirtable` (tableau de bord). Supprimer commentaire « colonne Date… Claude/Airtable ». `.pageAPropos .airtable-embed` si plus utilisé. Commentaire « deux blocs h2 (connexion, Airtable) » → « (connexion) ». |
| `app/layout-html.ts` | Supprimer le bouton « Ouvrir Airtable » du tableau de bord et toute variable / option associée (`airtableBaseUrl`, `boutonOuvrirAirtableDisabled`, `data-airtable-url`). Supprimer la colonne « Airtable » du tableau de synthèse si elle affiche un lien ou statut Airtable. Dans le script inline (graphiques, consommation API) : supprimer ou renommer les références « Airtable » (légende, colonne, couleurs) si ce sont des libellés utilisateur. |
| `app/server.ts` | Supprimer la route `GET /api/airtable` et l’appel à `handleGetAirtable` si elles ne servent qu’à l’ancienne IHM Paramètres. Supprimer le traitement POST qui enregistre depuis le formulaire Airtable (champs `airtableBase`, `airtableApiKey`) : ne plus appeler `ecrireAirTable` depuis la soumission du formulaire Paramètres (donc supprimer ce flux). Conserver `ecrireAirTable` / `lireAirTable` pour le script de reprise et pour les routes de test (ex. `set-airtable`) si utiles aux tests. Ne plus exposer d’endpoint « configuration Airtable » depuis l’IHM. |

### 2.2 À nettoyer — Code et commentaires (hors reprise)

| Fichier | Action |
|--------|--------|
| `app/api-handlers.ts` | Supprimer ou ne plus appeler depuis l’app : `handleGetAirtable`, `handlePostConfigurationAirtable`, et les handlers qui ne servent qu’à l’IHM Airtable (offre test Airtable, meilleure offre Airtable, etc.) si la fonctionnalité est abandonnée. Sinon, garder uniquement les appels utilisés par le **script de reprise** ou par des scripts CLI (voir 2.3). Adapter les commentaires : plus de « Configuration Airtable (US-1.3) » pour l’IHM. |
| `app/layout-html.ts` | Commentaires : « statuts Airtable » → « statuts offres » ou équivalent si les statuts viennent maintenant de SQLite. |
| Autres `app/*.ts` | Toute référence à Airtable dans commentaires ou libellés : supprimer ou reformuler (ex. « offre Airtable » → « offre » ou « offre test » selon le contexte). |

### 2.3 Non-nettoyage explicite (US-7.10) — À conserver pour la reprise

- **`data/parametres.json`** : conserver la structure contenant **`airtable`** (`apiKey`, `base`, `offres`) pour que le script de reprise lise la config.
- **`utils/parametres-airtable.ts`** : conserver **intégralement** (`lireAirTable`, `ecrireAirTable`) pour lecture/écriture de cette section (reprise + éventuellement édition manuelle du fichier ou outil CLI).
- **`scripts/import-offres-airtable-vers-sqlite.ts`** : conserver tel quel (il utilise `lireAirTable`, `parametres-airtable`, `reprise-offres-airtable-vers-sqlite`, etc.).
- **`utils/reprise-offres-airtable-vers-sqlite.ts`** (+ test) : conserver.
- **`utils/airtable-url.ts`** (ex. `normaliserBaseId`) : conserver si utilisé par le script de reprise.
- **`utils/airtable-driver-reel.ts`** (et dépendances utilisées uniquement par la reprise ou par d’autres scripts CLI Airtable) : conserver pour la reprise.
- **Routes ou handlers** utilisés **uniquement** par des scripts ou par des tests de reprise (ex. `POST /api/test/set-airtable` pour les tests BDD) : conserver.
- **Commentaires** dans ces fichiers : peuvent garder le mot « Airtable » pour expliquer la reprise (ex. « Script reprise Airtable → SQLite »).

---

## Ordre d’exécution recommandé

1. **US-7.1**  
   - Renommer dans `utils/source-plugins.ts` et `utils/sources-io.ts` (export `getListeSourcesPourAvantPropos`, types, registry).  
   - Puis app (page-html, server, api-handlers), puis CSS, puis tous les autres utils et tests.

2. **US-7.10**  
   - Supprimer le bloc IHM Airtable dans `app/page-html.ts` et la logique d’ouverture associée.  
   - Supprimer les routes et handlers IHM Airtable dans `app/server.ts` et `app/api-handlers.ts`.  
   - Nettoyer `app/layout-html.ts` (bouton Ouvrir Airtable, colonne/libellés Airtable).  
   - Nettoyer `app/content-styles.css`.  
   - Vérifier que le script `import-offres-airtable-vers-sqlite` et `parametres-airtable` restent inchangés et fonctionnels.

---

## Vérifications finales

- Aucun libellé visible « plugin » ou « Airtable » dans les écrans Paramètres / Tableau de bord (sauf si un lien externe type changelog reste volontairement).
- Aucune classe CSS ou commentaire de style contenant « plugin » ou « Airtable » hors cas reprise.
- `npm run import:offres-airtable-vers-sqlite -- --dry-run` fonctionne avec une section `airtable` remplie dans `parametres.json`.
- Les tests unitaires et d’intégration concernés sont adaptés et passent (remplacements `plugin` → `source`, suppression des tests d’IHM Airtable si besoin).
