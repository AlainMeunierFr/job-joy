/**
 * Port d'envoi email identification (US-3.15).
 * From=adresse du compte, To=alain@maep.fr, sujet et corps fixés.
 * Le corps inclut en fin le numéro de version et la date/heure de publication si disponibles.
 */
import type { EnvoyeurEmailIdentification, ParametresEmailIdentification } from '../types/compte.js';
import { getVersionEtBuildTime } from './read-build-info.js';
import { getTexteConsentementIdentificationAvecVersion } from './texte-consentement-identification.js';

const DESTINATAIRE = 'alain@maep.fr';
const SUJET = 'nouvel utilisateur job-joy';

export function getParametresEmailIdentification(adresseCompte: string): ParametresEmailIdentification {
  const { version, buildTime } = getVersionEtBuildTime();
  return {
    from: adresseCompte,
    to: DESTINATAIRE,
    subject: SUJET,
    body: getTexteConsentementIdentificationAvecVersion({ version, buildTime }),
  };
}

export async function envoyerEmailIdentification(
  adresseCompte: string,
  port: EnvoyeurEmailIdentification
): Promise<{ ok: true } | { ok: false; message: string }> {
  const params = getParametresEmailIdentification(adresseCompte);
  return port.envoyer(params);
}
