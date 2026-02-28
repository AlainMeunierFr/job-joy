# US-6.6 — Créer les sources

#### US-6.6 : Créer les sources

- **En tant que** utilisateur,
- **Je souhaite** que les sources soient créées à l'avance selon un schéma « une entrée par source » (LinkedIn, APEC, etc.) avec liste d'emails par défaut, URL officielle et activations par phase,
- **Afin de** disposer de toutes les sources de la liste canonique (même sans créateurs ni enrichisseur implémentés), d'ouvrir le site d'une source depuis le tableau de bord, et de préparer la migration des données existantes vers ce schéma.

- **Critères d'acceptation** :
- **CA1 - Liste canonique des noms de sources** :
  - La liste des noms canoniques suivants est la source de vérité : **Linkedin**, **HelloWork**, **APEC**, **Cadre Emploi**, **Welcome to the Jungle**, **Job That Make Sense**, **Indeed**, **France Travail**, **LesJeudis**, **Michael Page**, **Robert Walters**, **Hays**, **Monster**, **Glassdoor**, **Makesense**.
  - Le code source (énumération, constantes, types ou configuration) prévoit explicitement tous ces noms ; aucun nom de la liste canonique ne peut être absent. Un test ou une vérification statique permet de détecter un écart entre la liste canonique et le code.
- **CA2 - Données par source (emails par défaut et URL)** :
  - Pour chaque nom canonique, les données suivantes sont mémorisées (en code ou dans `data/sources.json` à l'initialisation) :
    - **Liste d'emails** : valeur(s) par défaut selon le tableau ci-dessous (chaîne vide ou tableau vide si pas d'email).
    - **URL officielle** : l'URL du site de la source, utilisée pour le lien « ouvrir le site » depuis le tableau de bord.
  - Tableau de référence (nom canonique | emails par défaut | URL officielle) :
    - Linkedin | jobalerts-noreply@linkedin.com ; jobs-listings@linkedin.com | https://www.linkedin.com/jobs
    - HelloWork | notification@emails.hellowork.com | https://www.hellowork.com
    - APEC | (vide) | https://www.apec.fr
    - Cadre Emploi | offres@alertes.cadremploi.fr | https://www.cadremploi.fr
    - Welcome to the Jungle | alerts@welcometothejungle.com | https://www.welcometothejungle.com/fr
    - Job That Make Sense | jobs@makesense.org | https://jobs.makesense.org/fr
    - Indeed | alert@indeed.com | https://www.indeed.fr
    - France Travail | nepasrepondre@offre.francetravail.fr | https://www.francetravail.fr
    - LesJeudis | (vide) | https://www.lesjeudis.com
    - Michael Page | (vide) | https://www.michaelpage.fr
    - Robert Walters | (vide) | https://www.robertwalters.fr
    - Hays | (vide) | https://www.hays.fr
    - Monster | (vide) | https://www.monster.fr
    - Glassdoor | (vide) | https://www.glassdoor.fr
    - Makesense | (vide) | https://makesense.org
- **CA3 - Schéma une entrée par source** :
  - Le fichier `data/sources.json` (ou la structure en mémoire) contient **une entrée par source** (une par nom canonique). Chaque entrée comporte : identifiant ou nom de source, liste d'emails, URL officielle, activations par phase (création par email, création par liste html, enrichissement, analyse IA). L'emplacement « liste html » pour une source peut être dérivé en code (ex. `liste html/<nom source>`).
- **CA4 - Migration des données existantes** :
  - Les données existantes (ex. entrées actuelles dans `sources.json` : une entrée par adresse email ou par chemin liste html) sont migrées vers le nouveau schéma : une entrée par source, avec regroupement des emails par nom de source et conservation des activations lorsqu'elles peuvent être mappées. Les entrées orphelines (source « Inconnu » ou sans correspondance dans la liste canonique) sont traitées de façon définie (ex. rattachées à « Inconnu » ou conservées avec un nom dérivé) ; le comportement est explicite et testé.
- **CA5 - Tableau de bord : clic sur le nom de la source ouvre l'URL** :
  - Dans le tableau de bord, un clic sur le **nom de la source** (ou sur un lien dédié associé à la source) ouvre l'**URL officielle** de cette source dans un **nouvel onglet** du navigateur. Chaque source de la liste canonique dispose d'une URL ; si une source n'a pas d'URL, le clic ne fait rien ou le lien n'est pas affiché (comportement explicite).
