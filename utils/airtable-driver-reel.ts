/**
 * Driver Airtable réel (US-1.3). Bases Free uniquement : la base est créée à la main dans Airtable.
 * Utilise l’ID (ou l’URL) de la base pour créer les tables Sources/Offres.
 */
import type { AirtableConfigDriver } from './configuration-airtable.js';
import { normaliserBaseId } from './airtable-url.js';
import { STATUTS_OFFRES_AIRTABLE_WITH_COLORS } from './statuts-offres-airtable.js';
import { PLUGINS_SOURCES_AIRTABLE } from './plugins-sources-airtable.js';
import { getBaseSchema, ensureSingleSelectChoices, ensureLookupsOffresFromSources, ensureScoreTotalIsNumber } from './airtable-ensure-enums.js';

const API_BASE = 'https://api.airtable.com/v0';

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
async function loadBaseSchema(baseId: string, apiKey: string): Promise<TableSchema[]> {
  const tables = await getBaseSchema(baseId, apiKey);
  return tables.map((t) => ({
    id: t.id,
    name: t.name ?? t.id,
    fields: (t.fields ?? []) as TableSchema['fields'],
  }));
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
      const existingTables = await loadBaseSchema(baseId, apiKey);

      const findTableId = (name: string) => existingTables.find((t) => t.name === name)?.id ?? '';

      // 1) Sources : réutiliser si elle existe, sinon créer
      let sourcesId = findTableId('Sources');
      if (!sourcesId) {
        const tableSources = {
          name: 'Sources',
          description: 'Sources d\'offres',
          fields: [
            { name: 'emailExpéditeur', type: 'singleLineText' as const },
            {
              name: 'plugin',
              type: 'singleSelect' as const,
              options: {
                choices: PLUGINS_SOURCES_AIRTABLE.map((name) => ({ name })),
              },
            },
            {
              name: 'type',
              type: 'singleSelect' as const,
              options: {
                choices: [{ name: 'email' }, { name: 'liste html' }, { name: 'liste csv' }],
              },
            },
            {
              name: 'Activer la création',
              type: 'checkbox' as const,
              options: { icon: 'check', color: 'greenBright' },
            },
            {
              name: 'Activer l\'enrichissement',
              type: 'checkbox' as const,
              options: { icon: 'check', color: 'greenBright' },
            },
            {
              name: 'Activer l\'analyse par IA',
              type: 'checkbox' as const,
              options: { icon: 'check', color: 'greenBright' },
            },
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
            { name: 'URL', type: 'url' as const },
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
                choices: STATUTS_OFFRES_AIRTABLE_WITH_COLORS.map((c) => (c.color ? { name: c.name, color: c.color } : { name: c.name })),
              },
            },
            { name: 'Résumé', type: 'multilineText' as const },
            { name: 'CritèreRéhibitoire1', type: 'singleLineText' as const },
            { name: 'CritèreRéhibitoire2', type: 'singleLineText' as const },
            { name: 'CritèreRéhibitoire3', type: 'singleLineText' as const },
            { name: 'CritèreRéhibitoire4', type: 'singleLineText' as const },
            { name: 'ScoreCritère1', type: 'number' as const, options: { precision: 0 } },
            { name: 'ScoreCritère2', type: 'number' as const, options: { precision: 0 } },
            { name: 'ScoreCritère3', type: 'number' as const, options: { precision: 0 } },
            { name: 'ScoreCritère4', type: 'number' as const, options: { precision: 0 } },
            { name: 'ScoreCulture', type: 'number' as const, options: { precision: 0 } },
            { name: 'ScoreLocalisation', type: 'number' as const, options: { precision: 0 } },
            { name: 'ScoreSalaire', type: 'number' as const, options: { precision: 0 } },
            { name: 'ScoreQualiteOffre', type: 'number' as const, options: { precision: 0 } },
            { name: 'Score_Total', type: 'number' as const, options: { precision: 1 } },
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
      await ensureSingleSelectChoices(baseId, offresId, 'Statut', STATUTS_OFFRES_AIRTABLE_WITH_COLORS, apiKey);

      // CA US-2.7 : Score_Total en type number (création si absent, ou tentative passage texte → number si base existante).
      await ensureScoreTotalIsNumber(baseId, offresId, apiKey);

      // Lookups Offres <- Sources (Source - emailExpéditeur, Source - plugin, Source - actif) pour afficher les infos source dans Offres. Ne casse pas si l’API refuse.
      await ensureLookupsOffresFromSources(baseId, sourcesId, offresId, apiKey);

      return { baseId, sourcesId, offresId };
    },
  };
}
