/**
 * Driver Airtable pour l'enrichissement des offres (US-1.4 CA3).
 * Liste les offres « Annonce à récupérer » et met à jour leurs champs.
 */
import type {
  EnrichissementOffresDriver,
  ChampsOffreAirtable,
  OffreAAnalyser,
} from './enrichissement-offres.js';
import type { OffreARecuperer } from '../types/offres-releve.js';
import { normaliserBaseId } from './airtable-url.js';
import { STATUTS_OFFRES_AIRTABLE_WITH_COLORS } from './statuts-offres-airtable.js';
import { ensureSingleSelectOption } from './airtable-ensure-enums.js';

const API_BASE = 'https://api.airtable.com/v0';
const STATUT_A_COMPLETER = 'A compléter';
const STATUT_A_ANALYSER = 'À analyser';
const STATUT_A_TRAITER = 'À traiter';

const CHAMP_LIEN_SOURCE = 'Adresse';
const CHAMP_TEXTE_OFFRE = "Texte de l'offre";

/** En cas d'erreur Airtable "valeur n'existe pas" sur le champ Statut, ajoute l'option manquante via l'API Meta puis retourne true. */
async function ensureStatutChoice(
  apiKey: string,
  baseId: string,
  offresId: string,
  choiceName: string
): Promise<boolean> {
  return ensureSingleSelectOption(baseId, offresId, 'Statut', choiceName, STATUTS_OFFRES_AIRTABLE_WITH_COLORS, apiKey);
}

export interface AirtableEnrichissementDriverOptions {
  apiKey: string;
  baseId: string;
  offresId: string;
  /** Si fourni, seules les offres dont la source liée est active (actif = true) sont retournées (table Airtable Sources). */
  sourcesId?: string;
  /** US-7.x : si fourni, filtre par nom de source (champ "source" des offres) depuis sources.json (analyse.activé). Prioritaire sur sourcesId. */
  sourceNomsActifs?: Set<string> | string[];
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json; charset=UTF-8',
  };
}

const SOURCE_INCONNUE = 'Inconnu';

const AIRTABLE_ACTIVER_CREATION = 'Activer la création';
const AIRTABLE_ACTIVER_ENRICHISSEMENT = "Activer l'enrichissement";
const AIRTABLE_ACTIVER_ANALYSE_IA = "Activer l'analyse par IA";

/** Sources avec une case à cocher donnée = true et source ≠ Inconnu. */
function fetchSourcesAvecCheckbox(
  apiKey: string,
  baseId: string,
  sourcesId: string,
  checkboxFieldName: string
): Promise<Array<{ id: string; emailExpéditeur: string }>> {
  const out: Array<{ id: string; emailExpéditeur: string }> = [];
  let offset: string | undefined;
  const baseUrl = `${API_BASE}/${baseId}/${sourcesId}`;
  const fetchPage = async (): Promise<void> => {
    const u = offset ? `${baseUrl}?offset=${encodeURIComponent(offset)}` : baseUrl;
    const res = await fetch(u, { method: 'GET', headers: headers(apiKey) });
    if (!res.ok) {
      throw new Error(`Airtable Sources list: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as {
      records?: Array<{ id: string; fields?: Record<string, unknown> }>;
      offset?: string;
    };
    for (const rec of json.records ?? []) {
      const fields = rec.fields ?? {};
      const coché = fields[checkboxFieldName] ?? fields.actif;
      if (coché !== true && coché !== 'true') continue;
      const sourceNom = (typeof fields.source === 'string' ? fields.source.trim() : null) ?? '';
      if (sourceNom === SOURCE_INCONNUE || !sourceNom) continue;
      const adresse =
        (typeof fields.Adresse === 'string' ? fields.Adresse.trim() : null) ??
        (typeof fields['email expéditeur'] === 'string' ? (fields['email expéditeur'] as string).trim() : null) ??
        '';
      if (adresse) out.push({ id: rec.id, emailExpéditeur: adresse });
    }
    offset = json.offset;
  };
  return (async () => {
    do {
      await fetchPage();
    } while (offset);
    return out;
  })();
}

/** Sources avec « Activer la création » = true et source ≠ Inconnu (phase relève). */
export async function fetchSourcesActives(
  apiKey: string,
  baseId: string,
  sourcesId: string
): Promise<Array<{ id: string; emailExpéditeur: string }>> {
  return fetchSourcesAvecCheckbox(apiKey, baseId, sourcesId, AIRTABLE_ACTIVER_CREATION);
}

function getLinkedSourceId(fields: Record<string, unknown>): string | undefined {
  const lien = fields[CHAMP_LIEN_SOURCE];
  if (Array.isArray(lien) && lien.length > 0 && typeof lien[0] === 'string') {
    return lien[0];
  }
  return undefined;
}

function recordToOffre(
  rec: { id: string; fields?: Record<string, unknown> },
  sourceIdToEmail?: Map<string, string>
): OffreARecuperer {
  const fields = rec.fields ?? {};
  const urlVal = typeof fields.URL === 'string' ? fields.URL : '';
  const statut = typeof fields.Statut === 'string' ? fields.Statut : '';
  const sourceId = getLinkedSourceId(fields);
  const emailExpéditeur = sourceId && sourceIdToEmail ? sourceIdToEmail.get(sourceId) : undefined;
  return {
    id: rec.id,
    url: urlVal,
    statut,
    emailExpéditeur,
    poste: typeof fields.Poste === 'string' ? fields.Poste : undefined,
    entreprise: typeof fields.Entreprise === 'string' ? fields.Entreprise : undefined,
    ville: typeof fields.Ville === 'string' ? fields.Ville : undefined,
    département: typeof fields.Département === 'string' ? fields.Département : undefined,
    salaire: typeof fields.Salaire === 'string' ? fields.Salaire : undefined,
    dateOffre: typeof fields.DateOffre === 'string' ? fields.DateOffre : undefined,
  };
}

/** Type étendu du driver Airtable : boucle par source (source ≠ Inconnu, actif = true). */
export interface AirtableEnrichissementDriverEtendu extends EnrichissementOffresDriver {
  getSourcesActives(): Promise<Array<{ id: string; emailExpéditeur: string }>>;
  /** Offres « Annonce à récupérer » dont la colonne « email expéditeur » vaut cet email. */
  getOffresARecupererPourSource(emailExpéditeur: string): Promise<OffreARecuperer[]>;
}

/** Échappe une valeur pour une formule Airtable (chaîne entre guillemets). */
function escapeFormulaString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Crée un driver qui utilise l'API Airtable pour getOffresARecuperer et updateOffre.
 * Si options.sourcesId est fourni, expose getSourcesActives (source ≠ Inconnu, actif = true) et getOffresARecupererPourSource.
 */
export function createAirtableEnrichissementDriver(
  options: AirtableEnrichissementDriverOptions
): AirtableEnrichissementDriverEtendu {
  const baseId = normaliserBaseId(options.baseId.trim());
  const { apiKey, offresId, sourcesId, sourceNomsActifs } = options;
  const nomsActifsSet =
    sourceNomsActifs instanceof Set
      ? sourceNomsActifs
      : Array.isArray(sourceNomsActifs)
        ? new Set(sourceNomsActifs.map((s) => String(s).trim()).filter(Boolean))
        : undefined;

  /** Une requête Offres : Statut = "Annonce à récupérer" ET « email expéditeur » dans la liste d'emails. */
  async function getOffresAvecListeEmails(
    emails: string[],
    sourceIdToEmail: Map<string, string>
  ): Promise<OffreARecuperer[]> {
    if (emails.length === 0) return [];
    const conditions = emails
      .map((e) => e.trim())
      .filter(Boolean)
      .map((e) => `{${CHAMP_LIEN_SOURCE}} = "${escapeFormulaString(e)}"`);
    if (conditions.length === 0) return [];
    const formula =
      conditions.length === 1
        ? `AND({Statut} = "${STATUT_A_COMPLETER}", ${conditions[0]})`
        : `AND({Statut} = "${STATUT_A_COMPLETER}", OR(${conditions.join(', ')}))`;
    const url = `${API_BASE}/${baseId}/${offresId}?filterByFormula=${encodeURIComponent(formula)}`;
    const all: OffreARecuperer[] = [];
    let offset: string | undefined;
    do {
      const u = offset ? `${url}&offset=${offset}` : url;
      const res = await fetch(u, { method: 'GET', headers: headers(apiKey) });
      if (!res.ok) throw new Error(`Airtable Offres list: ${res.status} ${res.statusText}`);
      const json = (await res.json()) as {
        records?: Array<{ id: string; fields?: Record<string, unknown> }>;
        offset?: string;
      };
      for (const rec of json.records ?? []) all.push(recordToOffre(rec, sourceIdToEmail));
      offset = json.offset;
    } while (offset);
    return all;
  }

  return {
    async getSourcesActives(): Promise<Array<{ id: string; emailExpéditeur: string }>> {
      if (!sourcesId?.trim()) return [];
      return fetchSourcesActives(apiKey, baseId, sourcesId.trim());
    },

    async getOffresARecupererPourSource(emailExpéditeur: string): Promise<OffreARecuperer[]> {
      const sources = await this.getSourcesActives();
      const sourceIdToEmail = new Map<string, string>(
        sources.map((s: { id: string; emailExpéditeur: string }) => [s.id, s.emailExpéditeur])
      );
      const emailEscaped = escapeFormulaString(emailExpéditeur.trim());
      const formula = encodeURIComponent(
        `AND({Statut} = "${STATUT_A_COMPLETER}", {${CHAMP_LIEN_SOURCE}} = "${emailEscaped}")`
      );
      const url = `${API_BASE}/${baseId}/${offresId}?filterByFormula=${formula}`;
      const all: OffreARecuperer[] = [];
      let offset: string | undefined;
      do {
        const u = offset ? `${url}&offset=${offset}` : url;
        const res = await fetch(u, { method: 'GET', headers: headers(apiKey) });
        if (!res.ok) throw new Error(`Airtable Offres list: ${res.status} ${res.statusText}`);
        const json = (await res.json()) as {
          records?: Array<{ id: string; fields?: Record<string, unknown> }>;
          offset?: string;
        };
        for (const rec of json.records ?? []) all.push(recordToOffre(rec, sourceIdToEmail));
        offset = json.offset;
      } while (offset);
      return all;
    },

    async getOffresARecuperer(): Promise<OffreARecuperer[]> {
      const sources =
        sourcesId?.trim() ?
          await fetchSourcesAvecCheckbox(apiKey, baseId, sourcesId.trim(), AIRTABLE_ACTIVER_ENRICHISSEMENT)
        : [];
      if (sources.length === 0) {
        const formula = encodeURIComponent(`{Statut} = "${STATUT_A_COMPLETER}"`);
        const url = `${API_BASE}/${baseId}/${offresId}?filterByFormula=${formula}`;
        const all: OffreARecuperer[] = [];
        let offset: string | undefined;
        do {
          const u = offset ? `${url}&offset=${offset}` : url;
          const res = await fetch(u, { method: 'GET', headers: headers(apiKey) });
          if (!res.ok) throw new Error(`Airtable Offres list: ${res.status} ${res.statusText}`);
          const json = (await res.json()) as {
            records?: Array<{ id: string; fields?: Record<string, unknown> }>;
            offset?: string;
          };
          for (const rec of json.records ?? []) all.push(recordToOffre(rec));
          offset = json.offset;
        } while (offset);
        return all;
      }
      const emails = sources.map((s) => s.emailExpéditeur);
      const sourceIdToEmail = new Map<string, string>(
        sources.map((s) => [s.id, s.emailExpéditeur])
      );
      return getOffresAvecListeEmails(emails, sourceIdToEmail);
    },

    async getOffresAAnalyser(): Promise<OffreAAnalyser[]> {
      let sourceIdsActifs: Set<string> | undefined;
      if (nomsActifsSet !== undefined) {
        if (nomsActifsSet.size === 0) return [];
      } else if (sourcesId?.trim()) {
        const sourcesAnalyseIA = await fetchSourcesAvecCheckbox(
          apiKey,
          baseId,
          sourcesId.trim(),
          AIRTABLE_ACTIVER_ANALYSE_IA
        );
        sourceIdsActifs = new Set(sourcesAnalyseIA.map((s) => s.id));
        if (sourceIdsActifs.size === 0) return [];
      }
      const formula = encodeURIComponent(`{Statut} = "${STATUT_A_ANALYSER}"`);
      const url = `${API_BASE}/${baseId}/${offresId}?filterByFormula=${formula}`;
      const all: OffreAAnalyser[] = [];
      let offset: string | undefined;
      do {
        const u = offset ? `${url}&offset=${encodeURIComponent(offset)}` : url;
        const res = await fetch(u, { method: 'GET', headers: headers(apiKey) });
        if (!res.ok) throw new Error(`Airtable Offres list (À analyser): ${res.status} ${res.statusText}`);
        const json = (await res.json()) as {
          records?: Array<{ id: string; fields?: Record<string, unknown> }>;
          offset?: string;
        };
        for (const rec of json.records ?? []) {
          const fields = rec.fields ?? {};
          if (nomsActifsSet !== undefined) {
            const sourceRaw =
              (typeof fields.source === 'string' ? fields.source : null) ??
              (typeof (fields as Record<string, unknown>).Source === 'string'
                ? (fields as Record<string, unknown>).Source as string
                : null);
            const sourceNom = String(sourceRaw ?? '').trim();
            if (!sourceNom || !nomsActifsSet.has(sourceNom)) continue;
          } else if (sourceIdsActifs) {
            const sourceId = getLinkedSourceId(fields);
            if (!sourceId || !sourceIdsActifs.has(sourceId)) continue;
          }
          all.push({
            id: rec.id,
            poste: typeof fields.Poste === 'string' ? fields.Poste.trim() : undefined,
            ville: typeof fields.Ville === 'string' ? fields.Ville.trim() : undefined,
            texteOffre:
              typeof fields[CHAMP_TEXTE_OFFRE] === 'string' ? (fields[CHAMP_TEXTE_OFFRE] as string).trim() : undefined,
            entreprise: typeof fields.Entreprise === 'string' ? fields.Entreprise.trim() : undefined,
            salaire: typeof fields.Salaire === 'string' ? fields.Salaire.trim() : undefined,
            dateOffre: typeof fields.DateOffre === 'string' ? fields.DateOffre.trim() : undefined,
            departement: typeof fields.Département === 'string' ? fields.Département.trim() : undefined,
          });
        }
        offset = json.offset;
      } while (offset);
      return all;
    },

    async updateOffre(recordId: string, champs: ChampsOffreAirtable): Promise<void> {
      const fieldsToSend: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(champs)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'boolean' || typeof v === 'number') {
          fieldsToSend[k] = v;
          continue;
        }
        const s = String(v).trim();
        if (s !== '') fieldsToSend[k] = v as string;
      }
      if (Object.keys(fieldsToSend).length === 0) return;
      const url = `${API_BASE}/${baseId}/${offresId}/${recordId}`;
      const h = headers(apiKey);
      // 1) Typecast permet à Airtable de créer l’option single select si elle n’existe pas (comme pour Sources.source).
      let res = await fetch(url, {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify({ fields: fieldsToSend, typecast: true }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        const invalidChoice =
          res.status === 422 &&
          (errBody.includes('INVALID_MULTIPLE_CHOICE_OPTIONS') || errBody.includes('INVALID_VALUE_FOR_COLUMN'));
        if (invalidChoice && fieldsToSend.Statut) {
          const added = await ensureStatutChoice(apiKey, baseId, offresId, String(fieldsToSend.Statut));
          if (added) {
            const res2 = await fetch(url, {
              method: 'PATCH',
              headers: h,
              body: JSON.stringify({ fields: fieldsToSend }),
            });
            if (!res2.ok) {
              const errBody2 = await res2.text();
              throw new Error(`Airtable Offres update: ${res2.status} ${errBody2 || res2.statusText}`);
            }
            return;
          }
        }
        throw new Error(`Airtable Offres update: ${res.status} ${errBody || res.statusText}`);
      }
    },
  };
}
