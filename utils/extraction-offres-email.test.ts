/**
 * Tests TDD pour l'extraction des offres depuis le HTML d'emails LinkedIn (US-1.4 CA2).
 * Baby step 1 : HTML vide => [].
 * Baby step 2 : HTML avec un job view => une offre avec id, url.
 */
import {
  extractCadreemploiOffresFromHtml,
  extractHelloworkOffresFromHtml,
  extractJobThatMakeSenseOffresFromHtml,
  extractOffresFromHtml,
  extractWelcomeToTheJungleOffresFromHtml,
} from './extraction-offres-email.js';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('extractOffresFromHtml', () => {
  it('retourne un tableau vide pour une chaîne vide', () => {
    expect(extractOffresFromHtml('')).toEqual([]);
  });

  it('retourne un tableau vide pour du HTML sans offre LinkedIn', () => {
    expect(extractOffresFromHtml('<html><body>Hello</body></html>')).toEqual([]);
  });

  it('extrait une offre avec id et url à partir d’un bloc jobcard_body contenant jobs/view/ID/', () => {
    const html = `
      <div class="jobcard_body">
        <a href="https://www.linkedin.com/jobs/view/12345/">Développeur full stack</a>
        <p>Entreprise · Paris</p>
      </div>
    `;
    // Le regex cherche jobs/view/(\d+)/ et jobcard_body dans les 600 caractères suivants
    const htmlWithContext = 'xxx jobs/view/12345/ yyy jobcard_body' + html;
    const result = extractOffresFromHtml(htmlWithContext);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '12345',
      url: 'https://www.linkedin.com/jobs/view/12345/',
    });
  });

  it('extrait titre, entreprise et lieu quand présents dans le bloc', () => {
    const bloc = 'jobcard_body <a href="/jobs/view/999/">Ingénieur DevOps</a><p>Ma Société · Lyon · CDI</p>';
    const html = 'linkedin.com/jobs/view/999/ ' + bloc;
    const result = extractOffresFromHtml(html);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('999');
    expect(result[0].url).toBe('https://www.linkedin.com/jobs/view/999/');
    expect(result[0].titre).toBeDefined();
    expect(result[0].entreprise).toBeDefined();
    expect(result[0].lieu).toBeDefined();
  });

  it('ne duplique pas les offres (même id vu plusieurs fois)', () => {
    const html = 'jobs/view/42/ aa jobcard_body <a>Poste</a> jobs/view/42/ bb jobcard_body <a>Poste</a>';
    const result = extractOffresFromHtml(html);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('42');
  });

  it("extrait une offre même si l'URL n'a pas de slash final après l'id", () => {
    const html = '... jobs/view/314159 jobcard_body <a>Data Analyst</a><p>Acme · Nantes</p> ...';
    const result = extractOffresFromHtml(html);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '314159',
      url: 'https://www.linkedin.com/jobs/view/314159/',
    });
  });

  it('extrait poste, entreprise et ville à partir du format texte LinkedIn', () => {
    const html = `
      jobs/view/777/
      Responsable des Opérations
      Storkeo · Lyon (Sur site)
      Entre 3,5 k € et 4,5 k € par mois

      Titre du poste : Responsable des Opérations
      Entreprise : Storkeo
      Ville : Lyon
      Lieu : Sur site
      Salaire : 3,5 k € et 4,5 k € par mois
    `;
    const result = extractOffresFromHtml(html);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '777',
      url: 'https://www.linkedin.com/jobs/view/777/',
      titre: 'Responsable des Opérations',
      entreprise: 'Storkeo',
      lieu: 'Lyon',
      salaire: '3,5 k € et 4,5 k € par mois',
    });
  });

  it('n extrait pas un faux salaire quand la valeur contient une URL de tracking linkedin', () => {
    const html = `
      jobs/view/4375002327/
      Titre du poste : Subscription Shopify Product Manager
      Entreprise : Scentbird
      Ville : Espace economique europeen
      Salaire : jobs/view/4375002327?alertAction=markasviewed&trackingId=Hp%2Br%2FHm7 target="_blank"> Subscription Shopify Product Manager Scentbird
    `;
    const result = extractOffresFromHtml(html);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4375002327');
    expect(result[0].salaire).toBeUndefined();
  });

  it('n extrait pas des lignes titre/entreprise comme salaire', () => {
    const html = `
      jobs/view/888/
      Titre du poste : Directeur-trice d'agence Propreté - Lyon - CDI (H/F)
      Entreprise : Makko
      Ville : Lyon
      Salaire : Directeur-trice d'agence Propreté - Lyon - CDI (H/F) Makko · Lyon (Hybride)

      jobs/view/999/
      Titre du poste : Area manager
      Entreprise : KIKO MILANO
      Ville : Lyon
      Salaire : Area manager KIKO MILANO · Lyon (Sur site)
    `;
    const result = extractOffresFromHtml(html);
    expect(result).toHaveLength(2);
    expect(result[0].salaire).toBeUndefined();
    expect(result[1].salaire).toBeUndefined();
  });

  it("utilise le fallback global de l'email quand les détails sont loin de l'URL", () => {
    const html = `
      jobs/view/111/
      <div>${'x'.repeat(7000)}</div>
      Titre du poste : Responsable des Opérations
      Entreprise : Storkeo
      Ville : Lyon
    `;
    const result = extractOffresFromHtml(html);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '111',
      titre: 'Responsable des Opérations',
      entreprise: 'Storkeo',
      lieu: 'Lyon',
    });
  });

  const fixturesDir = join(process.cwd(), 'tests', 'exemples', 'LinkedIn');
  const fixtureFiles = existsSync(fixturesDir)
    ? readdirSync(fixturesDir).filter((f) => f.toLowerCase().endsWith('.html'))
    : [];
  it('parse toutes les fixtures HTML LinkedIn (tests/exemples/LinkedIn)', () => {
    expect(fixtureFiles.length).toBeGreaterThan(0);
    for (const fileName of fixtureFiles) {
      const fullPath = join(fixturesDir, fileName);
      const html = readFileSync(fullPath, 'utf-8');
      const result = extractOffresFromHtml(html);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toMatch(/^\d+$/);
      expect(result[0].url).toMatch(/^https:\/\/www\.linkedin\.com\/jobs\/view\/\d+\//);
    }
  });
});

describe('extractHelloworkOffresFromHtml', () => {
  function toBase64Url(value: string): string {
    return Buffer.from(value, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  it('US-1.8 étape 1: extrait une offre HelloWork exploitable (min requis)', () => {
    const decoded = 'https://www.hellowork.com/fr-fr/emplois/123456.html';
    const token = toBase64Url(decoded);
    const html = `<a href="https://emails.hellowork.com/clic/a/b/c/d/e/${token}/f">Voir l'offre</a>`;

    const offres = extractHelloworkOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0]).toMatchObject({
      id: '123456',
      url: 'https://www.hellowork.com/fr-fr/emplois/123456.html',
    });
  });

  it('US-1.8 étape 1: décode une URL HelloWork encodée base64', () => {
    const decoded = 'https://www.hellowork.com/fr-fr/emplois/987654.html?utm_source=email';
    const token = toBase64Url(decoded);
    const html = `<a href="https://emails.hellowork.com/clic/a/b/c/d/e/${token}/f">Voir</a>`;

    const offres = extractHelloworkOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].url).toBe(decoded);
    expect(offres[0].id).toBe('987654');
  });

  it("US-1.8 étape 1: si décodage base64 KO, conserve l'URL encodée", () => {
    const tokenInvalide = '%%%invalid-base64%%%';
    const encodedUrl = `https://emails.hellowork.com/clic/a/b/c/d/e/${tokenInvalide}/f`;
    const html = `<a href="${encodedUrl}">Voir</a>`;

    const offres = extractHelloworkOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].url).toBe(encodedUrl);
    expect(offres[0].id).toMatch(/^hellowork-[a-f0-9]{16}$/);
  });

  it('US-1.8 correctif: deux emails distincts sans id numérique produisent des ids différents et stables', () => {
    const tokenInvalideA = '%%%invalid-base64-A%%%';
    const tokenInvalideB = '%%%invalid-base64-B%%%';
    const encodedUrlA = `https://emails.hellowork.com/clic/a/b/c/d/e/${tokenInvalideA}/f`;
    const encodedUrlB = `https://emails.hellowork.com/clic/a/b/c/d/e/${tokenInvalideB}/f`;
    const htmlA = `<a href="${encodedUrlA}">Voir A</a>`;
    const htmlB = `<a href="${encodedUrlB}">Voir B</a>`;

    const offresA = extractHelloworkOffresFromHtml(htmlA);
    const offresA2 = extractHelloworkOffresFromHtml(htmlA);
    const offresB = extractHelloworkOffresFromHtml(htmlB);

    expect(offresA).toHaveLength(1);
    expect(offresA2).toHaveLength(1);
    expect(offresB).toHaveLength(1);
    expect(offresA[0].id).toBe(offresA2[0].id);
    expect(offresA[0].id).not.toBe(offresB[0].id);
  });

  it('US-1.8 étape 1: extrait les champs clés depuis les 3 fixtures HelloWork', () => {
    const fixturesDir = join(process.cwd(), 'tests', 'exemples', 'notification@emails.hellowork.com');
    const html1 = readFileSync(join(fixturesDir, '01-email-1-of-3.html'), 'utf-8');
    const html2 = readFileSync(join(fixturesDir, '02-email-2-of-3.html'), 'utf-8');
    const html3 = readFileSync(join(fixturesDir, '03-email-3-of-3.html'), 'utf-8');

    const offres1 = extractHelloworkOffresFromHtml(html1);
    const offres2 = extractHelloworkOffresFromHtml(html2);
    const offres3 = extractHelloworkOffresFromHtml(html3);

    for (const offres of [offres1, offres2, offres3]) {
      expect(offres.length).toBeGreaterThan(0);
      expect(offres[0].id).toMatch(/^\d+$/);
      expect(offres[0].url).toMatch(/^https?:\/\/www\.hellowork\.com\/fr-fr\/emplois\/\d+\.html/i);
      expect(offres[0].titre).toBeDefined();
      expect(offres[0].entreprise).toBeDefined();
      expect(offres[0].ville).toBeDefined();
      expect(offres[0].département).toMatch(/^\d{2}$/);
    }

    const toutes = [...offres1, ...offres2, ...offres3];
    expect(toutes.some((o) => typeof o.salaire === 'string' && o.salaire.includes('€'))).toBe(true);
    expect(toutes.every((o) => /^\d+$/.test(o.id))).toBe(true);
  });

  it("US-1.8 étape 1: une même offre HelloWork conserve un id numérique stable (pas d'id pseudo-index)", () => {
    const urlA = 'https://www.hellowork.com/fr-fr/emplois/75736245.html?utm_source=email_a';
    const urlB = 'https://www.hellowork.com/fr-fr/emplois/75736245.html?utm_source=email_b';
    const tokenA = toBase64Url(urlA);
    const tokenB = toBase64Url(urlB);
    const htmlA = `<a href="https://emails.hellowork.com/clic/a/b/c/d/e/${tokenA}/f">Voir A</a>`;
    const htmlB = `<a href="https://emails.hellowork.com/clic/aa/bb/cc/dd/ee/${tokenB}/ff">Voir B</a>`;

    const offreA = extractHelloworkOffresFromHtml(htmlA)[0];
    const offreB = extractHelloworkOffresFromHtml(htmlB)[0];
    expect(offreA.id).toBe('75736245');
    expect(offreB.id).toBe('75736245');
  });

  it('US-1.8 correctif: sépare ville et département quand le chip est "Ville - 44"', () => {
    const decoded = 'https://www.hellowork.com/fr-fr/emplois/123456.html';
    const token = toBase64Url(decoded);
    const html = `
      <table>
        <tr>
          <td class="bg-dark-cards">
            <a class="font-mob-16" href="https://emails.hellowork.com/clic/a/b/c/d/e/${token}/f">Développeur</a>
            <td class="dark-style-color">Acme</td>
            <td style="background-color:#F6F6F6;">Nantes - 44</td>
          </td>
        </tr>
      </table>
    `;

    const offres = extractHelloworkOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].ville).toBe('Nantes');
    expect(offres[0].département).toBe('44');
  });
});

describe('extractWelcomeToTheJungleOffresFromHtml', () => {
  function toBase64Url(value: string): string {
    return Buffer.from(value, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  it('US-1.10 étape 1: extrait id/url et champs métier depuis les fixtures WTTJ', () => {
    const fixturesDir = join(process.cwd(), 'tests', 'exemples', 'alerts@welcometothejungle.com');
    const html1 = readFileSync(join(fixturesDir, '01-email-1-of-3.html'), 'utf-8');
    const html2 = readFileSync(join(fixturesDir, '02-email-2-of-3.html'), 'utf-8');
    const html3 = readFileSync(join(fixturesDir, '03-email-3-of-3.html'), 'utf-8');

    for (const html of [html1, html2, html3]) {
      const offres = extractWelcomeToTheJungleOffresFromHtml(html);
      expect(offres.length).toBeGreaterThan(0);
      expect(offres[0].id).toBeDefined();
      expect(offres[0].url).toContain('welcometothejungle.com');
      expect(offres[0].titre).toBeDefined();
      expect(offres[0].entreprise).toBeDefined();
      expect(offres[0].ville).toBeDefined();
    }
  });

  it('US-1.10 étape 1: décodage URL base64 OK -> URL normale', () => {
    const decodedUrl = 'https://www.welcometothejungle.com/fr/companies/acme/jobs/product-manager_paris';
    const token = toBase64Url(decodedUrl);
    const html = `
      <table class="job-item">
        <tr><td class="job-item-inner">
          <td style="text-transform:uppercase"><a href="https://x">Acme</a></td>
          <td style="font-size:20px"><a href="http://t.welcometothejungle.com/ls/click?upn=u001.${token}_suffix">Product Manager</a></td>
          <td style="font-size:14px"><a href="https://x">CDI - Paris</a></td>
        </td></tr>
      </table>
    `;

    const offres = extractWelcomeToTheJungleOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].url).toBe(decodedUrl);
    expect(offres[0].id).toContain('product-manager');
  });

  it("US-1.10 étape 1: décodage URL base64 KO -> URL encodée conservée", () => {
    const encodedUrl = 'http://t.welcometothejungle.com/ls/click?upn=u001.%%%invalid%%%_suffix';
    const html = `
      <table class="job-item">
        <tr><td class="job-item-inner">
          <td style="text-transform:uppercase"><a href="https://x">Acme</a></td>
          <td style="font-size:20px"><a href="${encodedUrl}">Product Manager</a></td>
          <td style="font-size:14px"><a href="https://x">CDI - Paris</a></td>
        </td></tr>
      </table>
    `;

    const offres = extractWelcomeToTheJungleOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].url).toBe(encodedUrl);
    expect(offres[0].id).toMatch(/^wttj-[a-f0-9]{16}$/);
  });
});

describe('extractJobThatMakeSenseOffresFromHtml', () => {
  it('US-1.11 étape 1: extrait des offres depuis les fixtures JTMS', () => {
    const fixturesDir = join(process.cwd(), 'tests', 'exemples', 'jobs@makesense.org');
    const html1 = readFileSync(join(fixturesDir, '01-email-1-of-3.html'), 'utf-8');
    const html2 = readFileSync(join(fixturesDir, '02-email-2-of-3.html'), 'utf-8');
    const html3 = readFileSync(join(fixturesDir, '03-email-3-of-3.html'), 'utf-8');

    for (const html of [html1, html2, html3]) {
      const offres = extractJobThatMakeSenseOffresFromHtml(html);
      expect(offres.length).toBeGreaterThan(0);
      expect(offres[0].id).toBeDefined();
      expect(offres[0].url).toMatch(/^https?:\/\//i);
      expect(offres[0].titre).toBeDefined();
    }
  });

  it('US-1.11: URL décodable -> URL jobs.makesense décodée', () => {
    const payload = JSON.stringify({ href: 'https://jobs.makesense.org/jobs/abc123?utm_source=email' });
    const token = Buffer.from(payload, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    const html = `<a href="https://e.customeriomail.com/e/c/${token}/sig">Data Engineer</a><div>Acme</div>`;
    const offres = extractJobThatMakeSenseOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].url).toBe('https://jobs.makesense.org/jobs/abc123');
    expect(offres[0].id).toBe('abc123');
  });

  it('US-1.11: URL non décodable -> fallback tracking conservé', () => {
    const trackingUrl = 'https://e.customeriomail.com/e/c/%%%bad%%/sig';
    const html = `<a href="${trackingUrl}">Senior PM</a>`;
    const offres = extractJobThatMakeSenseOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].url).toBe(trackingUrl);
    expect(offres[0].id).toMatch(/^jtms-[a-f0-9]{16}$/);
  });
});

describe('extractCadreemploiOffresFromHtml', () => {
  it('US-1.12 étape 1: extrait des offres depuis les fixtures Cadre Emploi', () => {
    const fixturesDir = join(process.cwd(), 'tests', 'exemples', 'offres@alertes.cadremploi.fr');
    const html1 = readFileSync(join(fixturesDir, '01-email-1-of-3.html'), 'utf-8');
    const html2 = readFileSync(join(fixturesDir, '02-email-2-of-3.html'), 'utf-8');
    const html3 = readFileSync(join(fixturesDir, '03-email-3-of-3.html'), 'utf-8');

    for (const html of [html1, html2, html3]) {
      const offres = extractCadreemploiOffresFromHtml(html);
      expect(offres.length).toBeGreaterThan(0);
      expect(offres[0].id).toBeDefined();
      expect(offres[0].url).toMatch(/^https?:\/\//i);
      expect(offres[0].id).toMatch(/^cadreemploi-[a-f0-9]{32}$/);
    }
  });

  it('US-1.12: URL conservée telle quelle (même encodée) ; ID = MD5(titre|entreprise|ville|type)', () => {
    const trackingUrl = 'https://r.emails.alertes.cadremploi.fr/tr/cl/abc?url=xxx';
    const html = `<span>ACME • Paris • CDI</span><a href="${trackingUrl}">Voir l'offre</a>`;
    const offres = extractCadreemploiOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].url).toBe(trackingUrl);
    expect(offres[0].id).toMatch(/^cadreemploi-[a-f0-9]{32}$/);
  });

  it('US-1.12: lien sans texte "Voir l\'offre" ignoré', () => {
    const html = `<a href="https://r.emails.alertes.cadremploi.fr/tr/cl/token">Lead Product Manager</a>`;
    const offres = extractCadreemploiOffresFromHtml(html);
    expect(offres).toHaveLength(0);
  });

  it('US-1.12: seul le lien "Voir l\'offre" est extrait', () => {
    const html = `
      <a href="https://www.cadremploi.fr/emploi/detail_offre?offreId=111">Voir l'offre</a>
      <a href="https://www.cadremploi.fr/accueil">Accueil</a>
    `;
    const offres = extractCadreemploiOffresFromHtml(html);
    expect(offres).toHaveLength(1);
    expect(offres[0].url).toContain('offreId=111');
  });
});
