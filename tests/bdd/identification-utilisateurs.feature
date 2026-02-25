# language: fr
Fonctionnalité: Identification des utilisateurs (consentement et notification par email)
  En tant qu'utilisateur de job-joy, je souhaite pouvoir consentir à communiquer mon adresse
  email lors de la configuration du compte, et que cette information soit envoyée à l'équipe
  support, afin d'être identifié pour le support et les retours beta.

  # --- CA1 : Consentement lors de la configuration du compte ---
  Contexte:
    Étant donné que je suis sur la page de paramétrage du compte email

  Scénario: La page Paramètres affiche une case à cocher pour le consentement à communiquer l'email
    Alors la page comporte une case à cocher relative au consentement pour le support et les retours beta
    Et le libellé de la case mentionne l'acceptation d'informer l'équipe job-joy et de communiquer l'adresse email pour le support et les retours beta

  Scénario: La valeur de la case consentement est enregistrée avec les paramètres du compte
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que je coche la case de consentement à communiquer mon email
    Et que les champs compte email (adresse, mot de passe, dossier) sont valides
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors les paramètres du compte sont sauvegardés avec succès
    Et la valeur du consentement (coché) est enregistrée avec le compte

  Scénario: L'enregistrement sans case consentement cochée enregistre le consentement à non
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que la case de consentement n'est pas cochée
    Et que les champs compte email sont valides
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors les paramètres du compte sont sauvegardés avec succès
    Et la valeur du consentement (non coché) est enregistrée avec le compte

  Scénario: Au rechargement de la page Paramètres, l'état de la case consentement est restauré
    Étant donné que le compte a été enregistré avec la case consentement cochée
    Quand je me rends sur la page de paramétrage
    Alors la case de consentement à communiquer mon email est cochée

  Scénario: Au rechargement sans consentement précédent, la case consentement est décochée
    Étant donné que le compte a été enregistré sans consentement (case non cochée)
    Quand je me rends sur la page de paramétrage
    Alors la case de consentement à communiquer mon email n'est pas cochée

  # --- CA2 : Envoi d'un email de notification lorsque le consentement est donné ---
  Scénario: Enregistrement avec consentement coché envoie un email à alain@maep.fr
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que le champ adresse email contient "utilisateur@example.com"
    Et que les champs mot de passe et dossier sont valides
    Et que je coche la case de consentement à communiquer mon email
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors la sauvegarde des paramètres réussit
    Et un email est envoyé à "alain@maep.fr"

  Scénario: Enregistrement sans consentement coché n'envoie aucun email
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que les champs compte email sont valides
    Et que la case de consentement n'est pas cochée
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors la sauvegarde des paramètres réussit
    Et aucun email n'est envoyé à "alain@maep.fr"

  Scénario: En cas d'échec de validation ou de connexion, aucun email n'est envoyé
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que je coche la case de consentement à communiquer mon email
    Et que les champs compte email sont invalides ou la connexion échoue
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors la sauvegarde des paramètres échoue ou un message d'erreur est affiché
    Et aucun email n'est envoyé à "alain@maep.fr"

  # --- CA3 : Contenu de l'email envoyé ---
  Scénario: L'email envoyé a pour expéditeur l'adresse du compte configuré
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que le champ adresse email contient "moncompte@domaine.fr"
    Et que les champs mot de passe et dossier sont valides
    Et que je coche la case de consentement à communiquer mon email
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors un email est envoyé à "alain@maep.fr"
    Et l'email a pour expéditeur (From) "moncompte@domaine.fr"

  Scénario: L'email envoyé a pour destinataire alain@maep.fr et le sujet "nouvel utilisateur job-joy"
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que le champ adresse email contient "user@test.fr"
    Et que les champs mot de passe et dossier sont valides
    Et que je coche la case de consentement à communiquer mon email
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors un email est envoyé à "alain@maep.fr"
    Et l'email a pour sujet "nouvel utilisateur job-joy"

  Scénario: Le corps de l'email contient le texte du consentement (identification, support, retours beta, GNU GPL)
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que les champs compte email sont valides
    Et que je coche la case de consentement à communiquer mon email
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors un email est envoyé à "alain@maep.fr"
    Et le corps de l'email contient le texte de consentement mentionnant Alain Meunier, job-joy, support et retours beta
    Et le corps de l'email mentionne la licence GNU GPL

  # --- CA4 : Un seul envoi par consentement ---
  Scénario: Premier enregistrement avec consentement coché déclenche un envoi, ré-enregistrement sans changement n'en déclenche pas
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que les champs compte email sont valides
    Et que je coche la case de consentement à communiquer mon email
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors un email est envoyé à "alain@maep.fr"
    Étant donné que je suis à nouveau sur la page de paramétrage (compte déjà enregistré avec consentement)
    Et que la case consentement est toujours cochée
    Quand je modifie un autre champ puis j'enregistre les paramètres en cliquant sur Enregistrer
    Alors la sauvegarde réussit
    Et aucun nouvel email n'est envoyé à "alain@maep.fr" (un seul envoi au total pour ce consentement)

  Scénario: Passage de consentement non coché à coché déclenche un envoi ; re-enregistrement ensuite n'en déclenche pas un second
    Étant donné que le compte a été enregistré sans consentement (case non cochée)
    Et que je suis sur la page de paramétrage
    Et que je coche la case de consentement à communiquer mon email
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors un email est envoyé à "alain@maep.fr"
    Étant donné que je suis à nouveau sur la page de paramétrage
    Et que la case consentement est toujours cochée
    Quand j'enregistre les paramètres en cliquant sur Enregistrer sans modifier le consentement
    Alors aucun nouvel email n'est envoyé à "alain@maep.fr"

  # --- CA5 : Échec d'envoi non bloquant ---
  Scénario: Si l'envoi de l'email échoue, la sauvegarde du compte et du consentement est tout de même réussie
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que les champs compte email sont valides
    Et que je coche la case de consentement à communiquer mon email
    Et que l'envoi d'email (réseau, SMTP) échouera
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors la sauvegarde des paramètres du compte est considérée comme réussie
    Et la valeur du consentement (coché) est enregistrée avec le compte
    Et l'utilisateur peut continuer à utiliser l'application (pas de blocage)

  Scénario: En cas d'échec d'envoi, l'erreur est signalée de façon non bloquante
    Étant donné que je suis sur la page de paramétrage du compte email
    Et que les champs compte email sont valides
    Et que je coche la case de consentement à communiquer mon email
    Et que l'envoi d'email échouera
    Quand j'enregistre les paramètres en cliquant sur Enregistrer
    Alors un message informatif ou un log signale l'échec d'envoi
    Et aucun message bloquant n'empêche l'utilisateur de poursuivre
