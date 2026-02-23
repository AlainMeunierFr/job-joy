import type { ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { SourceOfferFetchPlugin } from './source-plugins.js';
import { BROWSER_LIKE_HEADERS } from './fetch-offre-headers.js';

function extractFirstString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function extractAgentIaScriptContent(html: string): string | undefined {
  const openTagRegex = /<script\b[^>]*\bid=["']AgentIaJsonOffre["'][^>]*>/i;
  const openTagMatch = openTagRegex.exec(html);
  if (!openTagMatch || openTagMatch.index < 0) return undefined;
  const start = openTagMatch.index + openTagMatch[0].length;
  const end = html.indexOf('</script>', start);
  if (end === -1) return undefined;
  return html.slice(start, end).trim();
}

export function createHelloworkOfferFetchPlugin(): SourceOfferFetchPlugin {
  return {
    plugin: 'HelloWork',
    stage2Implemented: true,
    async recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre> {
      const u = (url ?? '').trim();
      if (!u) {
        return { ok: false, message: 'URL vide.' };
      }
      try {
        const res = await fetch(u, {
          headers: BROWSER_LIKE_HEADERS,
        });
        if (!res.ok) {
          return { ok: false, message: `HTTP ${res.status}` };
        }
        const html = await res.text();
        const jsonContent = extractAgentIaScriptContent(html);
        if (!jsonContent) {
          return { ok: false, message: 'AgentIaJsonOffre introuvable.' };
        }
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(jsonContent) as Record<string, unknown>;
        } catch {
          return { ok: false, message: 'JSON AgentIaJsonOffre invalide.' };
        }
        const texteOffre = extractFirstString(data, ['Description', 'description']);
        const poste = extractFirstString(data, ['Intitule', 'intitule', 'Titre', 'titre']);
        const entreprise = extractFirstString(data, ['NomEntreprise', 'nomEntreprise', 'Entreprise', 'entreprise']);
        const ville = extractFirstString(data, ['Ville', 'ville']);
        const département = extractFirstString(data, ['Departement', 'département', 'departement']);
        const salaire = extractFirstString(data, ['Salaire', 'salaire']);
        const dateOffre = extractFirstString(data, ['DatePublication', 'datePublication', 'DateOffre', 'dateOffre']);

        return {
          ok: true,
          champs: {
            texteOffre,
            poste,
            entreprise,
            ville,
            département,
            salaire,
            dateOffre,
          },
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
