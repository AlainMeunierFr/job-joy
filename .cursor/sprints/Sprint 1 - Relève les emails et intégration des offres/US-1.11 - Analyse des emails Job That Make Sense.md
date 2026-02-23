#### US-1.11 : Analyse des emails Job That Make Sense

- **En tant que** utilisateur
- **Je souhaite** que les offres contenues dans les emails Job That Make Sense soient détectées, créées puis enrichies via l'architecture plugin en 2 etapes
- **Afin de** alimenter la table Offres avec des annonces exploitables et pretes pour l'analyse IA

---

- **Critères d'acceptation** :

- **CA1 - Audit de la source Job That Make Sense** :
  - Le matching de l'expediteur se fait en comparaison exacte insensible a la casse.
  - Un expediteur proche mais non exact (exemple : variante avec +alias) n'est pas reconnu comme Job That Make Sense.
  - Si la source n'existe pas, elle est creee avec `plugin = "Job That Make Sense"` et `actif = true`.
  - Si la source existe deja, elle est mise a jour pour garantir `plugin = "Job That Make Sense"` et `actif = true`.

- **CA2 - Etape 1 plugin email (parsing et creation des offres)** :
  - Le plugin email Job That Make Sense est branche dans le registry de plugins de l'etape 1.
  - A partir des fixtures `tests/exemples/jobs@makesense.org`, les URLs d'offres sont extraites de facon deterministe.
  - Quand une URL est encodee, elle est decodee ; si le decodage echoue, un mecanisme de fallback conserve une URL exploitable pour l'etape 2.
  - Pour chaque offre extraite, une entree Offres est creee (ou mise a jour selon la logique projet) avec les champs minimum requis de l'etape 1 : source, URL (ou URL resolue), date d'ajout, statut initial coherent.
  - Le statut en sortie d'etape 1 est celui attendu par le workflow pour indiquer qu'un enrichissement etape 2 est necessaire.
  - Les exemples `data/ressourcesjtms.js` et `data/JTMS` sont utilises comme reference fonctionnelle pour les formats d'URL et les informations recuperables.

- **CA3 - Etape 2 plugin fetch (recuperation et enrichissement)** :
  - Le plugin fetch Job That Make Sense est branche dans le mecanisme d'enrichissement de l'etape 2.
  - A partir des URLs produites en etape 1, le texte de l'annonce est recupere quand la page est accessible.
  - Les champs disponibles sont alimentes sans regression sur le schema courant : poste, entreprise, lieu, salaire, date et autres metadonnees presentes.
  - Les transitions de statut sont coherentes entre etape 1 et etape 2 (pas de retour a un statut precedent, pas d'etat incoherent).
  - En cas d'echec de recuperation (URL invalide, contenu indisponible), le statut final est explicite et coherent avec la convention projet.

---

*References : Sprint 1 `00 - Sprint goal et contexte.md`, fixture `tests/exemples/jobs@makesense.org`, exemples `data/ressourcesjtms.js` et `data/JTMS`.*
