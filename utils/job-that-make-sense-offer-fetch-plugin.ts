import type { ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { SourceOfferFetchPlugin } from './source-plugins.js';
import { BROWSER_LIKE_HEADERS } from './fetch-offre-headers.js';

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtml(input: string): string {
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

function parseJobPostingJsonLd(html: string): Record<string, unknown> | undefined {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const jobPosting = parsed.find(
          (x) => x && typeof x === 'object' && (x as Record<string, unknown>)['@type'] === 'JobPosting'
        );
        if (jobPosting && typeof jobPosting === 'object') return jobPosting as Record<string, unknown>;
      }
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (obj['@type'] === 'JobPosting' || obj.title || obj.description) return obj;
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }
  return undefined;
}

function extractMeta(html: string, property: string): string | undefined {
  return (
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
      ?.trim()
  );
}

export function createJobThatMakeSenseOfferFetchPlugin(): SourceOfferFetchPlugin {
  return {
    plugin: 'Job That Make Sense',
    stage2Implemented: true,
    async recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre> {
      const u = (url ?? '').trim();
      if (!u) return { ok: false, message: 'URL vide.' };

      try {
        const res = await fetch(u, {
          headers: BROWSER_LIKE_HEADERS,
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
        const jsonLd = parseJobPostingJsonLd(html);

        const descriptionRaw = typeof jsonLd?.description === 'string' ? jsonLd.description : undefined;
        const poste = firstNonEmpty([
          typeof jsonLd?.title === 'string' ? jsonLd.title : undefined,
          extractMeta(html, 'og:title'),
          extractMeta(html, 'twitter:title'),
        ]);
        const entreprise = firstNonEmpty([
          typeof (jsonLd?.hiringOrganization as Record<string, unknown> | undefined)?.name === 'string'
            ? ((jsonLd?.hiringOrganization as Record<string, unknown>).name as string)
            : undefined,
          extractMeta(html, 'og:site_name'),
        ]);
        const ville = firstNonEmpty([
          typeof (
            ((jsonLd?.jobLocation as Record<string, unknown> | undefined)?.address as Record<string, unknown> | undefined)
              ?.addressLocality
          ) === 'string'
            ? ((((jsonLd?.jobLocation as Record<string, unknown>).address as Record<string, unknown>).addressLocality) as string)
            : undefined,
        ]);
        const dateOffre = firstNonEmpty([
          typeof jsonLd?.datePosted === 'string' ? jsonLd.datePosted : undefined,
          extractMeta(html, 'article:published_time'),
        ]);
        const texteOffre = descriptionRaw ? stripHtml(descriptionRaw) : undefined;

        if (!texteOffre && !poste && !entreprise && !ville && !dateOffre) {
          return { ok: false, message: 'Contenu offre non exploitable.' };
        }

        return {
          ok: true,
          champs: {
            texteOffre,
            poste,
            entreprise,
            ville,
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
