# Renommage du projet en « Job-Joy »

Ce document décrit tout ce qui est fait dans le code (par l’agent) et ce que tu dois faire toi-même (avec guide pas à pas).

---

## Ce qui a été fait dans le code (par l’agent)

- **package.json** : `name` → `job-joy`, `productName` → `Job-Joy`, `appId` → `fr.jobjoy.app`
- **Variable d’environnement** : `ANALYSE_OFFRES_USER_DATA` → `JOB_JOY_USER_DATA` (app/server.ts, electron/main.cjs, tests). Un commentaire dans `tests/bdd/publication-application-electron.steps.ts` (l.378) peut afficher « pas d'JOB_JOY_USER_DATA » : tu peux le corriger en « pas de JOB_JOY_USER_DATA » à la main si tu veux.
- **Dossier utilisateur (docs/comments)** : `analyse-offres` → `job-joy` (ex. %APPDATA%/job-joy)
- **Préfixe titre des pages** : titre du layout = « Job-Joy - … » (ex. « Job-Joy - Tableau de bord »)
- **Tests / BDD** : préfixes temporaires et regex mis à jour (job-joy-bdd-, job-joy-data-dir-, job-joy dans DATA_DIR)
- **electron/README.md** et **US-3.6** : exemples de chemins mis à jour

---

## Ce que tu dois faire toi-même (guide pas à pas)

### 1. Commit des changements du renommage

1. Dans Cursor (ou en terminal) : ouvre le panneau **Source Control** (icône branche).
2. Vérifie que les fichiers modifiés sont bien ceux du renommage (package.json, app/server.ts, electron/main.cjs, tests, docs, etc.).
3. Message de commit suggéré : `chore: renommage projet Job-Joy (package, appId, JOB_JOY_USER_DATA, titres)`.
4. Fais **Commit** (bouton ou Ctrl+Enter).

### 2. Quitter Cursor et renommer le dossier du projet

1. **Ferme Cursor** complètement (File → Exit ou fermeture de la fenêtre).
2. Dans l’**Explorateur Windows** (ou ton gestionnaire de fichiers), va au **dossier parent** de ton projet (ex. `C:\dev\`).
3. **Renomme** le dossier `analyse-offres` en `job-joy` (clic droit → Renommer).
4. **Rouvre Cursor** : File → Open Folder → sélectionne `C:\dev\job-joy` (ou le chemin que tu as).

### 3. Vérifier Git après le renommage du dossier

1. Ouvre un **terminal** dans Cursor (Ctrl+ù ou Terminal → New Terminal).
2. Lance : `git status`
3. Tu ne dois **pas** voir des centaines de fichiers “supprimés” ou “renommés” : Git suit le contenu, pas le nom du dossier. Si tout est normal, `git status` doit être propre (ou afficher seulement des changements non commités s’il en reste).
4. Si tu as des doutes : `git diff` pour voir les différences. Le remote (GitHub) pointe toujours vers le même dépôt ; le nom du dossier en local n’a pas d’impact sur le dépôt distant.

### 4. Renommer le dépôt sur GitHub

1. Va sur **GitHub.com**, ouvre ton dépôt (ex. `analyse-offres`).
2. Onglet **Settings** (Paramètres) du dépôt.
3. Dans **General**, tout en bas : section **Danger Zone** (Zone de danger).
4. Clique sur **Change repository name** (Changer le nom du dépôt).
5. Saisis le nouveau nom : **job-joy** (ou `Job-Joy` si tu préfères ; GitHub accepte les deux, l’URL sera en minuscules).
6. Confirme en cliquant sur le bouton de validation (et éventuellement en retapant le nom si demandé).
7. GitHub affiche une note : les anciennes URLs (clone, web) redirigeront vers le nouveau nom. C’est normal.

### 5. Resynchroniser le projet avec GitHub (remote)

1. En **local**, le remote `origin` pointe encore vers l’**ancienne URL** (ex. `https://github.com/TON_USER/analyse-offres.git`).
2. Dans le terminal du projet :
   - Vérifier l’URL actuelle :  
     `git remote -v`
   - Mettre à jour l’URL pour le nouveau nom de dépôt :  
     `git remote set-url origin https://github.com/TON_USER/job-joy.git`  
     (remplace **TON_USER** par ton identifiant GitHub et `job-joy` par le nom exact choisi sur GitHub.)
3. Tester la connexion :  
   `git fetch origin`  
   Si tout est OK, pas d’erreur.
4. Pousser les commits déjà faits (si tu ne l’as pas fait avant le renommage) :  
   `git push -u origin main`  
   (ou `master` si ta branche par défaut s’appelle `master`).

### 6. Page de téléchargement (docs/telecharger.html) si tu l’utilises

1. Ouvre le fichier **docs/telecharger.html** (s’il existe).
2. Remplace la variable **GITHUB_REPO** par ton dépôt :  
   `var GITHUB_REPO = 'TON_USER/job-joy';`  
   (avec ton identifiant GitHub et le nom exact du dépôt.)
3. Si tu actives **GitHub Pages** pour la page de téléchargement :  
   - Settings → Pages → Source : **Deploy from a branch**  
   - Branch : **main** (ou master), dossier **/docs**  
   - L’URL sera du type : `https://TON_USER.github.io/job-joy/telecharger.html`

### 7. Optionnel : autres endroits à vérifier

- **README.md** à la racine : si le nom du projet ou des liens vers le dépôt y figurent, mets à jour en **Job-Joy** et `job-joy`.
- **Scripts avec chemins en dur** : si tu as des scripts (ex. POC) qui contiennent `C:\dev\analyse-offres\...`, mets-les à jour en `C:\dev\job-joy\...` (ou utilise un chemin relatif / variable).
- **Favoris / raccourcis** : mets à jour les favoris navigateur ou raccourcis qui pointent vers l’ancien nom de dépôt ou l’ancien dossier.

---

## Résumé rapide

| Étape | Qui | Action |
|-------|-----|--------|
| Modifs code (package, appId, env, titres, tests) | Agent | Déjà fait |
| Commit | Toi | Commit des changements avec le message suggéré |
| Renommer le dossier local | Toi | Fermer Cursor → renommer `analyse-offres` en `job-joy` → rouvrir le dossier |
| Renommer le dépôt GitHub | Toi | Settings → Change repository name → `job-joy` |
| Mettre à jour le remote | Toi | `git remote set-url origin https://.../job-joy.git` puis `git fetch` / `git push` |
| docs/telecharger.html | Toi | Remplacer `GITHUB_REPO` par `TON_USER/job-joy` |
| GitHub Pages (optionnel) | Toi | Activer Pages depuis la branche main, dossier /docs |

Si une étape bloque (erreur Git, message GitHub, etc.), décris ce que tu vois et on ajuste.
