/**
 * Driver Airtable réel (US-1.3). Bases Free uniquement : la base est créée à la main dans Airtable.
 * Utilise l’ID (ou l’URL) de la base pour créer les tables Sources/Offres.
 */
import type { AirtableConfigDriver } from './configuration-airtable.js';
import { normaliserBaseId } from './airtable-url.js';
import { STATUTS_OFFRES_AIRTABLE } from './statuts-offres-airtable.js';

const API_BASE = 'https://api.airtable.com/v0';
const ALGO_CHOICES = ['Linkedin', 'Inconnu', 'HelloWork', 'Welcome to the Jungle'] as const;

interface TableSchema {
  id: string;
  name: string;
  fields?: Array<{
    id: string;
    name: string;
    type: string;
    options?: {
      choices?: Array<{ id?: string; name?: string; color?: string }>;
    };
  }>;
}

/** Récupère le schéma de la base (liste des tables) pour réutiliser des tables existantes. */
async function getBaseSchema(
  baseId: string,
  headers: Record<string, string>
): Promise<TableSchema[]> {
  const res = await fetch(`${API_BASE}/meta/bases/${baseId}/tables`, { method: 'GET', headers });
  if (!res.ok) return [];
  const json = await res.json();
  const tables = Array.isArray(json) ? json : (json as { tables?: TableSchema[] }).tables ?? [];
  return tables.map((t: TableSchema) => ({
    id: t.id,
    name: t.name,
    fields: t.fields ?? [],
  }));
}

async function ensureStatutChoices(
  baseId: string,
  offresTable: TableSchema | undefined,
  headers: Record<string, string>
): Promise<void> {
  if (!offresTable?.id) return;
  const fields = offresTable.fields ?? [];
  const statutField = fields.find((f) => f.name === 'Statut');
  if (!statutField || statutField.type !== 'singleSelect') return;

  const currentChoices = (statutField.options?.choices ?? [])
    .map((c) => (c.name ?? '').trim())
    .filter(Boolean);
  const missing = STATUTS_OFFRES_AIRTABLE.filter((c) => !currentChoices.includes(c));
  if (missing.length === 0) return;

  const merged = [...currentChoices, ...missing];
  const updateUrl = `${API_BASE}/meta/bases/${baseId}/tables/${offresTable.id}/fields/${statutField.id}`;
  const res = await fetch(updateUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      type: 'singleSelect',
      options: {
        choices: merged.map((name) => ({ name })),
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Mise à jour options Statut échouée (${res.status}): ${errBody || res.statusText}`
    );
  }
}

export interface AirtableDriverReelOptions {
  /** ID de la base Airtable (ou URL ; sera normalisé). Base créée à la main dans Airtable. */
  baseId: string;
}

/**
 * Crée un driver qui appelle l'API Airtable (tables Sources/Offres). Base créée à la main.
 */
export function createAirtableDriverReel(options: AirtableDriverReelOptions): AirtableConfigDriver {
  const { baseId: baseIdOption } = options;

  return {
    async creerBaseEtTables(apiKey: string): Promise<{
      baseId: string;
      sourcesId: string;
      offresId: string;
    }> {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=UTF-8',
      };

      const baseId = normaliserBaseId(baseIdOption.trim());
      if (!baseId) {
        throw new Error('baseId requis. Créer une base dans Airtable et renseigner son URL ou ID (parametres.json > airtable.base).');
      }

      const tablesUrl = `${API_BASE}/meta/bases/${baseId}/tables`;
      const existingTables = await getBaseSchema(baseId, headers);

      const findTableId = (name: string) => existingTables.find((t) => t.name === name)?.id ?? '';
      const findTable = (name: string) => existingTables.find((t) => t.name === name);

      // 1) Sources : réutiliser si elle existe, sinon créer
      let sourcesId = findTableId('Sources');
      if (!sourcesId) {
        const tableSources = {
          name: 'Sources',
          description: 'Sources d\'offres',
          fields: [
            { name: 'emailExpéditeur', type: 'singleLineText' as const },
            {
              name: 'algo',
              type: 'singleSelect' as const,
              options: {
                choices: ALGO_CHOICES.map((name) => ({ name })),
              },
            },
            { name: 'actif', type: 'checkbox' as const, options: { icon: 'check', color: 'greenBright' } },
          ],
        };
        const createSourcesRes = await fetch(tablesUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(tableSources),
        });
        if (!createSourcesRes.ok) {
          const errBody = await createSourcesRes.text();
          throw new Error(`Création table Sources échouée (${createSourcesRes.status}): ${errBody || createSourcesRes.statusText}`);
        }
        const createSourcesJson = (await createSourcesRes.json()) as { id?: string };
        sourcesId = createSourcesJson.id ?? '';
        if (!sourcesId) throw new Error('Réponse API Airtable invalide : sourcesId manquant.');
      }

      // 2) Offres : réutiliser si elle existe, sinon créer
      let offresId = findTableId('Offres');
      if (!offresId) {
        const tableOffres = {
          name: 'Offres',
          description: 'Offres récupérées',
          fields: [
            { name: 'Id offre', type: 'singleLineText' as const },
            { name: 'URL', type: 'singleLineText' as const },
            { name: 'Texte de l\'offre', type: 'multilineText' as const },
            { name: 'Poste', type: 'singleLineText' as const },
            { name: 'Entreprise', type: 'singleLineText' as const },
            { name: 'Ville', type: 'singleLineText' as const },
            { name: 'Département', type: 'singleLineText' as const },
            { name: 'Salaire', type: 'singleLineText' as const },
            {
              name: 'DateOffre',
              type: 'dateTime' as const,
              options: {
                dateFormat: { name: 'iso', format: 'YYYY-MM-DD' },
                timeFormat: { name: '24hour', format: 'HH:mm' },
                timeZone: 'Europe/Paris',
              },
            },
            {
              name: 'DateAjout',
              type: 'dateTime' as const,
              options: {
                dateFormat: { name: 'iso', format: 'YYYY-MM-DD' },
                timeFormat: { name: '24hour', format: 'HH:mm' },
                timeZone: 'Europe/Paris',
              },
            },
            {
              name: 'Statut',
              type: 'singleSelect' as const,
              options: {
                choices: STATUTS_OFFRES_AIRTABLE.map((name) => ({ name })),
              },
            },
            { name: 'Résumé', type: 'multilineText' as const },
            { name: 'CritèreRéhibitoire1', type: 'checkbox' as const, options: { icon: 'check', color: 'redBright' } },
            { name: 'CritèreRéhibitoire2', type: 'checkbox' as const, options: { icon: 'check', color: 'redBright' } },
            { name: 'CritèreRéhibitoire3', type: 'checkbox' as const, options: { icon: 'check', color: 'redBright' } },
            { name: 'CritèreRéhibitoire4', type: 'checkbox' as const, options: { icon: 'check', color: 'redBright' } },
            { name: 'ScoreCritère1', type: 'number' as const, options: { precision: 2 } },
            { name: 'ScoreCritère2', type: 'number' as const, options: { precision: 2 } },
            { name: 'ScoreCritère3', type: 'number' as const, options: { precision: 2 } },
            { name: 'ScoreCritère4', type: 'number' as const, options: { precision: 2 } },
            { name: 'ScoreCulture', type: 'number' as const, options: { precision: 2 } },
            { name: 'ScoreLocalisation', type: 'number' as const, options: { precision: 2 } },
            { name: 'ScoreSalaire', type: 'number' as const, options: { precision: 2 } },
            { name: 'ScoreQualiteOffre', type: 'number' as const, options: { precision: 2 } },
            { name: 'Score_Total', type: 'number' as const, options: { precision: 2 } },
            { name: 'Verdict', type: 'singleLineText' as const },
            // Lien mono : une offre n'a qu'un seul expéditeur (Sources). À configurer en "un seul enregistrement" dans l'UI Airtable si besoin.
            { name: 'email expéditeur', type: 'multipleRecordLinks' as const, options: { linkedTableId: sourcesId } },
          ],
        };
        const createOffresRes = await fetch(tablesUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(tableOffres),
        });
        if (!createOffresRes.ok) {
          const errBody = await createOffresRes.text();
          throw new Error(
            `Création table Offres échouée (${createOffresRes.status}): ${errBody || createOffresRes.statusText}`
          );
        }
        const createOffresJson = (await createOffresRes.json()) as { id?: string };
        offresId = createOffresJson.id ?? '';
        if (!offresId) throw new Error('Réponse API Airtable invalide : offresId manquant.');
      }

      // Garantit que les options single select de "Statut" incluent la valeur attendue
      // même si la table Offres existait déjà avant cette initialisation.
      const tablesAfterCreate = await getBaseSchema(baseId, headers);
      await ensureStatutChoices(baseId, tablesAfterCreate.find((t) => t.id === offresId) ?? findTable('Offres'), headers);

      return { baseId, sourcesId, offresId };
    },
  };
}
