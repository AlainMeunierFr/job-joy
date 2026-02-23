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
    const v = (value ?? '').trim();
    if (v) return v;
  }
  return undefined;
}

/** Aligné sur wttj.js : premier bloc application/ld+json, puis description/title (JobPosting ou objet racine). */
function parseFirstJsonLd(html: string): Record<string, unknown> | undefined {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    const raw = script[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const jobPosting = parsed.find((x) => x && typeof x === 'object' && (x as Record<string, unknown>)['@type'] === 'JobPosting');
        if (jobPosting && typeof jobPosting === 'object') return jobPosting as Record<string, unknown>;
        const withDesc = parsed.find((x) => x && typeof x === 'object' && (x as Record<string, unknown>).description);
        if (withDesc && typeof withDesc === 'object') return withDesc as Record<string, unknown>;
      }
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (obj['@type'] === 'JobPosting' || obj.description || obj.title) return obj;
      }
    } catch {
      // Ignore invalid JSON-LD blocks and continue with other candidates.
    }
  }
  return undefined;
}

function extractFromMeta(html: string, property: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  return re.exec(html)?.[1]?.trim();
}

export function createWelcomeToTheJungleOfferFetchPlugin(): SourceOfferFetchPlugin {
  return {
    plugin: 'Welcome to the Jungle',
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
        const jsonLd = parseFirstJsonLd(html);
        const descriptionRaw = typeof jsonLd?.description === 'string' ? jsonLd.description : undefined;
        const poste = firstNonEmpty([
          typeof jsonLd?.title === 'string' ? jsonLd.title : undefined,
          extractFromMeta(html, 'og:title'),
          extractFromMeta(html, 'twitter:title'),
        ]);
        const entreprise = firstNonEmpty([
          typeof (jsonLd?.hiringOrganization as Record<string, unknown> | undefined)?.name === 'string'
            ? ((jsonLd?.hiringOrganization as Record<string, unknown>).name as string)
            : undefined,
        ]);
        const ville = firstNonEmpty([
          typeof (((jsonLd?.jobLocation as Record<string, unknown> | undefined)?.address as Record<string, unknown> | undefined)?.addressLocality) ===
          'string'
            ? ((((jsonLd?.jobLocation as Record<string, unknown>).address as Record<string, unknown>).addressLocality) as string)
            : undefined,
        ]);
        const salaire = firstNonEmpty([
          typeof (((jsonLd?.baseSalary as Record<string, unknown> | undefined)?.value as Record<string, unknown> | undefined)?.value) === 'string'
            ? ((((jsonLd?.baseSalary as Record<string, unknown>).value as Record<string, unknown>).value) as string)
            : undefined,
        ]);
        const texteOffre = descriptionRaw ? stripHtml(descriptionRaw) : undefined;

        if (!texteOffre && !poste && !entreprise && !ville && !salaire) {
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
