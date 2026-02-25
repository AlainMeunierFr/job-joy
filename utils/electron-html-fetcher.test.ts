/**
 * Tests pour HtmlFetcher et createElectronHtmlFetcher (US-4.6).
 */
import { createElectronHtmlFetcher } from './electron-html-fetcher.js';

describe('createElectronHtmlFetcher', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetchHtml appelle GET vers baseUrl avec url en query et retourne le corps de la réponse', async () => {
    const baseUrl = 'http://127.0.0.1:9999/fetch';
    const targetUrl = 'https://www.linkedin.com/jobs/view/123/';
    const expectedHtml = '<html><body>LinkedIn job content</body></html>';
    (globalThis as unknown as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(expectedHtml),
    });

    const fetcher = createElectronHtmlFetcher(baseUrl);
    const html = await fetcher.fetchHtml(targetUrl);

    expect(html).toBe(expectedHtml);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [callUrl] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(callUrl).toBe('http://127.0.0.1:9999/fetch?url=' + encodeURIComponent(targetUrl));
  });

  it('fetchHtml lève si la réponse n\'est pas ok', async () => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const fetcher = createElectronHtmlFetcher('http://127.0.0.1:9999/fetch');
    await expect(fetcher.fetchHtml('https://example.com/page')).rejects.toThrow();
  });
});
