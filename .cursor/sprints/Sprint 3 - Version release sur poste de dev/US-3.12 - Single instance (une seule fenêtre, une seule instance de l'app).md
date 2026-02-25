#### US-3.12 : Single instance (une seule fenêtre, une seule instance de l'app)

- **En tant que** utilisateur de Job-Joy
- **Je souhaite** que l'application n'ouvre qu'une seule fenêtre et qu'une seule instance soit active à la fois
- **Afin de** éviter la confusion, les conflits de données et la multiplication des processus (serveur, ressources)

---

**Critères d'acceptation** :

- **CA1 - Une seule instance** :
  - Au lancement de l'application (exe, raccourci ou menu Démarrer), une seule instance de Job-Joy tourne sur la machine (un seul processus applicatif, un seul serveur local).
  - Un second lancement (double-clic sur l'exe, raccourci, ou nouvelle ouverture) ne crée pas de deuxième instance ni de deuxième fenêtre.

- **CA2 - Comportement au second lancement** :
  - Lorsqu'une instance est déjà en cours d'exécution et que l'utilisateur relance l'app (même exe, même raccourci, autre raccourci), la fenêtre existante de Job-Joy repasse au premier plan (focus) et est restaurée si elle était minimisée.
  - Aucune nouvelle fenêtre n'est ouverte ; l'utilisateur voit immédiatement l'application déjà ouverte.

- **CA3 - Message ou feedback explicite (optionnel ou complément)** :
  - Si le focus sur la fenêtre existante n'est pas possible dans un cas particulier (ex. fenêtre sur un autre bureau virtuel), un message explicite peut indiquer à l'utilisateur que l'application est déjà ouverte (sans ouvrir de seconde fenêtre).

- **CA4 - Vérification testable** :
  - On peut vérifier qu'un seul processus serveur (ou un seul processus Electron/Job-Joy) écoute sur le port prévu (ou qu'un seul instance lock existe), et qu'un second lancement n'en crée pas un nouveau.
