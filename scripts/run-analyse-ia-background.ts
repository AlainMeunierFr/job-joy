/**
 * Worker Analyse IA : offres « À analyser » → appel Claude → Résumé + statut « À traiter ».
 * En erreur API : Résumé = "⚠️ " + code, statut « À traiter ».
 */
import { join } from 'node:path';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { lireParametres } from '../utils/parametres-io.js';
import { lireClaudeCode } from '../utils/parametres-claudecode.js';
import { createAirtableEnrichissementDriver } from '../utils/airtable-enrichissement-driver.js';
import { getBaseSchema } from '../utils/airtable-ensure-enums.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { construirePromptComplet } from '../utils/prompt-ia.js';
import { appelerClaudeCode } from '../utils/appeler-claudecode.js';
import { enregistrerAppel } from '../utils/log-appels-api.js';
import { parseJsonReponseIA } from '../utils/parse-json-reponse-ia.js';
import type { ChampsOffreAirtable, OffreAAnalyser } from '../utils/enrichissement-offres.js';

const STATUT_A_TRAITER = 'À traiter';

/** Appelle updateOffre ; en cas d'erreur, écrit l'erreur dans Résumé puis lance pour arrêter le batch (éviter de griller des tokens). */
async function updateOffreOuRésuméErreur(
  driver: { updateOffre: (id: string, champs: ChampsOffreAirtable) => Promise<void> },
  recordId: string,
  champs: ChampsOffreAirtable,
  messages: string[]
): Promise<void> {
  try {
    await driver.updateOffre(recordId, champs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Analyse IA] updateOffre ${recordId} échoué:`, msg);
    messages.push(`${recordId}: ${msg}`);
    const resumeErreur = `⚠️ Erreur Airtable: ${msg.slice(0, 400)}`;
    try {
      await driver.updateOffre(recordId, { Résumé: resumeErreur });
    } catch {
      // ignorer si même l'écriture du Résumé échoue
    }
    throw err;
  }
}

/** Construit les champs Airtable à partir du JSON renvoyé par l'IA (Résumé déjà calculé). */
/** Mapping JSON IA → noms de colonnes Airtable (schéma airtable-driver-reel.ts). */
function jsonToChampsOffreAirtable(
  json: Record<string, unknown>,
  resume: string
): ChampsOffreAirtable {
  const champs: ChampsOffreAirtable = {
    Résumé: resume,
    Statut: STATUT_A_TRAITER,
  };
  const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  if (texte(json.Poste)) champs.Poste = texte(json.Poste);
  if (texte(json.Entreprise)) champs.Entreprise = texte(json.Entreprise);
  if (texte(json.Ville)) champs.Ville = texte(json.Ville);
  if (texte(json.Département)) champs.Département = texte(json.Département);
  if (texte(json.Salaire)) champs.Salaire = texte(json.Salaire);
  if (texte(json.Date_offre)) champs.DateOffre = texte(json.Date_offre);
  for (let i = 1; i <= 4; i++) {
    const v = json[`Réhibitoire${i}`];
    if (typeof v === 'boolean') (champs as Record<string, unknown>)[`CritèreRéhibitoire${i}`] = v;
  }
  const score = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 20 ? v : undefined);
  const sLoc = score(json.ScoreLocalisation); if (sLoc !== undefined) champs.ScoreLocalisation = sLoc;
  const sSal = score(json.ScoreSalaire); if (sSal !== undefined) champs.ScoreSalaire = sSal;
  const sCul = score(json.ScoreCulture); if (sCul !== undefined) champs.ScoreCulture = sCul;
  const sQual = score(json.ScoreQualitéOffre); if (sQual !== undefined) champs.ScoreQualiteOffre = sQual;
  for (let i = 1; i <= 4; i++) {
    const v = score(json[`ScoreOptionnel${i}`]);
    if (v !== undefined) (champs as Record<string, unknown>)[`ScoreCritère${i}`] = v;
  }
  return champs;
}

async function resolveSourcesId(
  apiKey: string,
  baseId: string,
  configSources: string | undefined
): Promise<string | undefined> {
  const trimmed = configSources?.trim();
  if (trimmed) return trimmed;
  const schema = await getBaseSchema(baseId, apiKey);
  const sourcesTable = schema.find((t) => (t.name ?? '').trim().toLowerCase() === 'sources');
  return sourcesTable?.id;
}

export type ResultatAnalyseIABackground =
  | { ok: true; nbAnalysees: number; nbEchecs: number; messages: string[]; nbCandidates: number }
  | { ok: false; message: string };

export type EtatAnalyseIABackground =
  | { ok: true; nbCandidates: number }
  | { ok: false; message: string };

export async function getAnalyseIABackgroundState(dataDir: string): Promise<EtatAnalyseIABackground> {
  const dir = dataDir || join(process.cwd(), 'data');
  const airtable = lireAirTable(dir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.offres?.trim()) {
    return { ok: false, message: 'Configuration Airtable incomplète (apiKey, base, offres).' };
  }
  const claudecode = lireClaudeCode(dir);
  if (!claudecode?.apiKey?.trim()) {
    return { ok: false, message: 'Clé API ClaudeCode non configurée.' };
  }
  const baseId = normaliserBaseId(airtable.base);
  const sourcesId = await resolveSourcesId(airtable.apiKey.trim(), baseId, airtable.sources);
  const driver = createAirtableEnrichissementDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId: airtable.offres,
    sourcesId,
  });
  if (!driver.getOffresAAnalyser) {
    return { ok: false, message: 'Driver sans getOffresAAnalyser.' };
  }
  const candidates = await driver.getOffresAAnalyser();
  return { ok: true, nbCandidates: candidates.length };
}

export type OptionsRunAnalyseIABackground = {
  onProgress?: (offre: OffreAAnalyser, index: number, total: number) => void;
  /** Si retourne true, la boucle s'arrête immédiatement (ex. bouton Arrêter le traitement). */
  shouldAbort?: () => boolean;
};

export async function runAnalyseIABackground(
  dataDir: string,
  options?: OptionsRunAnalyseIABackground
): Promise<ResultatAnalyseIABackground> {
  const dir = dataDir || join(process.cwd(), 'data');
  const airtable = lireAirTable(dir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.offres?.trim()) {
    return { ok: false, message: 'Configuration Airtable incomplète (apiKey, base, offres).' };
  }
  const claudecode = lireClaudeCode(dir);
  if (!claudecode?.apiKey?.trim()) {
    return { ok: false, message: 'Clé API ClaudeCode non configurée.' };
  }
  const baseId = normaliserBaseId(airtable.base);
  const sourcesId = await resolveSourcesId(airtable.apiKey.trim(), baseId, airtable.sources);
  const driver = createAirtableEnrichissementDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId: airtable.offres,
    sourcesId,
  });
  if (!driver.getOffresAAnalyser) {
    return { ok: false, message: 'Driver sans getOffresAAnalyser.' };
  }
  const candidates = await driver.getOffresAAnalyser();
  if (candidates.length === 0) {
    return { ok: true, nbCandidates: 0, nbAnalysees: 0, nbEchecs: 0, messages: [] };
  }
  const parametrageIA = lireParametres(dir)?.parametrageIA ?? null;
  const promptSystem = construirePromptComplet(dir, parametrageIA);
  const messages: string[] = [];
  let nbAnalysees = 0;
  let nbEchecs = 0;
  for (let i = 0; i < candidates.length; i++) {
    if (i >= 1 && options?.shouldAbort?.()) break;
    const offre = candidates[i];
    options?.onProgress?.(offre, i, candidates.length);
    const texteOffre = (offre.texteOffre ?? '').trim() || '(texte absent)';
    const messageUser = `Analyse cette offre et retourne le JSON demandé.\n\nContenu de l'offre :\n${texteOffre}`;
    const result = await appelerClaudeCode(dir, promptSystem, messageUser);
    enregistrerAppel(dir, {
      api: 'Claude',
      succes: result.ok,
      codeErreur: result.ok ? undefined : result.code,
    });
    let resume: string;
    if (result.ok) {
      const parsed = parseJsonReponseIA(result.texte);
      if (parsed.ok) {
        resume = typeof parsed.json.Résumé_IA === 'string' ? parsed.json.Résumé_IA.trim() : result.texte;
        nbAnalysees += 1;
        const champs = jsonToChampsOffreAirtable(parsed.json, resume);
        await updateOffreOuRésuméErreur(driver, offre.id, champs, messages);
      } else {
        const detailErreur = parsed.error.slice(0, 180);
        resume = `⚠️ invalid_json: ${detailErreur}`;
        nbEchecs += 1;
        messages.push(`${offre.id}: JSON invalide — ${parsed.error}`);
        await updateOffreOuRésuméErreur(driver, offre.id, { Résumé: resume, Statut: STATUT_A_TRAITER }, messages);
      }
    } else {
      resume = `⚠️ ${result.code ?? result.message ?? 'erreur'}`;
      nbEchecs += 1;
      messages.push(`${offre.id}: ${result.code} - ${result.message ?? ''}`);
      await updateOffreOuRésuméErreur(driver, offre.id, { Résumé: resume, Statut: STATUT_A_TRAITER }, messages);
    }
  }
  return {
    ok: true,
    nbCandidates: candidates.length,
    nbAnalysees,
    nbEchecs,
    messages,
  };
}
