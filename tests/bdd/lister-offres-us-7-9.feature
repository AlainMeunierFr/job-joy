# language: fr
@us-7.9
Fonctionnalité: Lister les offres
  En tant qu'utilisateur
  Je souhaite disposer d'une page qui liste les offres dans un tableau interactif
  Afin de consulter le résultat de la création, de l'enrichissement et de l'analyse du logiciel.

  # --- CA1 : Page « Offres » — présence, position menu, visibilité conditionnelle ---
  Scénario: La page Offres existe et le lien menu est placé après Tableau de bord et avant Paramètres
    Étant donné que la base contient au moins une offre
    Quand je consulte le menu de navigation
    Alors un lien "Offres" est présent dans le menu
    Et le lien "Offres" est placé après le lien "Tableau de bord"
    Et le lien "Offres" est placé avant le lien "Paramètres"

  Scénario: Le lien Offres est visible uniquement lorsque la base contient au moins une offre
    Étant donné que la base ne contient aucune offre
    Quand je consulte le menu de navigation
    Alors le lien "Offres" n'est pas visible dans le menu

  Scénario: Lorsque la base contient au moins une offre, le lien Offres est visible
    Étant donné que la base contient au moins une offre
    Quand je consulte le menu de navigation
    Alors le lien "Offres" est visible dans le menu

  Scénario: Cliquer sur le lien Offres affiche la page Offres
    Étant donné que la base contient au moins une offre
    Et que je suis sur une page de l'application (Tableau de bord ou Paramètres)
    Quand je clique sur le lien "Offres" du menu
    Alors la page "Offres" est affichée

  # --- CA2 : Affichage RevoGrid — colonnes, lignes, défilement, pas de pagination ---
  Scénario: La page Offres affiche un tableau avec les colonnes et lignes des offres
    Étant donné que la base contient au moins une offre
    Quand j'affiche la page Offres
    Alors un tableau des offres (grid) est affiché
    Et le tableau affiche des colonnes correspondant aux données des offres (ex. Source, Statut, URL)
    Et le tableau affiche une ligne par offre présente en base

  Scénario: Lorsque les colonnes dépassent la largeur de l'écran, un ascenseur horizontal est disponible
    Étant donné que la base contient au moins une offre
    Et que la page Offres est affichée
    Et que le nombre de colonnes du tableau dépasse la largeur visible
    Quand j'observe la zone du tableau des offres
    Alors un ascenseur horizontal (ou défilement horizontal) est disponible ou le contenu peut défiler horizontalement

  Scénario: Lorsque les offres dépassent la hauteur de l'écran, un ascenseur vertical ou un défilement est disponible
    Étant donné que la base contient suffisamment d'offres pour dépasser la hauteur visible du tableau
    Et que la page Offres est affichée
    Quand j'observe la zone du tableau des offres
    Alors un ascenseur vertical (ou défilement vertical) est disponible ou le contenu peut défiler verticalement

  Scénario: En v1 il n'y a pas de pagination « 1, 2, 3 » en bas du tableau
    Étant donné que la base contient des offres
    Et que la page Offres est affichée
    Quand j'observe le bas du tableau des offres
    Alors aucun contrôle de pagination numérotée (type "1, 2, 3…") n'est affiché en bas du tableau

  # --- CA3 : Ordre des colonnes — modifiable par l'utilisateur ---
  Scénario: L'utilisateur peut modifier l'ordre des colonnes du tableau
    Étant donné que la page Offres est affichée avec au moins une offre
    Et que les colonnes ont un ordre initial observable (ex. première colonne "Source")
    Quand je modifie l'ordre des colonnes (glisser-déposer ou mécanisme natif du grid)
    Alors l'ordre affiché des colonnes reflète la modification
    Et le nouvel ordre est visible immédiatement dans le tableau

  # --- CA4 : Filtre des lignes — multicritère ---
  Scénario: L'utilisateur peut filtrer les lignes affichées
    Étant donné que la page Offres est affichée avec plusieurs offres (ex. statuts différents)
    Quand j'applique un filtre sur une colonne (ex. Statut = "À traiter")
    Alors le tableau n'affiche que les lignes correspondant au filtre
    Et le nombre de lignes visibles est cohérent avec le critère de filtre

  Scénario: Supprimer le filtre réaffiche toutes les lignes
    Étant donné que la page Offres est affichée avec des offres
    Et qu'un filtre est appliqué (une partie des lignes est masquée)
    Quand je supprime ou réinitialise le filtre
    Alors le tableau affiche à nouveau toutes les offres (ou toutes celles en base)

  # --- CA5 : Tri des lignes ---
  Scénario: L'utilisateur peut trier les lignes par une colonne (clic en-tête)
    Étant donné que la page Offres est affichée avec plusieurs offres
    Quand je trie par une colonne (ex. clic sur l'en-tête "Statut")
    Alors les lignes du tableau sont réordonnées selon cette colonne
    Et l'ordre affiché est cohérent avec le tri (ascendant ou descendant)

  Scénario: Un second clic sur la même colonne inverse l'ordre de tri
    Étant donné que la page Offres est affichée avec plusieurs offres
    Et que le tableau est trié par une colonne (ordre ascendant)
    Quand je clique à nouveau sur l'en-tête de cette colonne
    Alors les lignes sont triées en ordre inverse (descendant) ou selon le cycle de tri du grid

  # --- CA6 : Vues sauvegardées — zone latérale, créer, renommer, supprimer, charger ---
  Scénario: La page Offres affiche une zone latérale gauche avec la liste des vues sauvegardées
    Étant donné que la page Offres est affichée
    Quand j'observe la zone à gauche du tableau
    Alors une zone latérale (ou panneau) affiche la liste des vues sauvegardées
    Et un moyen de "Créer une vue" est proposé (bouton ou lien)

  Scénario: En l'absence de vue sauvegardée, la vue courante utilise les paramètres par défaut
    Étant donné qu'aucune vue sauvegardée n'existe (état initial ou après suppression de toutes les vues)
    Et que la page Offres est affichée avec des offres
    Quand j'affiche la page Offres
    Alors le tableau affiche les colonnes dans l'ordre par défaut
    Et toutes les colonnes sont affichées
    Et aucun filtre n'est appliqué
    Et aucun tri personnalisé n'est appliqué (ou ordre par défaut)

  Scénario: Créer une vue enregistre le nom et les paramètres (ordre colonnes, filtre, tri)
    Étant donné que la page Offres est affichée avec des offres
    Et que j'ai modifié l'ordre des colonnes ou appliqué un filtre ou un tri
    Quand je clique sur "Créer une vue" et je saisis le nom "Ma vue filtre statut"
    Alors une nouvelle vue "Ma vue filtre statut" apparaît dans la liste des vues
    Et les paramètres courants (ordre colonnes, filtre, tri) sont associés à cette vue

  Scénario: Charger une vue applique ses paramètres au tableau
    Étant donné qu'une vue sauvegardée "Vue À traiter" existe avec un filtre Statut = "À traiter"
    Et que la page Offres est affichée (avec une autre vue ou vue par défaut)
    Quand je clique sur la vue "Vue À traiter" dans la liste des vues
    Alors le tableau affiche les paramètres de cette vue (filtre, ordre colonnes, tri)
    Et seules les offres "À traiter" sont affichées (ou cohérent avec le filtre de la vue)

  Scénario: L'utilisateur peut renommer une vue sauvegardée
    Étant donné qu'une vue "Ancien nom" existe dans la liste des vues
    Et que la page Offres est affichée
    Quand je renomme la vue "Ancien nom" en "Nouveau nom"
    Alors la vue apparaît sous le nom "Nouveau nom" dans la liste des vues
    Et "Ancien nom" n'apparaît plus dans la liste

  Scénario: L'utilisateur peut supprimer une vue sauvegardée
    Étant donné qu'une vue "Vue à supprimer" existe dans la liste des vues
    Et que la page Offres est affichée
    Quand je supprime la vue "Vue à supprimer"
    Alors la vue "Vue à supprimer" n'apparaît plus dans la liste des vues

  Scénario: Les vues sauvegardées persistent après rechargement de la page
    Étant donné qu'une vue "Vue persistante" a été créée et sauvegardée
    Quand je recharge la page Offres ou je quitte et reviens sur la page Offres
    Alors la vue "Vue persistante" est toujours présente dans la liste des vues
    Et charger cette vue applique ses paramètres au tableau
