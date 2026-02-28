/**
 * Driver Airtable pour la relève : crée des lignes dans la table Offres uniquement.
 *
 * Règle :
 * - Paramétrage du comportement des workers (sources, actifs, etc.) : JSON (data/sources.json).
 * - Écrire et chercher dans les offres : chaîne de caractères dans la colonne Airtable Offres (champ « source »), pas de lien vers une table.
 */
import type { RelèveOffresDriver } from './relève-offres-linkedin.js';
import type { SourceLinkedInResult } from '../types/offres-releve.js';
import type { OffreInsert, ResultatCreerOffres, MethodeCreationOffre } from '../types/offres-releve.js';
import type { SourceEmail } from './gouvernance-sources-emails.js';
import { normaliserBaseId } from './airtable-url.js';

export type { ResultatCreerOffres };

const API_BASE = 'https://api.airtable.com/v0';

/** US-7.2 CA5 : colonne Offres « Méthode de création ». Valeurs : email, liste html, manuelle. La colonne doit exister dans la base Airtable (sinon 422). */
const AIRTABLE_FIELD_METHODE_CREATION = 'Méthode de création';

export interface AirtableReleveDriverOptions {
  apiKey: string;
  baseId: string;
  offresId: string;
  /** Ignoré (sources = sources.json). Conservé pour compatibilité d’appel. */
  sourcesId?: string;
}

export interface SourceAirtable extends SourceEmail {
  sourceId: string;
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json; charset=UTF-8',
  };
}

/**
 * Driver Airtable pour creerOffres uniquement. Sources = data/sources.json (utiliser createCompositeReleveDriver).
 */
export function createAirtableReleveDriver(
  options: AirtableReleveDriverOptions
): RelèveOffresDriver & {
  listerSources(): Promise<SourceAirtable[]>;
  creerSource(source: SourceEmail): Promise<SourceAirtable>;
  mettreAJourSource(
    sourceId: string,
    patch: Partial<
      Pick<
        SourceEmail,
        'source' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'
      >
    >
  ): Promise<void>;
} {
  const baseId = normaliserBaseId(options.baseId.trim());
  const { apiKey, offresId } = options;

  return {
    async getSourceLinkedIn(): Promise<SourceLinkedInResult> {
      return { found: false };
    },

    async creerOffres(offres: OffreInsert[], sourceId: string, methodeCreation: MethodeCreationOffre = 'email'): Promise<ResultatCreerOffres> {
      const sourceNom = String(sourceId).trim();
      if (!sourceNom) {
        throw new Error('creerOffres: nom de source requis.');
      }
      if (offres.length === 0) {
        return { nbCreees: 0, nbDejaPresentes: 0 };
      }
      const h = headers(apiKey);
      const tableUrl = `${API_BASE}/${baseId}/${offresId}`;
      /** Échappe les guillemets pour une formule Airtable (chaîne entre "..."). */
      function escapeFormulaString(s: string): string {
        return String(s).replace(/"/g, '""');
      }
      const toCreate: OffreInsert[] = [];
      const toUpdate: Array<{ recordId: string; offre: OffreInsert }> = [];
      for (const o of offres) {
        const idOffre = (o.idOffre ?? '').trim();
        const url = (o.url ?? '').trim();
        const key = idOffre || url;
        if (!key) continue;
        const formula =
          idOffre
            ? `{Id offre} = "${escapeFormulaString(idOffre)}"`
            : `{URL} = "${escapeFormulaString(url)}"`;
        const searchUrl = `${tableUrl}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
        const res = await fetch(searchUrl, { method: 'GET', headers: h });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Airtable Offres (recherche): ${res.status} ${body || res.statusText}`);
        }
        const json = (await res.json()) as { records?: Array<{ id: string }> };
        const records = json.records ?? [];
        if (records.length === 0) {
          toCreate.push(o);
        } else {
          toUpdate.push({ recordId: records[0].id, offre: o });
        }
      }
      let nbCreees = 0;
      let nbDejaPresentes = toUpdate.length;
      const batchSize = 10;
      /** Champs envoyés à Airtable. Inclut « Méthode de création » : la colonne doit exister dans Airtable (sinon 422). */
      function toFields(o: OffreInsert): Record<string, unknown> {
        return {
          ...(o.idOffre && { 'Id offre': o.idOffre }),
          URL: o.url,
          DateAjout: o.dateAjout,
          ...(o.dateOffre && { DateOffre: o.dateOffre }),
          Statut: o.statut,
          source: sourceNom,
          [AIRTABLE_FIELD_METHODE_CREATION]: methodeCreation,
          ...(o.poste && { Poste: o.poste }),
          ...(o.entreprise && { Entreprise: o.entreprise }),
          ...((o.ville ?? o.lieu) && { Ville: o.ville ?? o.lieu }),
          ...(o.département && { Département: o.département }),
          ...(o.salaire && { Salaire: o.salaire }),
        };
      }
      /** Retire les champs vides pour ne pas écraser des données renseignées en phase 2 (ex. Texte de l'offre). */
      function omitEmptyFields(fields: Record<string, unknown>): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          if (v === undefined || v === null) continue;
          if (typeof v === 'string' && !v.trim()) continue;
          out[k] = v;
        }
        return out;
      }
      function isInvalidSingleSelect(body: string): boolean {
        return body.includes('INVALID_MULTIPLE_CHOICE_OPTIONS');
      }
      for (let i = 0; i < toCreate.length; i += batchSize) {
        const batch = toCreate.slice(i, i + batchSize).map((o) => ({ fields: toFields(o) }));
        const res = await fetch(tableUrl, { method: 'POST', headers: h, body: JSON.stringify({ records: batch }) });
        if (res.ok) {
          nbCreees += batch.length;
          continue;
        }
        const body = await res.text();
        if (res.status === 422 && isInvalidSingleSelect(body)) {
          const withoutStatut = batch.map((r) => ({ fields: (() => { const { Statut: _s, ...f } = r.fields as Record<string, unknown>; return f; })() }));
          const retry = await fetch(tableUrl, { method: 'POST', headers: h, body: JSON.stringify({ records: withoutStatut }) });
          if (!retry.ok) throw new Error(`Airtable Offres: ${retry.status} ${await retry.text()}`);
          nbCreees += batch.length;
          continue;
        }
        if (res.status === 403 && body.includes('INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND')) {
          throw new Error(`Airtable Offres: 403 modèle introuvable ou droits insuffisants (base=${baseId}, tableOffres=${offresId}). Détail: ${body}`);
        }
        if (res.status === 422 && body.includes('INVALID_VALUE_FOR_COLUMN') && body.includes('source')) {
          throw new Error(`Airtable Offres: valeur "source" invalide (attendu: nom canonique depuis data/sources.json). Détail: ${body}`);
        }
        throw new Error(`Airtable Offres: ${res.status} ${body}`);
      }
      for (let i = 0; i < toUpdate.length; i += batchSize) {
        const batch = toUpdate.slice(i, i + batchSize).map(({ recordId, offre }) => ({
          id: recordId,
          fields: omitEmptyFields(toFields(offre)),
        }));
        const res = await fetch(tableUrl, { method: 'PATCH', headers: h, body: JSON.stringify({ records: batch }) });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Airtable Offres (PATCH): ${res.status} ${body}`);
        }
      }
      return { nbCreees, nbDejaPresentes };
    },

    async listerSources(): Promise<SourceAirtable[]> {
      return [];
    },

    async creerSource(): Promise<SourceAirtable> {
      throw new Error('Sources : utiliser data/sources.json (createCompositeReleveDriver).');
    },

    async mettreAJourSource(): Promise<void> {
      return Promise.resolve();
    },
  };
}
