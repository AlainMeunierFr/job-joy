#### US-3.3 : Tableau de bord unifié

- **En tant que** utilisateur
- **Je souhaite** que le traitement des emails soit intégré au tableau de bord
- **Afin de** ne pas multiplier les étapes et surcharger inutilement la page "Tableau de bord"

---

**Contexte**

Maintenant que le flux en 3 étapes a émergé de la conception, il est inutile de présenter l'étape 1 et les étapes suivantes dans un autre tableau.

**Deux étapes distinctes pour la donnée "à importer"**

1. **Compter les éléments à importer** — toujours exécutée par "quelque chose" (audit / comptage). Elle n'est pas désactivable. Elle produit la donnée éphémère "nb à importer" par source.
2. **Importer les éléments** — faite par le worker phase 1 **si**, pour ce plugin, la phase est activée. Les offres créées persistent dans Airtable.

Le tableau de bord ne fait que **lire** l'état ; les workers mettent à jour la base. Le "nb à importer" est maintenu en RAM (cache dernier audit) et alimente la colonne "A importer". Le back-end prépare le rendu complet du tableau (une seule API, colonne "A importer" incluse).

---

**Décisions de design (tunnel)**

- **Architecture hexa** : logique centralisée côté back-end ; les clients (dont le front) sont consommateurs d'API. Bouton "Mise à jour" = enchaînement audit puis rafraîchissement, géré côté serveur.
- **Données** : offres = persistées (Airtable). "Nb à importer" = éphémère, maintenu en RAM (cache dernier audit). Une seule API renvoie le rendu complet du tableau (colonne "A importer" incluse).
- **Phase 1** : `runTraitement` → **`runCreation`**. Worker serveur, intervalle 1 h. Thermomètre phase 1 déplacé dans le bloc "Synthèse des offres". Suppression du container "Dossier de la boite aux lettres" et désimplémentation du code inutile (décompte archivés/subsistance, etc.).
- **Bouton "Mise à jour"** : enchaîne l'audit (comptage) puis le comportement actuel (rafraîchissement statuts offres). Enchaînement côté back-end ou cas d'usage ; le front envoie une action, le serveur fait l’enchaînement.

---

- **Critères d'acceptation** :

- **CA1 - Colonne "A importer" dans la Synthèse des offres** :
  - Le tableau "Synthèse des offres" affiche une colonne "A importer" avec le nombre d'éléments à importer par source (ou expéditeur).
  - La valeur affichée provient du back-end : une seule API renvoie toutes les lignes du tableau avec cette colonne ; la donnée est le cache RAM du dernier audit (comptage), pas une table persistée.
  - Comportement métier : l'étape "compter les éléments à importer" est toujours exécutée (par l'audit) ; l'étape "importer" est faite par le worker phase 1 uniquement si la phase est activée pour ce plugin. Les offres créées sont persistées dans Airtable.

- **CA2 - Bouton "Mise à jour" : audit puis rafraîchissement** :
  - Le bouton "Mise à jour" du bloc "Synthèse des offres" déclenche côté serveur : (1) exécution de l'audit (comptage des éléments à importer), puis (2) rafraîchissement des statuts des offres. Le front envoie une seule action ; l'enchaînement est géré par le back-end.
  - Après clic, l'utilisateur voit le tableau se mettre à jour (colonne "A importer" et statuts offres cohérents avec le résultat de cet enchaînement).

- **CA3 - Worker phase 1 et thermomètre** :
  - La phase 1 (relevé / création d'offres) est exécutée par un worker côté serveur, avec un intervalle de 1 h. L'ancien nom `runTraitement` est renommé en `runCreation`.
  - Le thermomètre de progression de la phase 1 est affiché dans le bloc "Synthèse des offres", à côté des thermomètres enrichissement et analyse IA. Pour déclencher un cycle immédiat : l'utilisateur arrête puis relance le worker (ou un endpoint dédié peut être ajouté ultérieurement).

- **CA4 - Suppression du container "Dossier de la boite aux lettres"** :
  - Le container "Dossier de la boite aux lettres" n'est plus présent sur la page : titre, boutons "Auditer le dossier" et "Lancer le traitement", thermomètres et résultats dédiés, tableau synthèse audit, sous-totaux archivés/subsistance sont supprimés.
  - Le code associé est désimplémenté : décompte des emails archivés / subsistance, rendu du tableau audit séparé, listeners et DOM liés à ce container.
