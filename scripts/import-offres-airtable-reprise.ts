/**
 * One-shot : LIRE les offres dans la base POC (vue Export), ÉCRIRE dans la base de l'app.
 * - Lecture : base POC avec AIRTABLE_REPRISE (lecture seule suffit).
 * - Écriture : base + table Offres de data/parametres.json avec la clé API de l'app (droits d'écriture).
 * - Ne garde que les lignes où Conserver = true.
 * - Chaque ligne insérée en cible a Conservé = true. La base cible doit avoir une colonne "Conservé" (case à cocher).
 *
 * .env.local : AIRTABLE_REPRISE (lecture base POC)
 * data/parametres.json : airtable.base, airtable.offres, + clé API (écriture base app)
 *
 * Usage :
 *   npm run import:offres-reprise                    # limite 1
 *   npm run import:offres-reprise -- --limit=10
 *   LIMIT=10 npm run import:offres-reprise
 *   npm run import:offres-reprise -- --dry-run
 *
 * 403 à l'insert : clé app doit avoir data.records:write sur la base cible.
 */
import '../utils/load-env-local.js';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getDataDir } from '../utils/data-dir.js';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { normaliserBaseId } from '../utils/airtable-url.js';

const API = 'https://api.airtable.com/v0';

// Source (lecture) : base POC, vue Export
const SOURCE_BASE_ID = 'appBUawXmCVxYD4GR';
const SOURCE_TABLE_ID = 'tblN4poiflpMtCtuT';
const VIEW_ID = 'viwxMxF2H4Brc3ct4';

/** Nombre d'offres à importer (1 par défaut pour tester). Passer --limit=N en ligne de commande. */
const DEFAULT_LIMIT = 1;

/** Colonnes affichées dans la vue Export (ordre d'affichage). Conserver = filtre uniquement, pas copié. */
const COLONNES_VUE_EXPORT = [
  'Id Offre-',
  'email expéditeur',
  'Poste',
  'URL',
  'Ville',
  'Statut',
  'Texte de l\'offre',
  'Entreprise',
  'Département',
  'Salaire',
  'DateOffre',
  'DateAjout',
  'Conserver',
] as const;

/** Mapping nom colonne POC (tel que dans la table / API) -> nom colonne base cible. Uniquement les colonnes de la vue Export (sauf Conserver). */
const MAPPING_POC_VERS_CIBLE: Record<string, string> = {
  'Id Offre-': 'Id offre',
  'email expéditeur': 'email expéditeur',
  Poste: 'Poste',
  URL: 'URL',
  Ville: 'Ville',
  Statut: 'Statut',
  'Texte de l\'offre': 'Texte de l\'offre',
  Entreprise: 'Entreprise',
  Département: 'Département',
  Salaire: 'Salaire',
  DateOffre: 'DateOffre',
  'Date de création': 'DateOffre', // si l’API renvoie "Date de création"
  DateAjout: 'DateAjout',
};

const apiKeyLecture = process.env.AIRTABLE_REPRISE?.trim();
if (!apiKeyLecture) throw new Error('AIRTABLE_REPRISE manquant dans .env.local (lecture base POC)');

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json; charset=UTF-8',
  };
}

function parseLimit(): number {
  const fromEnv = process.env.LIMIT;
  if (fromEnv !== undefined && fromEnv !== '') {
    const n = parseInt(fromEnv, 10);
    if (!Number.isNaN(n) && n >= 1) return n;
  }
  const arg = process.argv.find((a) => a.startsWith('--limit='));
  if (!arg) return DEFAULT_LIMIT;
  const n = parseInt(arg.split('=')[1], 10);
  return Number.isNaN(n) || n < 1 ? DEFAULT_LIMIT : n;
}

/** Map email (lowercase) → record ID de la table Sources en base app (pour écrire le lien "email expéditeur"). */
type MapEmailToSourceId = Map<string, string>;

/** Map record ID POC (Sources) → email (pour résoudre un lien "email expéditeur" POC en email). */
type MapPocSourceIdToEmail = Map<string, string>;

/** Construit les champs pour la cible : colonnes vue Export (sauf Conserver) + Conservé = true. */
function mapperChamps(
  fields: Record<string, unknown>,
  appEmailToSourceId: MapEmailToSourceId,
  pocRecIdToEmail?: MapPocSourceIdToEmail
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const nomPoc of COLONNES_VUE_EXPORT) {
    if (nomPoc === 'Conserver') continue;
    const nomCible = MAPPING_POC_VERS_CIBLE[nomPoc];
    if (!nomCible) continue;
    let value = fields[nomPoc];
    if (value === undefined && nomPoc === 'DateOffre') value = fields['Date de création'];
    if (value === undefined) continue;

    if (nomPoc === 'email expéditeur' && nomCible === 'email expéditeur') {
      const email = resolveEmailExpediteur(value, pocRecIdToEmail);
      if (email) {
        const appSourceId = appEmailToSourceId.get(email);
        if (appSourceId) out['email expéditeur'] = [appSourceId];
      }
      continue;
    }

    if (Array.isArray(value) && value.every((v) => typeof v === 'string' && /^rec[A-Za-z0-9]+$/.test(v))) continue;
    out[nomCible] = value;
  }
  out['Conservé'] = true;
  return out;
}

function resolveEmailExpediteur(
  value: unknown,
  pocRecIdToEmail?: MapPocSourceIdToEmail
): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase();
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && pocRecIdToEmail) {
    const email = pocRecIdToEmail.get(value[0]);
    return email?.trim().toLowerCase();
  }
  return undefined;
}

async function main() {
  const limit = parseLimit();
  const dryRun = process.argv.includes('--dry-run');

  // Cible (écriture) : base de l'app depuis data/parametres.json
  const cwd = process.cwd();
  const dataDir = getDataDir({ cwd });
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const airtable = lireAirTable(dataDir);
  if (!airtable?.base?.trim() || !airtable?.offres?.trim()) {
    throw new Error('Base ou table Offres manquante dans data/parametres.json (section airtable)');
  }
  const apiKeyEcriture = (airtable.apiKey ?? '').trim();
  if (!apiKeyEcriture) {
    throw new Error('Clé API Airtable de l\'app manquante (configurer Airtable dans Paramètres)');
  }
  const cibleBaseId = normaliserBaseId(airtable.base);
  const cibleTableId = airtable.offres.trim();

  // 1) Lire les enregistrements de la vue Export (base POC, token AIRTABLE_REPRISE)
  const records: Array<Record<string, unknown>> = [];
  let offset: string | undefined;
  do {
    const url = `${API}/${SOURCE_BASE_ID}/${SOURCE_TABLE_ID}?view=${VIEW_ID}&pageSize=100${offset ? `&offset=${offset}` : ''}`;
    const res = await fetch(url, { headers: headers(apiKeyLecture!) });
    if (!res.ok) throw new Error(`Lecture POC: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { records?: Array<{ fields: Record<string, unknown> }>; offset?: string };
    for (const r of data.records ?? []) records.push(r.fields ?? {});
    offset = data.offset;
  } while (offset);

  // 2) Garder uniquement les lignes où Conserver === true
  const aImporter = records.filter((r) => r.Conserver === true);
  const totalEligibles = aImporter.length;
  const aTraiter = aImporter.slice(0, limit);

  if (aTraiter.length === 0) {
    console.log('Aucune ligne avec Conserver=true (ou vue Export vide).');
    return;
  }

  const colonnesCible = [...COLONNES_VUE_EXPORT.filter((c) => c !== 'Conserver').map((c) => MAPPING_POC_VERS_CIBLE[c] ?? c), 'Conservé'];
  console.log('Lecture : base POC (AIRTABLE_REPRISE). Écriture : base app %s', cibleBaseId);
  console.log('Colonnes (vue Export) → cible:', colonnesCible.join(', '));
  console.log('');
  console.log('  %d offres avec Conserver=true (total), limite d\'import = %d', totalEligibles, limit);
  console.log('  %d offres à importer', aTraiter.length);
  console.log('');

  if (dryRun) {
    console.log('--dry-run : stop.');
    return;
  }

  const appEmailToSourceId: MapEmailToSourceId = new Map();
  const pocRecIdToEmail: MapPocSourceIdToEmail | undefined = undefined;
  const total = aTraiter.length;
  for (let i = 0; i < aTraiter.length; i++) {
    const fieldsCible = mapperChamps(aTraiter[i], appEmailToSourceId, pocRecIdToEmail);
    const res = await fetch(`${API}/${cibleBaseId}/${cibleTableId}`, {
      method: 'POST',
      headers: headers(apiKeyEcriture),
      body: JSON.stringify({ records: [{ fields: fieldsCible }] }),
    });
    if (!res.ok) {
      const body = await res.text();
      const hint = res.status === 403 ? ' (clé app dans Paramètres : vérifier scope data.records:write sur la base cible)' : '';
      throw new Error(`Insert ligne ${i + 1}: ${res.status} ${body}${hint}`);
    }
    const n = i + 1;
    const pct = total ? Math.round((n / total) * 100) : 0;
    const bar = '█'.repeat(Math.floor((n / total) * 20)) + '░'.repeat(20 - Math.floor((n / total) * 20));
    process.stdout.write(`\r  [${bar}] ${n}/${total} (${pct}%)`);
  }
  process.stdout.write('\n');
  console.log('Terminé : %d lignes insérées.', total);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
