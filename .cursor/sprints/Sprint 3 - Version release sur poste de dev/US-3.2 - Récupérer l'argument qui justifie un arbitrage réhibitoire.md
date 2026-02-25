#### US-3.2 : Récupérer l'argument qui justifie un arbitrage réhibitoire

- **En tant qu'** utilisateur (candidat ou recruteur)
- **Je souhaite** récupérer l'argument qui justifie chaque arbitrage réhibitoire (true/false) sur une offre
- **Afin de** comprendre pourquoi un critère a été jugé rédhibitoire ou non et d'ajuster mon profil ou ma lecture des offres

---

**Contexte**

L'analyse IA produit aujourd'hui des booléens pour les critères rédhibitoires (Réhibitoire1, Réhibitoire2, etc.). Pour un arbitrage (true = rédhibitoire, false = non), l'utilisateur a besoin de la **justification** (argument court) renvoyée par l'IA, pas seulement du résultat.

---

**Critères d'acceptation**

- **CA1 – Réponse IA (format JSON)** :
  - Pour chaque critère rédhibitoire configuré (1 à 4), l'IA renvoie en plus du booléen RéhibitoireN un champ **JustificationRéhibitoireN** (N = 1 à 4).
  - JustificationRéhibitoireN est une chaîne de caractères (texte brut, une phrase courte) expliquant pourquoi le critère a été jugé rédhibitoire (true) ou non (false).
  - Seuls les JustificationRéhibitoireN correspondant aux réhibitoires effectivement configurés dans le paramétrage IA sont demandés dans le prompt et attendus dans la réponse (aligné sur le nombre de Réhibitoire1..4 déjà demandés).

- **CA2 – Schéma Airtable (table Offres)** :
  - La création d'une base Airtable vierge crée, pour chaque réhibitoire (1 à 4), un champ **JustificationRéhibitoireN** (JustificationRéhibitoire1 à JustificationRéhibitoire4) de type texte sur une seule ligne (ou texte long si contrainte métier), en plus des champs CritèreRéhibitoire1..4 existants.
  - Les drivers et le code qui lisent/écrivent les offres après analyse IA gèrent ces champs (lecture, écriture, types).

- **CA3 – Parsing, validation et persistance** :
  - Le parseur de la réponse IA (ex. parse-json-reponse-ia) accepte et valide les champs JustificationRéhibitoire1..4 (chaîne de caractères ; longueur maximale à définir, ex. 500 caractères) pour les réhibitoires configurés ; les erreurs de type ou de format sont signalées comme pour les autres champs.
  - Le script ou worker d'analyse IA (ex. run-analyse-ia-background) écrit, pour chaque offre analysée, les valeurs JustificationRéhibitoire1..4 renvoyées par l'IA dans les champs Airtable correspondants (en plus des booléens CritèreRéhibitoire1..4).

- **CA4 – Exposition API** :
  - Les endpoints ou services qui exposent les données d'une offre (ex. GET offre par id, liste d'offres, synthèse) incluent les champs justification des réhibitoires (JustificationRéhibitoire1..4 ou nommage aligné avec l'API) lorsque les données d'analyse IA sont retournées, afin que tout client (dont l'UI) puisse les afficher.

- **CA5 – Interface utilisateur** :
  - Là où l'utilisateur consulte le résultat des critères rédhibitoires (true/false) pour une offre, l'argument (justification) associé à chaque critère est affiché à côté ou sous le booléen (ex. sous chaque CritèreRéhibitoireN, affichage de JustificationRéhibitoireN).
  - L'affichage est lisible (texte court, pas de HTML non échappé) et reste cohérent avec le design existant (libellés, ordre des réhibitoires).

- **CA6 – Tests** :
  - Les tests unitaires ou d'intégration qui concernent la réponse IA, le parsing, l'écriture Airtable et l'API incluent des cas avec justifications (présentes, vides, longueur max) et vérifient que les justifications sont correctement propagées de l'IA jusqu'à l'API / au stockage.
  - Les tests BDD ou E2E pertinents (consultation d'une offre analysée) vérifient que les justifications sont visibles dans l'UI pour l'utilisateur.

---

*Merci de dire **GO NEXT** pour que le Lead Dev fasse la revue puis enchaîne le tunnel (BDD → TDD).*
