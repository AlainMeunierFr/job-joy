# US-3.8 — Package Electron : variables d'environnement et premier lancement

## Contexte

En mode **développement**, le serveur charge les variables d'environnement depuis un fichier **`.env.local`** à la racine du projet (via `utils/load-env-local.ts`). En mode **packagé Electron**, le serveur est lancé avec `cwd` = dossier d'installation de l'app : il n'y a pas de `.env.local` à cet endroit, et on ne doit pas déployer de clé commune chez tous les utilisateurs.

Deux besoins métier pour les variables d'environnement :

1. **Chiffrement** : `PARAMETRES_ENCRYPTION_KEY` — obligatoire pour chiffrer/déchiffrer les clés API (Airtable, etc.) et le mot de passe IMAP dans `parametres.json`. Sans elle, l'app lève une erreur au premier enregistrement de paramètres.
2. **Azure** (optionnel) : `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET` — uniquement pour la connexion « Microsoft » (OAuth) avec un compte Office 365 professionnel. Pour Hotmail/Outlook perso, l'utilisateur peut utiliser le mode IMAP.

---

## Solution mise en place

### 1. Fichier `.env.local` dans le dossier de données utilisateur

- En mode packagé, le serveur reçoit **`JOB_JOY_USER_DATA`** (défini par Electron = `app.getPath('userData')`).
- Le fichier d'environnement utilisé est **`<userData>/.env.local`** :
  - **Windows** : `%APPDATA%\job-joy\.env.local`
  - Même dossier que `parametres.json`, `data/`, etc.

Ainsi la clé de chiffrement et les variables optionnelles restent dans le dossier de données de l'utilisateur, pas dans le binaire.

### 2. Premier lancement : template + complétion de la clé

Au **premier lancement** (fichier `userData/.env.local` absent) :

1. L'app cherche le **template** `ressources/env.local.template` (dossier des ressources de l'app, packagé avec Electron).
2. Si le template existe : son contenu est **copié** vers `userData/.env.local`. Le template contient une documentation en **commentaires** au-dessus de chaque variable (comme dans un `.env` habituel).
3. La ligne **`PARAMETRES_ENCRYPTION_KEY=`** est **complétée** avec une clé générée (32 octets hex, `randomBytes(32).toString('hex')`).
4. Si le template est absent (ancien build) : fallback sur un fichier minimal contenant uniquement `PARAMETRES_ENCRYPTION_KEY=<clé générée>`.

Résultat : l'utilisateur obtient un fichier **par défaut** avec la doc en commentaires et la clé déjà renseignée ; il peut éditer ce fichier pour ajouter les variables Azure si besoin.

### 3. Chargement au démarrage

- **Avec `JOB_JOY_USER_DATA`** : chargement de `userData/.env.local` (création + complétion si absent, comme ci-dessus).
- **Sans** (dev) : chargement de `process.cwd()/.env.local` (racine du projet).

---

## Fichiers impliqués

| Fichier | Rôle |
|--------|------|
| **`utils/load-env-local.ts`** | Détecte le mode (userData vs cwd), crée `.env.local` à partir du template si absent, complète `PARAMETRES_ENCRYPTION_KEY`, charge le fichier avec `dotenv`. Exporte `chargerEnvLocal(customPath?)` pour recharger après édition. |
| **`ressources/env.local.template`** | Template avec en-tête explicatif, commentaires au-dessus de chaque variable, ligne `PARAMETRES_ENCRYPTION_KEY=` (complétée au premier lancement), section optionnelle Azure (lignes commentées). Inclus dans le build Electron. |
| **`.env.example`** (racine) | Liste des variables pour développeurs (obligatoires, optionnelles, dev/test) avec commentaires. À copier en `.env.local` en dev. Référence pour la doc. |
| **`electron/main.cjs`** | Passe au process serveur `env: { ...process.env, JOB_JOY_USER_DATA, PORT }` et `cwd: app.getAppPath()`. |

---

## Comportement pour l'utilisateur final

- **Aucune action requise** pour le chiffrement : au premier lancement, `.env.local` est créé dans son dossier de données avec une clé générée.
- **Optionnel** : s'il utilise la connexion « Microsoft » avec un compte professionnel, il peut éditer `%APPDATA%\job-joy\.env.local`, décommenter et remplir `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`, puis redémarrer l'app. La documentation dans le fichier (commentaires du template) explique chaque variable.

---

## Liste des variables (rappel)

### Utiles en release (packagé)

| Variable | Obligatoire | Rôle |
|----------|-------------|------|
| `PARAMETRES_ENCRYPTION_KEY` | Oui (auto au 1er lancement) | Chiffrement AES-256-GCM des clés API et mot de passe IMAP dans `parametres.json`. |
| `AZURE_CLIENT_ID` | Non | ID client de l'app Entra (connexion Microsoft compte pro). |
| `AZURE_TENANT_ID` | Non | ID de l'annuaire Entra. |
| `AZURE_CLIENT_SECRET` | Non | Secret client Azure. |

`JOB_JOY_USER_DATA` et `PORT` sont définis par Electron / le main process ; l'utilisateur ne les configure pas.

### Uniquement dev / tests

Voir `.env.example` à la racine : `PORT`, `BDD_MOCK_CONNECTEUR`, `BDD_IN_MEMORY_STORE`, `PLAYWRIGHT_BASE_URL`, `BDD_FEATURE`, `ELECTRON_APP_PORT`, `JOB_JOY_USER_DATA` (simulation), `AIRTABLE_*`, etc.

---

## Vérifications build Electron

- Le dossier **`ressources/`** (et donc **`ressources/env.local.template`**) doit être inclus dans l'application packagée pour que le premier lancement utilise le template avec la doc. Sinon, le fallback crée un fichier minimal (sans les commentaires Azure).
