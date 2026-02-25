/**
 * Fetcher HTTP pour récupérer le HTML d'une URL en mode Electron packagé (US-4.6).
 * Utilisé à la place de Playwright lorsque JOB_JOY_ELECTRON_FETCH_URL est défini.
 */

export interface HtmlFetcher {
  fetchHtml(url: string): Promise<string>;
}

/**
 * Crée un HtmlFetcher qui fait un GET vers baseUrl avec le paramètre url en query.
 * Convention : baseUrl + "?url=" + encodeURIComponent(url)
 */
export function createElectronHtmlFetcher(baseUrl: string): HtmlFetcher {
  const base = (baseUrl ?? '').trim().replace(/\/*$/, '');
  return {
    async fetchHtml(url: string): Promise<string> {
      const u = (url ?? '').trim();
      const fetchUrl = `${base}?url=${encodeURIComponent(u)}`;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Electron fetch failed: ${res.status}`);
      }
      return res.text();
    },
  };
}
