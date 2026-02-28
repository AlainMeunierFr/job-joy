# US-7.1 — Renommer « plugin » en « source »

#### US-7.1 : Renommer « plugin » en « source »

- **En tant que** développeur ou utilisateur,
- **Je souhaite** que le terme technique « plugin » soit remplacé partout par « source » (une source = une plateforme : Linkedin, APEC, etc.),
- **Afin de** clarifier le vocabulaire métier et préparer les US suivantes sans changer le comportement.

- **Critères d'acceptation** :
- **CA1 – Code (types, variables, paramètres)** :
  - Les types, interfaces et enums qui utilisent le mot « plugin » (ex. `PluginSource`, `pluginEtape1`, `getEmailPlugin`) sont renommés pour utiliser « source » (ex. `SourceNom`, `sourceEtape1`, `getEmailSource`) ou une formulation équivalente cohérente.
  - Les paramètres et variables internes (code TypeScript/JavaScript) suivent la même convention.
  - Aucun changement de structure de données (Airtable ou fichiers) ni de logique métier dans cette US.

- **CA2 – Données (champ Airtable ou futur JSON)** :
  - Si un champ s'appelle « plugin » dans Airtable (table Sources), il est renommé en « source » (ou « Source » selon la convention Airtable). Le code qui lit/écrit ce champ utilise le nouveau nom.
  - Si à la livraison de cette US les sources sont encore en Airtable, les appels API (GET/POST/PATCH) utilisent le libellé de colonne « source ».

- **CA3 – Interface utilisateur** :
  - Les libellés visibles par l'utilisateur (tableau de bord, colonnes, tooltips, formulaires) qui affichent « plugin » ou « Plugin » sont remplacés par « source » ou « Source » selon le contexte.
  - Aucun ajout ni suppression de colonne ou de bloc dans cette US ; uniquement le renommage des textes.

- **CA4 – Tests et documentation** :
  - Les tests (unitaires, intégration, BDD) et la documentation interne qui mentionnent « plugin » dans un sens « source métier » sont mis à jour pour utiliser « source ». Les assertions et les noms de scénarios reflètent le nouveau vocabulaire.

---

## Notes techniques

- Recherche globale sur « plugin » (hors cas « plugin » au sens extension technique si pertinent) pour identifier tous les renommages.
- Conserver la liste canonique des noms de sources (Linkedin, HelloWork, Welcome to the Jungle, Job That Make Sense, Cadre Emploi, APEC, Externatic, Talent.io, Inconnu) ; seul le nom du concept change (plugin → source).
