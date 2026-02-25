# language: fr
Fonctionnalité: Single instance (une seule fenêtre, une seule instance de l'app)
  En tant qu'utilisateur de Job-Joy, je souhaite que l'application n'ouvre qu'une seule fenêtre
  et qu'une seule instance soit active à la fois, afin d'éviter la confusion, les conflits
  de données et la multiplication des processus (serveur, ressources).

  Contexte: application Electron Job-Joy (desktop). Un second lancement ne doit pas créer
  de deuxième processus ni de deuxième fenêtre ; la fenêtre existante doit repasser au premier plan.

  # --- CA1 : Une seule instance ---
  Scénario: Au premier lancement, une seule instance de l'application tourne et une fenêtre s'ouvre
    Étant donné que l'application n'est pas déjà en cours d'exécution
    Quand l'utilisateur lance l'application (exe, raccourci ou menu Démarrer)
    Alors une seule instance de Job-Joy tourne sur la machine
    Et une seule fenêtre de l'application s'ouvre

  Scénario: Un second lancement ne crée pas de deuxième instance ni de deuxième fenêtre
    Étant donné qu'une instance de Job-Joy est déjà en cours d'exécution
    Et qu'une fenêtre de l'application est déjà ouverte
    Quand l'utilisateur relance l'application (double-clic exe, raccourci ou nouvelle ouverture)
    Alors aucune deuxième instance de Job-Joy n'est créée
    Et aucune deuxième fenêtre n'est ouverte

  # --- CA2 : Comportement au second lancement (focus et restauration) ---
  Scénario: Au second lancement, la fenêtre existante repasse au premier plan
    Étant donné qu'une instance de Job-Joy est déjà en cours d'exécution
    Et que la fenêtre de l'application est ouverte (éventuellement en arrière-plan)
    Quand l'utilisateur relance l'application (même exe, même raccourci ou autre raccourci)
    Alors la fenêtre existante de Job-Joy repasse au premier plan (focus)
    Et aucune nouvelle fenêtre n'est ouverte
    Et l'utilisateur voit immédiatement l'application déjà ouverte

  Scénario: Au second lancement, si la fenêtre était minimisée, elle est restaurée puis mise au premier plan
    Étant donné qu'une instance de Job-Joy est déjà en cours d'exécution
    Et que la fenêtre de l'application est minimisée
    Quand l'utilisateur relance l'application
    Alors la fenêtre existante est restaurée (plus minimisée)
    Et elle repasse au premier plan (focus)
    Et aucune nouvelle fenêtre n'est ouverte

  # --- CA3 (optionnel) : Message si focus impossible ---
  Scénario: Si le focus sur la fenêtre existante est impossible, un message indique que l'app est déjà ouverte
    Étant donné qu'une instance de Job-Joy est déjà en cours d'exécution
    Et que le focus sur la fenêtre existante n'est pas possible (ex. fenêtre sur un autre bureau virtuel)
    Quand l'utilisateur relance l'application
    Alors un message explicite indique à l'utilisateur que l'application est déjà ouverte
    Et aucune seconde fenêtre n'est ouverte

  # --- CA4 : Vérification testable (une seule instance détectable) ---
  Scénario: Après le premier lancement, une seule instance est détectable (processus ou verrou)
    Étant donné que l'application n'est pas déjà en cours d'exécution
    Quand l'utilisateur lance l'application
    Alors une seule instance est détectable (un seul processus applicatif Job-Joy ou un seul verrou d'instance / port)
    Et une fenêtre est ouverte

  Scénario: Après tentative de second lancement, une seule instance reste détectable
    Étant donné qu'une instance de Job-Joy est déjà en cours d'exécution (une fenêtre ouverte)
    Quand l'utilisateur tente de relancer l'application (second lancement)
    Alors une seule instance reste détectable (aucun nouveau processus ni nouveau verrou créé)
    Et aucune nouvelle fenêtre n'est créée
