/**
 * Contrôle du schéma Airtable table Offres : comparaison avec les enums canoniques du code.
 * Récupère toutes les colonnes (nom, type, valeurs autorisées) et signale les écarts.
 * Permet de s'adapter aux renommages faits par les utilisateurs dans Airtable.
 */
import { getBaseSchema, type TableSchema } from './airtable-ensure-enums.js';
import { STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';
import { SOURCES_NOMS_AIRTABLE } from './plugins-sources-airtable.js';

/** Méthodes de création (US-7.2 CA5). */
const METHODES_CREATION_CANONIQUES = ['email', 'liste html', 'manuelle'] as const;

/** Définition canonique d'un champ Offres (alignée sur airtable-driver-reel). */
export type ChampOffresCanonique = {
  /** Nom du champ dans le code (création table). */
  name: string;
  /** Type Airtable attendu (optionnel : on ne bloque pas si différent). */
  type?: string;
  /** Pour singleSelect : valeurs attendues (optionnel). */
  singleSelectChoices?: readonly string[];
};

/** Schéma canonique de la table Offres (source unique : airtable-driver-reel + enums). */
export const OFFRES_SCHEMA_CANONIQUE: readonly ChampOffresCanonique[] = [
  { name: 'UID', type: 'singleLineText' },
  { name: 'Id offre', type: 'singleLineText' },
  { name: 'URL', type: 'url' },
  { name: "Texte de l'offre", type: 'multilineText' },
  { name: 'Poste', type: 'singleLineText' },
  { name: 'Entreprise', type: 'singleLineText' },
  { name: 'Ville', type: 'singleLineText' },
  { name: 'Département', type: 'singleLineText' },
  { name: 'Salaire', type: 'singleLineText' },
  { name: 'DateOffre', type: 'dateTime' },
  { name: 'DateAjout', type: 'dateTime' },
  { name: 'Statut', type: 'singleSelect', singleSelectChoices: STATUTS_OFFRES_AIRTABLE },
  { name: 'source', type: 'singleSelect', singleSelectChoices: [...SOURCES_NOMS_AIRTABLE, 'manuelle'] },
  { name: 'Méthode de création', type: 'singleSelect', singleSelectChoices: [...METHODES_CREATION_CANONIQUES] },
  { name: 'Résumé', type: 'multilineText' },
  { name: 'CritèreRéhibitoire1', type: 'singleLineText' },
  { name: 'CritèreRéhibitoire2', type: 'singleLineText' },
  { name: 'CritèreRéhibitoire3', type: 'singleLineText' },
  { name: 'CritèreRéhibitoire4', type: 'singleLineText' },
  { name: 'ScoreCritère1', type: 'number' },
  { name: 'ScoreCritère2', type: 'number' },
  { name: 'ScoreCritère3', type: 'number' },
  { name: 'ScoreCritère4', type: 'number' },
  { name: 'ScoreCulture', type: 'number' },
  { name: 'ScoreLocalisation', type: 'number' },
  { name: 'ScoreSalaire', type: 'number' },
  { name: 'ScoreQualiteOffre', type: 'number' },
  { name: 'Score_Total', type: 'number' },
  { name: 'Verdict', type: 'singleLineText' },
];

/** Résultat du contrôle : mapping nom canonique → nom réel Airtable + erreurs / avertissements. */
export type ResultatControleSchemaOffres = {
  ok: boolean;
  /** Table trouvée (id Airtable). */
  tableId?: string;
  /** Nom canonique → nom réel dans la base (pour appels API). */
  fieldNameMap: Record<string, string>;
  /** Noms canoniques des champs absents dans Airtable. */
  champsManquants: string[];
  /** Champs canoniques absents ou invalides (messages). */
  errors: string[];
  /** Types ou options différents sans bloquer. */
  warnings: string[];
};

function findTable(schema: TableSchema[], tableIdOrName: string): TableSchema | undefined {
  const key = (tableIdOrName ?? '').trim();
  if (!key) return undefined;
  const keyLower = key.toLowerCase();
  return (
    schema.find((t) => (t.id ?? '').toLowerCase() === keyLower) ??
    schema.find((t) => (t.name ?? '').trim().toLowerCase() === keyLower)
  );
}

/** Compare un nom canonique à un nom Airtable (insensible à la casse, trim). */
function namesMatch(canonical: string, actual: string): boolean {
  return (canonical ?? '').trim().toLowerCase() === (actual ?? '').trim().toLowerCase();
}

/**
 * Récupère le schéma de la table Offres depuis Airtable (API Meta), compare avec le schéma canonique,
 * et retourne un mapping nom canonique → nom réel + liste d'erreurs et d'avertissements.
 */
export async function controlOffresSchema(
  baseId: string,
  offresId: string,
  apiKey: string
): Promise<ResultatControleSchemaOffres> {
  const result: ResultatControleSchemaOffres = {
    ok: true,
    fieldNameMap: {},
    champsManquants: [],
    errors: [],
    warnings: [],
  };

  const schema = await getBaseSchema(baseId, apiKey);
  if (!schema?.length) {
    result.errors.push('Impossible de récupérer le schéma de la base (API Meta).');
    result.ok = false;
    return result;
  }

  const table = findTable(schema, offresId);
  if (!table?.id) {
    result.errors.push(`Table Offres introuvable (id ou nom: ${offresId}). Vérifiez l'ID table dans Paramètres.`);
    result.ok = false;
    return result;
  }

  result.tableId = table.id;
  const airtableFields = table.fields ?? [];

  for (const canon of OFFRES_SCHEMA_CANONIQUE) {
    const canonicalName = canon.name.trim();
    const found = airtableFields.find((f) => namesMatch(canonicalName, f.name ?? ''));
    if (!found) {
      result.champsManquants.push(canonicalName);
      result.errors.push(`Champ attendu absent dans Airtable : « ${canonicalName} ».`);
      result.fieldNameMap[canonicalName] = canonicalName;
      continue;
    }

    const actualName = (found.name ?? '').trim();
    result.fieldNameMap[canonicalName] = actualName;

    if (canon.type && found.type && found.type !== canon.type) {
      result.warnings.push(`Champ « ${actualName} » : type attendu ${canon.type}, type actuel ${found.type}.`);
    }

    if (canon.singleSelectChoices?.length && found.options?.choices?.length) {
      const actualChoices = new Set((found.options.choices ?? []).map((c) => (c.name ?? '').trim()).filter(Boolean));
      for (const choice of canon.singleSelectChoices) {
        const hasMatch = [...actualChoices].some((a) => a.toLowerCase() === choice.toLowerCase());
        if (!hasMatch) {
          result.warnings.push(`Champ « ${actualName} » (single select) : valeur canonique « ${choice} » absente des options Airtable.`);
        }
      }
    }
  }

  if (result.errors.length > 0) result.ok = false;
  return result;
}

/**
 * Retourne le nom réel Airtable d'un champ à partir du contrôle.
 * Utilise le mapping ; si absent, retourne le nom canonique.
 */
export function nomReelChamp(controle: ResultatControleSchemaOffres, nomCanonique: string): string {
  return controle.fieldNameMap[nomCanonique] ?? nomCanonique.trim();
}
