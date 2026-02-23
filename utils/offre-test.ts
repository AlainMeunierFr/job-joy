/**
 * Récupération du texte d'une offre pour le test ClaudeCode (US-2.4).
 * Port : driver fourni par l'appelant (Airtable réel ou mock BDD).
 */
const API_BASE = 'https://api.airtable.com/v0';

export interface OffreTestDriver {
  getTexteUneOffre(): Promise<string | null>;
}

/**
 * Récupère le texte d'une offre via le driver (mock ou Airtable).
 * Retourne null si aucune offre ou pas de texte.
 */
export function recupererTexteOffreTest(driver: OffreTestDriver): Promise<string | null> {
  return driver.getTexteUneOffre();
}

const NOMS_CHAMPS_TEXTE = ["Texte de l'offre", 'Contenu', 'Texte'] as const;

function extraireTexte(fields: Record<string, unknown>): string | null {
  for (const nom of NOMS_CHAMPS_TEXTE) {
    const v = fields[nom];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string' && value.trim()) {
      const k = key.trim().toLowerCase();
      if (k === 'contenu' || k === 'texte') return value.trim();
    }
  }
  return null;
}

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Crée un driver Airtable qui récupère le texte de la première offre ayant un contenu.
 * fetchFn optionnel pour les tests (sinon fetch global).
 */
export function createOffreTestDriverAirtable(
  options: { apiKey: string; baseId: string; offresId: string },
  fetchFn?: FetchFn
): OffreTestDriver {
  const fetch = fetchFn ?? globalThis.fetch;
  const { apiKey, baseId, offresId } = options;
  const baseIdNorm = baseId.trim();
  const offresIdNorm = offresId.trim();

  return {
    async getTexteUneOffre(): Promise<string | null> {
      const url = `${API_BASE}/${encodeURIComponent(baseIdNorm)}/${encodeURIComponent(offresIdNorm)}?pageSize=10`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { records?: Array<{ fields?: Record<string, unknown> }> };
      const records = json.records ?? [];
      for (const rec of records) {
        const fields = rec.fields ?? {};
        const texte = extraireTexte(fields);
        if (texte) return texte;
      }
      return null;
    },
  };
}
