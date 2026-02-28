/**
 * Tests US-6.1 : extraction des URL d'offres depuis une page de recherche APEC (HTML).
 * Structure ciblée : cartes d'offres = lien <a href=".../emploi/detail-offre/..."> autour de card card-offer.
 */
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  extraireIdOffreApec,
  extraireOffresApecFromHtml,
  extraireUrlsApecDepuisDossier,
  extraireUrlsApecDepuisDossierDirEtDeplacer,
  extraireUrlsApecDepuisDossierEtDeplacer,
} from './apec-liste-html-parser.js';

describe('extraireIdOffreApec (US-6.1)', () => {
  it('extrait l\'ID depuis une URL détail APEC', () => {
    expect(extraireIdOffreApec('https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178177253W')).toBe(
      '178177253W'
    );
  });
  it('extrait l\'ID en ignorant la query string', () => {
    expect(
      extraireIdOffreApec('https://www.apec.fr/candidat/.../emploi/detail-offre/178177253W?foo=bar')
    ).toBe('178177253W');
  });
  it('retourne null pour une URL sans detail-offre', () => {
    expect(extraireIdOffreApec('https://www.apec.fr/emploi/recherche.html')).toBeNull();
  });
});

describe('apec-liste-html-parser (US-6.1)', () => {
  it('retourne un tableau vide pour HTML sans carte d\'offre', () => {
    const html = '<html><body><p>Pas d\'offre ici</p></body></html>';
    expect(extraireOffresApecFromHtml(html)).toEqual([]);
  });

  it('retourne une URL pour une seule carte avec lien detail-offre', () => {
    const html = `
      <div class="container-result">
        <div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178177253W?foo=bar">
          <apec-recherche-resultat><div class="card card-offer mb-20 card--clickable">
            <div class="card-body">Product Manager F/H</div>
          </div></apec-recherche-resultat>
        </a></div>
      </div>`;
    expect(extraireOffresApecFromHtml(html)).toEqual([
      { url: 'https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178177253W?foo=bar' },
    ]);
  });

  it('retourne deux URL pour deux cartes (ordre conservé)', () => {
    const html = `
      <div class="container-result">
        <div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/111W">
          <apec-recherche-resultat><div class="card card-offer">Offre 1</div></apec-recherche-resultat>
        </a></div>
        <div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/222W">
          <apec-recherche-resultat><div class="card card-offer">Offre 2</div></apec-recherche-resultat>
        </a></div>
      </div>`;
    expect(extraireOffresApecFromHtml(html)).toEqual([
      { url: 'https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/111W' },
      { url: 'https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/222W' },
    ]);
  });

  it('déduplique par ID quand une même carte contient plusieurs liens vers la même offre', () => {
    const html = `
      <div class="card card-offer">
        <a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178177253W">
          <span class="card-title">Product Manager</span>
        </a>
        <a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178177253W">Voir l'offre</a>
      </div>`;
    const result = extraireOffresApecFromHtml(html);
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('178177253W');
  });

  it('n\'extraît pas les liens hors cartes (ex. navigation, footer)', () => {
    const html = `
      <a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi">Rechercher</a>
      <div class="container-result">
        <div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/178177253W">
          <apec-recherche-resultat><div class="card card-offer">Une offre</div></apec-recherche-resultat>
        </a></div>
      </div>
      <a href="https://www.apec.fr/infos-legales.html">Mentions légales</a>`;
    const result = extraireOffresApecFromHtml(html);
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('detail-offre/178177253W');
  });
});

describe('extraireUrlsApecDepuisDossier (US-6.1)', () => {
  it('retourne une liste unique d\'URLs à partir de plusieurs fichiers HTML (mock)', async () => {
    const html1 = '<div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/111W">x</a></div>';
    const html2 = '<div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/222W">y</a></div>';
    const mockLire = async () => [
      { filePath: '/data/liste html/apec/p1.html', content: html1 },
      { filePath: '/data/liste html/apec/p2.html', content: html2 },
    ];
    const result = await extraireUrlsApecDepuisDossier('/data', 'apec', {
      lireFichiersHtmlEnAttente: mockLire,
    });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.url)).toContain(
      'https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/111W'
    );
    expect(result.map((r) => r.url)).toContain(
      'https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/222W'
    );
    expect(result[0].sourceFile).toContain('apec');
    expect(result[0].sourceFile).toMatch(/\.html$/);
  });

  it('déduplique par ID les URL présentes dans plusieurs fichiers (même offre)', async () => {
    const html = '<div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/999W">x</a></div>';
    const mockLire = async () => [
      { filePath: '/data/liste html/apec/a.html', content: html },
      { filePath: '/data/liste html/apec/b.html', content: html },
    ];
    const result = await extraireUrlsApecDepuisDossier('/data', 'apec', {
      lireFichiersHtmlEnAttente: mockLire,
    });
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('detail-offre/999W');
  });

  it('déduplique par ID quand la même offre a des URL légèrement différentes (query, trailing slash)', async () => {
    const html1 =
      '<div><a href="https://www.apec.fr/candidat/.../emploi/detail-offre/123W">x</a></div>';
    const html2 =
      '<div><a href="https://www.apec.fr/candidat/.../emploi/detail-offre/123W?ref=page2">y</a></div>';
    const mockLire = async () => [
      { filePath: '/data/liste html/apec/p1.html', content: html1 },
      { filePath: '/data/liste html/apec/p2.html', content: html2 },
    ];
    const result = await extraireUrlsApecDepuisDossier('/data', 'apec', {
      lireFichiersHtmlEnAttente: mockLire,
    });
    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('123W');
  });

  it('retourne un tableau vide si le reader retourne aucun fichier', async () => {
    const mockLire = async () => [];
    const result = await extraireUrlsApecDepuisDossier('/data', 'apec', {
      lireFichiersHtmlEnAttente: mockLire,
    });
    expect(result).toEqual([]);
  });
});

describe('extraireUrlsApecDepuisDossierDirEtDeplacer (US-6.1)', () => {
  let pluginDir: string;

  beforeEach(() => {
    pluginDir = mkdtempSync(join(tmpdir(), 'apec-dir-et-deplacer-'));
  });

  afterEach(() => {
    rmSync(pluginDir, { recursive: true, force: true });
  });

  it('après appel, les fichiers sont dans traité et le résultat contient les URLs', async () => {
    const html1 =
      '<div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/111W">x</a></div>';
    const html2 =
      '<div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/222W">y</a></div>';
    writeFileSync(join(pluginDir, 'p1.html'), html1);
    writeFileSync(join(pluginDir, 'p2.html'), html2);

    const result = await extraireUrlsApecDepuisDossierDirEtDeplacer(pluginDir);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.url)).toContain(
      'https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/111W'
    );
    expect(result.map((r) => r.url)).toContain(
      'https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/222W'
    );
    const traiteDir = join(pluginDir, 'traité');
    expect(existsSync(join(traiteDir, 'p1.html'))).toBe(true);
    expect(existsSync(join(traiteDir, 'p2.html'))).toBe(true);
    expect(existsSync(join(pluginDir, 'p1.html'))).toBe(false);
    expect(existsSync(join(pluginDir, 'p2.html'))).toBe(false);
  });
});

describe('extraireUrlsApecDepuisDossierEtDeplacer (US-6.1)', () => {
  let dataDir: string;

  beforeEach(() => {
    const root = mkdtempSync(join(tmpdir(), 'apec-dossier-et-deplacer-'));
    dataDir = root;
    const listeHtml = join(root, 'liste html', 'apec');
    mkdirSync(listeHtml, { recursive: true });
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('utilise dataDir et pluginSlug puis déplace les fichiers vers traité', async () => {
    const pluginDir = join(dataDir, 'liste html', 'apec');
    const html =
      '<div><a href="https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/999W">x</a></div>';
    writeFileSync(join(pluginDir, 'page.html'), html);

    const result = await extraireUrlsApecDepuisDossierEtDeplacer(dataDir, 'apec');

    expect(result).toHaveLength(1);
    expect(result[0].url).toContain('detail-offre/999W');
    const traiteDir = join(pluginDir, 'traité');
    expect(existsSync(join(traiteDir, 'page.html'))).toBe(true);
    expect(existsSync(join(pluginDir, 'page.html'))).toBe(false);
  });
});
