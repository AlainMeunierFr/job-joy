# Revue Designer — US-2.5 Comptage des appels API

**Date** : 2026-02-23  
**Livrable** : CSS de la section Consommation API (tableau de bord).

---

## ✅ Conformité

| Point | Attendu | Fait |
|-------|---------|------|
| Fichiers modifiés | CSS uniquement (content-styles.css) | Oui — aucun HTML/TS modifié |
| Design system | Tokens (--space-*, --color-*, --radius-md), même patterns que syntheseOffres / auditSynthese | Oui |
| Section .consommationApi | Carte (fond, bordure, padding, margin-top), overflow-x auto | Oui — lignes 140–148 |
| Titre h2 | Marges, taille 1.125rem, font-weight 600 | Oui — lignes 150–155 |
| Table .consommationApiTable | width 100%, border-collapse, padding th/td, thead, hover, last-row | Oui — lignes 157–184 |
| Bouton .boutonCalculerConsommationApi | Style secondaire (margin-top/margin-right, padding, hover, focus) avec les autres boutons tableau de bord | Oui — intégré aux blocs existants (lignes 89–98, 803, 822–833, 1871) |
| Responsive | Bouton inline-block dans media-query | Oui |

---

## Fichier impacté

- **app/content-styles.css** : bloc « Consommation API (US-2.5) » après auditSyntheseTable ; ajout de `.boutonCalculerConsommationApi` aux sélecteurs communs des boutons secondaires du tableau de bord.

---

## Suite

**US-2.5 Comptage des appels API : done.** Tunnel US → BDD → TDD-back-end → TDD-front-end → Designer terminé.
