# Rapport GO FIN — US-7.9 : Lister les offres (phase US)

**Date** : 2026-02-21  
**US** : US-7.9 (Sprint 7 — Abandon de AirTable)  
**Objectif** : Rédaction et validation de la User Story « Lister les offres » (page Offres, RevoGrid, ordre colonnes, filtre, tri, vues sauvegardées en SQLite).

---

## 1. Synthèse

| Étape   | Statut   | Livrable principal |
|---------|----------|----------------------|
| US      | ✅ Fait  | US-7.9 reformulée au format DOD, CA1–CA6 alignés RevoGrid, fichier mis à jour |
| BDD     | ⏭ À faire | Scénarios Gherkin à écrire (GO NEXT après validation) |
| TDD     | ⏭ À faire | Back-end puis front-end selon tunnel |

---

## 2. Réalisations (phase US)

- **Fichier** : `.cursor/sprints/Sprint 7 - Abandon de AirTable/US-7.9 - Lister les offres.md`
- **Reformulation** : En tant que utilisateur / Je souhaite disposer d'une page qui liste les offres dans un tableau interactif / Afin de consulter le résultat de la création, de l'enrichissement et de l'analyse du logiciel.
- **Critères d'acceptation** :
  - **CA1** : Page « Offres », menu après Tableau de bord / avant Paramètres, lien visible seulement si au moins une offre en base.
  - **CA2** : RevoGrid pour affichage (colonnes + lignes SQLite), ascenseurs H/V, pas de pagination « 1, 2, 3 » en v1.
  - **CA3** : Ordre des colonnes (glisser-déposer ou mécanisme natif RevoGrid).
  - **CA4** : Filtre des lignes (multicritère, capacités natives RevoGrid).
  - **CA5** : Tri des lignes (en-tête et/ou multicritère, natif RevoGrid).
  - **CA6** : Vues sauvegardées (zone latérale, créer/renommer/supprimer/charger, table SQLite « vues » : UID, Nom, Json de paramétrage).
- **Typos corrigées** et libellés clarifiés ; CA adaptés pour s'appuyer sur les capacités natives de RevoGrid plutôt que de sur-spécifier un UX type Airtable.

---

## 3. Suite

- **GO NEXT** (quand vous voulez enchaîner) : revue Lead Dev puis délégation **BDD** pour les scénarios Gherkin de l'US-7.9.
- **Tunnel** : BDD → TDD-back-end → TDD-front-end → Designer si besoin → done.
