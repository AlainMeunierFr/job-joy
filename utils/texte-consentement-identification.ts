/**
 * Texte du consentement identification (US-3.15).
 * Source unique pour le corps de l'email envoyé à alain@maep.fr.
 */
const TEXTE_CONSENTEMENT_IDENTIFICATION =
  'En envoyant cet email, je consens à informer Alain Meunier que j\'utilise le logiciel « job-joy » et à ce que mon adresse email (expéditeur de ce message) soit utilisée pour le support et les retours beta.\n\n' +
  'job-joy est un logiciel libre diffusé sous licence GNU GPL (https://www.gnu.org/licenses/gpl.html). Je comprends que mon adresse ne sera utilisée que dans ce cadre (identification utilisateur / support).';

function formatBuildTime(iso: string): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${date} à ${time}`;
  } catch {
    return iso;
  }
}

export function getTexteConsentementIdentification(): string {
  return TEXTE_CONSENTEMENT_IDENTIFICATION;
}

/** Options pour ajouter version et date de publication à la fin du corps. */
export interface ConsentementAvecVersionOptions {
  version?: string;
  buildTime?: string | null;
}

/**
 * Retourne le texte du consentement avec, à la fin, le numéro de version et la date/heure de publication si fournis.
 */
export function getTexteConsentementIdentificationAvecVersion(
  options?: ConsentementAvecVersionOptions
): string {
  const base = TEXTE_CONSENTEMENT_IDENTIFICATION;
  const { version, buildTime } = options ?? {};
  if (!version && !buildTime) return base;
  const parts: string[] = [base, '', '---'];
  if (version) parts.push(`Version ${version}`);
  if (buildTime) parts.push(`Publiée le : ${formatBuildTime(buildTime)}`);
  return parts.join('\n');
}
