#### US-4.5 : Introduction au process de paramétrage

- **En tant que** utilisateur qui ouvre la page Paramètres pour la première fois (ou qui revient après une absence)
- **Je souhaite** voir en tête de page un bloc introductif qui rappelle à quoi sert Job-Joy, quels sont les composants du système et comment le flux fonctionne
- **Afin de** ne pas arriver brutalement sur « Configuration Airtable » / « Crée-toi un compte Airtable » sans contexte, et de comprendre rapidement le rôle de chaque élément à configurer avant de les paramétrer

---

- **Critères d'acceptation** :

- **CA1 – Bloc introductif en tête de page Paramètres** :
  - Un bloc introductif unique est affiché en **premier** sur la page Paramètres, avant tous les blocs de configuration (Airtable, compte email, ClaudeCode, etc.).
  - Ce bloc est **non repliable** : il reste toujours visible et ouvert ; il n’a pas de contrôle pour le replier ou le déplier.
  - Le bloc est clairement identifiable comme une section d’introduction (titre ou libellé explicite), distincte des sections de configuration.

- **CA2 – Section WHY (pourquoi)** :
  - Le bloc intro contient une section dédiée au **pourquoi** (objectif du logiciel).
  - Le texte reprend une version **condensée du pitch** : Job-Joy relève la messagerie, extrait les offres, les met dans Airtable, les fait scorer par l’IA selon le profil de l’utilisateur (inspiré du contenu de `docs/telecharger.html`, formulé de façon courte et lisible).
  - La formulation est cohérente avec le positionnement du produit (pas de contradiction avec la page de téléchargement ou la doc).

- **CA3 – Section WHAT (quoi)** :
  - Le bloc intro contient une section dédiée au **quoi** (composants du système).
  - Les **trois composants** sont explicitement présentés : (1) l’application Job-Joy elle-même, (2) Airtable (pour consulter le résultat), (3) ClaudeCode (pour analyser et scorer les offres).
  - Chaque composant est nommé et son rôle est brièvement indiqué (consultation du résultat pour Airtable ; analyse/scoring pour ClaudeCode).

- **CA4 – Section HOW (comment)** :
  - Le bloc intro contient une section dédiée au **comment** (flux du process).
  - Un **schéma d’architecture très simple** représente le flux : Boîte aux lettres → emails vers offres « vides » (URL) → ouverture URL → offre enrichie (texte complet) → offre + prompt + IA → scoring.
  - Le schéma est réalisé sous forme d’**une série de petits blocs avec des flèches en CSS** : pas d’image importée, pas de librairie externe ; mise en page simple et lisible (blocs et flèches en pur HTML/CSS ou équivalent du stack actuel).
  - La représentation est compréhensible par un utilisateur non technique (libellés courts, enchaînement visuel clair).

- **CA5 – Vocabulaire aligné sur l’app (DDD)** :
  - Les libellés et le texte du bloc intro utilisent le **même vocabulaire métier** que le reste de l’application, afin de faciliter le support (l’utilisateur nomme ses problèmes avec les mêmes termes que l’interface).
  - À reprendre en particulier : **Création** (phase 1 – extraction des URLs des offres dans les emails), **Enrichissement** (phase 2 – récupération du texte complet de l’offre), **Analyse IA** (phase 3 – scoring par l’IA) ; **Synthèse des offres** ; **offres** ; **Configuration Airtable**, **Configuration ClaudeCode**, **Paramétrage du compte email** ; **Tableau de bord** si mentionné. Éviter des synonymes ou des tournures qui divergent de ces libellés.

- **CA6 – Cohérence et accessibilité** :
  - Le bloc intro est lisible sur la résolution et les tailles de fenêtre prévues pour l’application (pas de texte tronqué ni de chevauchement gênant).
  - Les textes sont en français et rédigés de façon claire (orthographe et formulation soignées).
