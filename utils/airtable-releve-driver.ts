/**
 * Driver Airtable pour la relève des offres (US-1.4).
 * Lit les sources (table Sources) et crée des lignes dans la table Offres.
 * Upsert : une recherche Airtable par offre (clé = Id offre, sinon URL). Si absent → INSERT, si présent → PATCH (enrichissement).
 */
import type { RelèveOffresDriver } from './relève-offres-linkedin.js';
import type { SourceLinkedInResult } from '../types/offres-releve.js';
import type { OffreInsert, ResultatCreerOffres } from '../types/offres-releve.js';
import type { SourceEmail } from './gouvernance-sources-emails.js';
import type { AlgoSource } from './gouvernance-sources-emails.js';
import { normaliserBaseId } from './airtable-url.js';

export type { ResultatCreerOffres };

const API_BASE = 'https://api.airtable.com/v0';
const ALGO_CHOICES = [
  'Linkedin',
  'Inconnu',
  'HelloWork',
  'Welcome to the Jungle',
  'Job That Make Sense',
  'cadreemploi',
] as const;

export interface AirtableReleveDriverOptions {
  apiKey: string;
  baseId: string;
  sourcesId: string;
  offresId: string;
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

type TableSchema = {
  id: string;
  name: string;
  fields?: Array<{
    id: string;
    name: string;
    type: string;
    options?: {
      choices?: Array<{ id?: string; name?: string }>;
    };
  }>;
};

async function getBaseSchema(baseId: string, h: Record<string, string>): Promise<TableSchema[]> {
  const res = await fetch(`${API_BASE}/meta/bases/${baseId}/tables`, { method: 'GET', headers: h });
  if (!res.ok) return [];
  const json = (await res.json()) as { tables?: TableSchema[] } | TableSchema[];
  const tables = Array.isArray(json) ? json : json.tables ?? [];
  return tables.map((t) => ({ id: t.id, name: t.name, fields: t.fields ?? [] }));
}

async function ensureAlgoChoice(
  baseId: string,
  sourcesId: string,
  h: Record<string, string>,
  required: string
): Promise<boolean> {
  const schema = await getBaseSchema(baseId, h);
  const sourcesIdNormalized = (sourcesId ?? '').trim().toLowerCase();
  const sourcesTable =
    schema.find((t) => t.id === sourcesId) ??
    schema.find((t) => (t.name ?? '').trim().toLowerCase() === sourcesIdNormalized) ??
    schema.find((t) => (t.name ?? '').trim().toLowerCase() === 'sources');
  const algoField = sourcesTable?.fields?.find(
    (f) => (f.name ?? '').trim().toLowerCase() === 'algo' && f.type === 'singleSelect'
  );
  if (!sourcesTable?.id || !algoField?.id) return false;
  const current = (algoField.options?.choices ?? [])
    .map((c) => (c.name ?? '').trim())
    .filter(Boolean);
  const seed = [...ALGO_CHOICES];
  const merged = [...new Set([...current, ...seed, required])];
  if (current.includes(required)) return true;
  const updateUrl = `${API_BASE}/meta/bases/${baseId}/tables/${sourcesTable.id}/fields/${algoField.id}`;
  const updateRes = await fetch(updateUrl, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({
      type: 'singleSelect',
      options: { choices: merged.map((name) => ({ name })) },
    }),
  });
  return updateRes.ok;
}

/**
 * Crée un driver qui utilise l'API Airtable pour getSourceLinkedIn et creerOffres.
 */
export function createAirtableReleveDriver(
  options: AirtableReleveDriverOptions
): RelèveOffresDriver & {
  listerSources(): Promise<SourceAirtable[]>;
  creerSource(source: SourceEmail): Promise<SourceAirtable>;
  mettreAJourSource(sourceId: string, patch: Partial<Pick<SourceEmail, 'algo' | 'actif'>>): Promise<void>;
} {
  const baseId = normaliserBaseId(options.baseId.trim());
  const { apiKey, sourcesId, offresId } = options;

  function toAlgo(fields: Record<string, unknown>): AlgoSource {
    const algo = typeof fields.algo === 'string' ? fields.algo.trim() : '';
    if (
      algo === 'Linkedin' ||
      algo === 'Inconnu' ||
      algo === 'HelloWork' ||
      algo === 'Welcome to the Jungle' ||
      algo === 'Job That Make Sense' ||
      algo === 'cadreemploi'
    ) {
      return algo;
    }
    return 'Inconnu';
  }

  return {
    async getSourceLinkedIn(): Promise<SourceLinkedInResult> {
      const formula = encodeURIComponent('{algo} = "Linkedin"');
      const url = `${API_BASE}/${baseId}/${sourcesId}?filterByFormula=${formula}&maxRecords=1`;
      const res = await fetch(url, { method: 'GET', headers: headers(apiKey) });
      if (!res.ok) {
        throw new Error(`Airtable Sources: ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as { records?: Array<{ id: string; fields?: Record<string, unknown> }> };
      const records = json.records ?? [];
      const rec = records[0];
      if (!rec) {
        return { found: false };
      }
      const fields = rec.fields ?? {};
      const actif = Boolean(fields.actif);
      const emailExpéditeur = typeof fields.emailExpéditeur === 'string' ? fields.emailExpéditeur.trim() : '';
      return {
        found: true,
        actif,
        emailExpéditeur,
        sourceId: rec.id,
      };
    },

    async creerOffres(offres: OffreInsert[], sourceId: string): Promise<ResultatCreerOffres> {
      const trimmed = String(sourceId).trim();
      const idValide = /^rec[A-Za-z0-9]+$/.test(trimmed);
      if (!trimmed || !idValide) {
        throw new Error(
          `creerOffres: sourceId invalide (attendu: ID d'enregistrement Airtable type recXXX). Reçu: ${JSON.stringify(sourceId)}. ` +
          `Vérifie que les sources viennent bien de listerSources() (table Sources, algo Linkedin / email expéditeur).`
        );
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
      function toFields(o: OffreInsert): Record<string, unknown> {
        return {
          ...(o.idOffre && { 'Id offre': o.idOffre }),
          URL: o.url,
          DateAjout: o.dateAjout,
          ...(o.dateOffre && { DateOffre: o.dateOffre }),
          Statut: o.statut,
          'email expéditeur': [trimmed],
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
      const champLienSource = 'email expéditeur';
      for (let i = 0; i < toCreate.length; i += batchSize) {
        const batch = toCreate.slice(i, i + batchSize).map((o) => ({ fields: toFields(o) }));
        const res = await fetch(tableUrl, { method: 'POST', headers: h, body: JSON.stringify({ records: batch }) });
        if (res.ok) {
          nbCreees += batch.length;
          continue;
        }
        const body = await res.text();
        if (res.status === 422 && isInvalidSingleSelect(body)) {
          const withoutStatut = batch.map((r) => ({ fields: (() => { const { Statut: _s, ...f } = r.fields; return f; })() }));
          const retry = await fetch(tableUrl, { method: 'POST', headers: h, body: JSON.stringify({ records: withoutStatut }) });
          if (!retry.ok) throw new Error(`Airtable Offres: ${retry.status} ${await retry.text()}`);
          nbCreees += batch.length;
          continue;
        }
        if (res.status === 403 && body.includes('INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND')) {
          throw new Error(`Airtable Offres: 403 modèle introuvable ou droits insuffisants (base=${baseId}, tableOffres=${offresId}). Détail: ${body}`);
        }
        if (res.status === 422 && body.includes('INVALID_VALUE_FOR_COLUMN') && (body.includes('Source') || body.includes(champLienSource))) {
          throw new Error(`Airtable Offres: champ "${champLienSource}" invalide. Vérifie le lien vers Sources. Détail: ${body}`);
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
      const records: Array<{ id: string; fields?: Record<string, unknown> }> = [];
      let offset = '';
      const maxAttempts = 4;
      const delaysMs = [0, 2000, 4000, 6000];
      const fetchWithRetryOn403 = async (url: string): Promise<Response> => {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, delaysMs[attempt]));
          const res = await fetch(url, { method: 'GET', headers: headers(apiKey) });
          if (res.status !== 403) return res;
        }
        return await fetch(url, { method: 'GET', headers: headers(apiKey) });
      };
      do {
        const url = `${API_BASE}/${baseId}/${sourcesId}?pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
        const res = await fetchWithRetryOn403(url);
        if (!res.ok) {
          const body = await res.text();
          const detail = body ? ` — ${body.slice(0, 500)}` : '';
          if (res.status === 403) {
            throw new Error(
              `Airtable Sources: 403 Forbidden${detail}. Vérifie : (1) token valide (data/parametres.json ou .env) ; (2) scope data.records:read sur la base ; (3) baseId=${baseId} et table Sources=${sourcesId} corrects. Airtable : Paramètres > Développeur > Personal access token > ajouter cette base.`
            );
          }
          throw new Error(`Airtable Sources: ${res.status} ${res.statusText}${detail}`);
        }
        const json = (await res.json()) as {
          records?: Array<{ id: string; fields?: Record<string, unknown> }>;
          offset?: string;
        };
        records.push(...(json.records ?? []));
        offset = json.offset ?? '';
      } while (offset);

      return records.map((rec) => {
        const fields = rec.fields ?? {};
        const emailExpéditeurRaw = typeof fields.emailExpéditeur === 'string' ? fields.emailExpéditeur : '';
        const emailExpéditeur = emailExpéditeurRaw.trim().toLowerCase();
        return {
          sourceId: rec.id,
          emailExpéditeur,
          algo: toAlgo(fields),
          actif: Boolean(fields.actif),
        };
      });
    },

    async creerSource(source: SourceEmail): Promise<SourceAirtable> {
      const url = `${API_BASE}/${baseId}/${sourcesId}`;
      const payload = {
        records: [
          {
            fields: {
              emailExpéditeur: source.emailExpéditeur.trim().toLowerCase(),
              algo: source.algo,
              actif: source.actif,
            },
          },
        ],
      };
      const h = headers(apiKey);
      let res = await fetch(url, {
        method: 'POST',
        headers: h,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        const invalidChoice = res.status === 422 && body.includes('INVALID_MULTIPLE_CHOICE_OPTIONS');
        if (invalidChoice && source.algo) {
          // 1) Tentative sans meta API: typecast=true peut créer l'option singleSelect.
          res = await fetch(url, {
            method: 'POST',
            headers: h,
            body: JSON.stringify({ ...payload, typecast: true }),
          });
          if (!res.ok) {
            // 2) Fallback meta API: patch explicite des choices du champ algo.
            const patched = await ensureAlgoChoice(baseId, sourcesId, h, source.algo);
            if (patched) {
              res = await fetch(url, {
                method: 'POST',
                headers: h,
                body: JSON.stringify(payload),
              });
            } else {
              throw new Error(
                `Airtable Sources: option "${source.algo}" absente dans l'énum "algo" et auto-ajout impossible (typecast+meta indisponibles).`
              );
            }
          }
        } else {
          throw new Error(`Airtable Sources: ${res.status} ${body}`);
        }
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Airtable Sources: ${res.status} ${body}`);
      }
      const json = (await res.json()) as { records?: Array<{ id: string; fields?: Record<string, unknown> }> };
      const rec = json.records?.[0];
      if (!rec) throw new Error('Airtable Sources: création source sans enregistrement');
      return {
        sourceId: rec.id,
        emailExpéditeur: source.emailExpéditeur.trim().toLowerCase(),
        algo: source.algo,
        actif: source.actif,
      };
    },

    async mettreAJourSource(
      sourceId: string,
      patch: Partial<Pick<SourceEmail, 'algo' | 'actif'>>
    ): Promise<void> {
      const fields: Record<string, unknown> = {};
      if (patch.algo) fields.algo = patch.algo;
      if (typeof patch.actif === 'boolean') fields.actif = patch.actif;
      const url = `${API_BASE}/${baseId}/${sourcesId}`;
      const h = headers(apiKey);
      const payload = { records: [{ id: sourceId, fields }] };
      let res = await fetch(url, {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.text();
        const invalidChoice = res.status === 422 && body.includes('INVALID_MULTIPLE_CHOICE_OPTIONS');
        if (invalidChoice && typeof patch.algo === 'string' && patch.algo.trim()) {
          // 1) Tentative sans meta API via typecast=true.
          res = await fetch(url, {
            method: 'PATCH',
            headers: h,
            body: JSON.stringify({ ...payload, typecast: true }),
          });
          if (!res.ok) {
            // 2) Fallback meta API.
            const patched = await ensureAlgoChoice(baseId, sourcesId, h, patch.algo);
            if (patched) {
              res = await fetch(url, {
                method: 'PATCH',
                headers: h,
                body: JSON.stringify(payload),
              });
            } else {
              throw new Error(
                `Airtable Sources: option "${patch.algo}" absente dans l'énum "algo" et auto-ajout impossible (typecast+meta indisponibles).`
              );
            }
          }
        } else {
          throw new Error(`Airtable Sources: ${res.status} ${body}`);
        }
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Airtable Sources: ${res.status} ${body}`);
      }
    },
  };
}
