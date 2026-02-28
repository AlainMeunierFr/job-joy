# US-7.3 — Refactoriser une entrée par source dans les données

#### US-7.3 : Refactoriser une entrée par source dans les données

- **En tant que** utilisateur,
- **Je souhaite** que les données des sources soient organisées par **source** (une entrée par plateforme : Linkedin, APEC, etc.) avec une liste d'emails et les activations par phase,
- **Afin de** refléter le modèle métier (une source = une plateforme avec plusieurs emails possibles) et préparer le tableau de bord « une ligne par source ».

- **Critères d'acceptation** :
- **CA1 – Schéma sources.json** :
  - Le fichier `sources.json` contient un tableau (ou objet) d'entrées **source**. Chaque entrée comporte : un identifiant de source (nom canonique), creationEmail (activé, emails[]), creationListeHtml (activé), enrichissement (activé), analyse (activé).
  - L'emplacement « liste html » pour une source n'est pas stocké en JSON ; il est dérivé en code (ex. `liste html/<nom source>` ou forme fichier 1:1 du nom canonique).
- **CA2 – Migration des données existantes** :
  - Aucune reprise des paramètres existants ; le code d'initialisation s'applique comme pour un nouvel utilisateur.
- **CA3 – Initialisation** :
  - Toutes les options sont activées par défaut (l'activation n'a d'effet que si l'implémentation existe).
  - Une liste d'emails par source est fournie en code pour l'initialisation (ex. WTTJ, Linkedin, JTMS, HelloWork, Cadre Emploi avec les adresses définies en code).
- **CA4 – API et code métier** :
  - Les services (audit, traitement, enrichissement, tableau de bord) utilisent la nouvelle structure « une entrée par source » ; creation email et creation liste html s'appuient sur creationEmail et creationListeHtml (liste d'emails, activé, emplacement liste html dérivé en code).
- **CA5 – Liste canonique des sources** :
  - La liste des noms canoniques (Linkedin, HelloWork, Welcome to the Jungle, Job That Make Sense, Cadre Emploi, APEC, Externatic, Talent.io, Inconnu) est la source de vérité ; toute entrée dans `sources.json` référence un de ces noms. La dérivation nom de source ↔ dossier liste html est 1:1 et implémentée en code.
- **CA6 – Pas de doublons** :
  - Il ne peut pas exister deux entrées pour la même source. Un test ou scénario vérifie qu'après chargement ou migration, il n'y a pas deux entrées avec le même nom de source.

---

## Notes techniques (implémentation)

- Adapter le driver ou module « sources » pour exposer une interface « par source » (getSource(nom), listSources(), updateSource(nom, patch)).
- Table Offres : le lien vers la source peut rester par adresse email ou par « liste html/<nom> » ; le code résout vers l'entrée source correspondante.
