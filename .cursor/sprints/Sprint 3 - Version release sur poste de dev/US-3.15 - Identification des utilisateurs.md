#### US-3.15 : Identification des utilisateurs (consentement et notification par email)

- **En tant qu’** utilisateur de job-joy
- **Je souhaite** pouvoir consentir à communiquer mon adresse email lors de la configuration du compte, et que cette information soit envoyée à l’équipe support
- **Afin d’** être identifié comme utilisateur pour le support et les retours beta (sans implémenter un vrai multi-utilisateur)

---

- **Critères d'acceptation** :

- **CA1 - Consentement lors de la configuration du compte** :
  - Sur la page de paramétrage du compte email (Paramètres), une **case à cocher** permet à l’utilisateur de donner son **consentement à communiquer son email** pour identification / support / retours beta.
  - Le libellé de la case est explicite (ex. « J’accepte d’informer l’équipe job-joy de mon utilisation et de communiquer mon adresse email pour le support et les retours beta »).
  - La valeur (coché / non coché) est enregistrée avec les autres paramètres du compte (ex. dans le même formulaire et le même flux d’enregistrement).

- **CA2 - Envoi d'un email de notification lorsque le consentement est donné** :
  - Lorsque l’utilisateur **enregistre** le compte (soumission du formulaire Paramètres) **avec la case consentement cochée**, l’application utilise la **boîte aux lettres (BAL) du compte qui vient d’être configuré** pour envoyer **un seul email** à l’adresse **alain@maep.fr**.
  - L’envoi a lieu après la sauvegarde réussie des paramètres du compte (pas en cas d’erreur de validation ou d’échec de connexion).
  - Si la case n’est pas cochée, aucun email n’est envoyé.

- **CA3 - Contenu de l'email envoyé** :
  - **De (From)** : l’adresse du compte qui vient d’être configuré (celle saisie dans le formulaire).
  - **À (To)** : alain@maep.fr.
  - **Sujet** : « nouvel utilisateur job-joy ».
  - **Corps du mail** : le **texte du consentement** (référence ci-dessous). Ce texte rappelle que l’utilisateur consente à informer Alain Meunier de son utilisation de job-joy et à ce que son email soit utilisé pour le support et les retours beta, et mentionne la licence GNU GPL.

- **CA4 - Un seul envoi par consentement** :
  - L’email n’est envoyé qu’**une fois** lors de l’enregistrement du compte **avec** consentement coché. Les enregistrements ultérieurs (modification du compte sans changer le consentement, ou avec consentement déjà donné précédemment) ne déclenchent pas un nouvel envoi (à définir : par ex. un flag « email identification déjà envoyé » stocké avec le compte, ou envoi uniquement si « passage de non coché à coché »).

- **CA5 - Échec d'envoi non bloquant** :
  - Si l’envoi de l’email échoue (réseau, refus SMTP, etc.), la **sauvegarde du compte et du consentement** est tout de même considérée comme réussie. L’erreur peut être loguée ou affichée de façon non bloquante (message informatif), sans empêcher l’utilisateur d’utiliser l’app.

---

**Référence – Texte du consentement (corps du mail)**

À utiliser comme corps de l’email envoyé à alain@maep.fr (source unique de vérité : à mettre dans le code ou une ressource).

> En envoyant cet email, je consens à informer Alain Meunier que j'utilise le logiciel « job-joy » et à ce que mon adresse email (expéditeur de ce message) soit utilisée pour le support et les retours beta.
>
> job-joy est un logiciel libre diffusé sous licence GNU GPL (https://www.gnu.org/licenses/gpl.html). Je comprends que mon adresse ne sera utilisée que dans ce cadre (identification utilisateur / support).
