# US-2.4 : Configuration ClaudeCode - Test

- **En tant qu'** utilisateur
- **Je souhaite** vérifier que les paramétrages de l'API sont corrects
- **Afin de** quitter les paramétrages en tout sérénité

---

## Critères d'acceptation

- **CA1 - Champ "Texte d'offre à tester"**  
  La section Configuration ClaudeCode propose un champ "Texte d'offre à tester" (textarea ou équivalent) pour saisir ou coller le texte d'une offre.

- **CA2 - Bouton "Récupérer le texte d'une offre"**  
  Si au moins une offre Airtable est disponible en base, un bouton "Récupérer le texte d'une offre" est affiché. Au clic, le champ "Texte d'offre à tester" prend la valeur du texte d'une offre récupérée en base (ex. champ contenu texte de la table Offres).

- **CA3 - Bouton "Tester API"**  
  Un bouton "Tester API" est affiché. Au clic :
  - Le prompt est construit : **partie obligatoire (fixe) + partie configurée (modifiable) + texte de l'offre**.
  - Ce prompt est envoyé à l'API ClaudeCode (référence : `data/ressources/analyse-offre.js` pour l’appel API).
  - **Si erreur** : affichage du code erreur (et message si disponible).
  - **Si OK** : affichage propre du résultat (pas en JSON brut : mise en page lisible, ex. champs formatés).

- **CA4 - Emplacement**  
  Ces éléments (champ texte, boutons, zone résultat) sont dans la section **Configuration ClaudeCode** de la page Paramètres.

---

*Référence : Sprint 2 « Analyse des offres » ; code exemple `.\data\ressources\analyse-offre.js`.*
