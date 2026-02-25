/**
 * Tests pour getLinkedInHtmlFetcherForEnv et getCadreEmploiHtmlFetcherForEnv (US-4.6).
 */
import {
  getLinkedInHtmlFetcherForEnv,
  getCadreEmploiHtmlFetcherForEnv,
} from './env-html-fetcher.js';

describe('getLinkedInHtmlFetcherForEnv', () => {
  const originalEnv = process.env.JOB_JOY_ELECTRON_FETCH_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.JOB_JOY_ELECTRON_FETCH_URL = originalEnv;
    } else {
      delete process.env.JOB_JOY_ELECTRON_FETCH_URL;
    }
  });

  it('retourne undefined quand JOB_JOY_ELECTRON_FETCH_URL est absent', () => {
    delete process.env.JOB_JOY_ELECTRON_FETCH_URL;
    expect(getLinkedInHtmlFetcherForEnv()).toBeUndefined();
  });

  it('retourne undefined quand JOB_JOY_ELECTRON_FETCH_URL est vide', () => {
    process.env.JOB_JOY_ELECTRON_FETCH_URL = '';
    expect(getLinkedInHtmlFetcherForEnv()).toBeUndefined();
  });

  it('retourne une instance HtmlFetcher quand JOB_JOY_ELECTRON_FETCH_URL est défini', () => {
    process.env.JOB_JOY_ELECTRON_FETCH_URL = 'http://127.0.0.1:9999/fetch';
    const fetcher = getLinkedInHtmlFetcherForEnv();
    expect(fetcher).toBeDefined();
    expect(fetcher).toHaveProperty('fetchHtml');
    expect(typeof (fetcher as { fetchHtml: unknown }).fetchHtml).toBe('function');
  });
});

describe('getCadreEmploiHtmlFetcherForEnv', () => {
  const originalEnv = process.env.JOB_JOY_ELECTRON_FETCH_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.JOB_JOY_ELECTRON_FETCH_URL = originalEnv;
    } else {
      delete process.env.JOB_JOY_ELECTRON_FETCH_URL;
    }
  });

  it('retourne undefined quand JOB_JOY_ELECTRON_FETCH_URL est absent', () => {
    delete process.env.JOB_JOY_ELECTRON_FETCH_URL;
    expect(getCadreEmploiHtmlFetcherForEnv()).toBeUndefined();
  });

  it('retourne une instance HtmlFetcher quand JOB_JOY_ELECTRON_FETCH_URL est défini', () => {
    process.env.JOB_JOY_ELECTRON_FETCH_URL = 'http://127.0.0.1:9999/fetch';
    const fetcher = getCadreEmploiHtmlFetcherForEnv();
    expect(fetcher).toBeDefined();
    expect(fetcher).toHaveProperty('fetchHtml');
    expect(typeof (fetcher as { fetchHtml: unknown }).fetchHtml).toBe('function');
  });
});
