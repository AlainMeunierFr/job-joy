/**
 * Construction du prompt IA pour l'analyse des offres (US-2.3).
 * Partie fixe + partie modifiable (stockée dans parametres.json).
 */
import type { ParametrageIA } from '../types/parametres.js';
import { lirePartieModifiablePrompt } from './parametres-io.js';

/** Valeur par défaut de la partie modifiable : rôle, ton, éléments à mentionner, placeholders pour critères. */
const PARTIE_MODIFIABLE_DEFAUT = `**Rôle** : Tu es un agent de veille emploi pour le candidat.

**Ton du résumé** : Factuel et neutre. Mentionne ce qui correspond au profil, les points incertains et les points de vigilance.

**Critères rédhibitoires** (à évaluer en booléen) : {{REHIBITOIRE1_TITRE}} — {{REHIBITOIRE1_DESCRIPTION}} ; {{REHIBITOIRE2_TITRE}} — {{REHIBITOIRE2_DESCRIPTION}} ; {{REHIBITOIRE3_TITRE}} — {{REHIBITOIRE3_DESCRIPTION}} ; {{REHIBITOIRE4_TITRE}} — {{REHIBITOIRE4_DESCRIPTION}}.

**Scores incontournables** (note 0-20) : Localisation {{SCORE_LOCALISATION}} ; Salaire {{SCORE_SALAIRE}} ; Culture {{SCORE_CULTURE}} ; Qualité de l'offre {{SCORE_QUALITE_OFFRE}}.

**Scores optionnels** : {{SCORE_OPTIONNEL1_TITRE}} — {{SCORE_OPTIONNEL1_ATTENTE}} ; etc.

**Autres ressources** : {{AUTRES_RESSOURCES}}
`;

/**
 * Retourne la valeur par défaut de la partie modifiable du prompt (qualité professionnelle).
 */
export function getPartieModifiablePromptDefaut(): string {
  return PARTIE_MODIFIABLE_DEFAUT;
}

/** Partie fixe du prompt : tâche (sans la liste des clés, construite dynamiquement). */
const PARTIE_FIXE_PROMPT_IA_AVANT_FORMAT = `Tu analyses une offre d'emploi pour compléter les champs structurés et produire un résumé.

**Tâche** : À partir du texte de l'offre, corriger / améliorer / compléter les champs : Poste, Entreprise, Ville, Département (déduire si besoin), Salaire, Date_offre. Produire un résumé (Résumé_IA) centré sur les centres d'intérêt du candidat.

`;

/**
 * Nombre de critères rédhibitoires réellement configurés (titre ou description non vide), consécutifs à partir du premier.
 */
function nombreRehibitoiresConfigures(parametrageIA: ParametrageIA | null): number {
  if (!parametrageIA?.rehibitoires?.length) return 0;
  let n = 0;
  for (const r of parametrageIA.rehibitoires) {
    const rempli = !!((r.titre ?? '').trim() || (r.description ?? '').trim());
    if (!rempli) break;
    n++;
  }
  return n;
}

/**
 * Nombre de scores optionnels réellement configurés (titre ou attente non vide), consécutifs à partir du premier.
 */
function nombreScoresOptionnelsConfigures(parametrageIA: ParametrageIA | null): number {
  if (!parametrageIA?.scoresOptionnels?.length) return 0;
  let n = 0;
  for (const s of parametrageIA.scoresOptionnels) {
    const rempli = !!((s.titre ?? '').trim() || (s.attente ?? '').trim());
    if (!rempli) break;
    n++;
  }
  return n;
}

const CLES_BASE_TEXTE = [
  'Poste',
  'Entreprise',
  'Ville',
  'Département',
  'Date_offre',
  'Salaire',
  'Résumé_IA',
] as const;

const CLES_SCORES_INCONTOURNABLES = [
  'ScoreLocalisation',
  'ScoreSalaire',
  'ScoreCulture',
  'ScoreQualitéOffre',
] as const;

/**
 * Retourne la liste des clés JSON attendues (pour validation de conformité).
 * Même logique que construireListeClesJson mais en tableau.
 */
export function getClesAttenduesJson(parametrageIA: ParametrageIA | null): string[] {
  const nbRehib = nombreRehibitoiresConfigures(parametrageIA);
  const nbOptionnels = nombreScoresOptionnelsConfigures(parametrageIA);
  const clesRehib = Array.from({ length: nbRehib }, (_, i) => `Réhibitoire${i + 1}`);
  const clesOptionnels = Array.from({ length: nbOptionnels }, (_, i) => `ScoreOptionnel${i + 1}`);
  return [
    ...CLES_BASE_TEXTE,
    ...clesRehib,
    ...CLES_SCORES_INCONTOURNABLES,
    ...clesOptionnels,
  ];
}

/**
 * Construit la liste explicite des clés JSON à demander (sans abréviation "1...4").
 * Seuls les réhibitoires et scores optionnels configurés sont inclus.
 */
export function construireListeClesJson(parametrageIA: ParametrageIA | null): string {
  return getClesAttenduesJson(parametrageIA).join(', ');
}

/**
 * Section "Format de réponse" du prompt : règles strictes + liste des clés (explicite, sans "1...4").
 * N'inclut que les réhibitoires et scores optionnels réellement configurés.
 */
function getSectionFormatReponse(parametrageIA: ParametrageIA | null): string {
  const nbRehib = nombreRehibitoiresConfigures(parametrageIA);
  const nbOptionnels = nombreScoresOptionnelsConfigures(parametrageIA);
  const nomsRehib = Array.from({ length: nbRehib }, (_, i) => `Réhibitoire${i + 1}`).join(', ');
  const nomsOptionnels = Array.from({ length: nbOptionnels }, (_, i) => `ScoreOptionnel${i + 1}`).join(', ');
  const lignesRehib = nbRehib > 0 ? `- ${nomsRehib} : booléen strict (true ou false).\n` : '';
  const lignesOptionnels = nbOptionnels > 0 ? `- ${nomsOptionnels} : entier entre 0 et 20 inclus.\n` : '';

  const listeCles = construireListeClesJson(parametrageIA);

  return `**Format de réponse** : Répondre uniquement par un objet JSON valide, sans texte avant ni après. Ne pas inclure d'exemple, ni de commentaire, ni de bloc markdown (pas de \`\`\`) : uniquement l'objet JSON brut. Utiliser uniquement les clés listées ci-dessous (aucune clé supplémentaire). Ne pas inclure de clé pour un critère ou score non défini dans le prompt.

Règles strictes pour un JSON exploitable :
- Champs texte (Poste, Entreprise, Ville, Département, Date_offre, Salaire, Résumé_IA) : toujours des chaînes. Si l'information est absente, utiliser "" (chaîne vide). Ne jamais utiliser null.
- Résumé_IA : un seul paragraphe, factuel, sans formatage markdown (pas de **, pas de listes à puces). Deux à quatre phrases maximum.
${lignesRehib}- ScoreLocalisation, ScoreSalaire, ScoreCulture, ScoreQualitéOffre : entier entre 0 et 20 inclus.
${lignesOptionnels}
Clés à inclure (dans cet ordre, uniquement celles listées) :
${listeCles}

`;
}

/** Partie fixe du prompt (tâche + format) avec paramétrage null : export pour tests. */
export const PARTIE_FIXE_PROMPT_IA =
  PARTIE_FIXE_PROMPT_IA_AVANT_FORMAT + getSectionFormatReponse(null);

/**
 * Partie fixe du prompt pour affichage ou envoi : inclut la section format avec uniquement les clés configurées.
 * À utiliser avec le parametrageIA courant pour que la "partie fixe" affichée reflète les champs configurés.
 */
export function getPartieFixePromptIA(parametrageIA: ParametrageIA | null): string {
  return PARTIE_FIXE_PROMPT_IA_AVANT_FORMAT + getSectionFormatReponse(parametrageIA);
}

/**
 * Retourne la partie modifiable du prompt à utiliser (enregistrée ou valeur par défaut).
 */
function getPartieModifiablePourConstruction(dataDir: string): string {
  const stocke = lirePartieModifiablePrompt(dataDir);
  return stocke !== '' ? stocke : PARTIE_MODIFIABLE_DEFAUT;
}

/**
 * Construit le prompt complet : partie fixe + section format (clés dynamiques selon paramétrage) + partie modifiable.
 * Seuls les réhibitoires et scores optionnels configurés sont demandés dans le JSON.
 */
export function construirePromptComplet(
  dataDir: string,
  parametrageIA: ParametrageIA | null
): string {
  const partieModifiable = getPartieModifiablePourConstruction(dataDir);
  const partieModifiableInjectee = injecterParametrageIA(partieModifiable, parametrageIA);
  const sectionFormat = getSectionFormatReponse(parametrageIA);
  return PARTIE_FIXE_PROMPT_IA_AVANT_FORMAT + sectionFormat + partieModifiableInjectee;
}

/**
 * Remplace les placeholders dans le texte par les valeurs de parametrageIA (si définis).
 */
function injecterParametrageIA(texte: string, parametrageIA: ParametrageIA | null): string {
  if (!parametrageIA) return texte;
  let out = texte;
  parametrageIA.rehibitoires?.forEach((r, i) => {
    out = out.replace(new RegExp(`\\{\\{REHIBITOIRE${i + 1}_TITRE\\}\\}`, 'g'), r.titre || '');
    out = out.replace(new RegExp(`\\{\\{REHIBITOIRE${i + 1}_DESCRIPTION\\}\\}`, 'g'), r.description || '');
  });
  if (parametrageIA.scoresIncontournables) {
    out = out.replace(/\{\{SCORE_LOCALISATION\}\}/g, parametrageIA.scoresIncontournables.localisation ?? '');
    out = out.replace(/\{\{SCORE_SALAIRE\}\}/g, parametrageIA.scoresIncontournables.salaire ?? '');
    out = out.replace(/\{\{SCORE_CULTURE\}\}/g, parametrageIA.scoresIncontournables.culture ?? '');
    out = out.replace(/\{\{SCORE_QUALITE_OFFRE\}\}/g, parametrageIA.scoresIncontournables.qualiteOffre ?? '');
  }
  parametrageIA.scoresOptionnels?.forEach((s, i) => {
    out = out.replace(new RegExp(`\\{\\{SCORE_OPTIONNEL${i + 1}_TITRE\\}\\}`, 'g'), s.titre || '');
    out = out.replace(new RegExp(`\\{\\{SCORE_OPTIONNEL${i + 1}_ATTENTE\\}\\}`, 'g'), s.attente || '');
  });
  out = out.replace(/\{\{AUTRES_RESSOURCES\}\}/g, parametrageIA.autresRessources ?? '');
  return out;
}
