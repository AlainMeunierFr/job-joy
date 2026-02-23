#### US-1.6 : Redirection vers les paramètres tant que la configuration n'est pas complète

- **En tant que** utilisateur qui n'a pas encore terminé les paramétrages
- **Je souhaite** être amené directement sur les paramètres et ne pas avoir accès au tableau de bord
- **Afin de** ne pas perdre mon temps sur un tableau de bord qui ne ferait que m'envoyer des messages d'erreur

---

- **Critères d'acceptation** :

- **CA1 - Menu Tableau de bord masqué et redirection vers Paramètres** :
  - Tant que la connexion (compte email) et Airtable ne sont pas configurés et opérationnels, le menu « Tableau de bord » n'apparaît pas dans la navigation.
  - L'utilisateur est redirigé automatiquement vers la page « Paramètres » (ou équivalent) dès qu'il accède à l'application.

- **CA2 - Enregistrement partiel et message d'erreur** :
  - L'utilisateur peut cliquer sur « Enregistrer » à tout moment pour conserver les paramétrages déjà saisis (enregistrement partiel).
  - Si les paramétrages ne sont pas complets au moment du clic sur « Enregistrer », un message d'erreur s'affiche et indique explicitement ce qu'il reste à terminer (ex. « Connexion email non configurée », « Airtable non connecté », etc.).
  - Les données déjà enregistrées sont bien persistées ; seul le message d'erreur informe l'utilisateur des étapes manquantes.

- **CA3 - Configuration complète : déblocage du Tableau de bord** :
  - Lorsque tous les paramétrages requis sont complets et que l'utilisateur clique sur « Enregistrer », la sauvegarde se fait sans message d'erreur.
  - Le menu « Tableau de bord » apparaît alors dans la navigation.
  - L'utilisateur est redirigé vers le tableau de bord (ou y est amené automatiquement après l'enregistrement).

---

**Note** : « Paramétrages complets » = connexion (compte email) OK + Airtable OK (configuré et opérationnel).

*Référence : Sprint 1 - Relève les emails ; objectif : éviter l'accès au tableau de bord tant que la configuration n'est pas valide.*
