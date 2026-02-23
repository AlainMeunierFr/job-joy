# Backlog — Plugin Cadre emploi (Cadremploi)

**Contexte** : les offres Cadre emploi donnent souvent un résumé IA du type « contenu = HTML et scripts de navigation, pas d’info poste/entreprise ». Après vérification manuelle : connexion requise, beaucoup de liens inutiles extraits, et page « Voir l’offre » non gérée.

---

## 1. Extraction : trop de liens considérés comme des offres

**Fichier** : `utils/extraction-offres-email.ts` → `extractCadreemploiOffresFromHtml`.

**Problème** : tout lien dont l’URL contient `cadremploi.fr` ou `emails.alertes.cadremploi.fr` est pris, sauf si le **texte du lien** est exactement « Voir l’offre », « Voir toutes les offres », « Cadremploi », etc. Donc des liens navigation, footer, « Mon compte », résultats de recherche, etc. sont traités comme des offres → « une annonce sur 2 m’amène sur une page pas intéressante ».

**Piste** : ne garder que les liens qui mènent à une **vraie page d’offre** :
- URL décodée (ou href) contient `detail_offre` et `offreId=` (ex. `detail_offre?offreId=123456`).
- Si l’URL de tracking n’est **pas** décodable (fallback avec `finalUrl = hrefRaw`), ne pas créer d’offre (ou la marquer non exploitable), car ouvrir le lien de tracking donne une page générique, pas l’offre.

**Actions** :
- [ ] Filtrer en sortie : n’ajouter une offre que si `finalUrl` ressemble à une offre (ex. `/emploi\/detail_offre[\s\S]*offreId=\d+/i` ou équivalent).
- [ ] Quand `decodeCadreemploiTrackingUrl(hrefRaw)` retourne `undefined`, ne pas créer d’entrée avec `url: hrefRaw` ; soit ignorer le lien, soit créer une entrée avec un flag « URL non décodable » (selon product owner).

---

## 2. Page réelle : clic « Voir l’offre »

**Fichier** : `utils/cadreemploi-page-fetcher.ts` → `fetchCadreEmploiPage`.

**Problème** : on fait uniquement `page.goto(url)` + `waitForTimeout(2000)` + `page.content()`. Sur Cadremploi, l’URL peut ouvrir une **page intermédiaire** avec un bouton « Voir l’offre » ; sans clic, on ne récupère que le shell (HTML + nav), pas le contenu de l’offre.

**Actions** :
- [ ] Après chargement, détecter la présence d’un bouton/lien « Voir l’offre » (texte ou aria).
- [ ] Si présent : cliquer, attendre navigation / apparition du contenu (sélecteur ou texte typique de la page d’offre), puis récupérer `page.content()`.
- [ ] Gérer le cas « pas de bouton » (page déjà = page d’offre) sans casser le flux.

---

## 3. Connexion / session

**Problème** : sans être connecté, Cadremploi renvoie une page de connexion ou du contenu limité. En headless sans cookies de session, on obtient donc du HTML inexploitable.

**Options** (hors scope immédiat, à trancher) :
- Documenter que la récupération Cadremploi nécessite une session (ex. export de cookies après connexion manuelle, ou flux auth dédié).
- Ou accepter que les offres Cadre emploi ne soient pas enrichies automatiquement sans auth (statut « À récupérer » sans contenu).

**Actions** :
- [ ] Décision produit : auth/session pour Cadremploi ou non.
- [ ] Si oui : définir un flux (fichier cookies, profil Playwright, etc.) et l’intégrer dans `cadreemploi-page-fetcher.ts`.

---

## 4. Parsing du HTML récupéré

**Fichier** : `utils/cadreemploi-offer-fetch-plugin.ts` → `parseHtmlToChamps`.

**État** : le parsing cherche h1, meta og:title, blocs « Quelles sont les missions », etc. Si la page reçue est la bonne (après clic « Voir l’offre » + session si besoin), ce parsing peut suffire. À revalider une fois les points 1 et 2 en place.

**Actions** :
- [ ] Après correction extraction + fetcher, tester sur quelques vrais emails et ajuster sélecteurs / regex si besoin.

---

## Priorisation proposée

1. **Court terme** : extraction stricte (seules les URLs « détail offre » ou décodées vers détail offre ; pas d’offre avec URL de tracking non décodable).
2. **Ensuite** : clic « Voir l’offre » dans le page-fetcher.
3. **Puis** : décision et implémentation session/auth si nécessaire.
