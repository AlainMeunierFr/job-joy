Analyse les erreurs du pipeline à partir des logs, sans relancer les tests.

**À faire :**
1. Lire les **logs d'erreur du pipeline** (emplacement défini par le projet, ex. `logs/*-errors.txt` ou équivalent) pour identifier l'étape en échec et le message d'erreur.
2. Si pertinent, lire le **fichier de résultats de tests** (ex. `test-results.json`) pour le détail des tests en échec.
3. Proposer les corrections en te basant sur ces fichiers. Ne pas relancer la suite de tests pour « identifier » les erreurs — le log est la source de vérité après un run du script.
