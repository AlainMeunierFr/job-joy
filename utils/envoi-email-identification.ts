/**
 * Port d'envoi email identification (US-3.15).
 * From=adresse du compte, To=alain@maep.fr, sujet et corps fixés.
 */
import type { EnvoyeurEmailIdentification, ParametresEmailIdentification } from '../types/compte.js';
import { getTexteConsentementIdentification } from './texte-consentement-identification.js';

const DESTINATAIRE = 'alain@maep.fr';
const SUJET = 'nouvel utilisateur job-joy';

export function getParametresEmailIdentification(adresseCompte: string): ParametresEmailIdentification {
  return {
    from: adresseCompte,
    to: DESTINATAIRE,
    subject: SUJET,
    body: getTexteConsentementIdentification(),
  };
}

export async function envoyerEmailIdentification(
  adresseCompte: string,
  port: EnvoyeurEmailIdentification
): Promise<{ ok: true } | { ok: false; message: string }> {
  const params = getParametresEmailIdentification(adresseCompte);
  return port.envoyer(params);
}
