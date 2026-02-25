# language: fr
Fonctionnalité: Introduction au process de paramétrage
  En tant qu'utilisateur qui ouvre la page Paramètres, je souhaite voir en tête un bloc « Avant propos »
  (contenu personnalisable via ressources/guides/AvantPropos.html) afin d'avoir du contexte avant les blocs de configuration.

  Contexte:
    Étant donné que je suis sur la page Paramètres

  Scénario: La page Paramètres affiche le bloc Avant propos en premier
    Alors la page Paramètres affiche un bloc introductif identifié comme section d'introduction (titre ou libellé explicite)
    Et ce bloc introductif est affiché en premier sur la page, avant tout bloc de configuration (Airtable, compte email, ClaudeCode, etc.)

  Scénario: Le bloc Avant propos est repliable comme les autres sections
    Alors le bloc introductif est un bloc repliable (details) avec le libellé "Avant propos"
    Et le bloc introductif a le même style de container que les autres sections (blocParametrage)

  Scénario: Quand les paramètres sont incomplets le bloc Avant propos est ouvert à l'ouverture
    Étant donné que la configuration est incomplète
    Quand j'arrive sur l'application
    Alors je suis redirigé vers la page Paramètres
    Et le bloc introductif est déroulé (ouvert)

  Scénario: Quand les paramètres sont complets le bloc Avant propos est fermé à l'ouverture
    Étant donné que la connexion email est OK
    Et que la configuration Airtable est OK
    Quand je suis sur la page Paramètres
    Alors le bloc introductif est enroulé (fermé)
