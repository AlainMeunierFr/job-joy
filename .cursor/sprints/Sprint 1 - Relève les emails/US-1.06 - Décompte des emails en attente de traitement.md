# US-1.5 - Decompte des emails en attente de traitement

## User Story

En tant qu'utilisateur du tableau de bord  
Je souhaite auditer le contenu du dossier de ma BAL  
Afin de savoir quels emails seront analyses et/ou archives au prochain traitement

## Exemple

Given un dossier de boite aux lettres contenant 7 emails :
- email 1 from `alerte@emails.hellowork.com`
- email 2 from `jobs@linkedin.com`
- email 3 from `alerte@emails.hellowork.com`
- email 4 from `alerte@emails.hellowork.com`
- email 5 from `alerte@wttj.com`
- email 6 from `jobs@linkedin.com`
- email 7 from `jobs@linkedin.com`

## Criteres d'acceptation

### CA1 - Audit des sources + tableau de synthese

- Une passe d'audit scanne le dossier BAL et aligne les sources avec Airtable.
- Le tableau de synthese affiche exactement les colonnes suivantes :
  - `emailExpediteur`
  - `algo`
  - `actif`
  - `nbEmails`

Tableau attendu (exemple) :

| emailExpediteur | algo | actif | nbEmails |
| --- | --- | --- | --- |
| jobs@linkedin.com | Linkedin | true | 3 |
| alerte@emails.hellowork.com | Inconnu | false | 3 |
| alerte@wttj.com | Inconnu | true | 1 |

### CA2 - Sous-totaux previsionnels

Sous le tableau, afficher :
- `emailsAArchiver` (nombre d'emails qui seraient deplaces vers le dossier archive)
- `emailsAAnalyser` (nombre d'emails qui seraient effectivement analyses)

### CA3 - Ordre IHM

- Le bouton `Auditer le dossier` est au-dessus du tableau.
- Le bouton `Lancer le traitement` est en dessous des sous-totaux.

### CA4 - Ouverture directe Airtable

- Sous le bouton `Lancer le traitement`, afficher un bouton `Ouvrir Airtable`.
- Le clic ouvre la base Airtable dans un nouvel onglet.
- Pas de nouvelle API dediee : l'URL est injectee directement dans la page HTML par le serveur.
