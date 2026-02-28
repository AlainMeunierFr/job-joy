# Tableau des grandes fonctionnalités et traçabilité US / CA

Tableau **TSV (tabulations)** : copiez le bloc ci-dessous et collez-le dans Excel (une colonne par tabulation).

```
Fonctionnalité émergente du code	Nb tests	Nb steps	Nb scénarios BDD	CA d'US associés (US-X.Y - CAZ)
Configuration du compte email	~40	59	12	US-1.1 - CA1, CA2, CA3
Configuration Airtable	~14	27	8	US-1.3 - CA1, CA2, CA3, CA4, CA5, CA6, CA7
Redirection paramètres (config incomplète)	~6	51	10	US-1.7 - CA (redirection, message manque)
Tableau de synthèse des offres	~24	69	14	US-1.7 - CA ; US-1.13 - CA (totaux) ; US-3.3 - CA1-CA4 ; US-3.5 - CA
Offres des emails LinkedIn	~40	44	11	US-1.5 - CA1, CA2, CA3
Offres des emails HelloWork	~8	55	7	US-1.8 / US-1.9 - CA
Offres des emails Welcome to the Jungle	~3	partagé	7	US-1.10 - CA
Offres des emails Job That Make Sense	~3	43 (jtms+ce)	10	US-1.11 - CA
Offres des emails Cadre emploi	~11	43 (jtms+ce)	10	US-1.12 - CA
Configuration ClaudeCode (API Key)	~17	60	11	US-2.2 - CA1, CA2, CA3
Configuration ClaudeCode (test offre)	~6	60 (claudecode)	8	US-2.4 - CA
Paramétrage IA (CRUD réhibitoires/scores)	~13	52	17	US-2.1 - CA (section Paramétrage prompt IA)
Prompt IA (partie fixe / modifiable)	~9	27	10	US-2.3 - CA ; US-2.1 - CA4
Comptage des appels API	~27	47	12	US-2.5 - CA (log, consommation, intention)
Sources : type et activation par phase	~29	45	10	US-3.1 - CA1, CA2 (type, 3 cases)
Gouvernance sources / audit emails	~25	35	7	US-3.1 - CA (schéma Sources, audit)
Justifications rédhibitoires (IA)	~17	24	5	US-3.2 - CA1, CA2
Audit dossier email (container supprimé)	~2	28	1	US-3.3 - CA4
Log appels API avec intention	~24	15	5	US-3.4 - CA (intention, agrégation)
Réorganisation des traitements	~2	45	10	US-3.5 - CA (une requête, bouton Mise à jour, thermomètres)
Single instance (une fenêtre, une app)	-	28	7	US-3.12 - CA
Identification utilisateurs (consentement)	~15	51	15	US-3.15 - CA1, CA2, CA3, CA4, CA5, CA6
Publication application Electron	~4	32	8	US-3.6 - CA ; US-3.8 - CA (installer, DATA_DIR)
Prérequis enrichissement (package Electron)	~5	16	5	US-4.6 - CA
Introduction au paramétrage (Avant propos)	~5	6	4	US-4.5 - CA
```

**Légende et précisions**

- **Nb tests** : nombre de tests unitaires (Jest) associés à la fonctionnalité, estimé à partir des fichiers `*.test.ts` du domaine (utils/, app/). Une partie des tests couvre plusieurs US (ex. parametres-io pour compte + consentement).
- **Nb steps** : nombre de définitions de steps (Given/When/Then) dans le fichier `.steps.ts` dédié à la feature. « (partagé) » ou « (jtms+ce) » : steps partagés entre plusieurs features (ex. offres-emails-jtms-cadreemploi.steps.ts).
- **Nb scénarios BDD** : nombre de lignes contenant « Scénario: » ou « Plan du Scénario: » dans le fichier `.feature` (Playwright BDD).
- **CA d'US** : critères d'acceptation des user stories, au format US-X.Y - CAZ (ex. US-1.1 - CA1, CA2, CA3). Les CA détaillés sont dans `.cursor/sprints/.../US-X.Y - Titre.md`.

**Convention de traçabilité**

- **Explicite** : le `.feature` contient un tag `@us-X.Y` ou un commentaire du type « CAZ US-X.Y » ; le lien code ↔ US est direct.
- **Sémantique** : le lien est déduit du nom de la feature, des steps et du code (handlers, utils) couverts par les scénarios et les tests.

**Fichiers sources**

- BDD : `tests/bdd/*.feature`, `tests/bdd/*.steps.ts`
- US / CA : `.cursor/sprints/**/US-*.md`
- Tests unitaires : `app/**/*.test.ts`, `utils/**/*.test.ts`
