#### US-3.14 : Gestion des erreurs réseau et service indisponible

- **En tant que** utilisateur ou mainteneur de l'application Job-Joy
- **Je souhaite** que les appels aux services externes (Airtable, IMAP, Microsoft Graph, Claude) gèrent les erreurs réseau et l'indisponibilité des services de façon prévisible
- **Afin de** voir un message clair en cas de problème (réseau ou service injoignable), éviter tout crash silencieux, et pouvoir réessayer ou diagnostiquer sans être confronté à des messages techniques bruts

---

- **Critères d'acceptation** :

- **CA1 – Message utilisateur clair (non technique)** :
  - En cas d'erreur réseau ou de service indisponible (ex. ECONNREFUSED, ETIMEDOUT, ENOTFOUND, « fetch failed », timeouts), le message présenté à l'utilisateur (ou retourné à l'appelant) est lisible et compréhensible, et non le message technique brut (ex. `e.message`).
  - Exemple de libellé attendu : « Réseau indisponible ou service injoignable. Vérifiez votre connexion Internet. » (ou équivalent explicite). Le libellé exact peut être défini en implémentation.
  - Testable : simuler une erreur réseau (ex. mock ECONNREFUSED / ETIMEDOUT) sur un des points d'appel → le message retourné ou affiché ne contient pas le détail technique brut et contient une formulation claire pour l'utilisateur.

- **CA2 – Pas de crash ni exception non gérée** :
  - Tous les appels aux services externes concernés (Airtable, IMAP, Microsoft Graph, Claude) retournent un résultat structuré en cas d'erreur (ex. `{ ok: false, message: "…" }` ou équivalent), sans laisser remonter d'exception non gérée.
  - Aucun crash silencieux : l'échec est toujours signalé par un retour explicite (ok: false + message) ou un affichage d'erreur côté UI.
  - Testable : provoquer une erreur réseau ou une indisponibilité sur chaque type de service (configuration Airtable, test IMAP, auth Microsoft, appel Claude) → l'app ou le script ne plante pas et reçoit un retour structuré indiquant l'échec.

- **CA3 – Mapping commun des erreurs réseau** :
  - Les erreurs réseau courantes (ECONNREFUSED, ETIMEDOUT, ENOTFOUND, « fetch failed », timeouts) sont mappées vers un message utilisateur commun (ou un petit ensemble de messages selon le contexte), afin d'éviter la duplication de logique dans chaque point d'appel.
  - Un helper commun (ex. `messageErreurReseau(err)` ou équivalent) peut être introduit pour centraliser ce mapping ; les points d'appel (configuration-airtable, connecteur-email-imap, connecteur-email-graph / auth-microsoft, appeler-claudecode) utilisent ce mapping ou ce helper pour produire le message utilisateur.
  - Testable : pour chaque type d'erreur réseau simulée, le message produit est cohérent (même libellé ou même famille de libellés) quel que soit le service appelé.

- **CA4 – Périmètre des services** :
  - Les services concernés sont : **Airtable** (configuration, relève, enrichissement), **IMAP** (test connexion, relève emails), **Microsoft Graph** (auth, lecture emails), **Claude** (analyse IA). Claude gère déjà retry et timeout ; les autres services appliquent les CA1 à CA3 (message clair, pas de crash, usage du mapping commun).
  - Chaque point d'appel concerné retourne en erreur un message dérivé du mapping commun (CA3) et un retour structuré (CA2).

- **CA5 – Retry optionnel** :
  - Là où c'est pertinent (ex. Airtable, IMAP), 1 à 2 tentatives supplémentaires peuvent être effectuées avant de retourner l'erreur à l'utilisateur ; Claude conserve son comportement actuel (retry + timeout).
  - Le comportement de retry (nombre de tentatives, délai éventuel) peut être fixe ou documenté ; une option configurable reste possible mais n'est pas imposée par cette US.
  - Testable : en cas d'échec temporaire simulé (ex. première requête en erreur, deuxième réussie), l'appel peut aboutir au succès après retry ; après épuisement des tentatives, l'erreur est retournée avec le message clair (CA1).
