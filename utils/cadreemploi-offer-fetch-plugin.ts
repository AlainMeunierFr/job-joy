import type { ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { SourceOfferFetchPlugin } from './source-plugins.js';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function toText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstNonEmpty(values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const cleaned = (value ?? '').trim();
    if (cleaned) return cleaned;
  }
  return undefined;
}

function extractMeta(html: string, property: string): string | undefined {
  return (
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
      ?.trim()
  );
}

function parseDateToIso(value: string | undefined): string | undefined {
  const raw = (value ?? '').trim();
  if (!raw) return undefined;
  const direct = Date.parse(raw);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  const fr = raw.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (!fr) return undefined;
  return new Date(`${fr[3]}-${fr[2]}-${fr[1]}T00:00:00.000Z`).toISOString();
}

export function createCadreEmploiOfferFetchPlugin(): SourceOfferFetchPlugin {
  return {
    algo: 'cadreemploi',
    stage2Implemented: true,
    async recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre> {
      const u = (url ?? '').trim();
      if (!u) return { ok: false, message: 'URL vide.' };

      try {
        const res = await fetch(u, {
          headers: {
            'User-Agent': 'Mozilla/5.0 analyse-offres/cadreemploi',
          },
          redirect: 'follow',
        });
        if (!res.ok) {
          const antiCrawler = res.status === 403 || res.status === 429;
          return {
            ok: false,
            message: antiCrawler
              ? `URL inaccessible (anti-crawler) HTTP ${res.status}`
              : `URL inaccessible HTTP ${res.status}`,
          };
        }

        const html = await res.text();
        const texte = toText(html);
        const poste = firstNonEmpty([
          html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ? toText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '') : undefined,
          extractMeta(html, 'og:title'),
          html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1],
        ]);
        const entreprise = firstNonEmpty([
          texte.match(/\bENTREPRISE\s+(.+?)(?:\s+Quelles sont les missions|\s+Informations complémentaires|$)/i)?.[1],
          html.match(/"hiringOrganization"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/i)?.[1],
        ]);
        const ville = firstNonEmpty([
          html.match(/"addressLocality"\s*:\s*"([^"]+)"/i)?.[1],
          texte.match(/\b([A-Z][A-Za-zÀ-ÖØ-öø-ÿ\- ]+)\s*[•|]\s*(?:CDI|CDD|Freelance|Stage|Alternance)\b/i)?.[1],
        ]);
        const salaire = firstNonEmpty([
          texte.match(/(\d[\d\s]*(?:k|K|€|euros?)[^\n\r]{0,30})/i)?.[1],
        ]);
        const dateOffre = parseDateToIso(
          firstNonEmpty([
            html.match(/"datePosted"\s*:\s*"([^"]+)"/i)?.[1],
            texte.match(/\b(?:publiée|publication)[^\d]*(\d{2}\/\d{2}\/\d{4})/i)?.[1],
          ])
        );

        const missionIdx = texte.toLowerCase().indexOf('quelles sont les missions');
        const infoIdx = texte.toLowerCase().indexOf('informations complémentaires');
        const texteOffre =
          missionIdx >= 0
            ? texte.slice(missionIdx, infoIdx > missionIdx ? infoIdx : Math.min(texte.length, missionIdx + 8000)).trim()
            : undefined;

        if (!texteOffre && !poste && !entreprise && !ville && !salaire && !dateOffre) {
          return { ok: false, message: 'Contenu offre non exploitable.' };
        }

        return {
          ok: true,
          champs: {
            texteOffre,
            poste,
            entreprise,
            ville,
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
