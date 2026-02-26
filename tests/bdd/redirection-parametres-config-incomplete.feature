# language: fr
Fonctionnalité: Redirection vers les paramètres tant que la configuration n'est pas complète
  En tant qu'utilisateur qui n'a pas encore terminé les paramétrages, je souhaite être amené
  directement sur les paramètres et ne pas avoir accès au tableau de bord, afin de ne pas
  perdre mon temps sur un tableau de bord qui ne ferait que m'envoyer des messages d'erreur.

  Paramétrages complets = connexion (compte email) OK + Airtable OK.

  # --- CA1 : Redirection vers Paramètres ; menu Tableau de bord masqué si config incomplète ---
  Plan du Scénario: À l'arrivée sur l'application, si la configuration est incomplète, redirection vers Paramètres ; le menu Tableau de bord est masqué
    Étant donné que "<état connexion email>"
    Et que "<état Airtable>"
    Quand j'arrive sur l'application
    Alors je suis redirigé vers la page Paramètres
    Et le menu "Tableau de bord" est masqué

    Exemples:
      | état connexion email | état Airtable |
      | la connexion email n'est pas OK | Airtable est OK |
      | la connexion email est OK | Airtable n'est pas OK |
      | la connexion email n'est pas OK | Airtable n'est pas OK |

  Scénario: Avec configuration incomplète, le menu Tableau de bord est masqué (pas de lien à cliquer)
    Étant donné que la connexion email n'est pas OK
    Quand j'arrive sur l'application
    Alors je suis redirigé vers la page Paramètres
    Et le menu "Tableau de bord" est masqué

  # --- CA2 : Enregistrer à tout moment, sauvegarde partielle, message d'erreur si incomplet, données conservées ---
  Scénario: Enregistrer sur la page Paramètres enregistre les données saisies même si la configuration est incomplète
    Étant donné que je suis sur la page Paramètres
    Et que la connexion email n'est pas encore OK
    Et que j'ai saisi des valeurs dans les champs
    Quand je clique sur le bouton Enregistrer
    Alors les données saisies sont sauvegardées
    Et je reste sur la page Paramètres ou un message confirme l'enregistrement partiel

  Scénario: Après enregistrement avec configuration incomplète, un message d'erreur indique ce qu'il reste à terminer
    Étant donné que je suis sur la page Paramètres
    Et que la configuration est incomplète
    Quand j'enregistre les paramètres
    Alors un message d'erreur est affiché
    Et le message indique ce qu'il reste à terminer (connexion email et/ou Airtable)

  Plan du Scénario: Le message d'erreur précise l'élément manquant selon le cas
    Étant donné que je suis sur la page Paramètres
    Et que "<élément manquant>"
    Quand j'enregistre les paramètres
    Alors un message d'erreur est affiché
    Et le message indique "<élément à terminer>"

    Exemples:
      | élément manquant | élément à terminer |
      | la connexion email n'est pas OK | la connexion email ou le compte email |
      | Airtable n'est pas OK | la configuration Airtable |
      | la connexion email et Airtable ne sont pas OK | la connexion email et la configuration Airtable |

  Scénario: Après enregistrement partiel, les données déjà enregistrées sont conservées
    Étant donné que j'ai enregistré des paramètres partiels (par exemple uniquement le compte email)
    Quand je me rends à nouveau sur la page Paramètres
    Alors les valeurs précédemment enregistrées sont affichées
    Et aucune donnée enregistrée n'a été perdue

  # --- CA3 : Configuration complète + Enregistrer → pas d'erreur, menu Tableau de bord visible, redirection ---
  Scénario: Lorsque la connexion email et Airtable sont OK et que j'enregistre, aucun message d'erreur n'est affiché
    Étant donné que la connexion email est OK
    Et que la configuration Airtable est OK
    Et que je suis sur la page Paramètres
    Quand j'enregistre les paramètres
    Alors aucun message d'erreur n'est affiché
    Et un message de succès ou une confirmation est affiché

  Scénario: Lorsque la configuration est complète, le menu "Tableau de bord" est visible
    Étant donné que la connexion email est OK
    Et que la configuration Airtable est OK
    Quand je suis sur l'application (page Paramètres ou après redirection)
    Alors le menu "Tableau de bord" est visible
    Et le menu "Tableau de bord" est accessible

  Scénario: Après enregistrement avec configuration complète, je suis redirigé vers le tableau de bord
    Étant donné que la connexion email est OK
    Et que la configuration Airtable est OK
    Et que je suis sur la page Paramètres
    Quand j'enregistre les paramètres
    Alors je suis redirigé vers le tableau de bord
    Et la page affichée est le tableau de bord

  Scénario: À l'arrivée sur l'application avec configuration complète, l'utilisateur accède au tableau de bord (pas de redirection forcée vers Paramètres)
    Étant donné que la connexion email est OK
    Et que la configuration Airtable est OK
    Quand j'arrive sur l'application
    Alors je ne suis pas redirigé vers la page Paramètres
    Et je peux accéder au tableau de bord (page d'accueil ou tableau de bord affiché)
