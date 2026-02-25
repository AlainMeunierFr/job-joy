/**
 * Extraction de l’ID de base Airtable depuis une URL (US-1.3).
 * Permet de coller l’URL de la base au lieu de copier l’ID à la main.
 */

/**
 * Extrait l'ID de la base depuis une URL Airtable (ex. https://airtable.com/appXXX/tblYYY/...).
 * Retourne l'ID (appXXX) ou null si l'URL ne correspond pas.
 */
export function extraireBaseIdDepuisUrl(urlOuId: string): string | null {
  const s = urlOuId.trim().replace(/\?.*$/, '');
  const matchApp = s.match(/\/app([A-Za-z0-9]+)/);
  if (matchApp) return 'app' + matchApp[1];
  if (/^app[A-Za-z0-9]+$/.test(s)) return s;
  return null;
}

/**
 * Extrait l'ID de table depuis une URL Airtable (ex. https://airtable.com/appXXX/tblYYY/viwZZZ...).
 * Retourne l'ID (tblYYY) ou null si non trouvé.
 */
export function extraireTableIdDepuisUrl(url: string): string | null {
  const s = url.trim().replace(/\?.*$/, '');
  const match = s.match(/\/tbl([A-Za-z0-9]+)/);
  if (match) return 'tbl' + match[1];
  if (/^tbl[A-Za-z0-9]+$/.test(s)) return s;
  return null;
}

/**
 * Prend une valeur (URL ou ID brut) et retourne l'ID de la base si détecté, sinon la valeur telle quelle si elle ressemble à un baseId (appXXX).
 */
export function normaliserBaseId(urlOuId: string): string {
  const s = urlOuId.trim();
  const fromUrl = extraireBaseIdDepuisUrl(s);
  if (fromUrl) return fromUrl;
  return s.replace(/\?.*$/, '');
}

/**
 * Retourne l’URL à ouvrir dans le navigateur pour la base Airtable.
 * Si la valeur est déjà une URL (https://airtable.com/...), elle est renvoyée telle quelle (sans query string).
 * Sinon (ID appXXX), renvoie https://airtable.com/{baseId}.
 * Utilisable par le tableau de bord pour un bouton « Ouvrir Airtable ».
 */
export function getUrlOuvertureBase(baseOuUrl: string): string {
  const s = baseOuUrl.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s.replace(/\?.*$/, '');
  const id = normaliserBaseId(s);
  return id ? `https://airtable.com/${id}` : '';
}
