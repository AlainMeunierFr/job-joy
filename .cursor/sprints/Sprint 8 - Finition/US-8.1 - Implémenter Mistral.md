# US-8.1 - Implémenter Mistral.txt

Remplacer ClaudeCode par Mistral


# CA1 - Paramétrage nouvelle ApiKey
- dans la page "paramètres" le container "API Claude Code" est renommé "API IA"
- pour construire le contenu du container utiliser ".\ressourcesCréationCompteMistral.html" (toute "CréationCompteClaudeCode.html" (qui n'existe plus )mais 
- l'API Key récupée par le formulaire est stockée **chiffée** dans "paramètres.json"

# CA2 - Configuraiton complète
- la récupération de l'APIKey Mistral n'est plus requise
- au charmgent de la page :
. si l'APIKey Mistral est manquante le container s'ouvre par défaut
. si elle est renseignée le container est fermé par défaut

# CA3 - Appel pour la phase 3 = "Analyse"
- Remplacer le code d'appel à l'API Claude par celui d'appel à l'APIKey Mistral
- Le faire aussi pour le bouton "Tester API" de "Prompt de l'IA" dans la page "paramètres"

# CA4 - Suppresion ancienne ApiKey
- L'ApiKey ClaudeCode n'est plus requise dans aucun endroit du code
- Le fichier ".\CréationCompteClaudeCode.html" n'est plus disponible
- la récupération de l'APIKey Claude n'est plus requise pur que la configuration soit complète
