#### US-3.2 - Récupérer l'argument qui justifie un arbitrage réhibitoire

- **En tant que** chercheur d'emploi
- **Je souhaite** que le compte-rendu de l'IA argumente la raison pour laquelle il a trouvé un critère réhibitoire
- **Afin de** pouvoir éventuellement l'annuler pour rendre éligible une offre

---

- **Critères d'acceptation** :

- **CA1 - changement du type de 'case à cocher' vers 'texte une seule ligne'
	- Lors de la création de la base de données AirTable 'CritèreRéhibitoire1...4' sont tous les cas de type 'texte une seule ligne'
	- Pas de modification du schéma existant - ça sera fait à la main

- **CA2 - changement du type de 'booleen' vers 'texte'
	- Dans le rapport d'IA au format json, pour les propriétés 'CritèreRéhibitoire1...4', ne pas retourner un booleen mais une chaine texte (dans html, sans retour de à la ligne, texte brut) où l'AI explique en une phrase courte ce qui justifie que ce critère soit 'acivé'
