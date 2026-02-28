/**
 * Récupération du texte d'une offre pour le test API IA (US-8.1).
 * US-2.6 : métadonnées (poste, entreprise, ville...) pour préremplir la zone de test et enrichir le prompt.
 * Port : driver fourni par l'appelant (Airtable réel ou mock BDD).
 */
const API_BASE = 'https://api.airtable.com/v0';

/** Résultat complet pour le test : texte + métadonnées optionnelles (US-2.6). */
export interface OffreTestResult {
  texte: string;
  poste?: string;
  entreprise?: string;
  ville?: string;
  salaire?: string;
  dateOffre?: string;
  departement?: string;
}

export interface OffreTestDriver {
  getTexteUneOffre(): Promise<string | null>;
  /** Retourne texte + métadonnées quand disponible (sinon équivalent à getTexteUneOffre + champs vides). */
  getOffreTest?(): Promise<OffreTestResult | null>;
}

/**
 * Récupère le texte d'une offre via le driver (mock ou Airtable).
 * Retourne null si aucune offre ou pas de texte.
 */
export function recupererTexteOffreTest(driver: OffreTestDriver): Promise<string | null> {
  return driver.getTexteUneOffre();
}

const NOMS_CHAMPS_TEXTE = ["Texte de l'offre", 'Contenu', 'Texte'] as const;

const CHAMPS_SCORES_INCONTOURNABLES = [
  'ScoreLocalisation',
  'ScoreSalaire',
  'ScoreCulture',
  'ScoreQualiteOffre',
] as const;

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

/**
 * Retourne un score pour trier les offres déjà analysées (plus haut = plus intéressant).
 * Utilise Score_Total si présent (souvent formule Airtable), sinon somme des 4 scores incontournables.
 * Retourne -1 si aucun score (offre non encore analysée).
 */
function scorePourTri(fields: Record<string, unknown>): number {
  const total = fields['Score_Total'];
  if (typeof total === 'number' && !Number.isNaN(total)) return total;
  let sum = 0;
  let hasAny = false;
  for (const nom of CHAMPS_SCORES_INCONTOURNABLES) {
    const v = fields[nom];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      sum += v;
      hasAny = true;
    }
  }
  return hasAny ? sum : -1;
}

const CHAMPS_METADONNEES: Array<{ key: keyof OffreTestResult; airtableKey: string }> = [
  { key: 'poste', airtableKey: 'Poste' },
  { key: 'entreprise', airtableKey: 'Entreprise' },
  { key: 'ville', airtableKey: 'Ville' },
  { key: 'salaire', airtableKey: 'Salaire' },
  { key: 'dateOffre', airtableKey: 'DateOffre' },
  { key: 'departement', airtableKey: 'Département' },
];

function extraireMetadonnees(fields: Record<string, unknown>): Omit<OffreTestResult, 'texte'> {
  const out: Omit<OffreTestResult, 'texte'> = {};
  for (const { key, airtableKey } of CHAMPS_METADONNEES) {
    const v = fields[airtableKey];
    if (typeof v === 'string' && v.trim()) (out as Record<string, string>)[key] = v.trim();
  }
  return out;
}

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const PAGE_SIZE = 100;
const MAX_PAGES = 2;

/**
 * Crée un driver Airtable qui récupère le texte d'une offre pour le test du prompt.
 * Si des offres ont déjà été analysées (scores renseignés), choisit une offre déjà qualifiée intéressante (meilleur score).
 * Sinon retourne la première offre ayant un contenu.
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

  async function fetchCandidates(): Promise<Array<{ texte: string; score: number; fields: Record<string, unknown> }>> {
    const candidates: Array<{ texte: string; score: number; fields: Record<string, unknown> }> = [];
    let offset: string | undefined;
    let pageCount = 0;

    while (pageCount < MAX_PAGES) {
      const url =
        `${API_BASE}/${encodeURIComponent(baseIdNorm)}/${encodeURIComponent(offresIdNorm)}?pageSize=${PAGE_SIZE}` +
        (offset ? `&offset=${encodeURIComponent(offset)}` : '');
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
      });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        records?: Array<{ fields?: Record<string, unknown> }>;
        offset?: string;
      };
      const records = json.records ?? [];
      for (const rec of records) {
        const fields = rec.fields ?? {};
        const texte = extraireTexte(fields);
        if (!texte) continue;
        candidates.push({ texte, score: scorePourTri(fields), fields });
      }
      offset = json.offset;
      pageCount++;
      if (!offset) break;
    }
    return candidates;
  }

  return {
    async getTexteUneOffre(): Promise<string | null> {
      const candidates = await fetchCandidates();
      if (candidates.length === 0) return null;
      const withScore = candidates.filter((c) => c.score >= 0);
      const chosen = withScore.length > 0
        ? withScore.sort((a, b) => b.score - a.score)[0]
        : candidates[0];
      return chosen.texte;
    },

    async getOffreTest(): Promise<OffreTestResult | null> {
      const candidates = await fetchCandidates();
      if (candidates.length === 0) return null;
      const withScore = candidates.filter((c) => c.score >= 0);
      const chosen = withScore.length > 0
        ? withScore.sort((a, b) => b.score - a.score)[0]
        : candidates[0];
      const metadonnees = extraireMetadonnees(chosen.fields);
      return { texte: chosen.texte, ...metadonnees };
    },
  };
}
