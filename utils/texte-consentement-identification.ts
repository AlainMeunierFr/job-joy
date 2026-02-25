/**
 * Texte du consentement identification (US-3.15).
 * Source unique pour le corps de l'email envoyé à alain@maep.fr.
 */
const TEXTE_CONSENTEMENT_IDENTIFICATION =
  'En envoyant cet email, je consens à informer Alain Meunier que j\'utilise le logiciel « job-joy » et à ce que mon adresse email (expéditeur de ce message) soit utilisée pour le support et les retours beta.\n\n' +
  'job-joy est un logiciel libre diffusé sous licence GNU GPL (https://www.gnu.org/licenses/gpl.html). Je comprends que mon adresse ne sera utilisée que dans ce cadre (identification utilisateur / support).';

export function getTexteConsentementIdentification(): string {
  return TEXTE_CONSENTEMENT_IDENTIFICATION;
}
