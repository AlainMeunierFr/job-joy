# US-7.5 - Liste html  dossiers et entrées systématiques par source

- **En tant que** utilisateur,
- **Je souhaite** que le système crée **tous** les sous-dossiers « liste html » (un par source de la liste canonique) et qu’une entrée « liste html » existe pour chaque source dans les données,
- **Afin de** pouvoir déposer des fichiers dans le bon dossier pour n’importe quelle source, même si l’import n’est pas encore implémenté (affichage « non implémenté » en phase création liste html).

---

## Contexte

Aujourd’hui, les dossiers liste html peuvent être créés à la demande ou par audit à partir de dossiers existants. La cible : à partir de la **liste canonique des sources**, créer systématiquement le sous-dossier `liste html/<nom source>` (ou forme fichier 1:1) et s’assurer qu’en données chaque source a bien une entrée pour la partie « liste html » (phase1ListeHtml), même si le code d’import n’est pas implémenté pour cette source.

---

## Critères d’acceptation

### CA1 – Création des sous-dossiers

- A l’initialisation, le système crée tous les sous-dossiers nécessaires sous `.\data\liste html\`. Il y a **un sous-dossier par source** de la liste canonique (Linkedin, HelloWork, Welcome to the Jungle, Job That Make Sense, Cadre Emploi, APEC, Externatic, Talent.io).
- Le nom du dossier est le nom canonique de la source ou une forme fichier unique dérivée (1:1) du nom canonique (ex. espaces → tirets, casse cohérente). La règle est en code (fonction ou constante), pas seulement en commentaire.

### CA2 – Entrées « liste html » en données

- Pour chaque source de la liste canonique, les données (`sources.json`) contiennent une entrée cohérente pour la phase creation liste html : au minimum phase1ListeHtml.activé (valeur par défaut si besoin). Aucune source canonique ne manque pour la partie « liste html ».
- L’emplacement du dossier n’est pas stocké en JSON ; il est dérivé en code à partir du nom de source (voir US-7.3).

### CA3 – Tableau de bord et traitement

- Dans le tableau de bord, chaque source affiche une ligne avec la colonne « Création par liste html ». Si l’import liste html n’est pas implémenté pour cette source dans le code, l’icône affichée est **croix rouge** (non implémenté) ; sinon, comportement habituel (😴 / 🏃 / ✅ selon activation et état).
- Le traitement « creation liste html » ne traite que les sources pour lesquelles l’import est implémenté et activé ; les autres sont ignorées sans erreur.

### CA4 – Pas d’écrasement

- La création des sous-dossiers et des entrées ne supprime ni ne modifie les données utilisateur existantes (fichiers déjà présents dans un dossier, activations déjà modifiées). Comportement idempotent : ré-exécuter ne crée pas de doublons.
- Les fichiers traités sont déplacés dans un sous dossier `liste html/<nom source>/traité` (qui est créé automatiquement s'il n'existe pas)

---

## Notes techniques

- Utiliser la même liste canonique que pour le reste (US-6.6, 6.7). Une fonction `getListeDossiersListeHtml()` ou équivalent retourne la liste des noms de dossiers à créer à partir de cette liste.
- Si une source est « Inconnu », décider si on crée ou non un dossier (ex. oui pour cohérence, ou non si Inconnu n’est pas une plateforme réelle).