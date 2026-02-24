/**
 * Mapping JSON analyse IA → champs Airtable (US-3.2).
 */
import type { ChampsOffreAirtable } from './enrichissement-offres.js';
import { STATUT_A_TRAITER } from './enrichissement-offres.js';

export const MAX_LONGUEUR_JUSTIFICATION_AIRTABLE = 500;

/**
 * Construit les champs Airtable à partir du JSON renvoyé par l'IA (Résumé déjà calculé).
 * Mapping JSON IA → noms de colonnes Airtable.
 */
export function jsonToChampsOffreAirtable(
  json: Record<string, unknown>,
  resume: string
): ChampsOffreAirtable {
  const champs: ChampsOffreAirtable = {
    Résumé: resume,
    Statut: STATUT_A_TRAITER,
  };
  const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  if (texte(json.Poste)) champs.Poste = texte(json.Poste);
  if (texte(json.Entreprise)) champs.Entreprise = texte(json.Entreprise);
  if (texte(json.Ville)) champs.Ville = texte(json.Ville);
  if (texte(json.Département)) champs.Département = texte(json.Département);
  if (texte(json.Salaire)) champs.Salaire = texte(json.Salaire);
  if (texte(json.Date_offre)) champs.DateOffre = texte(json.Date_offre);
  // US-2.1 / US-3.2 : CritèreRéhibitoire1..4 sont des colonnes "texte une seule ligne" dans Airtable (pas des cases à cocher).
  // On envoie la justification (chaîne) ou une chaîne vide si le critère n'est pas rédhibitoire.
  for (let i = 1; i <= 4; i++) {
    const v = json[`Réhibitoire${i}`];
    const justification = typeof v === 'string' ? v.trim() : '';
    const truncated =
      justification.length > MAX_LONGUEUR_JUSTIFICATION_AIRTABLE
        ? justification.slice(0, MAX_LONGUEUR_JUSTIFICATION_AIRTABLE)
        : justification;
    (champs as Record<string, unknown>)[`CritèreRéhibitoire${i}`] = truncated;
  }
  const score = (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 20 ? v : undefined;
  const sLoc = score(json.ScoreLocalisation);
  if (sLoc !== undefined) champs.ScoreLocalisation = sLoc;
  const sSal = score(json.ScoreSalaire);
  if (sSal !== undefined) champs.ScoreSalaire = sSal;
  const sCul = score(json.ScoreCulture);
  if (sCul !== undefined) champs.ScoreCulture = sCul;
  const sQual = score(json.ScoreQualitéOffre);
  if (sQual !== undefined) champs.ScoreQualiteOffre = sQual;
  for (let i = 1; i <= 4; i++) {
    const v = score(json[`ScoreOptionnel${i}`]);
    if (v !== undefined) (champs as Record<string, unknown>)[`ScoreCritère${i}`] = v;
  }
  return champs;
}
