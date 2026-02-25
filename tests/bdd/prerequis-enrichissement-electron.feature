# language: fr
@us-4.6 @electron @enrichissement
Fonctionnalité: Prérequis techniques d'enrichissement dans le package Electron
  En tant que beta testeur utilisant l'application installée via le package Electron (sans environnement de dev),
  je souhaite que tous les prérequis techniques nécessaires à l'enrichissement des offres soient inclus dans l'installateur,
  afin de lancer l'étape d'enrichissement pour toutes les sources supportées sans installer ni configurer de navigateur ni binaires supplémentaires.

  Contexte:
    Les prérequis techniques (ex. capacité à charger des pages pour LinkedIn et Cadre emploi) sont livrés avec l'app.
    Clés API, configuration compte (email, Airtable) restent à la charge de l'utilisateur.

  # --- CA1 : Enrichissement LinkedIn en package Electron ---
  Scénario: En package Electron, l'enrichissement LinkedIn récupère le contenu des pages sans installation Playwright par l'utilisateur
    Étant donné que l'application packagée est lancée (version Electron)
    Et que l'utilisateur n'a pas exécuté "npx playwright install" ni configuré de chemin vers un navigateur
    Et que la table Offres contient une ligne avec Statut "Annonce à récupérer" et une URL d'offre LinkedIn
    Et que le texte complet de la page d'offre est accessible pour cette URL (mock ou service disponible)
    Quand je lance l'enrichissement des offres à récupérer
    Alors la ligne Offres correspondante a les champs renseignés à partir du texte récupéré (ex. Texte de l'offre, Poste, Entreprise)
    Et le statut de cette offre n'est plus "Annonce à récupérer"

  # --- CA2 : Enrichissement Cadre emploi en package Electron ---
  Scénario: En package Electron, l'enrichissement Cadre emploi récupère le contenu des pages sans installation supplémentaire
    Étant donné que l'application packagée est lancée (version Electron)
    Et que l'utilisateur n'a pas exécuté de commande d'installation de binaires ni configuré de chemin navigateur
    Et qu'une offre Cadre emploi en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Et que le contenu de la page d'offre est accessible pour cette URL
    Quand je lance l'étape 2 d'enrichissement des offres à récupérer
    Alors cette offre est mise à jour dans la table Offres
    Et le champ "Texte de l'offre" est renseigné
    Et le statut de cette offre devient "À analyser" ou reflète un enrichissement réussi

  # --- CA3 : Autres sources (HelloWork, WTTJ, JTMS) sans régression en package ---
  Scénario: En package Electron, l'enrichissement HelloWork continue de fonctionner sans régression
    Étant donné que l'application packagée est lancée (version Electron)
    Et qu'une offre HelloWork en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Quand je lance l'étape 2 d'enrichissement des offres à récupérer
    Alors cette offre est mise à jour dans la table Offres
    Et le champ "Texte de l'offre" est renseigné

  Scénario: En package Electron, l'enrichissement Welcome to the Jungle continue de fonctionner sans régression
    Étant donné que l'application packagée est lancée (version Electron)
    Et qu'une offre Welcome to the Jungle en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable
    Quand je lance l'étape 2 d'enrichissement des offres à récupérer
    Alors cette offre est mise à jour dans la table Offres
    Et le champ "Texte de l'offre" est renseigné

  # --- CA4 : Comportement en dev inchangé ---
  Scénario: En mode développement, l'enrichissement des offres à récupérer reste fonctionnel (LinkedIn ou Cadre emploi)
    Étant donné que l'application est lancée en mode développement (ex. npm run dev ou node dist/app/server.js)
    Et qu'une offre en statut "Annonce à récupérer" existe dans la table Offres pour une source nécessitant un navigateur (LinkedIn ou Cadre emploi) avec une URL exploitable
    Et que les prérequis d'enrichissement sont disponibles en environnement de dev (binaires Playwright ou équivalent selon config)
    Quand je lance l'enrichissement des offres à récupérer
    Alors l'enrichissement s'exécute sans erreur bloquante liée au mode (dev vs packagé)
    Et l'offre est mise à jour dans la table Offres ou une cause d'échec explicite est consignée

  # --- CA5 : Aucune action technique requise pour le beta testeur ---
  # Couvert par les scénarios CA1 et CA2 : si l'enrichissement LinkedIn/Cadre emploi aboutit en package sans
  # que l'utilisateur ait exécuté "npx playwright install" ni configuré de chemin navigateur, CA5 est satisfait.
