/**
 * Factory HtmlFetcher selon l'environnement (US-4.6).
 * En mode Electron packagé (JOB_JOY_ELECTRON_FETCH_URL défini), retourne un fetcher HTTP.
 * Sinon retourne undefined : les appelants utilisent le comportement par défaut (Playwright).
 */

import type { HtmlFetcher } from './electron-html-fetcher.js';
import { createElectronHtmlFetcher } from './electron-html-fetcher.js';
import { isElectronPackaged } from './electron-packaged.js';

/**
 * Retourne un HtmlFetcher pour LinkedIn en mode Electron packagé, sinon undefined.
 */
export function getLinkedInHtmlFetcherForEnv(): HtmlFetcher | undefined {
  if (!isElectronPackaged()) return undefined;
  const baseUrl = process.env.JOB_JOY_ELECTRON_FETCH_URL!;
  return createElectronHtmlFetcher(baseUrl);
}

/**
 * Retourne un HtmlFetcher pour Cadre emploi en mode Electron packagé, sinon undefined.
 */
export function getCadreEmploiHtmlFetcherForEnv(): HtmlFetcher | undefined {
  if (!isElectronPackaged()) return undefined;
  const baseUrl = process.env.JOB_JOY_ELECTRON_FETCH_URL!;
  return createElectronHtmlFetcher(baseUrl);
}
