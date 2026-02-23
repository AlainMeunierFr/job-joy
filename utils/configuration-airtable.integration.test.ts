/**
 * Tests d’intégration Airtable (US-1.3) : validation du schéma pour nouveaux utilisateurs.
 *
 * Utilise uniquement airtable.baseTest (ou AIRTABLE_BASE_TEST_URL). La base de production
 * (airtable.base) n’est jamais touchée. Crée les tables Sources/Offres dans la base de test
 * pour vérifier que le schéma reste valide (évolution future).
 * Exécutés seulement si apiKey et baseTest sont configurés ; sinon describe.skip.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executerConfigurationAirtable } from './configuration-airtable.js';
import { createAirtableDriverReel } from './airtable-driver-reel.js';
import { lireAirTable } from './parametres-airtable.js';
import { ecrireParametres, getDefaultParametres } from './parametres-io.js';

const DATA_DIR_PROJET = join(process.cwd(), 'data');
const airtableParametres = lireAirTable(DATA_DIR_PROJET);
const hasBaseTest = Boolean(
  (process.env.AIRTABLE_BASE_TEST_URL ?? '').trim() || (airtableParametres?.baseTest ?? '').trim()
);
const hasApiKey = Boolean(
  (process.env.AIRTABLE_API_KEY ?? '').trim() || airtableParametres?.apiKey?.trim()
);
const runIntegration = Boolean(hasApiKey && hasBaseTest);

(runIntegration ? describe : describe.skip)('configuration Airtable (intégration — schéma)', () => {
  let dataDir: string;

  beforeAll(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'config-airtable-int-'));
  });

  afterAll(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it(
    'crée les tables Sources/Offres dans la base de test (schéma pour nouveaux utilisateurs)',
    async () => {
      const apiKey =
        (process.env.AIRTABLE_API_KEY ?? '').trim() || airtableParametres?.apiKey?.trim() || '';
      const baseTestUrlOuId =
        (process.env.AIRTABLE_BASE_TEST_URL ?? '').trim() || airtableParametres?.baseTest?.trim() || '';
      ecrireParametres(dataDir, getDefaultParametres());
      const driver = createAirtableDriverReel({
        baseId: baseTestUrlOuId,
      });

      const result = await executerConfigurationAirtable(apiKey, dataDir, driver);

      if (!result.ok) {
        throw new Error(`Configuration Airtable échouée: ${result.message}`);
      }
      expect(result.baseId).toBeTruthy();
      expect(result.sourcesId).toBeTruthy();
      expect(result.offresId).toBeTruthy();

      const airtable = lireAirTable(dataDir);
      expect(airtable).not.toBeNull();
      expect(airtable?.apiKey).toBe(apiKey);
      expect(airtable?.base).toBe(result.baseId);
      expect(airtable?.sources).toBe(result.sourcesId);
      expect(airtable?.offres).toBe(result.offresId);
    },
    runIntegration ? 60_000 : 5
  );
});

