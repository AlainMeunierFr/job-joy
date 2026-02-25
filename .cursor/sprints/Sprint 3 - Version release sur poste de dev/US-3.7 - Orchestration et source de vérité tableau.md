#### US-3.7 : Orchestration et source de vérité tableau

- **En tant qu'** utilisateur
- **Je souhaite** que le tableau de synthèse et l'orchestration des traitements s'appuient sur une seule source de vérité
- **Afin de** éviter les appels Airtable superflus, gérer correctement reprise et changements manuels, et arrêter les traitements quand il n'y a plus rien à faire

---

**Contexte**

Avec une stratégie « lancer le traitement une fois » (sans boucle continue), on ne peut pas paralléliser bêtement les trois workers : l’analyse IA partirait, verrait qu’il n’y a rien à faire (les deux autres n’ont pas terminé) et s’arrêterait. Il faut une orchestration pilotée par les données.

Par ailleurs, il faut couvrir le cas d’offres déjà au stade « A compléter » ou « À analyser » sans avoir été créées à l’instant d’avant par l’import (plantage, reprise, ou changement manuel par l’utilisateur dans Airtable). La décision de lancer une phase ne doit pas reposer sur une **recherche** dédiée dans Airtable (coûteuse en appels API), mais sur une **source de vérité unique** déjà disponible.

---

**Décisions de design**

- **Une seule source de vérité** : un objet métier, relativement complexe, sert à la fois à **orchestrer les workers** (quand lancer phase 1, 2, 3 ; enchaînement ; règle « colonne ≠ 0 ») et à **construire le tableau** (lignes, totaux, colonnes affichées). Les mises à jour (chargement initial, mises à jour chirurgicales) ne se font que sur cet objet ; le tableau et l’orchestration en dérivent.

- **Pas d’appel Airtable dédié au déclenchement** : la requête qui alimente le tableau (Sources + Offres, totaux par statut, « A compléter », « À analyser », etc.) est la même qui fournit l’information pour décider quelles phases déclencher. Aucune requête supplémentaire pour « chercher » s’il y a du travail pour la phase 2 ou 3.

- **Déclenchement des phases**  
  - **Phase 1** : déclenchée par le contrôle de la boîte aux lettres (audit → « A importer » > 0). Pas d’appel Airtable pour ce déclencheur.  
  - **Phase 2** : déclenchée **soit** par la phase 1 à la fin de son exécution (enchaînement direct, pas de requête), **soit** parce que la source de vérité indique qu’il existe des offres « A compléter » (reprise, manuel, plantage).  
  - **Phase 3** : déclenchée **soit** par la phase 2 à la fin de son exécution (enchaînement direct), **soit** parce que la source de vérité indique des offres « À analyser ».

- **Mises à jour chirurgicales** : lorsqu’un statut change (ex. après une phase), on met à jour l’objet source de vérité en -1 / +1 sur les colonnes concernées, sans refaire une requête complète. Le tableau affiché et les décisions d’orchestration restent cohérents avec un minimum d’appels.

- **Arrêt** : le traitement s’arrête quand aucune phase n’a plus de travail (plus d’emails à importer, plus d’offres « A compléter », plus d’offres « À analyser »).

- **Implémentation** : l’essentiel est côté **domaine / back-end**, dans `utils` (architecture hexagonale). Le front affiche le tableau et envoie « Lancer les traitements » ; il consomme l’API qui s’appuie sur cet objet.

---

**Critères d'acceptation**

- **CA1 - Objet source de vérité** *(couche : back, `utils`)* :
  - Un même objet métier (ou agrégat) contient les données nécessaires pour : (1) construire le rendu du tableau de synthèse (lignes, totaux par colonne, « A importer », « A compléter », « À analyser », etc.) ; (2) décider quelles phases lancer (ex. lancer la phase 2 si « A compléter » > 0, la phase 3 si « À analyser » > 0).
  - Cet objet est alimenté par la même requête (ou le même flux) que celui qui sert à afficher le tableau (pas de requête Airtable supplémentaire pour le déclenchement des phases 2 et 3).
  - Testable en back : un module ou service expose cet objet ; les décisions d’orchestration et le format tableau en dérivent.

- **CA2 - Déclenchement phase 1** *(couche : back)* :
  - La phase 1 (import / création) est déclenchée lorsque le contrôle de la boîte aux lettres indique des emails en attente (« A importer » > 0). Aucun appel Airtable pour ce déclenchement.
  - Testable : phase 1 lancée à partir de l’audit / cache « A importer », sans liste Airtable dédiée.

- **CA3 - Déclenchement phase 2** *(couche : back)* :
  - La phase 2 (enrichissement) est déclenchée **soit** par la phase 1 à la fin de son exécution (si elle a produit au moins une offre « A compléter »), **soit** parce que la source de vérité indique « A compléter » > 0 (reprise, changement manuel, plantage).
  - Aucune requête Airtable supplémentaire pour « chercher » des offres « A compléter » ; l’information vient de l’objet source de vérité (alimenté par la requête tableau ou par mise à jour chirurgicale).
  - Testable : enchaînement phase 1 → phase 2 ; et scénario « source de vérité avec A compléter > 0 sans phase 1 récente » déclenche bien la phase 2.

- **CA4 - Déclenchement phase 3** *(couche : back)* :
  - La phase 3 (analyse IA) est déclenchée **soit** par la phase 2 à la fin de son exécution (si elle a passé au moins une offre à « À analyser »), **soit** parce que la source de vérité indique « À analyser » > 0.
  - Aucune requête Airtable supplémentaire pour « chercher » des offres « À analyser ».
  - Testable : enchaînement phase 2 → phase 3 ; et scénario « source de vérité avec À analyser > 0 sans phase 2 récente » déclenche bien la phase 3.

- **CA5 - Mises à jour chirurgicales** *(couche : back + front)* :
  - Lorsqu’un statut d’offre change (ex. après une phase), la source de vérité est mise à jour de façon chirurgicale : -1 sur l’ancien statut, +1 sur le nouveau (ou équivalent). Le tableau affiché peut en dériver sans requête complète.
  - Testable en back : après exécution d’une phase, l’objet source de vérité reflète les changements de compteurs sans relecture Airtable complète pour le déclenchement.

- **CA6 - Arrêt des traitements** *(couche : back)* :
  - Les workers s’arrêtent lorsqu’il n’y a plus rien à faire : plus d’emails à importer pour la phase 1, plus d’offres « A compléter » pour la phase 2, plus d’offres « À analyser » pour la phase 3.
  - Testable : après une exécution complète, aucun job récurrent ne reste actif ; une nouvelle exécution ne repart que si la source de vérité (ou l’audit) indique du travail.

---

**Notes pour le tunnel**

| CA   | BDD (scénarios possibles) | TDD back-end (exemples) | TDD front-end |
|------|----------------------------|--------------------------|---------------|
| CA1  | —                          | Objet source de vérité ; dérivation tableau + décisions orchestration | Consommation API inchangée |
| CA2  | Phase 1 déclenchée par audit | Phase 1 lancée depuis cache/audit « A importer » | — |
| CA3  | Phase 2 après phase 1 ; phase 2 après reprise (A compléter > 0) | Enchaînement 1→2 ; décision depuis source de vérité | — |
| CA4  | Phase 3 après phase 2 ; phase 3 après reprise (À analyser > 0) | Enchaînement 2→3 ; décision depuis source de vérité | — |
| CA5  | Tableau mis à jour chirurgicalement pendant les phases | Mise à jour -1/+1 sur l’objet après changement statut | Affichage cohérent sans rechargement complet |
| CA6  | Traitement s’arrête quand plus rien à faire | État workers après exécution ; pas de boucle | — |

**Périmètre technique** : principalement `utils` (domaine) et couche API qui s’appuie sur l’objet ; le front reste consommateur du tableau et du bouton « Lancer les traitements ».

---

*Référence : Sprint 3 « Publication de l'application » ; orchestration pilotée par les données, une seule source de vérité pour tableau et workers.*
