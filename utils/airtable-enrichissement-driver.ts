/**
 * Driver Airtable pour l'enrichissement des offres (US-1.4 CA3).
 * Liste les offres « Annonce à récupérer » et met à jour leurs champs.
 */
import type { EnrichissementOffresDriver, ChampsOffreAirtable } from './enrichissement-offres.js';
import type { OffreARecuperer } from '../types/offres-releve.js';
import { normaliserBaseId } from './airtable-url.js';

const API_BASE = 'https://api.airtable.com/v0';
const STATUT_ANNONCE_A_RECUPERER = 'Annonce à récupérer';

export interface AirtableEnrichissementDriverOptions {
  apiKey: string;
  baseId: string;
  offresId: string;
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json; charset=UTF-8',
  };
}

/**
 * Crée un driver qui utilise l'API Airtable pour getOffresARecuperer et updateOffre.
 */
export function createAirtableEnrichissementDriver(
  options: AirtableEnrichissementDriverOptions
): EnrichissementOffresDriver {
  const baseId = normaliserBaseId(options.baseId.trim());
  const { apiKey, offresId } = options;

  return {
    async getOffresARecuperer(): Promise<OffreARecuperer[]> {
      const formula = encodeURIComponent(`{Statut} = "${STATUT_ANNONCE_A_RECUPERER}"`);
      const url = `${API_BASE}/${baseId}/${offresId}?filterByFormula=${formula}`;
      const all: OffreARecuperer[] = [];
      let offset: string | undefined;
      do {
        const u = offset ? `${url}&offset=${offset}` : url;
        const res = await fetch(u, { method: 'GET', headers: headers(apiKey) });
        if (!res.ok) {
          throw new Error(`Airtable Offres list: ${res.status} ${res.statusText}`);
        }
        const json = (await res.json()) as {
          records?: Array<{ id: string; fields?: Record<string, unknown> }>;
          offset?: string;
        };
        const records = json.records ?? [];
        for (const rec of records) {
          const fields = rec.fields ?? {};
          const urlVal = typeof fields.URL === 'string' ? fields.URL : '';
          const statut = typeof fields.Statut === 'string' ? fields.Statut : '';
          all.push({
            id: rec.id,
            url: urlVal,
            statut,
            poste: typeof fields.Poste === 'string' ? fields.Poste : undefined,
            entreprise: typeof fields.Entreprise === 'string' ? fields.Entreprise : undefined,
            ville: typeof fields.Ville === 'string' ? fields.Ville : undefined,
            département: typeof fields.Département === 'string' ? fields.Département : undefined,
            salaire: typeof fields.Salaire === 'string' ? fields.Salaire : undefined,
            dateOffre: typeof fields.DateOffre === 'string' ? fields.DateOffre : undefined,
          });
        }
        offset = json.offset;
      } while (offset);
      return all;
    },

    async updateOffre(recordId: string, champs: ChampsOffreAirtable): Promise<void> {
      const fieldsToSend: Record<string, string> = {};
      for (const [k, v] of Object.entries(champs)) {
        if (v === undefined || v === null) continue;
        const s = String(v).trim();
        if (s !== '') fieldsToSend[k] = v as string;
      }
      if (Object.keys(fieldsToSend).length === 0) return;
      const url = `${API_BASE}/${baseId}/${offresId}/${recordId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: headers(apiKey),
        body: JSON.stringify({ fields: fieldsToSend }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Airtable Offres update: ${res.status} ${errBody || res.statusText}`);
      }
    },
  };
}
