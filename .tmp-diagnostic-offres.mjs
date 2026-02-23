import './dist/utils/load-env-local.js';
import { lireAirTable } from './dist/utils/parametres-airtable.js';
import { normaliserBaseId } from './dist/utils/airtable-url.js';

const airtable = lireAirTable(process.cwd());
const apiKey = (airtable?.apiKey || '').trim();
const baseId = normaliserBaseId((airtable?.base || '').trim());
const sourcesId = (airtable?.sources || '').trim();
const offresConfigured = (airtable?.offres || '').trim();
const offresFromBase = ((airtable?.base || '').match(/tbl[0-9A-Za-z]+/) || [])[0] || '';

if (!apiKey || !baseId || !sourcesId) {
  console.log(JSON.stringify({ ok: false, error: 'config_airtable_incomplete', hasApiKey: !!apiKey, hasBase: !!baseId, hasSources: !!sourcesId }));
  process.exit(0);
}

const headers = { Authorization: `Bearer ${apiKey}` };

async function listRecords(table) {
  let out = [];
  let offset = '';
  while (true) {
    let url = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(table)}?pageSize=100`;
    if (offset) url += `&offset=${encodeURIComponent(offset)}`;
    const r = await fetch(url, { headers });
    if (!r.ok) return { ok: false, status: r.status, table };
    const j = await r.json();
    out.push(...(j.records || []));
    if (!j.offset) break;
    offset = j.offset;
  }
  return { ok: true, records: out, table };
}

const sourcesRes = await listRecords(sourcesId);
if (!sourcesRes.ok) {
  console.log(JSON.stringify({ ok: false, error: 'sources_read_failed', details: sourcesRes }));
  process.exit(0);
}

const sourcesById = new Map();
for (const rec of sourcesRes.records) {
  const f = rec.fields || {};
  sourcesById.set(rec.id, {
    email: String(f['emailExpÃ©diteur'] || '').toLowerCase(),
    algo: String(f['algo'] || ''),
    actif: !!f['actif'],
  });
}

const candidates = [offresConfigured, offresFromBase, 'Offres'].filter(Boolean);
let offresRes = null;
for (const c of candidates) {
  const r = await listRecords(c);
  if (r.ok) {
    offresRes = r;
    break;
  }
}

if (!offresRes) {
  console.log(JSON.stringify({ ok: false, error: 'offres_read_failed', candidates }));
  process.exit(0);
}

const offers = offresRes.records.map((r) => ({ id: r.id, f: r.fields || {} }));
const byStatus = {};
let helloTotal = 0;
let helloAnnonce = 0;
let helloAnalyser = 0;
let helloDateAjoutPresent = 0;
let helloDateOffrePresent = 0;
const helloAnnonceUrls = [];

for (const o of offers) {
  const statut = String(o.f['Statut'] || '');
  byStatus[statut] = (byStatus[statut] || 0) + 1;
  const srcLinks = Array.isArray(o.f['email expÃ©diteur']) ? o.f['email expÃ©diteur'] : [];
  const src = srcLinks.length ? sourcesById.get(String(srcLinks[0])) : null;
  if (src?.algo === 'HelloWork') {
    helloTotal++;
    if (o.f['DateAjout']) helloDateAjoutPresent++;
    if (o.f['DateOffre']) helloDateOffrePresent++;
    if (statut === 'Annonce Ã  rÃ©cupÃ©rer') {
      helloAnnonce++;
      if (typeof o.f['URL'] === 'string') helloAnnonceUrls.push(String(o.f['URL']));
    }
    if (statut === 'Ã€ analyser') helloAnalyser++;
  }
}

const sample = helloAnnonceUrls.slice(0, 12);
async function checkUrl(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: c.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 analyse-offres diagnostic' },
    });
    clearTimeout(t);
    return { url, status: r.status };
  } catch (e) {
    clearTimeout(t);
    return { url, error: e?.name === 'AbortError' ? 'timeout' : String(e) };
  }
}

const checks = [];
for (const u of sample) checks.push(await checkUrl(u));

const httpErrors = checks.filter((x) => x.status && x.status >= 400).length;
const timeouts = checks.filter((x) => x.error === 'timeout').length;

console.log(
  JSON.stringify(
    {
      ok: true,
      offresTableUsed: offresRes.table,
      totalOffres: offers.length,
      byStatus,
      helloWork: {
        total: helloTotal,
        annonceARecuperer: helloAnnonce,
        aAnalyser: helloAnalyser,
        dateAjoutPresent: helloDateAjoutPresent,
        dateOffrePresent: helloDateOffrePresent,
        dateOffreMissing: helloTotal - helloDateOffrePresent,
      },
      urlCheckSample: {
        tested: checks.length,
        httpErrors,
        timeouts,
        examples: checks.slice(0, 6),
      },
    },
    null,
    2
  )
);
