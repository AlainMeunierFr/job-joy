/**
 * Extraction des offres depuis le contenu HTML d'un email LinkedIn (US-1.4 CA2).
 * S'inspire de ressources/AnalyseeMailLinkedin.js.
 */
import type { OffreExtraite } from '../types/offres-releve.js';
import { createHash } from 'node:crypto';

const BASE_URL_VIEW = 'https://www.linkedin.com/jobs/view/';
const ID_REGEX = /jobs\/view\/(\d+)(?:[/?#&\s]|$)/g;

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function toReadableText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitVilleDepartementFromLieu(
  lieu: string | undefined
): { ville?: string; département?: string } {
  const value = (lieu ?? '').trim();
  if (!value) return {};
  const match = value.match(/^(.+?)\s*-\s*(\d{2})\b/);
  if (!match) return {};
  const ville = match[1]?.trim();
  const département = match[2]?.trim();
  return {
    ville: ville || undefined,
    département: département || undefined,
  };
}

function isLikelySalary(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (
    /jobs\/view|trackingid=|target=|href=|https?:\/\/|www\.|·/i.test(v) ||
    v.length > 180
  ) {
    return false;
  }
  // Un salaire exploitable doit contenir un montant chiffré + un marqueur monétaire/période.
  if (!/\d/.test(v)) return false;
  return /€|\beuros?\b|\b\d[\d.,\s]*k\b|\/\s*(an|mois)|par\s+(an|mois)|annuel|mensuel|entre\s+\d/i.test(v);
}

function pickSalary(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return isLikelySalary(cleaned) ? cleaned : undefined;
}

function parseOffreDetails(blockRaw: string): {
  titre?: string;
  entreprise?: string;
  lieu?: string;
  salaire?: string;
} {
  const titreHtml = blockRaw.match(/<a[^>]*>([^<]{3,120})<\/a>/i)?.[1]?.trim();
  const infoHtml = blockRaw.match(/<p[^>]*>\s*([^<]+?)\s*·\s*([^<]+?)\s*<\/p>/i);
  const text = toReadableText(blockRaw);
  let titre = text.match(/Titre du poste\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? titreHtml;
  let entreprise = text.match(/Entreprise\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? infoHtml?.[1]?.trim();
  let lieu = text.match(/Ville\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? infoHtml?.[2]?.trim();
  let salaire = pickSalary(text.match(/Salaire\s*:\s*([^\n]+)/i)?.[1]?.trim());

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const metaIdx = lines.findIndex((l) => l.includes('·'));
  if (metaIdx !== -1) {
    const meta = lines[metaIdx].split('·').map((s) => s.trim()).filter(Boolean);
    if (!entreprise && meta[0]) {
      entreprise = meta[0];
    }
    if (!lieu && meta[1]) {
      // Ex: "Lyon (Sur site)" => "Lyon"
      lieu = meta[1].replace(/\([^)]*\)/g, '').trim();
    }
    if (!titre && metaIdx > 0) {
      const prev = lines[metaIdx - 1];
      if (prev && !/jobs\/view/i.test(prev)) {
        titre = prev;
      }
    }
  }

  if (!salaire) {
    const salaryLine = lines.find((l) => /(?:\bentre\b|\bsalaire\b|€|\beuros?\b)/i.test(l));
    if (salaryLine) {
      salaire = pickSalary(salaryLine);
    }
  }

  return {
    titre: titre || undefined,
    entreprise: entreprise || undefined,
    lieu: lieu || undefined,
    salaire: salaire || undefined,
  };
}

function collectEmailLevelCandidates(html: string): Array<{
  titre?: string;
  entreprise?: string;
  lieu?: string;
  salaire?: string;
}> {
  const text = toReadableText(html);
  const candidates: Array<{ titre?: string; entreprise?: string; lieu?: string; salaire?: string }> = [];

  const explicitRegex =
    /Titre du poste\s*:\s*([^\n]+)[\s\S]{0,220}?Entreprise\s*:\s*([^\n]+)[\s\S]{0,220}?Ville\s*:\s*([^\n]+)(?:[\s\S]{0,220}?Salaire\s*:\s*([^\n]+))?/gi;
  let m: RegExpExecArray | null;
  while ((m = explicitRegex.exec(text)) !== null) {
    candidates.push({
      titre: m[1]?.trim() || undefined,
      entreprise: m[2]?.trim() || undefined,
      lieu: m[3]?.trim() || undefined,
      salaire: pickSalary(m[4]?.trim()),
    });
  }

  if (candidates.length > 0) {
    return candidates;
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('·')) continue;
    const parts = line.split('·').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const maybeTitle = lines[i - 1];
    if (!maybeTitle || /jobs\/view/i.test(maybeTitle)) continue;
    candidates.push({
      titre: maybeTitle,
      entreprise: parts[0] || undefined,
      lieu: parts[1]?.replace(/\([^)]*\)/g, '').trim() || undefined,
      salaire: pickSalary(lines[i + 1]),
    });
  }

  return candidates;
}

/**
 * Extrait les offres (id, url, titre, entreprise, lieu) depuis le HTML d'un email LinkedIn.
 * Étape debug : l'extraction se base d'abord sur l'URL jobs/view/<id>/ (sans filtrage jobcard_body).
 */
export function extractLinkedinOffresFromHtml(html: string): OffreExtraite[] {
  const results: OffreExtraite[] = [];
  const seen = new Set<string>();
  const idsOrder: { id: string; idx: number }[] = [];
  const emailLevelCandidates = collectEmailLevelCandidates(html);

  let m: RegExpExecArray | null;
  ID_REGEX.lastIndex = 0;
  while ((m = ID_REGEX.exec(html)) !== null) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      idsOrder.push({ id, idx: m.index });
    }
  }

  for (let k = 0; k < idsOrder.length; k++) {
    const { id, idx } = idsOrder[k];
    const jcbIdx = html.indexOf('jobcard_body', idx);
    const blocStart = (jcbIdx !== -1 && jcbIdx <= idx + 1000) ? jcbIdx : idx;
    const bloc = html.substring(blocStart, blocStart + 6000);
    const parsed = parseOffreDetails(bloc);
    const fallback = emailLevelCandidates[k] ?? {};

    results.push({
      id,
      url: BASE_URL_VIEW + id + '/',
      titre: parsed.titre ?? fallback.titre,
      entreprise: parsed.entreprise ?? fallback.entreprise,
      lieu: parsed.lieu ?? fallback.lieu,
      salaire: parsed.salaire ?? fallback.salaire,
    });
  }

  return results;
}

/**
 * Alias historique conservé pendant la transition vers les plugins source.
 */
export function extractOffresFromHtml(html: string): OffreExtraite[] {
  return extractLinkedinOffresFromHtml(html);
}

/**
 * Extraction HelloWork (US-1.8) depuis les URLs de tracking présentes dans le body.
 * Si le token base64 est décodable, on stocke l'URL décodée ; sinon on garde l'URL encodée.
 */
export function extractHelloworkOffresFromHtml(html: string): OffreExtraite[] {
  const trackingUrls = [
    ...String(html ?? '').matchAll(/https:\/\/emails\.hellowork\.com\/clic\/[^\s"<>]+/gi),
  ].map((m) => m[0].replace(/&amp;/g, '&'));

  const offres: OffreExtraite[] = [];
  const seen = new Set<string>();

  function decodeBase64Url(value: string): string | undefined {
    if (!value) return undefined;
    const standard = value.replace(/-/g, '+').replace(/_/g, '/');
    const missingPadding = standard.length % 4;
    const padded = missingPadding === 0 ? standard : standard + '='.repeat(4 - missingPadding);
    try {
      return Buffer.from(padded, 'base64').toString('utf8');
    } catch {
      return undefined;
    }
  }

  function extractFirstHttpUrl(value: string): string | undefined {
    const m = value.match(/https?:\/\/[^\s"<>]+/i);
    return m?.[0];
  }

  function safeDecodeURIComponent(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function resolveFinalUrlFromDecoded(decoded: string): string | undefined {
    const firstUrl = extractFirstHttpUrl(decoded);
    if (!firstUrl) return undefined;
    if (/\/emplois\/\d+\.html/i.test(firstUrl)) {
      return firstUrl;
    }
    try {
      const parsed = new URL(firstUrl);
      const redirect = parsed.searchParams.get('urlRedirection');
      if (redirect) {
        const decodedRedirect = safeDecodeURIComponent(redirect);
        if (/^https?:\/\//i.test(decodedRedirect)) {
          return decodedRedirect;
        }
      }
    } catch {
      // Ignore malformed URL from decoded token.
    }
    return firstUrl;
  }

  function extraireToken(trackingUrl: string): string {
    const segments = trackingUrl.split('/').filter(Boolean);
    const idxClic = segments.findIndex((s) => s.toLowerCase() === 'clic');
    if (idxClic === -1) return '';
    const apresClic = segments.slice(idxClic + 1);
    for (let i = apresClic.length - 1; i >= 0; i--) {
      const s = apresClic[i];
      if (/^[A-Za-z0-9\-_]{8,}$/.test(s)) return s;
    }
    return '';
  }

  function buildStableHelloworkId(sourceUrl: string): string {
    const hash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);
    return `hellowork-${hash}`;
  }

  function computeOfferIdentity(trackingUrl: string): { id: string; url: string; hasNumericId: boolean; usedFallbackUrl: boolean } {
    const token = extraireToken(trackingUrl);
    const decoded = decodeBase64Url(token);
    const urlFromDecoded = decoded ? resolveFinalUrlFromDecoded(decoded) : undefined;
    const urlFinale = urlFromDecoded ?? trackingUrl;
    const idFromUrl = urlFinale.match(/emplois(?:\/|%2F)(\d+)/i)?.[1];
    const idFromTracking = trackingUrl.match(/[?&](?:utm_term|offerId|id)=([0-9]{5,})/i)?.[1];
    const id = idFromUrl ?? idFromTracking ?? buildStableHelloworkId(urlFinale);
    return { id, url: urlFinale, hasNumericId: Boolean(idFromUrl ?? idFromTracking), usedFallbackUrl: !urlFromDecoded };
  }

  function parseOffersFromCards(): OffreExtraite[] {
    const cardOffers: OffreExtraite[] = [];
    const seenCardIds = new Set<string>();
    const starts: number[] = [];
    const cardStartRegex = /<td[^>]*class="[^"]*bg-dark-cards[^"]*"[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = cardStartRegex.exec(html)) !== null) {
      starts.push(m.index);
    }
    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      const end = starts[i + 1] ?? html.length;
      const block = html.slice(start, end);
      const titleMatch = block.match(/<a[^>]*class="[^"]*font-mob-16[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!titleMatch) continue;
      const trackingUrl = titleMatch[1].replace(/&amp;/g, '&');
      const { id, url } = computeOfferIdentity(trackingUrl);
      if (!/^\d+$/.test(id)) continue;
      if (seenCardIds.has(id)) continue;
      seenCardIds.add(id);
      const titre = toReadableText(titleMatch[2]).trim() || undefined;
      const companyRaw = block.match(/<td[^>]*class="[^"]*dark-style-color[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1];
      const entreprise = companyRaw
        ? toReadableText(companyRaw).replace(/\s*Super recruteur.*$/i, '').trim() || undefined
        : undefined;
      const chipRegex = /background-color:#F6F6F6;[^>]*>([\s\S]*?)<\/td>/gi;
      let chip: RegExpExecArray | null;
      let lieu: string | undefined;
      let ville: string | undefined;
      let département: string | undefined;
      let salaire: string | undefined;
      while ((chip = chipRegex.exec(block)) !== null) {
        const text = toReadableText(chip[1]).trim();
        if (!lieu && /\s-\s\d{2}\b/.test(text)) {
          lieu = text;
          const split = splitVilleDepartementFromLieu(text);
          ville = split.ville;
          département = split.département;
        }
        if (!salaire) {
          salaire = pickSalary(text);
        }
      }
      cardOffers.push({
        id,
        url,
        titre,
        entreprise,
        lieu,
        ville,
        département,
        salaire,
      });
    }
    return cardOffers;
  }

  const offersFromCards = parseOffersFromCards();
  if (offersFromCards.length > 0) {
    // Les emails HelloWork "liste d'offres" contiennent toutes les infos utiles dans les cartes.
    // Évite d'interpréter les nombreux liens de tracking (logo, footer, préférences...) comme des offres.
    return offersFromCards;
  }

  for (let i = 0; i < trackingUrls.length; i++) {
    const trackingUrl = trackingUrls[i];
    const identity = computeOfferIdentity(trackingUrl);
    // Comportement inspiré du POC:
    // - on privilégie les offres avec id numérique
    // - fallback encodé seulement en cas d'email minimal (un seul lien) pour investigation
    const fallbackInvestigable = trackingUrls.length === 1 && identity.usedFallbackUrl;
    if (!identity.hasNumericId && !fallbackInvestigable) continue;
    if (seen.has(identity.id)) continue;
    seen.add(identity.id);
    offres.push({ id: identity.id, url: identity.url });
  }

  return offres;
}

function toBase64PaddingSafe(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const missingPadding = normalized.length % 4;
  return missingPadding === 0 ? normalized : normalized + '='.repeat(4 - missingPadding);
}

function decodeWttjTrackingUrl(trackingUrl: string): string | undefined {
  const m = trackingUrl.match(/[?&]upn=([^&]+)/i);
  if (!m?.[1]) return undefined;
  const encodedUpn = m[1]
    .replace(/-2B/g, '+')
    .replace(/-2F/g, '/')
    .replace(/-3D/g, '=')
    .replace(/-5F/g, '_');

  const withoutPrefix = encodedUpn.includes('.') ? encodedUpn.split('.').slice(1).join('.') : encodedUpn;
  const candidates = [withoutPrefix, encodedUpn];

  for (const candidate of candidates) {
    const tokens = candidate.split('_').filter(Boolean);
    for (const token of tokens) {
      try {
        const decoded = Buffer.from(toBase64PaddingSafe(token), 'base64').toString('utf8');
        const firstUrl = decoded.match(/https?:\/\/[^\s"<>]+/i)?.[0];
        if (firstUrl && /welcometothejungle\.com/i.test(firstUrl)) return firstUrl;
      } catch {
        // Continue probing remaining token candidates.
      }
    }
  }

  return undefined;
}

function extractWttjId(url: string, titre?: string, entreprise?: string, ville?: string): string {
  const cleanedUrl = (url ?? '').trim();
  const fromSlug = cleanedUrl.match(/\/jobs\/([^/?#]+)/i)?.[1];
  if (fromSlug) return fromSlug.toLowerCase();
  const fromNumeric = cleanedUrl.match(/\/emplois\/(\d+)\.html/i)?.[1];
  if (fromNumeric) return fromNumeric;
  const seed = [titre ?? '', entreprise ?? '', ville ?? '', cleanedUrl].join('|').toLowerCase();
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return `wttj-${hash}`;
}

function extractWttjVille(line: string | undefined): string | undefined {
  const value = (line ?? '').trim();
  if (!value) return undefined;
  const chunks = value.split('-').map((s) => s.trim()).filter(Boolean);
  return chunks.length >= 2 ? chunks[chunks.length - 1] : undefined;
}

/**
 * Extraction WTTJ (US-1.10) depuis les cartes offres du body email.
 * Récupère un id stable, une URL (décodée si possible), et les champs métier présents.
 */
export function extractWelcomeToTheJungleOffresFromHtml(html: string): OffreExtraite[] {
  const source = String(html ?? '');
  const offres: OffreExtraite[] = [];
  const seenIds = new Set<string>();
  const titleLinkRegex = /<td[^>]*font-size:20px[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>/gi;
  let m: RegExpExecArray | null;

  while ((m = titleLinkRegex.exec(source)) !== null) {
    const href = (m[1] ?? '').replace(/&amp;/g, '&').trim();
    const titre = toReadableText(m[2] ?? '').replace(/\s+/g, ' ').trim() || undefined;
    if (!href || !titre) continue;

    const anchorIdx = m.index;
    const blocStart = Math.max(0, source.lastIndexOf('class="job-item"', anchorIdx));
    const blocEndCandidate = source.indexOf('class="job-item"', anchorIdx + 1);
    const blocEnd = blocEndCandidate === -1 ? Math.min(source.length, anchorIdx + 4000) : blocEndCandidate;
    const bloc = source.slice(blocStart, blocEnd);

    const companyRaw = bloc.match(/text-transform:uppercase[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    const locationRaw = bloc.match(/font-size:14px[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    const entreprise = companyRaw ? toReadableText(companyRaw).trim() || undefined : undefined;
    const lieu = locationRaw ? toReadableText(locationRaw).trim() || undefined : undefined;
    const ville = extractWttjVille(lieu);
    const decodedUrl = decodeWttjTrackingUrl(href);
    const urlFinale = decodedUrl ?? href;
    const id = extractWttjId(urlFinale, titre, entreprise, ville);

    if (seenIds.has(id)) continue;
    seenIds.add(id);
    offres.push({
      id,
      url: urlFinale,
      titre,
      entreprise,
      ville,
      lieu,
    });
  }

  return offres;
}

function buildStableId(prefix: string, seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return `${prefix}-${hash}`;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeTrackingTokenBase64Json(token: string): string | undefined {
  if (!token) return undefined;
  const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
  const missingPadding = normalized.length % 4;
  const padded = missingPadding === 0 ? normalized : normalized + '='.repeat(4 - missingPadding);
  try {
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    const href = typeof parsed.href === 'string' ? parsed.href : undefined;
    return href ? safeDecodeURIComponent(href) : undefined;
  } catch {
    return undefined;
  }
}

function cleanupUrl(url: string): string {
  const raw = (url ?? '').trim();
  if (!raw) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes('jobs.makesense.org')) {
      parsed.search = '';
      parsed.hash = '';
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

function extractJobSlugFromUrl(url: string): string | undefined {
  const m = (url ?? '').match(/\/jobs\/([^/?#]+)/i);
  return m?.[1]?.trim() || undefined;
}

function decodeJtmsTrackingUrl(trackingUrl: string): string | undefined {
  const m = trackingUrl.match(/\/e\/c\/([^/]+)/i);
  const decoded = decodeTrackingTokenBase64Json(m?.[1] ?? '');
  if (!decoded) return undefined;
  return cleanupUrl(decoded);
}

/**
 * Extraction JTMS (US-1.11) depuis les liens de tracking Customer.io.
 * - Décode la cible quand possible
 * - Fallback sur URL de tracking si non décodable
 * - Génère un id stable sans doublon
 */
export function extractJobThatMakeSenseOffresFromHtml(html: string): OffreExtraite[] {
  const source = String(html ?? '');
  const offres: OffreExtraite[] = [];
  const seen = new Set<string>();
  const anchorRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = anchorRegex.exec(source)) !== null) {
    const hrefRaw = (m[1] ?? '').replace(/&amp;/g, '&').trim();
    if (!hrefRaw || !/customeriomail\.com\/e\/c\//i.test(hrefRaw)) continue;

    const decoded = decodeJtmsTrackingUrl(hrefRaw);
    const finalUrl = decoded ?? hrefRaw;
    const looksLikeOffer =
      /jobs\.makesense\.org/i.test(finalUrl) ? /\/jobs\//i.test(finalUrl) : /customeriomail\.com\/e\/c\//i.test(finalUrl);
    if (!looksLikeOffer) continue;

    const anchorText = toReadableText(m[2] ?? '').replace(/\s+/g, ' ').trim();
    if (!anchorText || /^(voir|modifier cette alerte|toutes les annonces)$/i.test(anchorText)) continue;

    const around = source.slice(m.index, Math.min(source.length, m.index + 1000));
    const entreprise = toReadableText(around.match(/<\/a>\s*<div>([^<]{2,120})<\/div>/i)?.[1] ?? '').trim() || undefined;
    const lieu = toReadableText(
      around.match(/<img[^>]+loc\.png[^>]*>\s*([^<]{2,120})<\/span>/i)?.[1] ?? ''
    ).trim() || undefined;
    const id = extractJobSlugFromUrl(finalUrl) ?? buildStableId('jtms', finalUrl);

    if (seen.has(id)) continue;
    seen.add(id);
    offres.push({
      id,
      url: finalUrl,
      titre: anchorText,
      entreprise,
      lieu,
      ville: lieu,
    });
  }

  return offres;
}

function decodeCadreemploiTrackingUrl(trackingUrl: string): string | undefined {
  try {
    const parsed = new URL(trackingUrl);
    for (const key of ['url', 'target', 'redirect', 'destination']) {
      const value = parsed.searchParams.get(key);
      if (!value) continue;
      const decoded = safeDecodeURIComponent(value);
      if (/^https?:\/\//i.test(decoded)) return decoded;
    }
  } catch {
    // Ignore malformed tracking URLs.
  }
  return undefined;
}

function extractCadreemploiId(url: string): string {
  const fromOffreId = (url ?? '').match(/[?&]offreId=(\d+)/i)?.[1];
  if (fromOffreId) return fromOffreId;
  return buildStableId('cadreemploi', url);
}

/**
 * Extraction cadreemploi (US-1.12) depuis les liens de tracking emails.
 */
export function extractCadreemploiOffresFromHtml(html: string): OffreExtraite[] {
  const source = String(html ?? '');
  const offres: OffreExtraite[] = [];
  const seen = new Set<string>();
  const anchorRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = anchorRegex.exec(source)) !== null) {
    const hrefRaw = (m[1] ?? '').replace(/&amp;/g, '&').trim();
    if (!hrefRaw || (!/cadremploi\.fr/i.test(hrefRaw) && !/emails\d*\.alertes\.cadremploi\.fr/i.test(hrefRaw))) continue;

    const finalUrl = decodeCadreemploiTrackingUrl(hrefRaw) ?? hrefRaw;
    const anchorText = toReadableText(m[2] ?? '').replace(/\s+/g, ' ').trim();
    if (!anchorText) continue;
    if (/^(voir l'offre|voir toutes les offres|cadremploi|facebook|instagram|youtube|x)$/i.test(anchorText)) continue;

    const around = source.slice(m.index, Math.min(source.length, m.index + 1200));
    const entrepriseVilleLine = toReadableText(
      around.match(/<span[^>]*font-weight:bold;[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? ''
    );
    const entreprise = entrepriseVilleLine.split('•')[0]?.trim() || undefined;
    const ville = entrepriseVilleLine.split('•')[1]?.trim() || undefined;
    const id = extractCadreemploiId(finalUrl);

    if (seen.has(id)) continue;
    seen.add(id);
    offres.push({
      id,
      url: finalUrl,
      titre: anchorText,
      entreprise,
      ville,
      lieu: ville,
    });
  }

  return offres;
}
