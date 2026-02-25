/**
 * Tests TDD page À propos (US-3.16) : changelog, support, GNU, mentions légales.
 */
import { getPageAPropos } from './page-html.js';

describe('getPageAPropos (US-3.16)', () => {
  it('retourne un document avec titre À propos et layout commun', () => {
    const html = getPageAPropos();
    expect(html).toContain('<title>Job-Joy - À propos</title>');
    expect(html).toContain('class="appHeader"');
    expect(html).toContain('href="/a-propos"');
    expect(html).toContain('<h1>À propos</h1>');
  });

  it('contient la section Changelog avec iframe Airtable release notes', () => {
    const html = getPageAPropos();
    expect(html).toContain('id="a-propos-changelog"');
    expect(html).toContain('Changelog / Release notes');
    expect(html).toContain('airtable.com/embed/appnnCmflxgrqf3H3/shr3ahE86sW7F1Qj9');
  });

  it('contient la section Support technique avec iframe formulaire', () => {
    const html = getPageAPropos();
    expect(html).toContain('id="a-propos-support"');
    expect(html).toContain('Support technique');
    expect(html).toContain('airtable.com/embed/appnnCmflxgrqf3H3/pagCSK6ZPjlXLz8fS/form');
  });

  it('contient la section GNU avec licence, disclaimer et code source', () => {
    const html = getPageAPropos();
    expect(html).toContain('id="a-propos-gnu"');
    expect(html).toContain('Licence et conformité (GNU)');
    expect(html).toContain('GNU AGPL v3');
    expect(html).toContain('sans garantie');
    expect(html).toContain('code source');
    expect(html).toContain('Copyright');
    expect(html).toContain('Alain MEUNIER');
  });

  it('contient les mentions légales avec éditeur et contact', () => {
    const html = getPageAPropos();
    expect(html).toContain('id="a-propos-mentions"');
    expect(html).toContain('Mentions légales');
    expect(html).toContain('Alain MEUNIER');
    expect(html).toContain('alain@maep.fr');
    expect(html).toContain('m-alain-et-possible.fr');
  });
});
