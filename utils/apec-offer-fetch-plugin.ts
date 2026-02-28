/**
 * Plugin enrichissement (phase 2) pour les offres APEC.
 * Récupère le contenu de la page détail offre depuis une URL apec.fr (ex. liste html/APEC).
 * Exclut scripts, styles et contenu hors zone offre pour éviter de stocker du bruit (config JS, popin connexion).
 */
import type { ResultatEnrichissementOffre } from '../types/offres-releve.js';
import type { SourceOfferFetchPlugin } from './source-plugins.js';
import { BROWSER_LIKE_HEADERS } from './fetch-offre-headers.js';

/** Retire script et style pour ne pas inclure JS/config dans le texte extrait. */
function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
}

/** Isole la zone contenu principal (offre) pour éviter popin connexion / header / footer. */
function extractMainContent(html: string): string | null {
  const stripped = stripScriptsAndStyles(html);
  const patterns: Array<{ re: RegExp; minLen: number }> = [
    { re: /<main\b[^>]*>([\s\S]*?)<\/main>/i, minLen: 100 },
    { re: /<article\b[^>]*>([\s\S]*?)<\/article>/i, minLen: 100 },
    { re: /<div[^>]*\b(?:class|id)=["'][^"']*offre[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, minLen: 150 },
    { re: /<div[^>]*\b(?:class|id)=["'][^"']*detail[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, minLen: 150 },
    { re: /<div[^>]*\b(?:class|id)=["'][^"']*fiche[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, minLen: 150 },
    { re: /<div[^>]*\b(?:class|id)=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i, minLen: 200 },
  ];
  for (const { re, minLen } of patterns) {
    const m = stripped.match(re);
    if (m && m[1] && m[1].trim().length >= minLen) return m[1].trim();
  }
  return null;
}

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
  return html
    .match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
        'i'
      )
    )?.[1]
    ?.trim();
}

/** Détecte une page connexion / erreur plutôt qu'une fiche offre. */
function looksLikeLoginOrError(texte: string): boolean {
  const t = texte.toLowerCase();
  const hasLogin = /vous avez déjà un compte|identifiant|mot de passe|se connecter|créer votre compte/i.test(t);
  const hasPopin = /popin-connexion|popin-connexion/i.test(t);
  const shortOrNoJob = t.length < 300 || !/\b(?:mission|description|cdi|cdd|recrutement|poste)\b/i.test(t);
  return (hasLogin && hasPopin) || (hasLogin && shortOrNoJob);
}

function parseHtmlToChamps(html: string): ResultatEnrichissementOffre {
  const htmlReduced = extractMainContent(html) ?? stripScriptsAndStyles(html);
  const texte = toText(htmlReduced);
  if (looksLikeLoginOrError(texte)) {
    return { ok: false, message: 'Page connexion ou contenu non exploitable (APEC).' };
  }
  const poste = firstNonEmpty([
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      ? toText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '')
      : undefined,
    extractMeta(html, 'og:title'),
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1],
  ]);
  const entreprise = firstNonEmpty([
    texte.match(/\b(?:entreprise|employeur)\s*[:\s]+([^\n\r]+)/i)?.[1]?.trim(),
    extractMeta(html, 'og:site_name'),
  ]);
  const ville = firstNonEmpty([
    texte.match(/\b(?:lieu|ville|localisation)\s*[:\s]+([^\n\r]+)/i)?.[1]?.trim(),
    texte.match(/\b([A-Z][A-Za-zÀ-ÖØ-öø-ÿ\- ]+)\s*[•|]\s*(?:CDI|CDD|Freelance|Stage)\b/i)?.[1],
  ]);
  const salaireMatch = texte.match(/(?:salaire|rémunération)\s*[:\s]*([^\n\r]{5,80})/i);
  const salaire = salaireMatch?.[1]?.trim() && !/tracking|req\b/i.test(salaireMatch[1]) ? salaireMatch[1] : undefined;
  const dateOffre = firstNonEmpty([
    html.match(/"datePosted"\s*:\s*"([^"]+)"/i)?.[1],
    texte.match(/\b(?:publiée|publication)[^\d]*(\d{2}\/\d{2}\/\d{4})/i)?.[1],
  ]);

  const missionIdx = texte.toLowerCase().indexOf('mission');
  const descIdx = texte.toLowerCase().indexOf('description');
  const startIdx = missionIdx >= 0 ? missionIdx : descIdx >= 0 ? descIdx : -1;
  let texteOffre: string | undefined =
    startIdx >= 0
      ? texte.slice(startIdx, Math.min(texte.length, startIdx + 8000)).trim()
      : texte.length > 100
        ? texte.slice(0, Math.min(8000, texte.length)).trim()
        : undefined;
  if ((texteOffre?.length ?? 0) < 50) texteOffre = undefined;

  if (!texteOffre && !poste && !entreprise && !ville && !salaire && !dateOffre) {
    return { ok: false, message: 'Contenu offre APEC non exploitable.' };
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

export function createApecOfferFetchPlugin(): SourceOfferFetchPlugin {
  return {
    source: 'APEC',
    stage2Implemented: true,
    async recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre> {
      const u = (url ?? '').trim();
      if (!u) return { ok: false, message: 'URL vide.' };
      if (!u.toLowerCase().includes('apec.fr')) {
        return { ok: false, message: 'URL non reconnue comme offre APEC.' };
      }

      try {
        const res = await fetch(u, {
          headers: BROWSER_LIKE_HEADERS,
          redirect: 'follow',
        });
        if (!res.ok) {
          return {
            ok: false,
            message: `URL APEC inaccessible HTTP ${res.status}`,
          };
        }
        const html = await res.text();
        if (!html?.trim()) return { ok: false, message: 'Réponse vide.' };
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
