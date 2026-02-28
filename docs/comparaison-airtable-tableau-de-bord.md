# Comparaison export Airtable vs tableau de bord

## Export Airtable (par étiquette de lignes)

Colonnes (tabulé) : **Étiquettes de lignes** | **A compléter** | **À traiter** | **Candidaté** | **Doublon** | **Expiré** | **Ignoré** | **Refusé** | **Total général**

| Source (étiquette) | A compléter | À traiter | Candidaté | Doublon | Expiré | Ignoré | Refusé | Total |
|-------------------|-------------|-----------|-----------|---------|--------|--------|--------|-------|
| APEC | 381 | 47 | 2 | | | | | 430 |
| Cadre Emploi | | 37 | 2 | | | | 1 | 40 |
| Externatic | | 26 | | | | | | 26 |
| HelloWork | | 175 | | | | | | 175 |
| Job That Make Sense | | 38 | | | | | | 38 |
| Linkedin | | 291 | 8 | 4 | 3 | 1 | | 307 |
| manuelle | | | | | | | | |
| Welcome to the Jungle | | 301 | 3 | | | | | 304 |
| **Total général** | **381** | **915** | **15** | **4** | **3** | **1** | **1** | **1320** |

---

## Tableau de bord (syntèse app)

Totaux ligne **Totaux** : A compléter 0 | À analyser 0 | À traiter **842** | Candidaté **13** | Refusé 1 | Traité 1 | Ignoré 1 | Expiré 3 | Autre 4 | **864**

---

## Alignement des colonnes

- **Doublon** (Airtable) = **Autre** (tableau de bord).
- Ordre statuts tableau de bord : A compléter, À analyser, À traiter, Candidaté, Refusé, Traité, Ignoré, Expiré, Autre.

## Comparaison totaux

| Statut | Export Airtable | Tableau de bord | Écart |
|--------|-----------------|-----------------|-------|
| A compléter | 381 | 0 | 381 |
| À traiter | 915 | 842 | 73 |
| Candidaté | 15 | 13 | 2 |
| Doublon / Autre | 4 | 4 | 0 |
| Expiré | 3 | 3 | 0 |
| Ignoré | 1 | 1 | 0 |
| Refusé | 1 | 1 | 0 |
| **Total** | **1320** | **864** | **456** |

## Interprétation

- **Total 1320 vs 864** : 456 offres de l’export Airtable n’apparaissent pas dans le tableau de bord.
- **A compléter 381 vs 0** : les 381 « A compléter » sont toutes sur **APEC** (430 offres APEC au total). Dans le tableau de bord, la ligne APEC affiche 0 partout → les offres APEC ne sont pas rattachées aux sources du tableau (lien source / email différent, ou source APEC non prise en compte dans l’agrégation).
- **À traiter 915 vs 842** (−73) et **Candidaté 15 vs 13** (−2) : cohérent avec des offres **Externatic** (26), **APEC** (47+2+…), ou **manuelle** qui ne sont pas comptées dans le tableau de bord car leurs sources (ou lien source) ne correspondent pas à celles utilisées par l’app.

En résumé : l’écart vient du **rattachement des offres aux sources**. Le tableau de bord n’affiche que les offres dont la source (lien ou email) correspond aux entrées de `sources.json` / agrégation par source. Les offres APEC, Externatic et éventuellement « manuelle » dans Airtable ne tombent pas dans ces sources dans l’app, d’où 0 pour APEC et un total 864 au lieu de 1320.

## Script synthèse export

Pour repasser un export Airtable (TSV) et afficher une synthèse alignée sur les colonnes :

```bash
node scripts/synthese-export-airtable.js chemin/vers/export.tsv
```

Ou coller le bloc tabulé puis Ctrl+Z (Windows) / Ctrl+D (Unix) :

```bash
node scripts/synthese-export-airtable.js
```
