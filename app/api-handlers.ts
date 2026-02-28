/**
 * Handlers API pour paramétrage compte email (US-1.1) et configuration Airtable (US-1.3).
 * Reçoivent les ports (ex. ConnecteurEmail) par injection — pas d'import des implémentations.
 */
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
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
import { runCreation, type ResultatTraitement } from '../scripts/run-traitement.js';
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
import type {
  ConnecteurEmail,
  EnvoyeurEmailIdentification,
  OptionsImap,
  ParametresEmailIdentification,
} from '../types/compte.js';
import { maskEmail } from '../utils/mask-email.js';
import { chargerEnvLocal } from '../utils/load-env-local.js';
import {
  lireParametres,
  lireEmailIdentificationDejaEnvoye,
  marquerEmailIdentificationEnvoye,
} from '../utils/parametres-io.js';
import { envoyerEmailIdentification } from '../utils/envoi-email-identification.js';
import {
  createEnvoyeurIdentificationValTown,
} from '../utils/envoi-identification-airtable.js';
import { createLecteurEmailsMock } from '../utils/lecteur-emails-mock.js';
import type { SourceEmail, TypeSource } from '../utils/gouvernance-sources-emails.js';
import {
  produireTableauSynthese,
  calculerTotauxTableauSynthese,
  mergeCacheDansLignes,
  enrichirCacheAImporterListeHtml,
} from '../utils/tableau-synthese-offres.js';
import { compterFichiersHtmlEnAttente } from '../utils/lire-fichiers-html-en-attente.js';
import { toFullPathListeHtml } from '../utils/liste-html-paths.js';
import type { LigneTableauSynthese } from '../utils/tableau-synthese-offres.js';
import { decrementAImporter, getDernierAudit, setDernierAudit } from '../utils/cache-audit-ram.js';
import { createAirtableReleveDriver } from '../utils/airtable-releve-driver.js';
import {
  createSourcesV2Driver,
  sourceEntriesToLegacyLignes,
  getCheminListeHtmlPourSource,
  SOURCES_NOMS_CANONIQUES,
  type SourceEntry,
} from '../utils/sources-v2.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { controlOffresSchema, nomReelChamp, type ResultatControleSchemaOffres } from '../utils/airtable-schema-control.js';
import { initOffresRepository, type OffresRepository, type OffreRow } from '../utils/repository-offres-sqlite.js';
import { initVuesOffresRepository, type VuesOffresRepository } from '../utils/repository-vues-offres-sqlite.js';

/** US-7.7 : cache du repository offres par dataDir (une instance par répertoire). */
const offresRepositoryByDataDir = new Map<string, OffresRepository>();

/** Retourne le repository offres pour dataDir (initialise si besoin). */
export function getOffresRepository(dataDir: string): OffresRepository {
  const key = dataDir || join(process.cwd(), 'data');
  let repo = offresRepositoryByDataDir.get(key);
  if (!repo) {
    repo = initOffresRepository(join(key, 'offres.sqlite'));
    offresRepositoryByDataDir.set(key, repo);
  }
  return repo;
}

/** US-7.7 : vide le cache des repositories (pour tests, libère les handles avant suppression du répertoire). */
export function clearOffresRepositoryCache(): void {
  for (const repo of offresRepositoryByDataDir.values()) {
    repo.close();
  }
  offresRepositoryByDataDir.clear();
}

/** US-7.9 : cache du repository vues offres par dataDir (même base que offres). */
const vuesOffresRepositoryByDataDir = new Map<string, VuesOffresRepository>();

/** Retourne le repository vues offres pour dataDir (initialise si besoin, même dbPath que offres). */
export function getVuesOffresRepository(dataDir: string): VuesOffresRepository {
  const key = dataDir || join(process.cwd(), 'data');
  let repo = vuesOffresRepositoryByDataDir.get(key);
  if (!repo) {
    repo = initVuesOffresRepository(join(key, 'offres.sqlite'));
    vuesOffresRepositoryByDataDir.set(key, repo);
  }
  return repo;
}

/** US-7.9 : vide le cache vues offres (pour tests). */
export function clearVuesOffresRepositoryCache(): void {
  for (const repo of vuesOffresRepositoryByDataDir.values()) {
    repo.close();
  }
  vuesOffresRepositoryByDataDir.clear();
}
import { createSourceRegistry } from '../utils/source-plugins.js';
import { STATUTS_OFFRES_AIRTABLE, STATUTS_OFFRES_AVEC_AUTRE } from '../utils/statuts-offres-airtable.js';
import {
  recupererTexteOffreTest,
  createOffreTestDriverAirtable,
} from '../utils/offre-test.js';
import { appelerMistral, type ResultatAppelIA } from '../utils/appeler-mistral.js';
import { parseJsonReponseIA, validerConformiteJsonIA } from '../utils/parse-json-reponse-ia.js';
import { construirePromptComplet, construireMessageUserAnalyse } from '../utils/prompt-ia.js';
import { lireMistral } from '../utils/parametres-mistral.js';
import {
  agregerConsommationParJourEtApi,
  agregerConsommationParJourEtIntention,
  enregistrerAppel,
} from '../utils/log-appels-api.js';
import {
  INTENTION_TABLEAU_SYNTHESE,
  INTENTION_OFFRE_TEST,
  INTENTION_TEST_MISTRAL,
  INTENTION_CONFIG_AIRTABLE,
} from '../utils/intentions-appels-api.js';

/** Store BDD : tableau synthèse offres pour tests (US-1.7). */
let bddMockTableauSyntheseStore: LigneTableauSynthese[] | null = null;

/** Store BDD : offre test pour Configuration API IA (US-8.1). null = utiliser source réelle. */
let bddMockOffreTestStore: { hasOffre: boolean; texte?: string } | null = null;

/** BDD : définir la réponse mock de GET /api/offre-test (null = comportement réel). */
export function setBddMockOffreTest(offre: { hasOffre: boolean; texte?: string } | null): void {
  bddMockOffreTestStore = offre;
}

/** Store BDD : réponse mock de POST /api/test-mistral (null = appel API réel). */
let bddMockTestMistralStore: ResultatAppelIA | null = null;

/** BDD : définir la réponse mock de POST /api/test-mistral (null = comportement réel). */
export function setBddMockTestMistral(resultat: ResultatAppelIA | null): void {
  bddMockTestMistralStore = resultat;
}

/** BDD : définir les lignes du tableau synthèse offres (null = utiliser produireTableauSynthese). */
export function setBddMockTableauSynthese(lignes: LigneTableauSynthese[] | null | unknown): void {
  bddMockTableauSyntheseStore = Array.isArray(lignes) ? (lignes as LigneTableauSynthese[]) : null;
}

/** BDD (US-3.15) : spy des emails d'identification envoyés. Vidé au reset-compte. */
const bddEmailsIdentificationEnvoyes: ParametresEmailIdentification[] = [];
/** BDD : si true, le port spy simule un échec d'envoi. */
let bddEnvoyeurIdentificationDoFail = false;

const spyEnvoyeurIdentification: EnvoyeurEmailIdentification = {
  envoyer: async (params: ParametresEmailIdentification) => {
    if (bddEnvoyeurIdentificationDoFail) {
      return { ok: false, message: 'mock failure' };
    }
    bddEmailsIdentificationEnvoyes.push(params);
    return { ok: true };
  },
};

/** Port d'envoi identification : BDD → spy ; sinon toujours Val.town (URL en dur, pas de config). */
export function getEnvoyeurIdentificationPort(): EnvoyeurEmailIdentification {
  if (process.env.BDD_IN_MEMORY_STORE === '1') return spyEnvoyeurIdentification;
  return createEnvoyeurIdentificationValTown();
}

/** BDD : vide la liste des emails enregistrés (appelé au reset-compte). */
export function clearBddEmailsIdentificationEnvoyes(): void {
  bddEmailsIdentificationEnvoyes.length = 0;
}

/** BDD : fait échouer le prochain envoi (scénario échec non bloquant). */
export function setBddMockEnvoyeurIdentificationFail(fail: boolean): void {
  bddEnvoyeurIdentificationDoFail = fail;
}

/** GET /api/test/emails-identification : retourne la liste des emails envoyés (spy BDD). */
export function handleGetEmailsIdentification(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(bddEmailsIdentificationEnvoyes));
}

/** POST /api/test/set-mock-cache-audit : définit le cache RAM du dernier audit (US-3.3 BDD). Body: { entries?: Array<{ emailExpéditeur: string; "A importer"?: string | number }> }. */
export function handlePostSetMockCacheAudit(
  body: Record<string, unknown>,
  res: ServerResponse
): void {
  const entries = Array.isArray(body?.entries) ? body.entries : [];
  const record: Record<string, number> = {};
  for (const row of entries) {
    const r = row as Record<string, unknown>;
    const email = typeof r?.emailExpéditeur === 'string' ? r.emailExpéditeur.trim() : '';
    if (!email) continue;
    const aImporter = r?.['A importer'];
    const n = typeof aImporter === 'number' ? aImporter : parseInt(String(aImporter ?? '0'), 10);
    record[email] = Number.isFinite(n) ? n : 0;
  }
  setDernierAudit(record);
  sendJson(res, 200, { ok: true });
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
export function setBddMockSources(sources: Array<{
  emailExpéditeur: string;
  source: SourceEmail['source'];
  type?: TypeSource;
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
}>): void {
  bddMockSourcesStore.length = 0;
  for (const s of sources) {
    bddMockSourcesStore.push({
      emailExpéditeur: s.emailExpéditeur.trim().toLowerCase(),
      source: s.source,
      type: s.type ?? 'email',
      activerCreation: s.activerCreation,
      activerEnrichissement: s.activerEnrichissement,
      activerAnalyseIA: s.activerAnalyseIA,
      sourceId: `rec_${randomUUID().slice(0, 14)}`,
    });
  }
}

/** BDD (US-4.6) : définir les offres mock pour enrichissement. Chaque offre doit avoir un emailExpéditeur correspondant à une source déjà dans bddMockSourcesStore. */
export function setBddMockOffres(
  offres: Array<{ idOffre: string; url: string; dateAjout: string; statut: string; emailExpéditeur: string }>
): void {
  bddMockOffresStore.length = 0;
  for (const o of offres) {
    const email = o.emailExpéditeur.trim().toLowerCase();
    const source = bddMockSourcesStore.find((s) => s.emailExpéditeur === email);
    if (source) {
      bddMockOffresStore.push({
        idOffre: o.idOffre,
        url: o.url,
        dateAjout: o.dateAjout,
        statut: o.statut,
        sourceId: source.sourceId,
      });
    }
  }
}

/** BDD (US-3.1) : retourne les offres à récupérer (statut Annonce à récupérer, source avec activerEnrichissement true). */
export function getBddMockOffresARecuperer(): Array<{ id: string; url: string; statut: string; emailExpéditeur: string }> {
  const offres = bddMockOffresStore as Array<{ idOffre: string; url: string; statut: string; sourceId: string }>;
  return offres
    .filter((o) => {
      const source = bddMockSourcesStore.find((s) => s.sourceId === o.sourceId);
      return source?.activerEnrichissement === true && (o.statut || '').trim() === 'Annonce à récupérer';
    })
    .map((o) => {
      const source = bddMockSourcesStore.find((s) => s.sourceId === o.sourceId);
      return { id: o.idOffre, url: o.url, statut: o.statut, emailExpéditeur: source?.emailExpéditeur ?? '' };
    });
}

/** BDD (US-3.1) : retourne les offres à analyser (statut À analyser, source avec activerAnalyseIA true). */
export function getBddMockOffresAAnalyser(): Array<{ id: string; poste?: string; ville?: string; texteOffre?: string }> {
  const offres = bddMockOffresStore as Array<{ idOffre: string; sourceId: string; statut: string }>;
  return offres
    .filter((o) => {
      const source = bddMockSourcesStore.find((s) => s.sourceId === o.sourceId);
      return source?.activerAnalyseIA === true && (o.statut || '').trim() === 'À analyser';
    })
    .map((o) => ({ id: o.idOffre }));
}

function createBddMockDriverReleve(): {
  listerSources: () => Promise<SourceRuntime[]>;
  creerSource: (source: SourceEmail) => Promise<SourceRuntime>;
  mettreAJourSource: (sourceId: string, patch: Partial<Pick<SourceEmail, 'source' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'>>) => Promise<void>;
  creerOffres: (offres: Array<{ idOffre: string; url: string; dateAjout: string; statut: string }>, sourceId: string) => Promise<{ nbCreees: number; nbDejaPresentes: number }>;
  getSourceLinkedIn: () => Promise<{ found: false } | { found: true; activerCreation: boolean; emailExpéditeur: string; sourceId: string }>;
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
    async mettreAJourSource(sourceId: string, patch: Partial<Pick<SourceEmail, 'source' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'>>) {
      const i = bddMockSourcesStore.findIndex((s) => s.sourceId === sourceId);
      if (i >= 0) {
        if (patch.source) bddMockSourcesStore[i].source = patch.source;
        if (patch.type !== undefined) bddMockSourcesStore[i].type = patch.type;
        if (typeof patch.activerCreation === 'boolean') bddMockSourcesStore[i].activerCreation = patch.activerCreation;
        if (typeof patch.activerEnrichissement === 'boolean') bddMockSourcesStore[i].activerEnrichissement = patch.activerEnrichissement;
        if (typeof patch.activerAnalyseIA === 'boolean') bddMockSourcesStore[i].activerAnalyseIA = patch.activerAnalyseIA;
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
      const linkedin = bddMockSourcesStore.find((s) => s.source === 'Linkedin');
      if (!linkedin) return { found: false };
      return { found: true, activerCreation: linkedin.activerCreation, emailExpéditeur: linkedin.emailExpéditeur, sourceId: linkedin.sourceId };
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

/** Noms canoniques (code d'initialisation airtable-driver-reel). Requête normale sans appel API Meta. */
const OFFRES_CHAMP_SOURCE_CANONIQUE = 'source';
const OFFRES_CHAMP_STATUT_CANONIQUE = 'Statut';

/** Offres Airtable : par champ source (sélecteur). Noms de champs passés en paramètre (canoniques ou issus d'audit). */
async function listerOffresPourTableau(options: {
  apiKey: string;
  baseId: string;
  offresId: string;
  sourceNomVersEmail: Map<string, string>;
  sourceFieldName: string;
  statutFieldName: string;
}): Promise<Array<{ emailExpéditeur: string; statut: string }>> {
  const { apiKey, baseId, offresId, sourceNomVersEmail, sourceFieldName, statutFieldName } = options;
  const offres: Array<{ emailExpéditeur: string; statut: string }> = [];
  const fieldsParam = `fields%5B%5D=${encodeURIComponent(sourceFieldName)}&fields%5B%5D=${encodeURIComponent(statutFieldName)}`;
  let offset = '';
  do {
    const url = `${AIRTABLE_API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(
      offresId
    )}?${fieldsParam}&pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
    if (!offset) console.error('[tableau-synthese] GET Airtable: %s/%s (champs: %s, %s)', baseId, offresId, sourceFieldName, statutFieldName);
    const res = await fetch(url, { method: 'GET', headers: airtableHeaders(apiKey) });
    if (!offset) console.error('[tableau-synthese] Airtable réponse: status=%d', res.status);
    if (!res.ok) {
      const detail = await res.text();
      if (!offset) console.error('[tableau-synthese] Airtable corps (brut): %s', detail.slice(0, 500));
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
    if (!offset && records.length > 0) console.error('[tableau-synthese] Airtable 1er enregistrement (brut): %s', JSON.stringify(records[0]).slice(0, 300));
    for (const rec of records) {
      const fields = rec.fields ?? {};
      const statut = typeof fields[statutFieldName] === 'string' ? (fields[statutFieldName] as string).trim() : '';
      if (!statut) continue;
      const sourceNomBrut = typeof fields[sourceFieldName] === 'string' ? (fields[sourceFieldName] as string).trim() : '';
      const sourceCanonique = sourceNomBrut ? normaliserSourceNomValue(sourceNomBrut) : '';
      let cle = sourceCanonique ? sourceNomVersEmail.get(sourceCanonique) : '';
      if (!cle && sourceNomBrut) cle = sourceNomVersEmail.get('Inconnu') ?? '';
      if (cle) offres.push({ emailExpéditeur: cle, statut });
    }
    offset = json.offset ?? '';
  } while (offset);
  return offres;
}

/** US-7.7 : liste les offres depuis le repository SQLite au format attendu par produireTableauSynthese (emailExpéditeur, statut). */
export function listerOffresPourTableauDepuisSqlite(
  repository: OffresRepository,
  sourceNomVersEmail: Map<string, string>
): Array<{ emailExpéditeur: string; statut: string }> {
  const all = repository.getAll();
  const offres: Array<{ emailExpéditeur: string; statut: string }> = [];
  for (const row of all) {
    const statut = typeof row.Statut === 'string' ? row.Statut.trim() : '';
    if (!statut) continue;
    const sourceNomBrut = typeof row.source === 'string' ? row.source.trim() : '';
    const sourceCanonique = sourceNomBrut ? normaliserSourceNomValue(sourceNomBrut) : '';
    const cle = sourceCanonique ? sourceNomVersEmail.get(sourceCanonique) : '';
    const emailExpéditeur = cle || (sourceNomBrut ? sourceNomVersEmail.get('Inconnu') ?? '' : '');
    if (emailExpéditeur) offres.push({ emailExpéditeur, statut });
  }
  return offres;
}

const MEILLEURE_OFFRE_FIELDS =
  'fields%5B%5D=Score_Total&fields%5B%5D=Poste&fields%5B%5D=Entreprise' +
  '&fields%5B%5D=ScoreLocalisation&fields%5B%5D=ScoreSalaire&fields%5B%5D=ScoreCulture&fields%5B%5D=ScoreQualiteOffre' +
  '&fields%5B%5D=ScoreCritère1&fields%5B%5D=ScoreCritère2&fields%5B%5D=ScoreCritère3&fields%5B%5D=ScoreCritère4';

function scoresFromFields(fields: Record<string, unknown>): Record<string, number> {
  const score = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(10, Math.round(v))) : 0;
  return {
    ScoreLocalisation: score(fields.ScoreLocalisation),
    ScoreSalaire: score(fields.ScoreSalaire),
    ScoreCulture: score(fields.ScoreCulture),
    ScoreQualitéOffre: score(fields.ScoreQualiteOffre ?? fields.ScoreQualitéOffre),
    ScoreCritère1: score(fields.ScoreCritère1),
    ScoreCritère2: score(fields.ScoreCritère2),
    ScoreCritère3: score(fields.ScoreCritère3),
    ScoreCritère4: score(fields.ScoreCritère4),
  };
}

/** Récupère l'offre avec le plus haut Score_Total (pour zone test Formule du score total). */
async function getMeilleureOffreAirtable(options: {
  apiKey: string;
  baseId: string;
  offresId: string;
}): Promise<{
  id: string;
  poste?: string;
  entreprise?: string;
  scoreTotal: number;
  url: string;
  scores: Record<string, number>;
} | null> {
  const { apiKey, baseId, offresId } = options;
  let best: {
    id: string;
    poste?: string;
    entreprise?: string;
    scoreTotal: number;
    url: string;
    scores: Record<string, number>;
  } | null = null;
  let offset = '';
  do {
    const url = `${AIRTABLE_API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(
      offresId
    )}?${MEILLEURE_OFFRE_FIELDS}&pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers: airtableHeaders(apiKey) });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      records?: Array<{ id: string; fields?: Record<string, unknown> }>;
      offset?: string;
    };
    const records = json.records ?? [];
    for (const rec of records) {
      const fields = rec.fields ?? {};
      const scoreTotal =
        typeof fields.Score_Total === 'number' && Number.isFinite(fields.Score_Total)
          ? Math.round(fields.Score_Total)
          : typeof fields.Score_Total === 'string'
            ? parseInt(fields.Score_Total, 10)
            : NaN;
      if (Number.isNaN(scoreTotal) || (best !== null && scoreTotal <= best.scoreTotal)) continue;
      const poste = typeof fields.Poste === 'string' ? fields.Poste.trim() : undefined;
      const entreprise = typeof fields.Entreprise === 'string' ? fields.Entreprise.trim() : undefined;
      const recordUrl = `https://airtable.com/${baseId}/${offresId}/${rec.id}`;
      best = {
        id: rec.id,
        poste,
        entreprise,
        scoreTotal,
        url: recordUrl,
        scores: scoresFromFields(fields),
      };
    }
    offset = json.offset ?? '';
  } while (offset);
  return best;
}

/** GET /api/meilleure-offre : offre avec le meilleur Score_Total (zone test Formule du score total). */
export async function handleGetMeilleureOffre(dataDir: string, res: ServerResponse): Promise<void> {
  const airtable = lireAirTable(dataDir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.offres?.trim()) {
    sendJson(res, 200, { ok: false, message: 'Configuration Airtable manquante.' });
    return;
  }
  const baseId = normaliserBaseId(airtable.base.trim());
  try {
    const offre = await getMeilleureOffreAirtable({
      apiKey: airtable.apiKey.trim(),
      baseId,
      offresId: airtable.offres.trim(),
    });
    if (!offre) {
      sendJson(res, 200, { ok: false, message: 'Aucune offre avec score trouvée.' });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      offre: {
        poste: offre.poste,
        entreprise: offre.entreprise,
        scoreTotal: offre.scoreTotal,
        url: offre.url,
        scores: offre.scores,
      },
    });
  } catch (err) {
    console.error('GET /api/meilleure-offre error', err);
    sendJson(res, 500, { ok: false, message: String(err) });
  }
}

/** US Statistiques scores : bornes des 10 colonnes de l'histogramme (score arrondi). Colonne 1: 0.1-1.4, 2: 1.5-2.4, …, 10: ≥ 9.5. */
const HISTOGRAMME_SCORES_BUCKETS: Array<{ label: string; min: number; max: number }> = [
  { label: '0 - 1,4', min: 0, max: 1.4 },
  { label: '1,5 - 2,4', min: 1.5, max: 2.4 },
  { label: '2,5 - 3,4', min: 2.5, max: 3.4 },
  { label: '3,5 - 4,4', min: 3.5, max: 4.4 },
  { label: '4,5 - 5,4', min: 4.5, max: 5.4 },
  { label: '5,5 - 6,4', min: 5.5, max: 6.4 },
  { label: '6,5 - 7,4', min: 6.5, max: 7.4 },
  { label: '7,5 - 8,4', min: 7.5, max: 8.4 },
  { label: '8,5 - 9,4', min: 8.5, max: 9.4 },
  { label: '≥ 9,5', min: 9.5, max: Infinity },
];

/** Liste les offres avec Score_Total et Statut pour l'histogramme (population : Score_Total != 0 ou Statut = Expiré). */
async function listerOffresPourHistogrammeScores(options: {
  apiKey: string;
  baseId: string;
  offresId: string;
}): Promise<Array<{ scoreTotal: number; statut: string }>> {
  const { apiKey, baseId, offresId } = options;
  const fieldsParam = 'fields%5B%5D=Score_Total&fields%5B%5D=Statut';
  const out: Array<{ scoreTotal: number; statut: string }> = [];
  let offset = '';
  const STATUT_EXPIRE = 'Expiré';
  do {
    const url = `${AIRTABLE_API_BASE}/${encodeURIComponent(baseId)}/${encodeURIComponent(
      offresId
    )}?${fieldsParam}&pageSize=100${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
    const res = await fetch(url, { method: 'GET', headers: airtableHeaders(apiKey) });
    if (!res.ok) throw new Error(`Airtable Offres list: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as {
      records?: Array<{ fields?: Record<string, unknown> }>;
      offset?: string;
    };
    for (const rec of json.records ?? []) {
      const fields = rec.fields ?? {};
      const statut = typeof fields.Statut === 'string' ? fields.Statut.trim() : '';
      let scoreTotal: number;
      if (typeof fields.Score_Total === 'number' && Number.isFinite(fields.Score_Total)) {
        scoreTotal = fields.Score_Total;
      } else if (typeof fields.Score_Total === 'string') {
        scoreTotal = parseFloat(fields.Score_Total) || 0;
      } else {
        scoreTotal = 0;
      }
      const inclus = (scoreTotal !== 0 && scoreTotal != null) || statut === STATUT_EXPIRE;
      if (inclus) out.push({ scoreTotal, statut });
    }
    offset = json.offset ?? '';
  } while (offset);
  return out;
}

const STATUT_EXPIRE_HISTO = 'Expiré';

/** US-7.7 : liste les offres depuis le repository SQLite pour l'histogramme (population : Score_Total != 0 ou Statut = Expiré). */
export function listerOffresPourHistogrammeScoresDepuisSqlite(
  repository: OffresRepository
): Array<{ scoreTotal: number; statut: string }> {
  const all = repository.getAll();
  const out: Array<{ scoreTotal: number; statut: string }> = [];
  for (const row of all) {
    const statut = typeof row.Statut === 'string' ? row.Statut.trim() : '';
    let scoreTotal: number;
    const st = row.Score_Total;
    if (typeof st === 'number' && Number.isFinite(st)) {
      scoreTotal = st;
    } else if (typeof st === 'string') {
      scoreTotal = parseFloat(st) || 0;
    } else {
      scoreTotal = 0;
    }
    const inclus = (scoreTotal !== 0 && scoreTotal != null) || statut === STATUT_EXPIRE_HISTO;
    if (inclus) out.push({ scoreTotal, statut });
  }
  return out;
}

/** GET /api/histogramme-scores-offres : histogramme des scores (US Statistiques). Population : Score_Total != 0 ou Statut = Expiré. US-7.7 : lecture depuis SQLite. */
export async function handleGetHistogrammeScoresOffres(dataDir: string, res: ServerResponse): Promise<void> {
  try {
    const repository = getOffresRepository(dataDir);
    const offres = listerOffresPourHistogrammeScoresDepuisSqlite(repository);
    const counts = HISTOGRAMME_SCORES_BUCKETS.map(() => 0);
    for (const o of offres) {
      const s = o.scoreTotal;
      const i = HISTOGRAMME_SCORES_BUCKETS.findIndex((b) => s >= b.min && s <= b.max);
      if (i >= 0) counts[i] += 1;
    }
    const buckets = HISTOGRAMME_SCORES_BUCKETS.map((b, i) => ({
      label: b.label,
      min: b.min,
      max: b.max === Infinity ? 9.5 : b.max,
      count: counts[i],
    }));
    sendJson(res, 200, {
      ok: true,
      buckets,
      total: offres.length,
    });
  } catch (err) {
    console.error('GET /api/histogramme-scores-offres error', err);
    sendJson(res, 500, { ok: false, message: String(err), buckets: [], total: 0 });
  }
}

/** Libellés par défaut pour critères rédhibitoires et scores (colonnes grid page Offres). */
const REHIBITOIRES_DEFAULT = ['Critère réhib. 1', 'Critère réhib. 2', 'Critère réhib. 3', 'Critère réhib. 4'];
const SCORES_INCONTOURNABLES_DEFAULT = ['Localisation', 'Salaire', 'Culture', "Qualité d'offre"];
const SCORES_OPTIONNELS_DEFAULT = ['Score opt. 1', 'Score opt. 2', 'Score opt. 3', 'Score opt. 4'];

/** GET /api/parametrage-ia-libelles : libellés des colonnes Critères rédhib. et Scores (page Offres). */
export function handleGetParametrageIALibelles(dataDir: string, res: ServerResponse): void {
  try {
    const parametres = lireParametres(dataDir);
    const ia = parametres?.parametrageIA ?? null;
    const rehibitoires = [0, 1, 2, 3].map(
      (i) => (ia?.rehibitoires?.[i]?.titre?.trim() || REHIBITOIRES_DEFAULT[i])
    );
    /* Titres fixes (Localisation, Salaire, Culture, Qualité d'offre) comme en page Paramètres. */
    const scoresIncontournables = SCORES_INCONTOURNABLES_DEFAULT.slice();
    const scoresOptionnels = [0, 1, 2, 3].map(
      (i) =>
        (ia?.scoresOptionnels?.[i]?.titre?.trim() || SCORES_OPTIONNELS_DEFAULT[i])
    );
    sendJson(res, 200, {
      rehibitoires,
      scoresIncontournables,
      scoresOptionnels,
    });
  } catch (err) {
    console.error('GET /api/parametrage-ia-libelles error', err);
    sendJson(res, 200, {
      rehibitoires: REHIBITOIRES_DEFAULT,
      scoresIncontournables: SCORES_INCONTOURNABLES_DEFAULT,
      scoresOptionnels: SCORES_OPTIONNELS_DEFAULT,
    });
  }
}

/** GET /api/offres : liste toutes les offres (US-7.9). */
export function handleGetOffres(dataDir: string, res: ServerResponse): void {
  try {
    const repository = getOffresRepository(dataDir);
    const offres: OffreRow[] = repository.getAll();
    sendJson(res, 200, { offres }, { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error('GET /api/offres error', err);
    sendJson(res, 500, { offres: [], message: String(err) });
  }
}

/** GET /api/offres/vues : liste des vues sauvegardées (US-7.9 CA6). */
export function handleGetVuesOffres(dataDir: string, res: ServerResponse): void {
  try {
    const repo = getVuesOffresRepository(dataDir);
    const vues = repo.listAll();
    sendJson(res, 200, { vues }, { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error('GET /api/offres/vues error', err);
    sendJson(res, 500, { vues: [], message: String(err) });
  }
}

/** POST /api/offres/vues : crée une vue (body: { nom, parametrage }). */
export function handlePostVueOffres(
  dataDir: string,
  body: Record<string, unknown>,
  res: ServerResponse
): void {
  try {
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    const parametrage = body.parametrage != null ? body.parametrage : {};
    if (!nom) {
      sendJson(res, 400, { ok: false, message: 'nom requis' });
      return;
    }
    const repo = getVuesOffresRepository(dataDir);
    const id = repo.create(nom, parametrage as object);
    sendJson(res, 201, { id, nom }, { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error('POST /api/offres/vues error', err);
    sendJson(res, 500, { ok: false, message: String(err) });
  }
}

/** PATCH /api/offres/vues/:id : renomme une vue (body: { nom }). */
export function handlePatchVueOffres(
  dataDir: string,
  id: string,
  body: Record<string, unknown>,
  res: ServerResponse
): void {
  try {
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    if (!id || !nom) {
      sendJson(res, 400, { ok: false, message: 'id et nom requis' });
      return;
    }
    const repo = getVuesOffresRepository(dataDir);
    const vue = repo.getById(id);
    if (!vue) {
      sendJson(res, 404, { ok: false, message: 'Vue introuvable' });
      return;
    }
    repo.updateNom(id, nom);
    sendJson(res, 200, { ok: true }, { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error('PATCH /api/offres/vues error', err);
    sendJson(res, 500, { ok: false, message: String(err) });
  }
}

/** DELETE /api/offres/vues/:id (US-7.9 CA6). */
export function handleDeleteVueOffres(dataDir: string, id: string, res: ServerResponse): void {
  try {
    if (!id) {
      sendJson(res, 400, { ok: false, message: 'id requis' });
      return;
    }
    const repo = getVuesOffresRepository(dataDir);
    const vue = repo.getById(id);
    if (!vue) {
      sendJson(res, 404, { ok: false, message: 'Vue introuvable' });
      return;
    }
    repo.deleteById(id);
    sendJson(res, 200, { ok: true }, { 'Cache-Control': 'no-store' });
  } catch (err) {
    console.error('DELETE /api/offres/vues error', err);
    sendJson(res, 500, { ok: false, message: String(err) });
  }
}

/** BDD US-7.9 : insère une offre en SQLite pour « la base contient au moins une offre ». */
export function handlePostTestSeedOffreSqlite(
  dataDir: string,
  body: Record<string, unknown>,
  res: ServerResponse
): void {
  try {
    const repo = getOffresRepository(dataDir);
    const offre: Partial<OffreRow> = {
      source: typeof body.source === 'string' ? body.source : 'Test',
      Statut: typeof body.Statut === 'string' ? body.Statut : 'À traiter',
      URL: typeof body.URL === 'string' ? body.URL : 'https://example.com/offre-1',
      Poste: typeof body.Poste === 'string' ? body.Poste : 'Poste test',
      Entreprise: typeof body.Entreprise === 'string' ? body.Entreprise : 'Entreprise test',
    };
    repo.insert(offre);
    const all = repo.getAll();
    const inserted = all[all.length - 1];
    sendJson(res, 201, { id: inserted?.id ?? '', count: all.length });
  } catch (err) {
    console.error('POST /api/test/seed-offre-sqlite error', err);
    sendJson(res, 500, { ok: false, message: String(err) });
  }
}

/** BDD US-7.9 : vide la table offres SQLite pour « la base ne contient aucune offre ». */
export function handlePostTestClearOffresSqlite(dataDir: string, res: ServerResponse): void {
  try {
    const repo = getOffresRepository(dataDir);
    const all = repo.getAll();
    for (const row of all) {
      repo.deleteById(row.id);
    }
    sendJson(res, 200, { ok: true, cleared: all.length });
  } catch (err) {
    console.error('POST /api/test/clear-offres-sqlite error', err);
    sendJson(res, 500, { ok: false, message: String(err) });
  }
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
  sourceNom?: string;
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

/** État de la phase Création (relève emails → offres), lancée au démarrage des traitements. */
type CreationWorkerState = {
  running: boolean;
  lastResult?: ResultatTraitement;
  lastError?: string;
  currentProgress?: { index: number; total: number };
};
const creationWorkerState: CreationWorkerState = { running: false };

async function runOneEnrichissementBatch(dataDir: string): Promise<void> {
  if (!enrichissementWorker.running) return;
  try {
    enrichissementWorker.currentProgress = undefined;
    const result = await runEnrichissementBackground(dataDir, {
      shouldAbort: () => !enrichissementWorker.running,
      onProgress: (offre, index, total, sourceNom) => {
        if (!enrichissementWorker.running) return;
        enrichissementWorker.currentProgress = {
          index,
          total,
          recordId: offre.id,
          sourceNom,
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
      if ((result.nbEnrichies ?? 0) > 0) {
        runOneAnalyseIABatch(dataDir).catch(() => {});
      }
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

/** GET /api/consommation-api : agrégation par jour et par API (US-2.5), + par intention (US-3.4). */
export function handleGetConsommationApi(dataDir: string, res: ServerResponse): void {
  const parApi = agregerConsommationParJourEtApi(dataDir);
  const parIntention = agregerConsommationParJourEtIntention(dataDir);
  const data = { ...parApi, parIntention };
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

/** POST /api/tableau-synthese-offres/refresh : exécute l'audit, met à jour le cache "A importer" (setDernierAudit), puis le client recharge le tableau (US-3.3 CA2). */
export async function handlePostRefreshSyntheseOffres(dataDir: string, res: ServerResponse): Promise<void> {
  const useBddMock = process.env.BDD_MOCK_CONNECTEUR === '1';
  const compteBdd = useBddMock ? (lireCompte(dataDir) ?? { provider: 'imap' as const, adresseEmail: 'test@example.com', cheminDossier: 'inbox', cheminDossierArchive: '', imapHost: 'imap.example.com', imapPort: 993, imapSecure: true }) : null;
  const airtableBdd = useBddMock ? (lireAirTable(dataDir) ?? { apiKey: 'patTestKeyValide123', base: 'appXyz123', offres: 'tblOffresId' }) : null;
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
  const result = await runAuditSources(dataDir, { deps });
  if (!result.ok) {
    sendJson(res, 200, { ok: false, message: result.message });
    return;
  }
  if (result.synthese?.length) {
    const record: Record<string, number> = {};
    for (const row of result.synthese) {
      const email = (row.emailExpéditeur ?? '').trim().toLowerCase();
      if (email) record[email] = Number(row.nbEmails) || 0;
    }
    setDernierAudit(record);
  }
  sendJson(res, 200, { ok: true });
}

/** US-7.4 : PATCH/POST activation d'une phase pour une source. Body: { source: string, phase: 'creationEmail'|'creationListeHtml'|'enrichissement'|'analyse', activé: boolean }. Persiste dans sources.json via driver V2. */
export async function handlePatchSourceActivation(
  dataDir: string,
  body: Record<string, unknown>,
  res: ServerResponse
): Promise<void> {
  const source = String(body.source ?? '').trim();
  const phase = String(body.phase ?? '').trim();
  const activé = body.activé === true || body.activé === 'true';
  if (!source || !phase) {
    sendJson(res, 400, { ok: false, message: 'source et phase requis.' });
    return;
  }
  const nom = SOURCES_NOMS_CANONIQUES.includes(source as (typeof SOURCES_NOMS_CANONIQUES)[number])
    ? (source as (typeof SOURCES_NOMS_CANONIQUES)[number])
    : null;
  if (!nom) {
    sendJson(res, 400, { ok: false, message: 'source inconnue.' });
    return;
  }
  const driver = createSourcesV2Driver(dataDir);
  if (phase === 'creationEmail') {
    await driver.updateSource(nom, { creationEmail: { activé } });
  } else if (phase === 'creationListeHtml') {
    await driver.updateSource(nom, { creationListeHtml: { activé } });
  } else if (phase === 'enrichissement') {
    await driver.updateSource(nom, { enrichissement: { activé } });
  } else if (phase === 'analyse') {
    await driver.updateSource(nom, { analyse: { activé } });
  } else {
    sendJson(res, 400, { ok: false, message: 'phase invalide (creationEmail, creationListeHtml, enrichissement, analyse).' });
    return;
  }
  sendJson(res, 200, { ok: true });
}

/** GET /api/tableau-synthese-offres : tableau de synthèse par expéditeur et statut (US-1.7, US-1.13). Source : SQLite + sources V2 ; en tests, mock injecté via setBddMockTableauSynthese (POST /api/test/set-mock-tableau-synthese). */
export async function handleGetTableauSyntheseOffres(dataDir: string, res: ServerResponse): Promise<void> {
  let statutsOrdre: string[] = [...STATUTS_OFFRES_AVEC_AUTRE];
  if (bddMockTableauSyntheseStore !== null) {
    // Mock injecté par les tests BDD/unitaires (set-mock-tableau-synthese)
    let lignes = mergeCacheDansLignes(bddMockTableauSyntheseStore, getDernierAudit());
    lignes = enrichirPhasesImplementation(lignes);
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
  try {
    const offresRepository = getOffresRepository(dataDir);
    const sourcesDriverV2 = createSourcesV2Driver(dataDir);
    const entries: SourceEntry[] = await sourcesDriverV2.listSources();
    console.error('[tableau-synthese] Sources chargées: %d entrées', entries.length);
    const sourceNomVersEmail = new Map<string, string>();
    for (const e of entries) {
      const premier = e.creationEmail.emails[0]?.trim().toLowerCase();
      const cle = premier ?? getCheminListeHtmlPourSource(e.source);
      sourceNomVersEmail.set(e.source, cle);
    }
    const legacyLignes = sourceEntriesToLegacyLignes(entries);
    statutsOrdre = [...STATUTS_OFFRES_AVEC_AUTRE];

    const offres = listerOffresPourTableauDepuisSqlite(offresRepository, sourceNomVersEmail);
    const dbPath = join(dataDir || join(process.cwd(), 'data'), 'offres.sqlite');
    console.error('[tableau-synthese] Source SQLite: %s → %d offres', dbPath, offres.length);

    let lignes = await produireTableauSynthese({
      async listerSources() {
        return legacyLignes.map((s) => ({
          emailExpéditeur: s.emailExpéditeur,
          source: s.source,
          type: s.type,
          activerCreation: s.activerCreation,
          activerEnrichissement: s.activerEnrichissement,
          activerAnalyseIA: s.activerAnalyseIA,
        }));
      },
      async listerOffres() {
        return offres;
      },
    }, statutsOrdre);
    let cachePourMerge = getDernierAudit();
    try {
      const compterListeHtml = (adresse: string) =>
        compterFichiersHtmlEnAttente(toFullPathListeHtml(dataDir, adresse));
      cachePourMerge = await enrichirCacheAImporterListeHtml(cachePourMerge, legacyLignes, compterListeHtml);
    } catch {
      // Ne pas faire échouer le GET si l'enrichissement liste html échoue (ex. chemin invalide)
    }
    lignes = mergeCacheDansLignes(lignes, cachePourMerge);
    let lignesAgg = agregerLignesParSource(lignes, statutsOrdre);
    // US-7.4 : garantir une ligne par source (même sans offres) pour que le tableau ne soit jamais vide
    lignesAgg = completerLignesParSourceV2(entries, lignesAgg, statutsOrdre);
    for (const ligne of lignesAgg) {
      const entry = entries.find((e) => e.source === (ligne.sourceEtape2 || ligne.emailExpéditeur));
      if (entry) {
        ligne.creationEmailActivé = entry.creationEmail.activé;
        ligne.creationListeHtmlActivé = entry.creationListeHtml.activé;
        ligne.urlOfficielle = entry.urlOfficielle ?? '';
      }
    }
    lignes = lignesAgg;
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
    throw err;
  }
}

function normaliserSourceNomValue(value: string): SourceEmail['source'] {
  const v = (value ?? '').trim();
  if (v.toLowerCase() === 'linkedin') return 'Linkedin';
  if (v === 'APEC' || v === 'HelloWork' || v === 'Welcome to the Jungle' || v === 'Job That Make Sense' || v === 'Cadre Emploi' || v === 'Externatic' || v === 'Talent.io' || v === 'Inconnu') return v as SourceEmail['source'];
  return 'Inconnu';
}

/** US-7.4 : type étendu avec Email/Fichier à importer et activations création email/liste html par source. US-6.6 CA5 : urlOfficielle pour lien dans le tableau de bord. */
export type LigneTableauSyntheseV2 = LigneTableauSynthese & {
  emailÀImporter?: number;
  fichierÀImporter?: number;
  creationEmailActivé?: boolean;
  creationListeHtmlActivé?: boolean;
  /** US-6.6 CA5 : URL officielle de la source (lien cliquable dans le tableau). */
  urlOfficielle?: string;
};

/** US-7.4 : complète les lignes pour avoir exactement une ligne par source (entries V2). Les sources absentes de lignesAgg reçoivent une ligne à zéro. */
function completerLignesParSourceV2(
  entries: SourceEntry[],
  lignesAgg: LigneTableauSyntheseV2[],
  statutsOrdre: readonly string[]
): LigneTableauSyntheseV2[] {
  const bySource = new Map<string, LigneTableauSyntheseV2>();
  for (const l of lignesAgg) {
    const nom = l.sourceEtape2 || l.sourceEtape1 || l.emailExpéditeur;
    if (nom) bySource.set(nom, l);
  }
  const statutsVides: Record<string, number> = {};
  for (const s of statutsOrdre) statutsVides[s] = 0;
  for (const e of entries) {
    if (bySource.has(e.source)) continue;
    bySource.set(e.source, {
      emailExpéditeur: e.source,
      sourceEtape1: e.source,
      sourceEtape2: e.source,
      activerCreation: e.creationEmail.activé,
      activerEnrichissement: e.enrichissement.activé,
      activerAnalyseIA: e.analyse.activé,
      statuts: { ...statutsVides },
      aImporter: 0,
      emailÀImporter: 0,
      fichierÀImporter: 0,
      creationEmailActivé: e.creationEmail.activé,
      creationListeHtmlActivé: e.creationListeHtml.activé,
      urlOfficielle: e.urlOfficielle ?? '',
    });
  }
  const ordre = [...SOURCES_NOMS_CANONIQUES];
  const result = Array.from(bySource.values());
  result.sort((a, b) => {
    const i = ordre.indexOf(a.sourceEtape2 as (typeof ordre)[number]);
    const j = ordre.indexOf(b.sourceEtape2 as (typeof ordre)[number]);
    const ci = i >= 0 ? i : ordre.length;
    const cj = j >= 0 ? j : ordre.length;
    return ci - cj || (a.sourceEtape2 ?? '').localeCompare(b.sourceEtape2 ?? '');
  });
  return result;
}

/** US-7.3 / US-7.4 : agrège les lignes du tableau (une par email/path) en une ligne par source (nom canonique). */
function agregerLignesParSource(
  lignes: LigneTableauSynthese[],
  statutsOrdre: readonly string[]
): LigneTableauSyntheseV2[] {
  const bySource = new Map<string, LigneTableauSyntheseV2>();
  for (const ligne of lignes) {
    const nom = ligne.sourceEtape2 || ligne.sourceEtape1 || ligne.emailExpéditeur;
    const isEmail = (ligne.emailExpéditeur || '').includes('@');
    const aImp = ligne.aImporter ?? 0;
    const existante = bySource.get(nom);
    if (!existante) {
      bySource.set(nom, {
        emailExpéditeur: nom,
        sourceEtape1: ligne.sourceEtape1,
        sourceEtape2: ligne.sourceEtape2,
        typeSource: ligne.typeSource,
        activerCreation: ligne.activerCreation,
        activerEnrichissement: ligne.activerEnrichissement,
        activerAnalyseIA: ligne.activerAnalyseIA,
        statuts: { ...ligne.statuts },
        aImporter: aImp,
        emailÀImporter: isEmail ? aImp : 0,
        fichierÀImporter: isEmail ? 0 : aImp,
      });
      continue;
    }
    for (const s of statutsOrdre) {
      existante.statuts[s] = (existante.statuts[s] ?? 0) + (ligne.statuts[s] ?? 0);
    }
    existante.aImporter = (existante.aImporter ?? 0) + aImp;
    existante.emailÀImporter = (existante.emailÀImporter ?? 0) + (isEmail ? aImp : 0);
    existante.fichierÀImporter = (existante.fichierÀImporter ?? 0) + (isEmail ? 0 : aImp);
  }
  const ordre = [...SOURCES_NOMS_CANONIQUES];
  const result: LigneTableauSyntheseV2[] = Array.from(bySource.values());
  result.sort((a, b) => {
    const i = ordre.indexOf(a.sourceEtape2 as (typeof ordre)[number]);
    const j = ordre.indexOf(b.sourceEtape2 as (typeof ordre)[number]);
    const ci = i >= 0 ? i : ordre.length;
    const cj = j >= 0 ? j : ordre.length;
    return ci - cj || a.sourceEtape2.localeCompare(b.sourceEtape2);
  });
  return result;
}

function enrichirPhasesImplementation(
  lignes: LigneTableauSynthese[]
): Array<
  LigneTableauSynthese & {
    phase1Implemented: boolean;
    phase1EmailImplemented: boolean;
    phase1ListeHtmlImplemented: boolean;
    phase2Implemented: boolean;
    phase3Implemented: boolean;
  }
> {
  const registry = createSourceRegistry();
  return lignes.map((ligne) => {
    const sourceNomRaw = ligne.sourceEtape1 || ligne.sourceEtape2 || 'Inconnu';
    const sourceNom = normaliserSourceNomValue(sourceNomRaw);
    const typeSource = ligne.typeSource ?? (ligne.emailExpéditeur.includes('@') ? 'email' : 'liste html');
    const phase1EmailImpl = registry.hasCreationEmail(sourceNom);
    const phase1ListeHtmlImpl = registry.hasCreationListeHtml(sourceNom);
    const phase1Impl =
      typeSource === 'liste html' ? phase1ListeHtmlImpl : phase1EmailImpl;
    const phase2Impl = registry.hasEnrichissement(sourceNom);
    return {
      ...ligne,
      phase1Implemented: phase1Impl,
      phase1EmailImplemented: phase1EmailImpl,
      phase1ListeHtmlImplemented: phase1ListeHtmlImpl,
      phase2Implemented: phase2Impl,
      phase3Implemented: true,
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

/** GET /api/offre-test : texte d'une offre pour préremplir le champ test API IA (US-8.1). */
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
    const offre = await driver.getOffreTest?.();
    enregistrerAppel(dataDir, { api: 'Airtable', succes: true, intention: INTENTION_OFFRE_TEST });
    if (offre) {
      sendJson(res, 200, {
        hasOffre: true,
        texte: offre.texte,
        ...(offre.poste !== undefined && offre.poste !== '' && { poste: offre.poste }),
        ...(offre.entreprise !== undefined && offre.entreprise !== '' && { entreprise: offre.entreprise }),
        ...(offre.ville !== undefined && offre.ville !== '' && { ville: offre.ville }),
        ...(offre.salaire !== undefined && offre.salaire !== '' && { salaire: offre.salaire }),
        ...(offre.dateOffre !== undefined && offre.dateOffre !== '' && { dateOffre: offre.dateOffre }),
        ...(offre.departement !== undefined && offre.departement !== '' && { departement: offre.departement }),
      });
    } else {
      sendJson(res, 200, { hasOffre: false });
    }
  } catch (err) {
    enregistrerAppel(dataDir, { api: 'Airtable', succes: false, codeErreur: err instanceof Error ? err.message : String(err), intention: INTENTION_OFFRE_TEST });
    throw err;
  }
}

/** POST /api/test-mistral : envoie le prompt (système + texte offre) à l'API Mistral et retourne le résultat (US-8.1). Enregistre l'appel dans le log avec intention Mistral. */
export async function handlePostTestMistral(
  dataDir: string,
  body: Record<string, unknown>,
  res: ServerResponse
): Promise<void> {
  if (bddMockTestMistralStore !== null) {
    enregistrerAppel(dataDir, {
      api: 'Mistral',
      succes: bddMockTestMistralStore.ok,
      codeErreur: bddMockTestMistralStore.ok ? undefined : bddMockTestMistralStore.code,
      intention: INTENTION_TEST_MISTRAL,
    });
    sendJson(res, 200, bddMockTestMistralStore);
    return;
  }
  const mistral = lireMistral(dataDir);
  if (!mistral?.hasApiKey) {
    sendJson(res, 200, {
      ok: false,
      code: 'no_api_key',
      message: 'Clé API Mistral non configurée. Enregistrez une clé dans la section API IA.',
    });
    return;
  }
  const texteOffre = typeof body.texteOffre === 'string' ? body.texteOffre : '';
  const meta = body.metadata && typeof body.metadata === 'object' ? (body.metadata as Record<string, unknown>) : body;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);
  const metadonnees = {
    poste: str(meta.poste) ?? str(body.poste),
    entreprise: str(meta.entreprise) ?? str(body.entreprise),
    ville: str(meta.ville) ?? str(body.ville),
    salaire: str(meta.salaire) ?? str(body.salaire),
    dateOffre: str(meta.dateOffre) ?? str(body.dateOffre),
    departement: str(meta.departement) ?? str(body.departement),
  };
  const parametrageIA = lireParametres(dataDir)?.parametrageIA ?? null;
  const promptSystem = construirePromptComplet(dataDir, parametrageIA);
  const messageUser = construireMessageUserAnalyse(metadonnees, texteOffre);
  const result = await appelerMistral(dataDir, promptSystem, messageUser);
  enregistrerAppel(dataDir, {
    api: 'Mistral',
    succes: result.ok,
    codeErreur: result.ok ? undefined : result.code,
    intention: INTENTION_TEST_MISTRAL,
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
  const result = await runCreation(dataDir);
  if (result.ok) {
    await autoStartEnrichissementWorkerIfNeeded(dataDir);
  }
  sendJson(res, 200, result);
}

/** Démarre un traitement asynchrone et renvoie un taskId pour suivi de progression. */
export function handlePostTraitementStart(dataDir: string, res: ServerResponse): void {
  // US-3.15 : si consentement donné et pas encore envoyé, envoyer l'email d'identification (ex. vers Airtable) au moment du premier relevé
  void (async () => {
    const p = lireParametres(dataDir);
    const consentGiven = p?.connexionBoiteEmail?.consentementIdentification === true;
    if (!consentGiven || lireEmailIdentificationDejaEnvoye(dataDir)) return;
    const adresse = lireCompte(dataDir)?.adresseEmail?.trim();
    if (!adresse) return;
    const port = getEnvoyeurIdentificationPort();
    const result = await envoyerEmailIdentification(adresse, port);
    if (result.ok === true) marquerEmailIdentificationEnvoye(dataDir);
  })();

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
  const airtableBddT = useBddMockTraitement ? (lireAirTable(dataDir) ?? { apiKey: 'patTestKeyValide123', base: 'appXyz123', offres: 'tblOffresId' }) : null;
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

  void runCreation(dataDir, {
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
  const airtableBdd = useBddMock ? (lireAirTable(dataDir) ?? { apiKey: 'patTestKeyValide123', base: 'appXyz123', offres: 'tblOffresId' }) : null;
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
  const running =
    creationWorkerState.running || enrichissementWorker.running || analyseIAWorker.running;
  const payload = {
    ok: true,
    running,
    creation: {
      running: creationWorkerState.running,
      lastResult: creationWorkerState.lastResult,
      lastError: creationWorkerState.lastError,
      currentProgress: creationWorkerState.currentProgress,
    },
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

export function handlePostEnrichissementWorkerStart(dataDir: string, res: ServerResponse): void {
  if (!creationWorkerState.running) {
    creationWorkerState.running = true;
    creationWorkerState.lastError = undefined;
    creationWorkerState.lastResult = undefined;
    creationWorkerState.currentProgress = undefined;
    console.error('[Traitement] Création (phase 1) démarrée…');
    let enrichissementTriggered = false;
    void runCreation(dataDir, {
      onProgress: (message) => {
        if (!creationWorkerState.running) return;
        const m = /(\d+)\/(\d+)/.exec(message);
        if (m) {
          const num = parseInt(m[1], 10);
          const total = parseInt(m[2], 10);
          creationWorkerState.currentProgress = { index: Math.max(0, num - 1), total };
        }
      },
      onSourceProgress: (emailExpediteur, nbProcessed) => {
        decrementAImporter(emailExpediteur, nbProcessed);
        if (!enrichissementTriggered) {
          enrichissementTriggered = true;
          runOneEnrichissementBatch(dataDir).catch(() => {});
        }
      },
    })
      .then((result) => {
        creationWorkerState.running = false;
        creationWorkerState.lastResult = result;
        creationWorkerState.lastError = result.ok ? undefined : result.message;
        creationWorkerState.currentProgress = undefined;
        if (result.ok) {
          console.error('[Traitement] Création terminée:', result.nbOffresCreees ?? 0, 'créée(s)');
          void autoStartEnrichissementWorkerIfNeeded(dataDir);
        } else {
          console.error('[Traitement] Création échouée:', result.message);
        }
      })
      .catch((err) => {
        creationWorkerState.running = false;
        creationWorkerState.lastError = err instanceof Error ? err.message : String(err);
        creationWorkerState.currentProgress = undefined;
        console.error('[Traitement] Création erreur:', err instanceof Error ? err.message : String(err));
      });
  }
  startEnrichissementWorker(dataDir);
  startAnalyseIAWorker(dataDir);
  sendJson(res, 200, { ok: true, running: true });
}

export function handlePostEnrichissementWorkerStop(dataDir: string, res: ServerResponse): void {
  creationWorkerState.running = false;
  creationWorkerState.currentProgress = undefined;
  stopEnrichissementWorker();
  stopAnalyseIAWorker();
  sendJson(res, 200, { ok: true, running: false });
}

import type { OverridesConnecteur } from '../utils/connecteur-email-factory.js';

/** Factory injectée : (options IMAP, overrides?) => connecteur. */
export type GetConnecteurEmailFn = (
  imapOptions?: OptionsImap,
  overrides?: OverridesConnecteur
) => ConnecteurEmail;

/** Options pour envoi email consentement après test connexion réussi (US-3.15). */
export interface OptionsTestConnexionConsentement {
  dataDir: string;
  portEnvoiConsentement: EnvoyeurEmailIdentification;
}

/**
 * Si case cochée et pas encore envoyé : envoie l'email vers Airtable/Val.town.
 * Déclencheur : case cochée + Tester connexion (test réussi). La date (consentementEnvoyeLe) n'est écrite que si l'envoi réussit.
 * Si adresseEmail du body est vide ou masquée (***), utilise l'email stocké dans le compte (champ non prérempli côté client).
 */
async function envoyerConsentementSiDemande(
  body: Record<string, unknown>,
  adresseEmail: string,
  options: OptionsTestConnexionConsentement | undefined
): Promise<string | undefined> {
  if (!options) return undefined;
  let emailPourEnvoi = (adresseEmail ?? '').trim();
  if (!emailPourEnvoi || emailPourEnvoi.includes('***')) {
    const compte = lireCompte(options.dataDir);
    emailPourEnvoi = (compte?.adresseEmail ?? '').trim();
  }
  if (!emailPourEnvoi) return undefined;
  const consentement =
    body.consentementIdentification === true || body.consentementIdentification === 'true';
  if (!consentement) return undefined;
  if (lireEmailIdentificationDejaEnvoye(options.dataDir)) return undefined;
  const envoiResult = await envoyerEmailIdentification(emailPourEnvoi, options.portEnvoiConsentement);
  if (envoiResult.ok === true) {
    marquerEmailIdentificationEnvoye(options.dataDir);
    const url = 'openUrl' in envoiResult && typeof envoiResult.openUrl === 'string' ? envoiResult.openUrl : undefined;
    return url;
  }
  return undefined;
}

/**
 * Test de connexion : selon provider (IMAP / Microsoft / Gmail), valide et appelle le connecteur.
 * Déclencheur consentement : case cochée + Tester connexion. Si test OK et envoi Airtable/Val.town OK, enregistre consentementEnvoyeLe (US-3.15).
 */
export async function handlePostTestConnexion(
  getConnecteurEmailFn: GetConnecteurEmailFn,
  body: Record<string, unknown>,
  res: ServerResponse,
  optionsConsentement?: OptionsTestConnexionConsentement
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
      const openFormUrl = await envoyerConsentementSiDemande(body, adresseEmail, optionsConsentement);
      sendJson(res, 200, { ok: true, nbEmails: result.nbEmails, ...(openFormUrl && { openFormUrl }) });
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
    const openFormUrl = await envoyerConsentementSiDemande(body, adresseEmail, optionsConsentement);
    sendJson(res, 200, { ok: true, nbEmails: result.nbEmails, ...(openFormUrl && { openFormUrl }) });
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
  const consentementIdentification = body.consentementIdentification === true || body.consentementIdentification === 'true';
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
      consentementIdentification,
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
  async creerBaseEtTables(apiKey: string): Promise<{ baseId: string; offresId: string }> {
    const key = (apiKey || '').trim();
    if (key.length < 10 || /Invalid|invalide/i.test(key)) {
      throw new Error('Indication d\'erreur d\'authentification ou d\'API.');
    }
    if (/InvalidOrUnreachable|indisponible/i.test(key)) {
      throw new Error('Indication d\'erreur de connexion ou de service.');
    }
    return {
      baseId: 'appBddMock',
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
    enregistrerAppel(dataDir, { api: 'Airtable', succes: result.ok, codeErreur: result.ok ? undefined : result.message, intention: INTENTION_CONFIG_AIRTABLE });
    const status = libelleStatutConfigurationAirtable(result);
    sendJson(res, 200, { ok: result.ok, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    enregistrerAppel(dataDir, { api: 'Airtable', succes: false, codeErreur: message, intention: INTENTION_CONFIG_AIRTABLE });
    sendJson(res, 200, { ok: false, status: `Erreur avec AirTable : ${message}` });
  }
}
