/**
 * Handlers API pour paramétrage compte email (US-1.1) et configuration Airtable (US-1.3).
 * Reçoivent les ports (ex. ConnecteurEmail) par injection — pas d'import des implémentations.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ServerResponse } from 'node:http';
import { join } from 'node:path';
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
import {
  runAnalyseIABackground,
  getAnalyseIABackgroundState,
  type ResultatAnalyseIABackground,
} from '../scripts/run-analyse-ia-background.js';
import type { ConnecteurEmail, OptionsImap } from '../types/compte.js';
import { maskEmail } from '../utils/mask-email.js';
import { chargerEnvLocal } from '../utils/load-env-local.js';
import { lireParametres } from '../utils/parametres-io.js';
import { createLecteurEmailsMock } from '../utils/lecteur-emails-mock.js';
import type { SourceEmail } from '../utils/gouvernance-sources-emails.js';
import { produireTableauSynthese, calculerTotauxTableauSynthese } from '../utils/tableau-synthese-offres.js';
import type { LigneTableauSynthese } from '../utils/tableau-synthese-offres.js';
import { createAirtableReleveDriver } from '../utils/airtable-releve-driver.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { createSourcePluginsRegistry } from '../utils/source-plugins.js';
import { STATUTS_OFFRES_AIRTABLE, STATUTS_OFFRES_AVEC_AUTRE } from '../utils/statuts-offres-airtable.js';
import {
  recupererTexteOffreTest,
  createOffreTestDriverAirtable,
} from '../utils/offre-test.js';
import { appelerClaudeCode, type ResultatAppelClaude } from '../utils/appeler-claudecode.js';
import { parseJsonReponseIA, validerConformiteJsonIA } from '../utils/parse-json-reponse-ia.js';
import { construirePromptComplet } from '../utils/prompt-ia.js';
import { lireClaudeCode } from '../utils/parametres-claudecode.js';
import { agregerConsommationParJourEtApi, enregistrerAppel } from '../utils/log-appels-api.js';

/** Store BDD : tableau synthèse offres pour tests (US-1.7). */
let bddMockTableauSyntheseStore: LigneTableauSynthese[] | null = null;

/** Store BDD : offre test pour Configuration ClaudeCode (US-2.4). null = utiliser Airtable réel. */
let bddMockOffreTestStore: { hasOffre: boolean; texte?: string } | null = null;

/** BDD : définir la réponse mock de GET /api/offre-test (null = comportement réel). */
export function setBddMockOffreTest(offre: { hasOffre: boolean; texte?: string } | null): void {
  bddMockOffreTestStore = offre;
}

/** Store BDD : réponse mock de POST /api/test-claudecode (null = appel API réel). */
let bddMockTestClaudecodeStore: ResultatAppelClaude | null = null;

/** BDD : définir la réponse mock de POST /api/test-claudecode (null = comportement réel). */
export function setBddMockTestClaudecode(resultat: ResultatAppelClaude | null): void {
  bddMockTestClaudecodeStore = resultat;
}

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
export function setBddMockSources(sources: Array<{ emailExpéditeur: string; plugin: SourceEmail['plugin']; actif: boolean }>): void {
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
  mettreAJourSource: (sourceId: string, patch: Partial<Pick<SourceEmail, 'plugin' | 'actif'>>) => Promise<void>;
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
    async mettreAJourSource(sourceId: string, patch: Partial<Pick<SourceEmail, 'plugin' | 'actif'>>) {
      const i = bddMockSourcesStore.findIndex((s) => s.sourceId === sourceId);
      if (i >= 0) {
        if (patch.plugin) bddMockSourcesStore[i].plugin = patch.plugin;
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
      const linkedin = bddMockSourcesStore.find((s) => s.plugin === 'Linkedin');
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

/** 2 appels : Sources puis Offres avec la clé étrangère (champ lien vers Sources) + Statut. */
async function listerOffresPourTableau(options: {
  apiKey: string;
  baseId: string;
  offresId: string;
  sourceIdVersEmail: Map<string, string>;
}): Promise<Array<{ emailExpéditeur: string; statut: string }>> {
  const { apiKey, baseId, offresId, sourceIdVersEmail } = options;
  const offres: Array<{ emailExpéditeur: string; statut: string }> = [];
  let offset = '';
  const fieldsParam = 'fields%5B%5D=email%20exp%C3%A9diteur&fields%5B%5D=Statut';
  do {
    const url = `${AIRTABLE_API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(
      offresId
    )}?${fieldsParam}&pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers: airtableHeaders(apiKey) });
    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 404) {
        throw new Error(`Airtable Offres : table introuvable (404). Vérifie l’ID table Offres dans Paramètres. ${detail || res.statusText}`);
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
        const sourceRef = String(lienSource[0] ?? '').trim();
        const email = sourceIdVersEmail.get(sourceRef) ?? '';
        if (email) offres.push({ emailExpéditeur: email, statut });
        continue;
      }
      if (typeof lienSource === 'string' && lienSource.trim()) {
        offres.push({ emailExpéditeur: lienSource.trim().toLowerCase(), statut });
      }
    }
    offset = json.offset ?? '';
  } while (offset);
  return offres;
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
  plugin?: string;
};

type AnalyseIACurrentProgress = {
  index: number;
  total: number;
  poste?: string;
  ville?: string;
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

type AnalyseIAWorkerState = {
  running: boolean;
  intervalMs: number;
  lastRunAt?: number;
  lastResult?: ResultatAnalyseIABackground;
  lastError?: string;
  currentProgress?: AnalyseIACurrentProgress;
  timer?: ReturnType<typeof setTimeout>;
};

const enrichissementWorker: EnrichissementWorkerState = {
  running: false,
  intervalMs: 30000,
};

/** Délai entre deux passes quand des offres ont été traitées (ou erreur). */
const ANALYSE_IA_INTERVAL_MS = 30000;
/** Délai plus court quand 0 candidat « À analyser » trouvé, pour réessayer vite (ex. après une vague d'enrichissement). */
const ANALYSE_IA_INTERVAL_IDLE_MS = 10000;

const analyseIAWorker: AnalyseIAWorkerState = {
  running: false,
  intervalMs: ANALYSE_IA_INTERVAL_MS,
};

async function runOneEnrichissementBatch(dataDir: string): Promise<void> {
  if (!enrichissementWorker.running) return;
  try {
    enrichissementWorker.currentProgress = undefined;
    const result = await runEnrichissementBackground(dataDir, {
      shouldAbort: () => !enrichissementWorker.running,
      onProgress: (offre, index, total, plugin) => {
        if (!enrichissementWorker.running) return;
        enrichissementWorker.currentProgress = {
          index,
          total,
          recordId: offre.id,
          plugin,
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
    runOneEnrichissementBatch(dataDir).catch(() => {});
  }, enrichissementWorker.intervalMs);
}

function startEnrichissementWorker(dataDir: string): void {
  if (enrichissementWorker.running) return;
  enrichissementWorker.running = true;
  runOneEnrichissementBatch(dataDir).catch(() => {});
}

function stopEnrichissementWorker(): void {
  enrichissementWorker.running = false;
  if (enrichissementWorker.timer) {
    clearTimeout(enrichissementWorker.timer);
    enrichissementWorker.timer = undefined;
  }
}

async function runOneAnalyseIABatch(dataDir: string): Promise<void> {
  if (!analyseIAWorker.running) return;
  try {
    analyseIAWorker.currentProgress = undefined;
    const result = await runAnalyseIABackground(dataDir, {
      shouldAbort: () => !analyseIAWorker.running,
      onProgress: (offre, index, total) => {
        if (!analyseIAWorker.running) return;
        analyseIAWorker.currentProgress = {
          index,
          total,
          poste: offre.poste,
          ville: offre.ville,
        };
      },
    });
    analyseIAWorker.lastRunAt = Date.now();
    analyseIAWorker.lastResult = result;
    if (result.ok && result.nbCandidates === 0) {
      analyseIAWorker.currentProgress = { index: 0, total: 0 };
    } else {
      analyseIAWorker.currentProgress = undefined;
    }
    if (!result.ok) {
      analyseIAWorker.lastError = result.message;
    } else {
      analyseIAWorker.lastError = undefined;
    }
  } catch (err) {
    analyseIAWorker.lastRunAt = Date.now();
    analyseIAWorker.lastError = err instanceof Error ? err.message : String(err);
    analyseIAWorker.currentProgress = undefined;
  } finally {
    planNextAnalyseIARun(dataDir);
  }
}

function planNextAnalyseIARun(dataDir: string): void {
  if (!analyseIAWorker.running) return;
  analyseIAWorker.timer = setTimeout(() => {
    runOneAnalyseIABatch(dataDir).catch(() => {
      /* erreur déjà logée dans lastError, on évite un rejet non géré */
    });
  }, analyseIAWorker.intervalMs);
}

function startAnalyseIAWorker(dataDir: string): void {
  if (analyseIAWorker.running) return;
  analyseIAWorker.running = true;
  runOneAnalyseIABatch(dataDir).catch(() => {
    /* erreur déjà logée dans lastError */
  });
}

function stopAnalyseIAWorker(): void {
  analyseIAWorker.running = false;
  if (analyseIAWorker.timer) {
    clearTimeout(analyseIAWorker.timer);
    analyseIAWorker.timer = undefined;
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

/** GET /api/consommation-api : agrégation par jour et par API (US-2.5). */
export function handleGetConsommationApi(dataDir: string, res: ServerResponse): void {
  const data = agregerConsommationParJourEtApi(dataDir);
  sendJson(res, 200, data, { 'Cache-Control': 'no-store' });
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

/** GET /api/tableau-synthese-offres : tableau de synthèse par expéditeur et statut (US-1.7, US-1.13). 2 appels : Sources puis Offres (champ lien FK + Statut). Ordre statuts + colonne Autre depuis le code. */
export async function handleGetTableauSyntheseOffres(dataDir: string, res: ServerResponse): Promise<void> {
  let statutsOrdre: string[] = [...STATUTS_OFFRES_AVEC_AUTRE];
  if (bddMockTableauSyntheseStore !== null) {
    const lignes = enrichirPhasesImplementation(bddMockTableauSyntheseStore);
    const totaux = calculerTotauxTableauSynthese(lignes, statutsOrdre);
    sendJson(res, 200, {
      lignes,
      statutsOrdre,
      totauxColonnes: totaux.totalParColonne,
      totalParLigne: totaux.totalParLigne,
      totalGeneral: totaux.totalGeneral,
    });
    return;
  }
  const useBddMock = process.env.BDD_MOCK_CONNECTEUR === '1';
  if (useBddMock) {
    const repo = {
      async listerSources() {
        return bddMockSourcesStore.map((s) => ({
          emailExpéditeur: s.emailExpéditeur,
          plugin: s.plugin,
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
    const lignes = await produireTableauSynthese(repo, STATUTS_OFFRES_AVEC_AUTRE);
    const totaux = calculerTotauxTableauSynthese(lignes, statutsOrdre);
    sendJson(res, 200, {
      lignes: enrichirPhasesImplementation(lignes),
      statutsOrdre: [...STATUTS_OFFRES_AVEC_AUTRE],
      totauxColonnes: totaux.totalParColonne,
      totalParLigne: totaux.totalParLigne,
      totalGeneral: totaux.totalGeneral,
    });
    return;
  }
  const airtable = lireAirTable(dataDir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.sources?.trim() || !airtable?.offres?.trim()) {
    sendJson(res, 200, {
      lignes: [],
      statutsOrdre: [...STATUTS_OFFRES_AVEC_AUTRE],
      totauxColonnes: {},
      totalParLigne: [],
      totalGeneral: 0,
    }, { 'Cache-Control': 'no-store' });
    return;
  }
  const baseId = normaliserBaseId(airtable.base.trim());
  const apiKey = airtable.apiKey.trim();
  const offresId = airtable.offres.trim();
  statutsOrdre = [...STATUTS_OFFRES_AVEC_AUTRE];

  try {
    const driver = createAirtableReleveDriver({
      apiKey,
      baseId,
      sourcesId: airtable.sources.trim(),
      offresId,
    });
    const sources = await driver.listerSources();
    enregistrerAppel(dataDir, { api: 'Airtable', succes: true });
    const sourceIdVersEmail = new Map(
      sources.map((s) => [s.sourceId, s.emailExpéditeur.trim().toLowerCase()])
    );
    const offres = await listerOffresPourTableau({
      apiKey,
      baseId,
      offresId,
      sourceIdVersEmail,
    });
    enregistrerAppel(dataDir, { api: 'Airtable', succes: true });
    const lignes = await produireTableauSynthese({
      async listerSources() {
        return sources.map((s) => ({
          emailExpéditeur: s.emailExpéditeur,
          plugin: s.plugin,
          actif: s.actif,
        }));
      },
      async listerOffres() {
        return offres;
      },
    }, statutsOrdre);
    const totaux = calculerTotauxTableauSynthese(lignes, statutsOrdre);
    sendJson(res, 200, {
      lignes: enrichirPhasesImplementation(lignes),
      statutsOrdre,
      totauxColonnes: totaux.totalParColonne,
      totalParLigne: totaux.totalParLigne,
      totalGeneral: totaux.totalGeneral,
    }, {
      'Cache-Control': 'no-store',
    });
  } catch (err) {
    enregistrerAppel(dataDir, { api: 'Airtable', succes: false, codeErreur: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

function normaliserPluginValue(value: string): SourceEmail['plugin'] {
  const v = (value ?? '').trim();
  if (v.toLowerCase() === 'linkedin') return 'Linkedin';
  if (v === 'HelloWork' || v === 'Welcome to the Jungle' || v === 'Job That Make Sense' || v === 'Cadre Emploi' || v === 'Inconnu') return v as SourceEmail['plugin'];
  return 'Inconnu';
}

function enrichirPhasesImplementation(
  lignes: LigneTableauSynthese[]
): Array<LigneTableauSynthese & { phase1Implemented: boolean; phase2Implemented: boolean }> {
  const registry = createSourcePluginsRegistry();
  return lignes.map((ligne) => {
    const pluginRaw = ligne.pluginEtape1 || ligne.pluginEtape2 || 'Inconnu';
    const plugin = normaliserPluginValue(pluginRaw);
    const emailPlugin = registry.getEmailPlugin(plugin);
    const offerPlugin = registry.getOfferFetchPlugin(plugin);
    return {
      ...ligne,
      phase1Implemented: !!emailPlugin,
      phase2Implemented: !!offerPlugin?.stage2Implemented,
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

/** Retourne true si au moins une offre a du texte (pour afficher le bouton "Récupérer" en page Paramètres). US-2.4 */
export async function getOffreTestHasOffre(dataDir: string): Promise<boolean> {
  if (bddMockOffreTestStore !== null) {
    return bddMockOffreTestStore.hasOffre;
  }
  const airtable = lireAirTable(dataDir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.offres?.trim()) {
    return false;
  }
  const baseId = normaliserBaseId(airtable.base.trim());
  const driver = createOffreTestDriverAirtable({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId: airtable.offres.trim(),
  });
  const texte = await recupererTexteOffreTest(driver);
  return !!texte;
}

/** GET /api/offre-test : texte d'une offre pour préremplir le champ test ClaudeCode (US-2.4). */
export async function handleGetOffreTest(dataDir: string, res: ServerResponse): Promise<void> {
  if (bddMockOffreTestStore !== null) {
    sendJson(res, 200, {
      hasOffre: bddMockOffreTestStore.hasOffre,
      ...(bddMockOffreTestStore.texte !== undefined && { texte: bddMockOffreTestStore.texte }),
    });
    return;
  }
  const airtable = lireAirTable(dataDir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.offres?.trim()) {
    sendJson(res, 200, { hasOffre: false });
    return;
  }
  const baseId = normaliserBaseId(airtable.base.trim());
  try {
    const driver = createOffreTestDriverAirtable({
      apiKey: airtable.apiKey.trim(),
      baseId,
      offresId: airtable.offres.trim(),
    });
    const texte = await recupererTexteOffreTest(driver);
    enregistrerAppel(dataDir, { api: 'Airtable', succes: true });
    sendJson(res, 200, {
      hasOffre: !!texte,
      ...(texte !== null && { texte }),
    });
  } catch (err) {
    enregistrerAppel(dataDir, { api: 'Airtable', succes: false, codeErreur: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

/** POST /api/test-claudecode : envoie le prompt (système + texte offre) à l'API Claude et retourne le résultat (US-2.4). US-2.5 : enregistre l'appel dans le log consommation API. */
export async function handlePostTestClaudecode(
  dataDir: string,
  body: Record<string, unknown>,
  res: ServerResponse
): Promise<void> {
  if (bddMockTestClaudecodeStore !== null) {
    enregistrerAppel(dataDir, {
      api: 'Claude',
      succes: bddMockTestClaudecodeStore.ok,
      codeErreur: bddMockTestClaudecodeStore.ok ? undefined : bddMockTestClaudecodeStore.code,
    });
    sendJson(res, 200, bddMockTestClaudecodeStore);
    return;
  }
  const claudecode = lireClaudeCode(dataDir);
  if (!claudecode?.hasApiKey) {
    sendJson(res, 200, {
      ok: false,
      code: 'no_api_key',
      message: 'Clé API ClaudeCode non configurée. Enregistrez une clé dans la section Configuration ClaudeCode.',
    });
    return;
  }
  const texteOffre = typeof body.texteOffre === 'string' ? body.texteOffre : '';
  const parametrageIA = lireParametres(dataDir)?.parametrageIA ?? null;
  const promptSystem = construirePromptComplet(dataDir, parametrageIA);
  const messageUser = `Analyse cette offre et retourne le JSON demandé.\n\nContenu de l'offre :\n${texteOffre}`;
  const result = await appelerClaudeCode(dataDir, promptSystem, messageUser);
  enregistrerAppel(dataDir, {
    api: 'Claude',
    succes: result.ok,
    codeErreur: result.ok ? undefined : result.code,
  });
  const payload: Record<string, unknown> = { ...result };
  if (result.ok && typeof result.texte === 'string') {
    const parsed = parseJsonReponseIA(result.texte);
    if (parsed.ok) {
      const conformite = validerConformiteJsonIA(parsed.json, parametrageIA);
      payload.jsonValidation = {
        valid: true,
        json: parsed.json,
        conform: conformite.conform,
        ...(conformite.conform ? {} : { validationErrors: conformite.errors }),
      };
    } else {
      payload.jsonValidation = { valid: false, error: parsed.error };
    }
  }
  sendJson(res, 200, payload);
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
  const running = enrichissementWorker.running || analyseIAWorker.running;
  const payload = {
    ok: true,
    running,
    enrichissement: {
      running: enrichissementWorker.running,
      intervalMs: enrichissementWorker.intervalMs,
      lastRunAt: enrichissementWorker.lastRunAt,
      lastError: enrichissementWorker.lastError,
      lastResult: enrichissementWorker.lastResult,
      currentProgress: enrichissementWorker.currentProgress,
    },
    analyseIA: {
      running: analyseIAWorker.running,
      intervalMs: analyseIAWorker.intervalMs,
      lastRunAt: analyseIAWorker.lastRunAt,
      lastError: analyseIAWorker.lastError,
      lastResult: analyseIAWorker.lastResult,
      currentProgress: analyseIAWorker.currentProgress,
    },
  };
  Promise.all([
    getEnrichissementBackgroundState(dataDir),
    getAnalyseIABackgroundState(dataDir),
  ])
    .then(([etat, etatAnalyseIA]) => {
      sendJson(res, 200, {
        ...payload,
        state: etat,
        stateAnalyseIA: etatAnalyseIA.ok ? { nbCandidates: etatAnalyseIA.nbCandidates } : { error: etatAnalyseIA.message },
      });
    })
    .catch(() => {
      sendJson(res, 200, payload);
    });
}

const WORKER_STATE_FILENAME = 'worker-running.json';

function persistWorkerRunning(dataDir: string, running: boolean): void {
  try {
    writeFileSync(join(dataDir, WORKER_STATE_FILENAME), JSON.stringify({ running }));
  } catch {
    // ignorer (dossier data absent ou droits)
  }
}

/** À appeler au démarrage du serveur : relance les workers si ils tournaient avant un redémarrage. */
export function restoreWorkerStateIfNeeded(dataDir: string): void {
  try {
    const path = join(dataDir, WORKER_STATE_FILENAME);
    if (!existsSync(path)) return;
    const raw = readFileSync(path, 'utf8');
    const data = JSON.parse(raw) as { running?: boolean };
    if (data.running === true) {
      startEnrichissementWorker(dataDir);
      startAnalyseIAWorker(dataDir);
      console.log('[Worker] État relancé après redémarrage du serveur.');
    }
  } catch {
    // ignorer
  }
}

export function handlePostEnrichissementWorkerStart(dataDir: string, res: ServerResponse): void {
  startEnrichissementWorker(dataDir);
  startAnalyseIAWorker(dataDir);
  persistWorkerRunning(dataDir, true);
  sendJson(res, 200, { ok: true, running: true });
}

export function handlePostEnrichissementWorkerStop(dataDir: string, res: ServerResponse): void {
  stopEnrichissementWorker();
  stopAnalyseIAWorker();
  persistWorkerRunning(dataDir, false);
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
    enregistrerAppel(dataDir, { api: 'Airtable', succes: result.ok, codeErreur: result.ok ? undefined : result.message });
    const status = libelleStatutConfigurationAirtable(result);
    sendJson(res, 200, { ok: result.ok, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    enregistrerAppel(dataDir, { api: 'Airtable', succes: false, codeErreur: message });
    sendJson(res, 200, { ok: false, status: `Erreur avec AirTable : ${message}` });
  }
}
