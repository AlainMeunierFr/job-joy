/**
 * Tests TDD case consentement identification (US-3.15) dans la page Paramètres.
 */
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getParametresContent } from './page-html.js';
import { getDefaultParametres, ecrireParametres } from '../utils/parametres-io.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);

describe('page Paramètres - case consentement identification (US-3.15)', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'page-html-id-'));
    process.env.PARAMETRES_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
    const p = getDefaultParametres();
    ecrireParametres(dataDir, p);
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    delete process.env.PARAMETRES_ENCRYPTION_KEY;
  });

  it('affiche une case à cocher consentement avec e2eid et libellé job-joy / support / retours beta', async () => {
    const html = await getParametresContent(dataDir);
    expect(html).toContain('e2eid="e2eid-champ-consentement-identification"');
    expect(html).toContain('name="consentementIdentification"');
    expect(html).toContain('job-joy');
    expect(html).toContain('support');
    expect(html).toContain('retours beta');
  });

  it('précoche la case lorsque le compte a consentementIdentification true', async () => {
    const p = getDefaultParametres();
    p.connexionBoiteEmail = { ...p.connexionBoiteEmail, consentementIdentification: true };
    ecrireParametres(dataDir, p);
    const html = await getParametresContent(dataDir);
    expect(html).toContain('e2eid="e2eid-champ-consentement-identification"');
    expect(html).toMatch(/consentement-identification[^>]*checked/);
  });

  it('ne précoche pas la case lorsque le compte a consentementIdentification false ou absent', async () => {
    const p = getDefaultParametres();
    p.connexionBoiteEmail = { ...p.connexionBoiteEmail, consentementIdentification: false };
    ecrireParametres(dataDir, p);
    const html = await getParametresContent(dataDir);
    expect(html).toContain('e2eid="e2eid-champ-consentement-identification"');
    const checkboxSegment = html.includes('consentement-identification')
      ? html.slice(html.indexOf('consentement-identification'), html.indexOf('consentement-identification') + 200)
      : '';
    expect(checkboxSegment).not.toMatch(/checked/);
  });

  it('affiche le rappel "Le consentement a été donné" et pas la case lorsque consentementEnvoyeLe est défini', async () => {
    const p = getDefaultParametres();
    p.connexionBoiteEmail = {
      ...p.connexionBoiteEmail,
      consentementEnvoyeLe: '2026-02-24T12:00:00.000Z',
    };
    ecrireParametres(dataDir, p);
    const html = await getParametresContent(dataDir);
    expect(html).toContain('Le consentement a été donné');
    expect(html).toContain('consentementRappel');
    expect(html).not.toContain('e2eid="e2eid-champ-consentement-identification"');
  });

  it('affiche Tester connexion et Enregistrer ; la désactivation sans case cochée est gérée en CSS (:has)', async () => {
    const p = getDefaultParametres();
    p.connexionBoiteEmail = { ...p.connexionBoiteEmail, consentementIdentification: false };
    ecrireParametres(dataDir, p);
    const html = await getParametresContent(dataDir);
    expect(html).toContain('e2eid="e2eid-bouton-enregistrer"');
    expect(html).toContain('e2eid="e2eid-bouton-test-connexion"');
    expect(html).toContain('id="consentement-identification"');
    /* Les boutons ne portent plus disabled côté serveur : CSS #form-compte:has(#consentement-identification:not(:checked)) + JS pour l’attribut disabled. */
  });
});
