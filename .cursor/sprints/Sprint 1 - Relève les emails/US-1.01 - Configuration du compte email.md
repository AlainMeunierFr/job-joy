#### US-1.1 : Configuration du compte email

**Périmètre** : Connexion au compte par **IMAP** (identifiant + mot de passe ou mot de passe d'application). Pas d'OAuth ni d'API Microsoft ; pas de dépendance à un admin ou à une certification d'application.

- **En tant que** utilisateur
- **Je souhaite** configurer mon compte mail (identifiant et mot de passe) et le dossier de travail
- **Afin de** que l'application puisse compter les emails à analyser

---

**Critères d'acceptation**

**CA1 – Page de paramétrage**
- La page comporte un champ de saisie pour l'adresse email.
- La page comporte un champ mot de passe masqué (saisie invisible), avec une **icône œil** permettant d'afficher temporairement le mot de passe en clair : **une seule icône visible à la fois** ; un clic sur l'icône affiche ou masque le mot de passe.
- La page comporte une zone de saisie pour le **dossier dans la boîte mail** (chemin relatif à la BAL, ex. `INBOX/Offres` ou `Dossier/Alertes`). Aucun chemin de fichier local.
- La page comporte les boutons **Tester connexion** (à gauche), **Annuler** et **Enregistrer** (à droite).
- **Au chargement** : les paramètres déjà sauvegardés (adresse email, chemin du dossier) sont **rechargés et affichés** dans les champs ; le **mot de passe n'est jamais rechargé ni affiché**.

**CA2 – Bouton Tester connexion**
- Un bouton « Tester connexion » permet de tester la connexion au compte avec les identifiants et le dossier saisis.
- Le résultat du test est présenté de façon lisible (ex. colonnes ou libellés : adresse email | Mot de passe [masqué] | Dossier | Type de message | Message).
- Les cas suivants sont couverts (tableau de cas) :

  | adresse email | Mot de passe | Dossier | Résultat attendu |
  |---------------|--------------|---------|------------------|
  | vide | (quelconque) | (quelconque) | Message d'erreur « le champ 'adresse email' est requis » |
  | (quelconque) | vide | (quelconque) | Message d'erreur « le champ 'mot de passe' est requis » |
  | invalide / mauvais login | valide | valide | Message d'erreur « erreur sur 'adresse email' ou le 'mot de passe' » |
  | valide | invalide / mauvais mot de passe | valide | Message d'erreur « erreur sur 'adresse email' ou le 'mot de passe' » |
  | invalide | invalide | valide | Message d'erreur « erreur sur 'adresse email' ou le 'mot de passe' » |
  | valide | valide | vide | Message d'erreur explicite « préciser le chemin vers le dossier à analyser » |
  | valide | valide | invalide | Message d'erreur explicite « le chemin vers le dossier à analyser n'existe pas » |
  | alain@maep.fr | MonMotDePasse | valide | « paramétrages corrects » |

**CA3 – Mémorisation**
- Les paramètres (adresse email, dossier de travail, mot de passe traité) sont enregistrés dans le fichier `.\data\compte.json`.
- Le mot de passe n'est pas stocké en clair : il est haché avec une méthode reconnue et non obsolète (ex. PBKDF2-SHA256 avec salage ; pas de MD5 seul).
- **Après enregistrement** : la page affiche ou recharge les paramètres enregistrés (adresse, dossier) ; le mot de passe n'est pas affiché.
- **Bouton Annuler** : remet les champs aux dernières valeurs sauvegardées (adresse et dossier rechargés depuis l'application ; mot de passe vidé), sans enregistrer.
