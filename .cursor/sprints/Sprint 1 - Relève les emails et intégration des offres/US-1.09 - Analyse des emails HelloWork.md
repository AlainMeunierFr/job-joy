En tant qu'utilisateur
Je souhaite que les offres contenues dans les emails reçus par HelloWork soient ajoutées dans la table "Offres"
Afin de pouvoir les faire analyser par une IA

CA1 : init sources AirTable
- ajouter "HelloWork" à la liste des "Plugin" sur AirTable

CA2 : audit
- lorsqu'un email avec un expéditeur contient "...HelloWork.com" l'insérer avec l'plugin "HelloWork" et l'activer

CA3 : lancer le traitement : implémenter l'étape 1 pour un plug-in "HelloWork"
- Lire le Body de l'email pour y récolter un maximum d'information pour alimenter la table "Offres"
- s'aider des exemples dans ".\tests\exemples\notification@emails.hellowork.com
- s'aider du code déja existant dans ".\data\ressources\AnalyseeMailHelloWork.js"
- on remarquera dans le code exemple js nous avons compris que l'URL est encodée en base64 et qu'on peut la décoder.

CA4 : du travial pour le worker : implémenter l'étape 2 pour un plug-in "HelloWork"
- une fois l'URL résolue (base64 to "normal") à l'étape 1, l'étape 2 se passe normalement sans problème
- s'aider du code déja existant dans ".\data\ressources\AnalyseeMailHelloWork.js"
