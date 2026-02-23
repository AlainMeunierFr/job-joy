/**
 * Extraction et validation du JSON renvoyé par l'IA (analyse d'offres).
 * Gère les réponses entourées de markdown (```json ... ```) ou avec du texte avant/après.
 * Retourne le détail de l'erreur si le JSON est invalide.
 * Valide aussi la conformité au schéma attendu (clés + types).
 */
import type { ParametrageIA } from '../types/parametres.js';
import { getClesAttenduesJson } from './prompt-ia.js';

export type ResultatParseJsonIA =
  | { ok: true; json: Record<string, unknown> }
  | { ok: false; error: string };

export type ResultatConformiteJsonIA =
  | { conform: true }
  | { conform: false; errors: string[] };

/**
 * Extrait un objet JSON du texte brut (réponse Claude) et le parse.
 * - Ignore les blocs markdown ```json ... ``` ou ``` ... ```
 * - Cherche le premier { et le dernier } pour délimiter l'objet
 * En cas d'échec, retourne le message d'erreur exact (ex. "Unexpected token 'H' at position 0").
 */
export function parseJsonReponseIA(texte: string): ResultatParseJsonIA {
  const trimmed = (texte ?? '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Réponse vide.' };
  }
  let candidat = trimmed;
  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/m);
  if (codeBlockMatch) {
    candidat = codeBlockMatch[1].trim();
  }
  const firstBrace = candidat.indexOf('{');
  const lastBrace = candidat.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { ok: false, error: 'Aucun objet JSON trouvé (pas de { ... }).' };
  }
  const jsonStr = candidat.slice(firstBrace, lastBrace + 1);
  try {
    const json = JSON.parse(jsonStr) as Record<string, unknown>;
    if (json === null || typeof json !== 'object' || Array.isArray(json)) {
      return { ok: false, error: 'La racine doit être un objet JSON, pas un tableau ni null.' };
    }
    return { ok: true, json };
  } catch (err) {
    const message = err instanceof SyntaxError ? err.message : err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Clés dont la valeur doit être une chaîne. */
const CLES_TEXTE = new Set([
  'Poste',
  'Entreprise',
  'Ville',
  'Département',
  'Date_offre',
  'Salaire',
  'Résumé_IA',
]);

/**
 * Vérifie que l'objet JSON est conforme au schéma attendu (clés présentes, types corrects, pas de clés en trop).
 * À appeler après parseJsonReponseIA quand ok est true.
 */
export function validerConformiteJsonIA(
  json: Record<string, unknown>,
  parametrageIA: ParametrageIA | null
): ResultatConformiteJsonIA {
  const attendues = new Set(getClesAttenduesJson(parametrageIA));
  const errors: string[] = [];

  for (const key of Object.keys(json)) {
    if (!attendues.has(key)) {
      errors.push(`Clé non attendue : "${key}".`);
    }
  }

  for (const key of attendues) {
    const v = json[key];
    if (v === undefined) {
      errors.push(`Clé manquante : "${key}".`);
      continue;
    }
    if (CLES_TEXTE.has(key)) {
      if (typeof v !== 'string') {
        errors.push(`"${key}" doit être une chaîne (reçu: ${typeof v}).`);
      }
      continue;
    }
    if (key.startsWith('Réhibitoire')) {
      if (typeof v !== 'boolean') {
        errors.push(`"${key}" doit être un booléen (reçu: ${typeof v}).`);
      }
      continue;
    }
    if (key.startsWith('Score')) {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 20) {
        errors.push(`"${key}" doit être un entier entre 0 et 20 (reçu: ${JSON.stringify(v)}).`);
      }
      continue;
    }
  }

  if (errors.length === 0) return { conform: true };
  return { conform: false, errors };
}
