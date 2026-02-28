/**
 * Code générique pour ajouter des options à un champ single select (API Meta).
 * Reprend la logique qui fonctionnait pour Sources.source ; utilisé aussi pour Offres.Statut.
 * Pour Statut : on envoie les couleurs par défaut du code (aucune lecture API des couleurs).
 */
import { STATUTS_OFFRES_AIRTABLE_WITH_COLORS, STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';
import { SOURCES_NOMS_AIRTABLE } from './plugins-sources-airtable.js';

/** Choix : libellé seul ou libellé + couleur (utilisée à la création de l'option). */
export type SingleSelectChoiceInput = string | { name: string; color?: string };

const API_BASE = 'https://api.airtable.com/v0';

export type TableSchema = {
  id: string;
  name?: string;
  fields?: Array<{
    id: string;
    name?: string;
    type?: string;
    options?: {
      choices?: Array<{ name?: string }>;
      linkedTableId?: string;
    };
  }>;
};

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json; charset=UTF-8',
  };
}

/** Récupère le schéma des tables de la base (API Meta). */
export async function getBaseSchema(
  baseId: string,
  apiKey: string
): Promise<TableSchema[]> {
  const res = await fetch(`${API_BASE}/meta/bases/${baseId}/tables`, {
    method: 'GET',
    headers: headers(apiKey),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { tables?: TableSchema[] } | TableSchema[];
  const tables = Array.isArray(json) ? json : (json as { tables?: TableSchema[] }).tables ?? [];
  return tables.map((t) => ({
    id: t.id,
    name: t.name,
    fields: t.fields ?? [],
  }));
}

/**
 * Résout une table par id (tblXXX) ou par nom (ex. Offres, Sources).
 * Même logique que l’ancien code pour Sources.
 */
function findTable(schema: TableSchema[], tableIdOrName: string): TableSchema | undefined {
  const key = (tableIdOrName ?? '').trim();
  if (!key) return undefined;
  const keyLower = key.toLowerCase();
  return (
    schema.find((t) => (t.id ?? '').toLowerCase() === keyLower) ??
    schema.find((t) => (t.name ?? '').trim().toLowerCase() === keyLower)
  );
}

/** Noms des champs pour lister les offres (tableau de synthèse), alignés sur le schéma réel. */
export type OffresListFieldNames = { sourceFieldName: string; statutFieldName: string };

/**
 * Récupère les noms réels des champs source et statut de la table Offres depuis l'API Meta.
 * Fallback : noms du code d'initialisation (airtable-driver-reel) : source, Statut.
 */
export async function getOffresListFieldNames(
  baseId: string,
  offresId: string,
  apiKey: string
): Promise<OffresListFieldNames> {
  try {
    const schema = await getBaseSchema(baseId, apiKey);
    const table = findTable(schema, offresId);
    if (!table?.fields?.length) return { sourceFieldName: 'source', statutFieldName: 'Statut' };
    const sourceField = table.fields.find((f) => (f.name ?? '').trim().toLowerCase() === 'source');
    const statutField = table.fields.find((f) => (f.name ?? '').trim().toLowerCase() === 'statut');
    return {
      sourceFieldName: sourceField?.name?.trim() ?? 'source',
      statutFieldName: statutField?.name?.trim() ?? 'Statut',
    };
  } catch {
    return { sourceFieldName: 'source', statutFieldName: 'Statut' };
  }
}

/**
 * Ajoute les options manquantes à un champ single select (API Meta PATCH).
 * Logique identique à l’ancien ensureSingleSelect pour Sources.source, rendue générique.
 */
export async function ensureSingleSelectChoices(
  baseId: string,
  tableIdOrName: string,
  fieldName: string,
  choicesFromCode: readonly SingleSelectChoiceInput[],
  apiKey: string
): Promise<boolean> {
  const schema = await getBaseSchema(baseId, apiKey);
  const table = findTable(schema, tableIdOrName);
  if (!table?.id) return false;
  const field = table.fields?.find(
    (f) => (f.name ?? '').trim().toLowerCase() === fieldName.trim().toLowerCase() && f.type === 'singleSelect'
  );
  if (!field?.id) return false;
  const namesFromCode = choicesFromCode.map((c) => (typeof c === 'string' ? c : c.name).trim()).filter(Boolean);
  const colorMap = new Map<string, string>();
  for (const c of choicesFromCode) {
    if (typeof c === 'object' && c.color) colorMap.set(c.name.trim(), c.color);
  }
  const current = (field.options?.choices ?? []).map((c) => (c.name ?? '').trim()).filter(Boolean);
  const merged = [...new Set([...current, ...namesFromCode])];
  if (merged.length === current.length) return true;
  const updateUrl = `${API_BASE}/meta/bases/${baseId}/tables/${table.id}/fields/${field.id}`;
  const choicesBody = merged.map((name) => {
    const color = colorMap.get(name);
    return color ? { name, color } : { name };
  });
  const res = await fetch(updateUrl, {
    method: 'PATCH',
    headers: headers(apiKey),
    body: JSON.stringify({
      type: 'singleSelect',
      options: { choices: choicesBody },
    }),
  });
  return res.ok;
}

/**
 * Fallback : ajoute une valeur manquante (ex. après 422).
 * Utilise la liste complète du code pour fusionner les choix (avec couleurs si fournies).
 */
export async function ensureSingleSelectOption(
  baseId: string,
  tableIdOrName: string,
  fieldName: string,
  optionValue: string,
  allChoicesFromCode: readonly SingleSelectChoiceInput[],
  apiKey: string
): Promise<boolean> {
  const names = allChoicesFromCode.map((c) => (typeof c === 'string' ? c : c.name).trim());
  const list = names.includes(optionValue.trim())
    ? allChoicesFromCode
    : [...allChoicesFromCode, typeof allChoicesFromCode[0] === 'object' ? { name: optionValue } : optionValue];
  return ensureSingleSelectChoices(baseId, tableIdOrName, fieldName, list, apiKey);
}

/**
 * CA US-2.7 : s'assure que la table Offres a un champ Score_Total de type number (1 décimale).
 * - Si le champ n'existe pas : le crée en number avec precision 1.
 * - Si le champ existe en texte (ou autre) : tente un PATCH pour le passer en number (l'API Meta peut refuser le changement de type ; dans ce cas, passer la colonne en « Nombre » manuellement dans Airtable).
 */
const SCORE_TOTAL_PRECISION = 1;

export async function ensureScoreTotalIsNumber(
  baseId: string,
  tableIdOrName: string,
  apiKey: string
): Promise<boolean> {
  const schema = await getBaseSchema(baseId, apiKey);
  const table = findTable(schema, tableIdOrName);
  if (!table?.id) return false;
  const fieldName = 'Score_Total';
  const field = table.fields?.find(
    (f) => (f.name ?? '').trim().toLowerCase() === fieldName.toLowerCase()
  );
  if (!field) {
    try {
      const createUrl = `${API_BASE}/meta/bases/${baseId}/tables/${table.id}/fields`;
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({
          name: fieldName,
          type: 'number',
          options: { precision: SCORE_TOTAL_PRECISION },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  if (field.type === 'number') return true;
  try {
    const updateUrl = `${API_BASE}/meta/bases/${baseId}/tables/${table.id}/fields/${field.id}`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: headers(apiKey),
      body: JSON.stringify({
        type: 'number',
        options: { precision: SCORE_TOTAL_PRECISION },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn(
        `[Airtable] Score_Total est actuellement en type "${field.type ?? '?'}". Passage en "number" refusé (${res.status}). Passez la colonne Score_Total en « Nombre » manuellement dans Airtable. Détail: ${body || res.statusText}`
      );
    }
    return res.ok;
  } catch (err) {
    console.warn('[Airtable] ensureScoreTotalIsNumber: PATCH échoué', err);
    return false;
  }
}

/**
 * Synchro de l'énumération Offres.Statut (US-7.2 : plus de table Sources).
 */
export async function ensureAirtableEnums(
  apiKey: string,
  baseId: string,
  offresId: string
): Promise<{ statut: boolean }> {
  const statut = await ensureSingleSelectChoices(baseId, offresId, 'Statut', STATUTS_OFFRES_AIRTABLE_WITH_COLORS, apiKey);
  return { statut };
}

export { STATUTS_OFFRES_AIRTABLE, STATUTS_OFFRES_AIRTABLE_WITH_COLORS, SOURCES_NOMS_AIRTABLE };
