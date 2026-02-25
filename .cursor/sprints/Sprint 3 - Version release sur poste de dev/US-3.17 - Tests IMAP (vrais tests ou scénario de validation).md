# US-3.17 — Tests IMAP (vrais tests ou scénario de validation)

Tests ou scénario de validation avec une vraie connexion IMAP (ou un serveur mock réaliste), pour éviter les régressions sur le flux « compte email » avant et pendant les beta.

**Cible produit** : Outlook.fr — compte Microsoft perso. Microsoft impose OAuth (pas d’IMAP avec mot de passe). Le test d’intégration ci‑dessous reste donc sur un fournisseur IMAP (ex. Gmail avec mot de passe d’app) ; la prise en charge Outlook/OAuth fera l’objet d’une autre US.

## Scénario de validation (connexion IMAP réelle)

Un test d’intégration exécute une vraie connexion IMAP uniquement si les variables d’environnement sont définies (sinon le test est ignoré, ex. en CI).

### Où mettre login et mot de passe

**Fichier `.env.local`** à la racine du projet (il est dans `.gitignore`, donc jamais versionné). Ajoute par exemple :

```
# Compte de test IMAP (US-3.17) — ne pas committer
IMAP_TEST_HOST=imap.example.com
IMAP_TEST_USER=ton-compte-test@example.com
IMAP_TEST_PASS=ton-mot-de-passe
IMAP_TEST_FOLDER=INBOX
```

Optionnelles : `IMAP_TEST_PORT` (défaut 993), `IMAP_TEST_SECURE` (défaut true).

**Gmail** : IMAP est possible avec un **mot de passe d'application** dans `IMAP_TEST_PASS` (pas le mot de passe du compte). Création : compte Google → Sécurité → Validation en 2 étapes activée → Mots de passe des applications. Hôte : `imap.gmail.com`. (Outlook/Microsoft impose OAuth, pas d’IMAP classique.)

Le test charge `.env.local` au démarrage, donc après avoir enregistré le fichier il suffit de lancer :

```bash
npm run test:integration:imap
```

Fichier du test : `utils/connecteur-email-imap.integration.test.ts`.
