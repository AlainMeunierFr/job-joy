import type { ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { SourceOfferFetchPlugin } from './source-plugins.js';
import { BROWSER_LIKE_HEADERS } from './fetch-offre-headers.js';
import { fetchCadreEmploiPage } from './cadreemploi-page-fetcher.js';
import { getCadreEmploiHtmlFetcherForEnv } from './env-html-fetcher.js';

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

/** Rejette les valeurs type ID de tracking ou "req" ; exige un vrai marqueur salaire (€, euros, k€). */
function isLikelySalary(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 120) return false;
  // IDs de tracking / tokens : longue chaîne alphanumérique ou contient "req" comme mot
  if (/[A-Z0-9]{12,}/i.test(v) || /\breq\b/i.test(v)) return false;
  if (/href=|https?:\/\/|tracking|offreId=/i.test(v)) return false;
  // Doit contenir un montant crédible : €, euros, ou chiffres + k (milliers)
  return /€|\beuros?\b|\d[\d\s.,]*(?:k|K)\s*€?|\/\s*(an|mois)|par\s+(an|mois)|annuel|mensuel|entre\s+\d/i.test(v);
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

function parseHtmlToChamps(html: string): ResultatEnrichissementOffre {
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
  const salaireCandidates = [
    texte.match(/Salaire\s*:\s*([^\n\r]+)/i)?.[1]?.trim(),
    texte.match(/(\d[\d\s,]*(?:k|K)\s*€?[^\n\r]{0,20})/)?.[1]?.trim(),
    texte.match(/(\d[\d\s,]+)\s*€[^\n\r]{0,15}/)?.[0]?.trim(),
  ].filter((s): s is string => Boolean(s?.trim()));
  const salaire = firstNonEmpty(salaireCandidates.filter((s) => isLikelySalary(s)));
  const dateOffre = parseDateToIso(
    firstNonEmpty([
      html.match(/"datePosted"\s*:\s*"([^"]+)"/i)?.[1],
      texte.match(/\b(?:publiée|publication)[^\d]*(\d{2}\/\d{2}\/\d{4})/i)?.[1],
    ])
  );

  const missionIdx = texte.toLowerCase().indexOf('quelles sont les missions');
  const infoIdx = texte.toLowerCase().indexOf('informations complémentaires');
  let texteOffre: string | undefined =
    missionIdx >= 0
      ? texte.slice(missionIdx, infoIdx > missionIdx ? infoIdx : Math.min(texte.length, missionIdx + 8000)).trim()
      : undefined;
  if (!texteOffre && texte.length > 100) {
    const fallbacks = [
      texte.toLowerCase().indexOf('missions'),
      texte.toLowerCase().indexOf('description du poste'),
      texte.toLowerCase().indexOf('présentation du poste'),
      texte.toLowerCase().indexOf('description'),
      texte.toLowerCase().indexOf('entreprise'),
    ].filter((i) => i >= 0);
    const start = fallbacks.length > 0 ? Math.min(...fallbacks) : 0;
    texteOffre = texte.slice(start, Math.min(texte.length, start + 8000)).trim();
    if ((texteOffre?.length ?? 0) < 50) texteOffre = undefined;
  }

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
}

export function createCadreEmploiOfferFetchPlugin(): SourceOfferFetchPlugin {
  return {
    source: 'Cadre Emploi',
    stage2Implemented: true,
    async recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre> {
      const u = (url ?? '').trim();
      if (!u) return { ok: false, message: 'URL vide.' };

      try {
        let html: string | null = null;
        const res = await fetch(u, {
          headers: BROWSER_LIKE_HEADERS,
          redirect: 'follow',
        });
        if (res.ok) {
          html = await res.text();
        } else if (res.status === 403 || res.status === 429) {
          const playResult = await fetchCadreEmploiPage(u, getCadreEmploiHtmlFetcherForEnv());
          if ('html' in playResult) html = playResult.html;
          else return { ok: false, message: playResult.error };
        } else {
          return {
            ok: false,
            message: `URL inaccessible HTTP ${res.status}`,
          };
        }

        if (!html) return { ok: false, message: 'Réponse vide.' };
        return parseHtmlToChamps(html);
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
