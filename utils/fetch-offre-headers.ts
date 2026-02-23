/**
 * En-têtes HTTP type navigateur pour les fetch de pages d'offres (phase 2).
 * Alignés sur les scripts JS de référence (data/ressources/wttj.js, AnalyseeeMailHelloWork.js)
 * qui utilisaient un User-Agent Chrome et Accept/Accept-Language pour récupérer le contenu.
 * Note : jtms.js et ce.js utilisaient Puppeteer ; si un site renvoie 403 avec fetch,
 * il faudra envisager Playwright pour cette source (comme LinkedIn).
 */
export const BROWSER_LIKE_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
};
