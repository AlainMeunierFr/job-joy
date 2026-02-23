/**
 * Handlers API pour paramétrage compte email (US-1.1) et configuration Airtable (US-1.3).
 * Reçoivent les ports (ex. ConnecteurEmail) par injection — pas d'import des implémentations.
 */
import { randomUUID } from 'node:crypto';
import { ServerResponse } from 'node:http';
import { validerParametresCompte } from '../utils/validation-compte.js';
import { ecrireCompte, lireCompte } from '../utils/compte-io.js';
import { executerTestConnexion } from '../utils/test-connexion-compte.js';
import type { AirtableConfigDriver } from '../utils/configuration-airtable.js';
import {
  executerConfigurationAirtable,
  libelleStatutConfigurationAirtable,
} from '../utils/configuration-airtable.js';
import { createAirtableDriverReel } from '../utils/airtable-driver-reel.js';
import { airtableDriverParDefaut } from '../utils/airtable-driver-par-defaut.js';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { runTraitement, type ResultatTraitement } from '../scripts/run-traitement.js';
import { runAuditSources, type ResultatAuditSources } from '../scripts/run-audit-sources.js';
import {
  runEnrichissementBackground,
  getEnrichissementBackgroundState,
  type ResultatEnrichissementBackground,
} from '../scripts/run-enrichissement-background.js';
import type { ConnecteurEmail, OptionsImap } from '../types/compte.js';
import { maskEmail } from '../utils/mask-email.js';
import { chargerEnvLocal } from '../utils/load-env-local.js';
import { lireParametres } from '../utils/parametres-io.js';
import { createLecteurEmailsMock } from '../utils/lecteur-emails-mock.js';
import type { SourceEmail } from '../utils/gouvernance-sources-emails.js';
import { produireTableauSynthese } from '../utils/tableau-synthese-offres.js';
import type { LigneTableauSynthese } from '../utils/tableau-synthese-offres.js';
import { createAirtableReleveDriver } from '../utils/airtable-releve-driver.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { createSourcePluginsRegistry } from '../utils/source-plugins.js';
import { STATUTS_OFFRES_AIRTABLE } from '../utils/statuts-offres-airtable.js';

/** Store BDD : tableau synthèse offres pour tests (US-1.7). */
let bddMockTableauSyntheseStore: LigneTableauSynthese[] | null = null;

/** BDD : définir les lignes du tableau synthèse offres (null = utiliser produireTableauSynthese). */
export function setBddMockTableauSynthese(lignes: LigneTableauSynthese[] | null | unknown): void {
  bddMockTableauSyntheseStore = Array.isArray(lignes) ? (lignes as LigneTableauSynthese[]) : null;
}

/** Store BDD : emails gouvernance pour le prochain audit/traitement (uniquement si BDD_MOCK_CONNECTEUR=1). */
let bddMockEmailsGouvernance: Array<{ id: string; from: string; html: string; receivedAtIso?: string }> | null = null;

/** Store BDD : sources Airtable en RAM pour audit/traitement (réinitialisé à chaque set-mock-emails). */
type SourceRuntime = SourceEmail & { sourceId: string };
const bddMockSourcesStore: SourceRuntime[] = [];
const bddMockOffresStore: unknown[] = [];

export function setBddMockEmailsGouvernance(
  emails: Array<{ id: string; from: string; html: string; receivedAtIso?: string }> | null
): void {
  bddMockEmailsGouvernance = emails;
  bddMockOffresStore.length = 0;
  // Ne pas vider bddMockSourcesStore : les scénarios "relève" ont besoin de sources préexistantes.
}

/** BDD : remplacer les sources mock ([] = vide, pour scénario "aucun expéditeur"; sinon source(s) existante(s)). */
export function setBddMockSources(sources: Array<{ emailExpéditeur: string; algo: SourceEmail['algo']; actif: boolean }>): void {
  bddMockSourcesStore.length = 0;
  for (const s of sources) {
    bddMockSourcesStore.push({
      ...s,
      emailExpéditeur: s.emailExpéditeur.trim().toLowerCase(),
      sourceId: `rec_${randomUUID().slice(0, 14)}`,
    });
  }
}

function createBddMockDriverReleve(): {
  listerSources: () => Promise<SourceRuntime[]>;
  creerSource: (source: SourceEmail) => Promise<SourceRuntime>;
  mettreAJourSource: (sourceId: string, patch: Partial<Pick<SourceEmail, 'algo' | 'actif'>>) => Promise<void>;
  creerOffres: (offres: Array<{ idOffre: string; url: string; dateAjout: string; statut: string }>, sourceId: string) => Promise<{ nbCreees: number; nbDejaPresentes: number }>;
  getSourceLinkedIn: () => Promise<{ found: false } | { found: true; actif: boolean; emailExpéditeur: string; sourceId: string }>;
} {
  return {
    async listerSources() {
      return [...bddMockSourcesStore];
    },
    async creerSource(source: SourceEmail) {
      const rec: SourceRuntime = {
        ...source,
        emailExpéditeur: source.emailExpéditeur.trim().toLowerCase(),
        sourceId: `rec_${randomUUID().slice(0, 14)}`,
      };
      bddMockSourcesStore.push(rec);
      return rec;
    },
    async mettreAJourSource(sourceId: string, patch: Partial<Pick<SourceEmail, 'algo' | 'actif'>>) {
      const i = bddMockSourcesStore.findIndex((s) => s.sourceId === sourceId);
      if (i >= 0) {
        if (patch.algo) bddMockSourcesStore[i].algo = patch.algo;
        if (typeof patch.actif === 'boolean') bddMockSourcesStore[i].actif = patch.actif;
      }
    },
    async creerOffres(offres: Array<{ idOffre: string; url: string; dateAjout: string; statut: string }>, sourceId: string) {
      const existingIds = new Set((bddMockOffresStore as Array<{ idOffre: string }>).map((o) => o.idOffre));
      let nbCreees = 0;
      for (const o of offres) {
        if (!existingIds.has(o.idOffre)) {
          bddMockOffresStore.push({ ...o, sourceId });
          existingIds.add(o.idOffre);
          nbCreees += 1;
        }
      }
      return { nbCreees, nbDejaPresentes: offres.length - nbCreees };
    },
    async getSourceLinkedIn() {
      const linkedin = bddMockSourcesStore.find((s) => s.algo === 'Linkedin');
      if (!linkedin) return { found: false };
      return { found: true, actif: linkedin.actif, emailExpéditeur: linkedin.emailExpéditeur, sourceId: linkedin.sourceId };
    },
  };
}

function sendJson(
  res: ServerResponse,
  status: number,
  data: object,
  extraHeaders?: Record<string, string>
): void {
  const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders };
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

function airtableHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json; charset=UTF-8',
  };
}

async function listerOffresPourTableau(options: {
  apiKey: string;
  baseId: string;
  baseRefRaw?: string;
  offresId: string;
  sourceIdVersEmail: Map<string, string>;
}): Promise<Array<{ emailExpéditeur: string; statut: string }>> {
  const { apiKey, baseId, baseRefRaw, offresId, sourceIdVersEmail } = options;
  const identifiants = await resoudreRefsTableOffres(apiKey, baseId, offresId, baseRefRaw);
  let lastError = '';
  for (const tableRef of identifiants) {
    const offres: Array<{ emailExpéditeur: string; statut: string }> = [];
    let offset = '';
    let tableFound = true;
    do {
      const url = `${AIRTABLE_API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(
        tableRef
      )}?pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
      const res = await fetch(url, { method: 'GET', headers: airtableHeaders(apiKey) });
      if (!res.ok) {
        const detail = await res.text();
        if (res.status === 404) {
          tableFound = false;
          lastError = `Airtable Offres list: 404 ${detail || res.statusText}`;
          break;
        }
        throw new Error(`Airtable Offres list: ${res.status} ${detail || res.statusText}`);
      }
      const json = (await res.json()) as {
        records?: Array<{ fields?: Record<string, unknown> }>;
        offset?: string;
      };
      const records = json.records ?? [];
      for (const rec of records) {
        const fields = rec.fields ?? {};
        const statut = typeof fields.Statut === 'string' ? fields.Statut.trim() : '';
        if (!statut) continue;
        const lienSource = fields['email expéditeur'];
        if (Array.isArray(lienSource) && lienSource.length > 0) {
          // Airtable linked record field: usually array of source record IDs.
          const sourceRef = String(lienSource[0] ?? '').trim();
          const email = sourceIdVersEmail.get(sourceRef) ?? '';
          if (email) offres.push({ emailExpéditeur: email, statut });
          continue;
        }
        // Fallback legacy: some datasets may still hold plain text email.
        if (typeof lienSource === 'string' && lienSource.trim()) {
          offres.push({ emailExpéditeur: lienSource.trim().toLowerCase(), statut });
        }
      }
      offset = json.offset ?? '';
    } while (offset);
    if (tableFound) return offres;
  }
  throw new Error(lastError || 'Airtable Offres list: table introuvable');
}

async function resoudreRefsTableOffres(
  apiKey: string,
  baseId: string,
  offresId: string,
  baseRefRaw?: string
): Promise<string[]> {
  const refs = new Set<string>();
  if (offresId.trim()) refs.add(offresId.trim());
  refs.add('Offres');
  const tableIdFromBaseRef = (baseRefRaw ?? '').match(/tbl[a-zA-Z0-9]+/)?.[0];
  if (tableIdFromBaseRef) refs.add(tableIdFromBaseRef);
  try {
    const metaUrl = `${AIRTABLE_API_BASE}/meta/bases/${encodeURIComponent(baseId)}/tables`;
    const res = await fetch(metaUrl, { method: 'GET', headers: airtableHeaders(apiKey) });
    if (!res.ok) return [...refs];
    const json = (await res.json()) as {
      tables?: Array<{
        id: string;
        name: string;
        fields?: Array<{ name?: string }>;
      }>;
    };
    const tables = json.tables ?? [];
    for (const t of tables) {
      const fieldNames = (t.fields ?? [])
        .map((f) => (f.name ?? '').trim())
        .filter(Boolean);
      const ressembleOffres =
        fieldNames.includes('Statut') &&
        fieldNames.includes('email expéditeur');
      if (ressembleOffres) {
        if (t.id) refs.add(t.id);
        if (t.name) refs.add(t.name);
      }
    }
  } catch {
    // Si l'API meta n'est pas accessible (scopes), on garde juste les refs explicites.
  }
  return [...refs];
}

async function lireOrdreStatutsOffresDepuisAirtable(options: {
  apiKey: string;
  baseId: string;
  offresId: string;
}): Promise<string[]> {
  const { apiKey, baseId, offresId } = options;
  const metaUrl = `${AIRTABLE_API_BASE}/meta/bases/${encodeURIComponent(baseId)}/tables`;
  const res = await fetch(metaUrl, { method: 'GET', headers: airtableHeaders(apiKey) });
  if (!res.ok) return [...STATUTS_OFFRES_AIRTABLE];
  const json = (await res.json()) as {
    tables?: Array<{
      id?: string;
      name?: string;
      fields?: Array<{
        name?: string;
        type?: string;
        options?: { choices?: Array<{ name?: string }> };
      }>;
    }>;
  };
  const tables = json.tables ?? [];
  const offresIdNorm = (offresId ?? '').trim().toLowerCase();
  const table = tables.find((t) => (t.id ?? '').toLowerCase() === offresIdNorm)
    ?? tables.find((t) => (t.name ?? '').trim().toLowerCase() === offresIdNorm)
    ?? tables.find((t) => (t.name ?? '').trim().toLowerCase() === 'offres');
  const fieldStatut = table?.fields?.find(
    (f) => (f.name ?? '').trim().toLowerCase() === 'statut' && f.type === 'singleSelect'
  );
  const choices = (fieldStatut?.options?.choices ?? [])
    .map((c) => (c.name ?? '').trim())
    .filter(Boolean);
  return choices.length > 0 ? choices : [...STATUTS_OFFRES_AIRTABLE];
}

type TraitementTask = {
  status: 'running' | 'done' | 'error';
  message: string;
  percent: number;
  result?: ResultatTraitement;
  emailsTotal?: number;
  emailIndex?: number;
  offresTotal?: number;
  offreIndex?: number;
  updatedAt: number;
};

const traitementTasks = new Map<string, TraitementTask>();

type AuditTask = {
  status: 'running' | 'done' | 'error';
  message: string;
  percent: number;
  result?: ResultatAuditSources;
  updatedAt: number;
};

const auditTasks = new Map<string, AuditTask>();

type EnrichissementCurrentProgress = {
  index: number;
  total: number;
  recordId: string;
  algo?: string;
};

type EnrichissementWorkerState = {
  running: boolean;
  intervalMs: number;
  lastRunAt?: number;
  lastResult?: ResultatEnrichissementBackground;
  lastError?: string;
  currentProgress?: EnrichissementCurrentProgress;
  timer?: ReturnType<typeof setTimeout>;
};

const enrichissementWorker: EnrichissementWorkerState = {
  running: false,
  intervalMs: 30000,
};

async function runOneEnrichissementBatch(dataDir: string): Promise<void> {
  if (!enrichissementWorker.running) return;
  try {
    enrichissementWorker.currentProgress = undefined;
    const result = await runEnrichissementBackground(dataDir, {
      onProgress: (offre, index, total, algo) => {
        if (!enrichissementWorker.running) return;
        enrichissementWorker.currentProgress = {
          index,
          total,
          recordId: offre.id,
          algo,
        };
      },
    });
    enrichissementWorker.lastRunAt = Date.now();
    enrichissementWorker.lastResult = result;
    enrichissementWorker.currentProgress = undefined;
    if (!result.ok) {
      enrichissementWorker.lastError = result.message;
    } else {
      enrichissementWorker.lastError = undefined;
    }
  } catch (err) {
    enrichissementWorker.lastRunAt = Date.now();
    enrichissementWorker.lastError = err instanceof Error ? err.message : String(err);
    enrichissementWorker.currentProgress = undefined;
  } finally {
    planNextEnrichissementRun(dataDir);
  }
}

function planNextEnrichissementRun(dataDir: string): void {
  if (!enrichissementWorker.running) return;
  enrichissementWorker.timer = setTimeout(() => {
    void runOneEnrichissementBatch(dataDir);
  }, enrichissementWorker.intervalMs);
}

function startEnrichissementWorker(dataDir: string): void {
  if (enrichissementWorker.running) return;
  enrichissementWorker.running = true;
  void runOneEnrichissementBatch(dataDir);
}

function stopEnrichissementWorker(): void {
  enrichissementWorker.running = false;
  if (enrichissementWorker.timer) {
    clearTimeout(enrichissementWorker.timer);
    enrichissementWorker.timer = undefined;
  }
}

async function autoStartEnrichissementWorkerIfNeeded(dataDir: string): Promise<void> {
  if (enrichissementWorker.running) return;
  const etat = await getEnrichissementBackgroundState(dataDir);
  if (!etat.ok) return;
  if (etat.nbEligibles > 0) {
    startEnrichissementWorker(dataDir);
  }
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computePercent(task: TraitementTask): number {
  const emailsTotal = task.emailsTotal ?? 0;
  const emailIndex = task.emailIndex ?? 0;
  const offresTotal = task.offresTotal ?? 0;
  const offreIndex = task.offreIndex ?? 0;
  if (emailsTotal <= 0) return task.percent;
  if (offresTotal > 0 && offreIndex > 0) {
    const p = ((Math.max(0, emailIndex - 1) + offreIndex / offresTotal) / emailsTotal) * 100;
    return clampPercent(p);
  }
  return clampPercent((emailIndex / emailsTotal) * 100);
}

function updateTaskProgress(task: TraitementTask, message: string): void {
  task.message = message;
  task.updatedAt = Date.now();

  let m = message.match(/^Emails LinkedIn trouvés\s*:\s*(\d+)/i);
  if (m) {
    task.emailsTotal = Number(m[1]) || 0;
    task.emailIndex = 0;
    task.offresTotal = 0;
    task.offreIndex = 0;
    task.percent = 0;
    return;
  }

  m = message.match(/^(\d+)\/(\d+)\s*->\s*(\d+)\/(\d+)$/);
  if (m) {
    task.emailIndex = Number(m[1]) || task.emailIndex;
    task.emailsTotal = Number(m[2]) || task.emailsTotal;
    task.offreIndex = Number(m[3]) || 0;
    task.offresTotal = Number(m[4]) || 0;
    task.percent = computePercent(task);
    return;
  }

  m = message.match(/^(\d+)\/(\d+)\s*->\s*(\d+)\s+annonce\(s\)$/);
  if (m) {
    task.emailIndex = Number(m[1]) || task.emailIndex;
    task.emailsTotal = Number(m[2]) || task.emailsTotal;
    task.offresTotal = Number(m[3]) || 0;
    task.offreIndex = 0;
    task.percent = computePercent(task);
    return;
  }

  m = message.match(/^(\d+)\/(\d+)$/);
  if (m) {
    task.emailIndex = Number(m[1]) || task.emailIndex;
    task.emailsTotal = Number(m[2]) || task.emailsTotal;
    task.offresTotal = 0;
    task.offreIndex = 0;
    task.percent = computePercent(task);
  }
}

/** GET /api/compte : ne jamais exposer l'email en clair (masqué pour affichage). */
export function handleGetCompte(dataDir: string, res: ServerResponse): void {
  const compte = lireCompte(dataDir);
  if (!compte) {
    sendJson(res, 200, {});
    return;
  }
  const { adresseEmail, ...rest } = compte;
  sendJson(res, 200, { ...rest, adresseEmail: adresseEmail ? maskEmail(adresseEmail) : '' });
}

/** GET /api/tableau-synthese-offres : tableau de synthèse par expéditeur et statut (US-1.7). */
export async function handleGetTableauSyntheseOffres(dataDir: string, res: ServerResponse): Promise<void> {
  if (bddMockTableauSyntheseStore !== null) {
    sendJson(res, 200, {
      lignes: enrichirPhasesImplementation(bddMockTableauSyntheseStore),
      statutsOrdre: [...STATUTS_OFFRES_AIRTABLE],
    });
    return;
  }
  const useBddMock = process.env.BDD_MOCK_CONNECTEUR === '1';
  if (useBddMock) {
    const repo = {
      async listerSources() {
        return bddMockSourcesStore.map((s) => ({
          emailExpéditeur: s.emailExpéditeur,
          algo: s.algo,
          actif: s.actif,
        }));
      },
      async listerOffres() {
        return (bddMockOffresStore as Array<{ sourceId?: string; statut?: string }>)
          .filter((o) => o.sourceId)
          .map((o) => {
            const source = bddMockSourcesStore.find((s) => s.sourceId === o.sourceId);
            return {
              emailExpéditeur: source?.emailExpéditeur ?? '',
              statut: o.statut ?? '',
            };
          });
      },
    };
    const lignes = await produireTableauSynthese(repo, STATUTS_OFFRES_AIRTABLE);
    sendJson(res, 200, {
      lignes: enrichirPhasesImplementation(lignes),
      statutsOrdre: [...STATUTS_OFFRES_AIRTABLE],
    });
    return;
  }
  const airtable = lireAirTable(dataDir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.sources?.trim() || !airtable?.offres?.trim()) {
    sendJson(res, 200, { lignes: [] }, { 'Cache-Control': 'no-store' });
    return;
  }
  const baseId = normaliserBaseId(airtable.base.trim());
  const driver = createAirtableReleveDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    sourcesId: airtable.sources.trim(),
    offresId: airtable.offres.trim(),
  });
  const sources = await driver.listerSources();
  const sourceIdVersEmail = new Map(
    sources.map((s) => [s.sourceId, s.emailExpéditeur.trim().toLowerCase()])
  );
  const offres = await listerOffresPourTableau({
    apiKey: airtable.apiKey.trim(),
    baseId,
    baseRefRaw: airtable.base.trim(),
    offresId: airtable.offres.trim(),
    sourceIdVersEmail,
  });
  const statutsOrdre = await lireOrdreStatutsOffresDepuisAirtable({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId: airtable.offres.trim(),
  });
  const lignes = await produireTableauSynthese({
    async listerSources() {
      return sources.map((s) => ({
        emailExpéditeur: s.emailExpéditeur,
        algo: s.algo,
        actif: s.actif,
      }));
    },
    async listerOffres() {
      return offres;
    },
  }, statutsOrdre);
  sendJson(res, 200, { lignes: enrichirPhasesImplementation(lignes), statutsOrdre }, {
    'Cache-Control': 'no-store',
  });
}

function normaliserAlgoPourPlugin(algo: string): SourceEmail['algo'] {
  const a = (algo ?? '').trim();
  if (a.toLowerCase() === 'linkedin') return 'Linkedin';
  if (a === 'HelloWork' || a === 'Welcome to the Jungle' || a === 'Job That Make Sense' || a === 'cadreemploi' || a === 'Inconnu') return a as SourceEmail['algo'];
  return 'Inconnu';
}

function enrichirPhasesImplementation(
  lignes: LigneTableauSynthese[]
): Array<LigneTableauSynthese & { phase1Implemented: boolean; phase2Implemented: boolean }> {
  const registry = createSourcePluginsRegistry();
  return lignes.map((ligne) => {
    const algoRaw = ligne.algoEtape1 || ligne.algoEtape2 || 'Inconnu';
    const algo = normaliserAlgoPourPlugin(algoRaw);
    const pluginEtape1 = registry.getEmailPlugin(algo);
    const pluginEtape2 = registry.getOfferFetchPluginByAlgo(algo);
    return {
      ...ligne,
      phase1Implemented: !!pluginEtape1,
      phase2Implemented: !!pluginEtape2?.stage2Implemented,
    };
  });
}

/** Réponse GET /api/airtable : ne jamais exposer la clé API. */
export function handleGetAirtable(dataDir: string, res: ServerResponse): void {
  chargerEnvLocal();
  const airtable = lireAirTable(dataDir);
  if (!airtable) {
    sendJson(res, 200, {});
    return;
  }
  sendJson(res, 200, {
    base: airtable.base,
    baseTest: airtable.baseTest,
    sources: airtable.sources,
    offres: airtable.offres,
    hasApiKey: !!(airtable.apiKey?.trim()),
  });
}

/**
 * Lance le traitement (relève offres LinkedIn + enrichissement) et répond en JSON (US-1.4).
 */
export async function handlePostTraitement(dataDir: string, res: ServerResponse): Promise<void> {
  const result = await runTraitement(dataDir);
  if (result.ok) {
    await autoStartEnrichissementWorkerIfNeeded(dataDir);
  }
  sendJson(res, 200, result);
}

/** Démarre un traitement asynchrone et renvoie un taskId pour suivi de progression. */
export function handlePostTraitementStart(dataDir: string, res: ServerResponse): void {
  const taskId = randomUUID();
  const task: TraitementTask = {
    status: 'running',
    message: 'Traitement en cours…',
    percent: 0,
    updatedAt: Date.now(),
  };
  traitementTasks.set(taskId, task);

  const useBddMockTraitement = process.env.BDD_MOCK_CONNECTEUR === '1';
  const compteBddT = useBddMockTraitement ? (lireCompte(dataDir) ?? { provider: 'imap' as const, adresseEmail: 'test@example.com', cheminDossier: 'inbox', cheminDossierArchive: '', imapHost: 'imap.example.com', imapPort: 993, imapSecure: true }) : null;
  const airtableBddT = useBddMockTraitement ? (lireAirTable(dataDir) ?? { apiKey: 'patTestKeyValide123', base: 'appXyz123', sources: 'tblSourcesId', offres: 'tblOffresId' }) : null;
  const depsTraitement = useBddMockTraitement
    ? {
        compte: compteBddT ?? undefined,
        airtable: airtableBddT ?? undefined,
        motDePasse: 'test',
        lecteurEmails: bddMockEmailsGouvernance
          ? createLecteurEmailsMock({ emailsGouvernance: bddMockEmailsGouvernance })
          : createLecteurEmailsMock(),
        driverReleve: createBddMockDriverReleve(),
      }
    : undefined;

  void runTraitement(dataDir, {
    onProgress: (message) => {
      const t = traitementTasks.get(taskId);
      if (!t || t.status !== 'running') return;
      updateTaskProgress(t, message);
    },
    deps: depsTraitement,
  })
    .then((result) => {
      const t = traitementTasks.get(taskId);
      if (!t) return;
      t.result = result;
      t.status = result.ok ? 'done' : 'error';
      t.percent = 100;
      t.message = result.ok
        ? `Terminé : ${result.nbOffresCreees ?? 0} offre(s) créée(s)${(result.nbOffresDejaPresentes ?? 0) > 0 ? `, ${result.nbOffresDejaPresentes} déjà présente(s) (mise à jour)` : ''}.`
        : result.message;
      t.updatedAt = Date.now();
      if (result.ok) {
        void autoStartEnrichissementWorkerIfNeeded(dataDir);
      }
    })
    .catch((err) => {
      const t = traitementTasks.get(taskId);
      if (!t) return;
      t.status = 'error';
      t.percent = 100;
      t.message = err instanceof Error ? err.message : String(err);
      t.updatedAt = Date.now();
    });

  sendJson(res, 200, { ok: true, taskId });
}

/** Retourne l'état courant d'un traitement asynchrone. */
export function handleGetTraitementStatus(taskId: string, res: ServerResponse): void {
  const task = traitementTasks.get(taskId);
  if (!task) {
    sendJson(res, 404, { ok: false, message: 'task introuvable' });
    return;
  }
  sendJson(res, 200, {
    ok: true,
    status: task.status,
    message: task.message,
    percent: task.percent,
    result: task.result,
  });
}

/** Démarre un audit asynchrone (création/contrôle des sources) et renvoie un taskId. */
export function handlePostAuditStart(
  dataDir: string,
  res: ServerResponse,
  runAudit: typeof runAuditSources = runAuditSources
): void {
  const taskId = randomUUID();
  const task: AuditTask = {
    status: 'running',
    message: 'Audit en cours…',
    percent: 0,
    updatedAt: Date.now(),
  };
  auditTasks.set(taskId, task);

  const useBddMock = process.env.BDD_MOCK_CONNECTEUR === '1';
  const compteBdd = useBddMock ? (lireCompte(dataDir) ?? { provider: 'imap' as const, adresseEmail: 'test@example.com', cheminDossier: 'inbox', cheminDossierArchive: '', imapHost: 'imap.example.com', imapPort: 993, imapSecure: true }) : null;
  const airtableBdd = useBddMock ? (lireAirTable(dataDir) ?? { apiKey: 'patTestKeyValide123', base: 'appXyz123', sources: 'tblSourcesId', offres: 'tblOffresId' }) : null;
  const deps = useBddMock
    ? {
        compte: compteBdd ?? undefined,
        airtable: airtableBdd ?? undefined,
        motDePasse: 'test',
        lecteurEmails: bddMockEmailsGouvernance
          ? createLecteurEmailsMock({ emailsGouvernance: bddMockEmailsGouvernance })
          : createLecteurEmailsMock(),
        driverReleve: createBddMockDriverReleve(),
      }
    : undefined;

  void runAudit(dataDir, {
    onProgress: (message) => {
      const t = auditTasks.get(taskId);
      if (!t || t.status !== 'running') return;
      t.message = message;
      t.updatedAt = Date.now();
    },
    deps,
  })
    .then((result) => {
      const t = auditTasks.get(taskId);
      if (!t) return;
      t.result = result;
      t.status = result.ok ? 'done' : 'error';
      t.percent = 100;
      t.message = result.ok
        ? `Terminé : ${result.nbEmailsScannes} email(s) scanné(s), ${result.nbSourcesCreees} source(s) créée(s), ${result.nbSourcesExistantes} existante(s).`
        : result.message;
      t.updatedAt = Date.now();
    })
    .catch((err) => {
      const t = auditTasks.get(taskId);
      if (!t) return;
      t.status = 'error';
      t.percent = 100;
      t.message = err instanceof Error ? err.message : String(err);
      t.updatedAt = Date.now();
    });

  sendJson(res, 200, { ok: true, taskId });
}

/** Retourne l'état courant d'un audit asynchrone. */
export function handleGetAuditStatus(taskId: string, res: ServerResponse): void {
  const task = auditTasks.get(taskId);
  if (!task) {
    sendJson(res, 404, { ok: false, message: 'task introuvable' });
    return;
  }
  sendJson(res, 200, {
    ok: true,
    status: task.status,
    message: task.message,
    percent: task.percent,
    result: task.result,
  });
}

export function handleGetEnrichissementWorkerStatus(dataDir: string, res: ServerResponse): void {
  void getEnrichissementBackgroundState(dataDir)
    .then((etat) => {
      if (etat.ok && etat.nbEligibles > 0 && !enrichissementWorker.running) {
        startEnrichissementWorker(dataDir);
      }
      sendJson(res, 200, {
        ok: true,
        running: enrichissementWorker.running,
        intervalMs: enrichissementWorker.intervalMs,
        lastRunAt: enrichissementWorker.lastRunAt,
        lastError: enrichissementWorker.lastError,
        lastResult: enrichissementWorker.lastResult,
        currentProgress: enrichissementWorker.currentProgress,
        state: etat,
      });
    })
    .catch((err) => {
      sendJson(res, 200, {
        ok: true,
        running: enrichissementWorker.running,
        intervalMs: enrichissementWorker.intervalMs,
        lastRunAt: enrichissementWorker.lastRunAt,
        lastError: err instanceof Error ? err.message : String(err),
        lastResult: enrichissementWorker.lastResult,
        currentProgress: enrichissementWorker.currentProgress,
      });
    });
}

export function handlePostEnrichissementWorkerStart(dataDir: string, res: ServerResponse): void {
  startEnrichissementWorker(dataDir);
  sendJson(res, 200, { ok: true, running: true });
}

export function handlePostEnrichissementWorkerStop(res: ServerResponse): void {
  stopEnrichissementWorker();
  sendJson(res, 200, { ok: true, running: false });
}

import type { OverridesConnecteur } from '../utils/connecteur-email-factory.js';

/** Factory injectée : (options IMAP, overrides?) => connecteur. */
export type GetConnecteurEmailFn = (
  imapOptions?: OptionsImap,
  overrides?: OverridesConnecteur
) => ConnecteurEmail;

/**
 * Test de connexion : selon provider (IMAP / Microsoft / Gmail), valide et appelle le connecteur.
 */
export async function handlePostTestConnexion(
  getConnecteurEmailFn: GetConnecteurEmailFn,
  body: Record<string, unknown>,
  res: ServerResponse
): Promise<void> {
  const provider = String(body.provider ?? 'imap').trim().toLowerCase() as 'imap' | 'microsoft' | 'gmail';
  const adresseEmail = String(body.adresseEmail ?? '').trim();
  const motDePasse = String(body.motDePasse ?? '').trim();
  const cheminDossier = String(body.cheminDossier ?? '').trim();
  const imapHost = String(body.imapHost ?? '').trim();
  const imapPort = Number(body.imapPort) || 993;
  const imapSecure = body.imapSecure !== '0' && body.imapSecure !== 'false';
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';

  if (provider === 'gmail') {
    sendJson(res, 200, { ok: false, message: 'En construction' });
    return;
  }

  if (provider === 'microsoft') {
    if (!adresseEmail) {
      sendJson(res, 200, { ok: false, message: "le champ 'adresse email' est requis" });
      return;
    }
    if (!cheminDossier) {
      sendJson(res, 200, { ok: false, message: 'préciser le chemin vers le dossier à analyser' });
      return;
    }
    const tokenFromForm = accessToken.trim();
    const connecteur = getConnecteurEmailFn(undefined, {
      provider: 'microsoft',
      accessToken: tokenFromForm || undefined,
    });
    const result = await executerTestConnexion(adresseEmail, '', cheminDossier, connecteur);
    if (result.ok) {
      sendJson(res, 200, { ok: true, nbEmails: result.nbEmails });
    } else {
      sendJson(res, 200, { ok: false, message: result.message });
    }
    return;
  }

  const validation = validerParametresCompte(adresseEmail, motDePasse, cheminDossier, { imapHost });
  if (!validation.ok) {
    sendJson(res, 200, { ok: false, message: validation.message });
    return;
  }
  const connecteur = getConnecteurEmailFn({ host: imapHost, port: imapPort, secure: imapSecure });
  const result = await executerTestConnexion(adresseEmail, motDePasse, cheminDossier, connecteur);
  if (result.ok) {
    sendJson(res, 200, { ok: true, nbEmails: result.nbEmails });
  } else {
    sendJson(res, 200, { ok: false, message: result.message });
  }
}

export function handlePostCompte(
  dataDir: string,
  body: Record<string, unknown>,
  res: ServerResponse
): void {
  const provider = (String(body.provider ?? 'imap').trim().toLowerCase() || 'imap') as 'imap' | 'microsoft' | 'gmail';
  const adresseEmail = String(body.adresseEmail ?? '').trim();
  const motDePasse = String(body.motDePasse ?? '').trim();
  const cheminDossier = String(body.cheminDossier ?? '').trim();
  const cheminDossierArchive = String(body.cheminDossierArchive ?? '').trim();
  const imapHost = String(body.imapHost ?? '').trim();
  const imapPort = Number(body.imapPort) || 993;
  const imapSecure = body.imapSecure !== '0' && body.imapSecure !== 'false';
  try {
    ecrireCompte(dataDir, {
      provider,
      adresseEmail,
      motDePasse,
      cheminDossier,
      cheminDossierArchive,
      imapHost,
      imapPort,
      imapSecure,
    });
    sendJson(res, 200, { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    sendJson(res, 500, { ok: false, message });
  }
}

/**
 * Driver mock pour BDD : succès si apiKey valide (ex. patTestKeyValide123),
 * erreur si apiKey vide/invalide (ex. patInvalidKey) pour les scénarios d'échec.
 */
const airtableDriverMockBdd: AirtableConfigDriver = {
  async creerBaseEtTables(apiKey: string): Promise<{
    baseId: string;
    sourcesId: string;
    offresId: string;
  }> {
    const key = (apiKey || '').trim();
    if (key.length < 10 || /Invalid|invalide/i.test(key)) {
      throw new Error('Indication d\'erreur d\'authentification ou d\'API.');
    }
    if (/InvalidOrUnreachable|indisponible/i.test(key)) {
      throw new Error('Indication d\'erreur de connexion ou de service.');
    }
    return {
      baseId: 'appBddMock',
      sourcesId: 'tblSourcesBdd',
      offresId: 'tblOffresBdd',
    };
  },
};

/**
 * Lance la configuration Airtable (création tables Sources/Offres).
 * Body JSON : { apiKey?: string, base?: string }. Si base renseignée, utilise le driver réel.
 * En mode BDD (BDD_IN_MEMORY_STORE=1), utilise un driver mock pour les scénarios de succès.
 */
export async function handlePostConfigurationAirtable(
  dataDir: string,
  body: Record<string, unknown>,
  res: ServerResponse
): Promise<void> {
  // Recharger .env.local ici évite de dépendre d'un redémarrage après correction du fichier.
  chargerEnvLocal();
  let apiKey = String(body.apiKey ?? '').trim();
  if (!apiKey) {
    const stored = lireAirTable(dataDir);
    apiKey = (stored?.apiKey ?? '').trim();
    if (!apiKey) {
      const p = lireParametres(dataDir) as
        | ({ airtable?: { apiKeyChiffre?: string } } & Record<string, unknown>)
        | null;
      const hasEncryptedKey = !!p?.airtable?.apiKeyChiffre;
      if (hasEncryptedKey) {
        sendJson(res, 200, {
          ok: false,
          status:
            "Erreur avec AirTable : API Key chiffrée détectée mais illisible. Vérifie PARAMETRES_ENCRYPTION_KEY dans .env.local.",
        });
        return;
      }
    }
  }
  const base = String(body.base ?? '').trim();
  const useMockBdd = process.env.BDD_IN_MEMORY_STORE === '1';
  const driver =
    useMockBdd
      ? airtableDriverMockBdd
      : base
        ? createAirtableDriverReel({ baseId: base })
        : airtableDriverParDefaut;
  try {
    const result = await executerConfigurationAirtable(apiKey, dataDir, driver);
    const status = libelleStatutConfigurationAirtable(result);
    sendJson(res, 200, { ok: result.ok, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, 200, { ok: false, status: `Erreur avec AirTable : ${message}` });
  }
}
