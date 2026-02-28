# GO FIN — Tunnel sans revues utilisateur

**Commande** : `GO FIN [US-x.y|lane]`

**Effet** : Le Lead Dev enchaîne le tunnel (BDD → TDD-back-end → TDD-front-end → Designer → done) en mode **Task** sans solliciter l'utilisateur pour les revues. Il fait lui-même chaque revue après livraison d'un sous-agent, rédige le rapport, puis délègue à l'agent suivant. Il **ne s'interrompt** pour poser une question à l'utilisateur **que si un arbitrage est nécessaire** (décision fonctionnelle, règle ambiguë, conflit).

**À utiliser** : quand tu veux laisser le Lead Dev aller au bout du tunnel sans valider étape par étape.
