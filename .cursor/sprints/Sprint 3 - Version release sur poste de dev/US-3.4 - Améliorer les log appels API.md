#### US-3.4 : Améliorer les log appels API

- **En tant qu’** utilisateur ou mainteneur
- **Je souhaite** que chaque entrée de log d’appel API comporte une intention métier et qu’un dictionnaire documente les points d’appel
- **Afin de** diagnostiquer l’origine des appels (ex. volume Airtable) et retrouver le contexte (méthode, API)

---

- **Critères d'acceptation** :

- **CA1 – Dictionnaire des intentions** :
  - Un module (ex. `utils/intentions-appels-api.ts`) définit un **dictionnaire** : pour chaque point d’appel connu, une entrée avec **intention métier** (libellé court), **méthode ou flux appelant** (nom de fonction ou identifiant), **API** (Airtable | Claude). Ce dictionnaire sert de référence pour le log et pour le diagnostic (retrouver le contexte à partir d’une intention).

- **CA2 – Log JSON avec intention** :
  - L’entrée de log (`EntreeLogAppel`) comporte un champ **intention** (string, optionnel pour rétrocompat). Les options d’enregistrement (`OptionsEnregistrerAppel`) acceptent **intention** (optionnel). À chaque `enregistrerAppel`, l’intention fournie est sérialisée dans le fichier JSON du jour.

- **CA3 – Passer l’intention aux points de log existants** :
  - Tous les appels à `enregistrerAppel` dans le code (api-handlers, run-analyse-ia-background, server test) passent une **intention** issue du dictionnaire (ou un code/libellé cohérent). Les entrées sans intention restent possibles (champ absent ou vide).

- **CA4 – Agrégation par intention (optionnel)** :
  - Une fonction ou un mode d’agrégation permet d’obtenir les totaux **par intention** (en plus ou à la place du total par API seul) pour une date donnée, afin de répondre à « quelles intentions ont généré le plus d’appels ».

- **CA5 – Rétrocompatibilité** :
  - Les fichiers de log existants (sans champ `intention`) restent lisibles ; `lireLogsDuJour` et l’agrégation par API continuent de fonctionner. L’agrégation par intention ignore les entrées sans intention.
