/**
 * Code générique pour ajouter des options à un champ single select (API Meta).
 * Reprend la logique qui fonctionnait pour Sources.plugin ; utilisé aussi pour Offres.Statut.
 * Pour Statut : on envoie les couleurs par défaut du code (aucune lecture API des couleurs).
 */
import { STATUTS_OFFRES_AIRTABLE_WITH_COLORS, STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';
import { PLUGINS_SOURCES_AIRTABLE } from './plugins-sources-airtable.js';

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

/**
 * Ajoute les options manquantes à un champ single select (API Meta PATCH).
 * Logique identique à l’ancien ensurePluginChoice pour Sources.plugin, rendue générique.
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
 * Synchro des énumérations : Sources.plugin et Offres.Statut.
 * Même code générique pour les deux.
 */
export async function ensureAirtableEnums(
  apiKey: string,
  baseId: string,
  sourcesId: string,
  offresId: string
): Promise<{ plugin: boolean; statut: boolean }> {
  const plugin = await ensureSingleSelectChoices(baseId, sourcesId, 'plugin', PLUGINS_SOURCES_AIRTABLE, apiKey);
  const statut = await ensureSingleSelectChoices(baseId, offresId, 'Statut', STATUTS_OFFRES_AIRTABLE_WITH_COLORS, apiKey);
  return { plugin, statut };
}

/**
 * Ajoute dans la table Offres un seul champ lookup : Source - plugin (pour afficher le plugin source dans Offres).
 * Pas de lookup emailExpéditeur (la FK est le champ lien). Pas de lookup actif.
 */
export async function ensureLookupsOffresFromSources(
  baseId: string,
  sourcesId: string,
  offresId: string,
  apiKey: string
): Promise<void> {
  const schema = await getBaseSchema(baseId, apiKey);
  if (schema.length === 0) {
    console.warn('[Airtable] ensureLookups: schéma base vide (API Meta indisponible ?).');
    return;
  }
  const tableOffres = findTable(schema, offresId);
  const tableSources = findTable(schema, sourcesId);
  if (!tableOffres?.id || !tableSources?.id) {
    console.warn('[Airtable] ensureLookups: table Offres ou Sources introuvable dans le schéma.');
    return;
  }

  // Champ lien Offres → Sources : par nom "email expéditeur" ou par type + linkedTableId
  const linkField = tableOffres.fields?.find((f) => {
    if (f.type !== 'multipleRecordLinks') return false;
    const nameMatch = (f.name ?? '').trim().toLowerCase() === 'email expéditeur';
    const linkedId = (f.options as { linkedTableId?: string } | undefined)?.linkedTableId;
    return nameMatch || linkedId === tableSources.id;
  });
  const recordLinkFieldId = linkField?.id;
  if (!recordLinkFieldId) {
    console.warn(
      '[Airtable] ensureLookups: aucun champ lien Offres → Sources trouvé (attendu: "email expéditeur" ou lien vers Sources).'
    );
    return;
  }

  const pluginField = tableSources.fields?.find(
    (x) => (x.name ?? '').trim().toLowerCase() === 'plugin'
  );
  if (!pluginField?.id) {
    console.warn('[Airtable] ensureLookups: champ plugin introuvable dans Sources.');
    return;
  }
  const sourceFieldIds: { name: string; fieldId: string }[] = [{ name: 'plugin', fieldId: pluginField.id }];

  const existingNames = new Set(
    (tableOffres.fields ?? []).map((f) => (f.name ?? '').trim().toLowerCase())
  );

  for (const { name, fieldId: fieldIdInLinkedTable } of sourceFieldIds) {
    const lookupName = `Source - ${name}`;
    if (existingNames.has(lookupName.toLowerCase())) continue;
    try {
      const createUrl = `${API_BASE}/meta/bases/${baseId}/tables/${tableOffres.id}/fields`;
      const res = await fetch(createUrl, {
        method: 'POST',
        headers: headers(apiKey),
        body: JSON.stringify({
          name: lookupName,
          type: 'lookup',
          options: {
            recordLinkFieldId,
            fieldIdInLinkedTable,
          },
        }),
      });
      if (res.ok) {
        existingNames.add(lookupName.toLowerCase());
      } else {
        const body = await res.text();
        console.warn(
          `[Airtable] ensureLookups: création "${lookupName}" refusée (${res.status}): ${body || res.statusText}`
        );
      }
    } catch (err) {
      console.warn('[Airtable] ensureLookups: erreur lors de la création lookup', err);
    }
  }
}

export { STATUTS_OFFRES_AIRTABLE, STATUTS_OFFRES_AIRTABLE_WITH_COLORS, PLUGINS_SOURCES_AIRTABLE };
