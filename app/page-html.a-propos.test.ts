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
    expect(html).toContain('À propos</h1>');
    expect(html).toContain('pageParametresTitle');
  });

  it('contient la section Discuter avec l\'auteur avec lien zcal avant le Changelog', () => {
    const html = getPageAPropos();
    expect(html).toContain('id="a-propos-discuter"');
    expect(html).toContain('Discuter avec l\'auteur');
    expect(html).toContain('Alain Meunier');
    expect(html).toContain('https://zcal.co/alain-meunier/30min');
    expect(html).toContain('30');
    expect(html).toContain('visio');
    const idxDiscuter = html.indexOf('a-propos-discuter');
    const idxChangelog = html.indexOf('a-propos-changelog');
    expect(idxDiscuter).toBeLessThan(idxChangelog);
  });

  it('contient la section Changelog avec lien nouvel onglet vers release notes', () => {
    const html = getPageAPropos();
    expect(html).toContain('id="a-propos-changelog"');
    expect(html).toContain('Changelog / Release notes');
    expect(html).toContain('airtable.com/embed/appnnCmflxgrqf3H3/shr3ahE86sW7F1Qj9');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('Voir le changelog');
  });

  it('contient la section Support technique avec lien nouvel onglet vers formulaire', () => {
    const html = getPageAPropos();
    expect(html).toContain('id="a-propos-support"');
    expect(html).toContain('Support technique');
    expect(html).toContain('airtable.com/embed/appnnCmflxgrqf3H3/pagCSK6ZPjlXLz8fS/form');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('formulaire de ticket');
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

  it('affiche le numéro de version et la date/heure de publication quand fournis', () => {
    const html = getPageAPropos({
      version: '1.0.2',
      buildTime: '2025-02-21T14:30:00.000Z',
    });
    expect(html).toContain('Version 1.0.2');
    expect(html).toContain('Publiée le');
    expect(html).toContain('pageAProposVersion');
    expect(html).toContain('pageAProposBuildTime');
    expect(html).toMatch(/février|21.*2025|14\s*:\s*30/);
  });

  it('n\'affiche pas version ni date quand non fournis', () => {
    const html = getPageAPropos();
    expect(html).not.toContain('pageAProposVersion');
    expect(html).not.toContain('pageAProposBuildTime');
  });
});
