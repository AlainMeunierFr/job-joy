# Exemples HTML par source

Ce dossier contient les `body html` réels versionnés pour les tests de non-régression.

Convention:

- `tests/exemples/<Source>/`
- Exemple LinkedIn: `tests/exemples/LinkedIn/`

Règle d'auto-capture:

- Lors de la relève, si `tests/exemples/<Source>/` contient moins de 3 fichiers `.html`,
  les prochains body lus sont archivés automatiquement jusqu'à atteindre 3.
- Une fois 3 fichiers présents, plus aucune capture n'est ajoutée.
