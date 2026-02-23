/**
 * Tests TDD pour le plugin HelloWork étape 2 (US-1.8 CA4).
 */
import { createHelloworkOfferFetchPlugin } from './hellowork-offer-fetch-plugin.js';

function htmlWithAgentIaJson(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  return `<!DOCTYPE html><html><body><script id="AgentIaJsonOffre" type="application/json">${json}</script></body></html>`;
}

describe('createHelloworkOfferFetchPlugin', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retourne ok: false pour URL vide', async () => {
    const plugin = createHelloworkOfferFetchPlugin();
    const result = await plugin.recupererContenuOffre('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('vide');
  });

  it('retourne ok: true avec champs quand la page contient AgentIaJsonOffre', async () => {
    const plugin = createHelloworkOfferFetchPlugin();
    const html = htmlWithAgentIaJson({
      Description: 'Texte de l\'offre complet',
      Intitule: 'Développeur Full Stack',
      NomEntreprise: 'Acme SAS',
      Ville: 'Lyon',
      Salaire: '45k€',
    });
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    });

    const result = await plugin.recupererContenuOffre('https://www.hellowork.com/fr-fr/emplois/123.html');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.champs.texteOffre).toBe('Texte de l\'offre complet');
      expect(result.champs.poste).toBe('Développeur Full Stack');
      expect(result.champs.entreprise).toBe('Acme SAS');
      expect(result.champs.ville).toBe('Lyon');
      expect(result.champs.salaire).toBe('45k€');
    }
  });

  it('retourne ok: false quand HTTP non 2xx', async () => {
    const plugin = createHelloworkOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    const result = await plugin.recupererContenuOffre('https://www.hellowork.com/fr-fr/emplois/999.html');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('404');
  });

  it('retourne ok: false quand AgentIaJsonOffre absent du HTML', async () => {
    const plugin = createHelloworkOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><body>Pas de script</body></html>'),
    });

    const result = await plugin.recupererContenuOffre('https://www.hellowork.com/fr-fr/emplois/1.html');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('AgentIaJsonOffre');
  });

  it('parse un JSON AgentIaJsonOffre imbriqué sans casser sur les accolades internes', async () => {
    const plugin = createHelloworkOfferFetchPlugin();
    const html = `<!DOCTYPE html><html><body>
      <script id="AgentIaJsonOffre" type="application/json">
      {
        "Description": "Texte de l'offre",
        "Intitule": "Backend Engineer",
        "NomEntreprise": "Acme",
        "Ville": "Nantes",
        "Meta": { "tracking": { "source": "email", "nested": { "a": 1 } } }
      }
      </script>
    </body></html>`;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    });

    const result = await plugin.recupererContenuOffre('https://www.hellowork.com/fr-fr/emplois/123.html');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.champs.texteOffre).toBe("Texte de l'offre");
      expect(result.champs.poste).toBe('Backend Engineer');
      expect(result.champs.entreprise).toBe('Acme');
      expect(result.champs.ville).toBe('Nantes');
    }
  });

  it('retourne un message explicite quand AgentIaJsonOffre contient un JSON invalide', async () => {
    const plugin = createHelloworkOfferFetchPlugin();
    const html = `<!DOCTYPE html><html><body>
      <script id="AgentIaJsonOffre" type="application/json">{ "Description": "ok", }</script>
    </body></html>`;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(html),
    });

    const result = await plugin.recupererContenuOffre('https://www.hellowork.com/fr-fr/emplois/123.html');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('JSON AgentIaJsonOffre invalide');
  });

  it('expose stage2Implemented à true et plugin HelloWork', () => {
    const plugin = createHelloworkOfferFetchPlugin();
    expect(plugin.plugin).toBe('HelloWork');
    expect(plugin.stage2Implemented).toBe(true);
  });

  it('retourne ok: false quand fetch ou parse lève une exception', async () => {
    const plugin = createHelloworkOfferFetchPlugin();
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await plugin.recupererContenuOffre('https://www.hellowork.com/fr-fr/emplois/1.html');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('Network error');
  });
});
