# Sprint 7 — Abandonner AirTable pour les sources

Document regroupant le **contexte d’origine** (abandon Airtable pour les sources) et les **cinq User Stories** découpées pour limiter le risque.

---

## Contexte et genèse : pourquoi abandonner Airtable pour les sources

Lors de l’audit d’architecture et des problèmes rencontrés, les points suivants ont conduit à abandonner la table **Sources** dans Airtable :

1. **Doublons à chaque redémarrage**  
   Des sources apparaissaient en double (ex. « liste html/mantiks » plusieurs fois). Le nombre de doublons était égal au nombre de fois où le serveur avait été relancé. La cause identifiée : un **bug dans les critères de recherche Airtable** avant création (la vérification « cette source existe déjà ? » ne fonctionnait pas correctement).

2. **Coût API disproportionné**  
   La table Sources dans Airtable consommait beaucoup de tokens API pour un usage limité : lecture/écriture des sources et des activations.

3. **Données réellement modifiables**  
   Les seules données que l’utilisateur a besoin de modifier sur les sources sont les **activations** (création, enrichissement, analyse IA). Ces modifications peuvent être faites depuis le tableau de bord (clic sur la coche verte / le bonhomme qui dort).

**Décision** : sérialiser les sources dans un fichier local **`.\data\sources.json`** et ne plus utiliser Airtable pour la table Sources. Les activations sont modifiables via le tableau de bord et persistées dans ce fichier.

Par la suite, le modèle a été précisé : abandon du terme technique « plugin » au profit de **« source »** (une source = une plateforme), et une structure cible « une entrée par source » avec liste d’emails, activations par phase, etc. Pour ne pas tout faire en une seule US trop ambitieuse, le découpage **Elephant Carpaccio** ci-dessous propose cinq US successives.
