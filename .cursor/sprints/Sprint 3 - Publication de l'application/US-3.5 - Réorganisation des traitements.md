#### US-3.5 : Réorganisation des traitements

- **En tant qu'** utilisateur
- **Je souhaite** que les traitements et l'ergonomie du tableau de bord soient réorganisés en trois blocs distincts (comptage emails, traitements payants, mise à jour manuelle)
- **Afin de** limiter la consommation d'API inutile et clarifier ce qui est gratuit (lecture seule), payant (traitement) et manuel (rafraîchissement)

---

**Contexte**

Aujourd'hui, le tableau de bord mélange comptage, traitements et rafraîchissement. L'objectif est de séparer clairement : (1) un processus **lecture seule** qui ne fait que compter les emails à importer ; (2) une **action utilisateur unique** « Lancer les traitements » qui enchaîne création, enrichissement et analyse IA ; (3) un **bouton Mise à jour** pour rafraîchir le tableau à la demande, sans rafraîchissement automatique en arrière-plan.

---

- **Critères d'acceptation** :

- **CA1 - Comportement au chargement de la page** *(couche : back + front)* :
  - Au chargement de la page tableau de bord, **une seule** requête est envoyée pour récupérer la synthèse des offres (vérifiable par mock/spy du client HTTP ou log des appels).
  - Aucun timer (polling) n'est mis en place pour rafraîchir tout le tableau en arrière-plan (vérifiable par absence de `setInterval` / polling sur la route de synthèse après le premier chargement).

- **CA2 - Bloc 1 – Comptage des emails (gratuit, continu)** *(couche : back + front)* :
  - Le processus **lecture seule** ne fait que **compter** les emails (ce qui serait à importer) et met à jour la colonne **« À importer »** ; il n'appelle **pas** les APIs de création d'offres ni de déplacement/archivage d'emails (testable en back : le service de comptage n'invoque pas création ni déplacement).
  - Le déplacement ou archivage des emails est **uniquement** déclenché dans la phase 1 de « Lancer les traitements », pas par le bloc comptage (testable : un scénario BDD « comptage seul » ne doit pas modifier la BAL).
  - Ce bloc peut tourner en continu (lecture seule, gratuit) ; le comptage n'est **pas** la « création » des offres.

- **CA3 - Bloc 2 – Lancer les traitements (action utilisateur, 3 phases)** *(couche : back + front)* :
  - Un **seul** bouton utilisateur, intitulé **« Lancer les traitements »** (remplace « Ouvrir, récupérer et analyser les annonces ») ; le clic déclenche en connaissance de cause la consommation (tokens, API, écriture Airtable) (testable en front : présence et libellé du bouton ; en back : orchestration déclenchée par l'action).
  - Trois **phases enchaînées** dans l'ordre : (1) **Création** – lire les emails, créer les offres en base, archiver les emails ; (2) **Enrichissement** – ouvrir les offres et récupérer le texte ; (3) **Analyse IA** – analyser avec l'IA. Testable en back : ordre et contenu des phases (mocks/stubs) ; en BDD : scénario « lancer les traitements » vérifie l'enchaînement.
  - Pendant l'exécution : mises à jour **chirurgicales** du tableau (compteurs/statuts mis à jour sans rechargement complet de la synthèse). Testable en front : pas d'appel « recharger toute la synthèse » pendant que les phases progressent ; en back : émission d'événements/états par phase.
  - À la fin des trois phases : les workers s'arrêtent (pas de boucle continue). Testable en back : après « fin phase 3 », aucun job récurrent ne reste actif (état ou log).

- **CA4 - Bloc 3 – Mise à jour à la demande** *(couche : front + back)* :
  - Un bouton **« Mise à jour »** est présent ; un clic déclenche **un** rafraîchissement du tableau (une nouvelle requête synthèse des offres). Testable en front : clic → exactement un appel vers l'API de synthèse ; en BDD : scénario « utilisateur rafraîchit le tableau ».
  - Hors chargement initial et hors mises à jour chirurgicales pendant « Lancer les traitements », **aucun** rafraîchissement automatique du tableau en arrière-plan (testable : pas de polling/timer pour la synthèse).

- **CA5 - Maquette / disposition en 3 blocs** *(couche : front)* :
  - **Container « Synthèse des offres »** (ligne 1, toute la largeur) : tableau de synthèse des offres + bouton « Ouvrir Airtable » (testable : structure DOM ou sections visibles en E2E/Composant).
  - **Container « Traitements »** (ligne 2, gauche, environ 2/3 de la largeur) : empilement vertical : bouton « Mise à jour » ; bouton « Lancer les traitements » ; une ligne par phase (3 phases) sur 3 colonnes à bords invisibles : nom de la phase | thermomètre | élément en cours (testable : présence des 3 lignes de phase et des deux boutons).
  - **Container « Consommation API »** (ligne 2, droite, environ 1/3) : identique à l'existant (affichage de la consommation API) (testable : section visible, contenu cohérent).

---

**Notes pour le tunnel**

| CA   | BDD (scénarios possibles)                    | TDD back-end (exemples)                                      | TDD front-end (exemples)                                           |
|------|----------------------------------------------|--------------------------------------------------------------|---------------------------------------------------------------------|
| CA1  | Chargement page → 1 appel synthèse, pas de polling | Service/API : un seul appel synthèse au init ; pas de scheduler | Composant page : pas de setInterval pour synthèse après mount       |
| CA2  | Comptage seul ne déplace pas les emails      | Comptage n'appelle pas création ni déplacement               | Affichage colonne « À importer » mise à jour par le flux comptage   |
| CA3  | Clic « Lancer les traitements » → 3 phases  | Orchestration 3 phases, ordre, fin sans boucle               | Bouton présent, libellé ; mises à jour ciblées pendant phases       |
| CA4  | Clic « Mise à jour » → tableau rafraîchi    | Endpoint synthèse idempotent                                 | Clic bouton → 1 appel synthèse ; pas de rafraîchissement auto       |
| CA5  | (optionnel) Disposition des 3 blocs visible | —                                                            | Structure layout : 3 containers, boutons et lignes de phase visibles |

---

*Référence : Sprint 3 « Publication de l'application » ; réorganisation des traitements et ergonomie du tableau de bord.*
