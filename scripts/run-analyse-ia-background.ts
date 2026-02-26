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
import { construirePromptComplet, construireMessageUserAnalyse } from '../utils/prompt-ia.js';
import { appelerClaudeCode } from '../utils/appeler-claudecode.js';
import { enregistrerAppel } from '../utils/log-appels-api.js';
import { INTENTION_ANALYSE_IA_LOT } from '../utils/intentions-appels-api.js';
import { parseJsonReponseIA } from '../utils/parse-json-reponse-ia.js';
import { STATUT_A_TRAITER, type ChampsOffreAirtable, type OffreAAnalyser } from '../utils/enrichissement-offres.js';
import { jsonToChampsOffreAirtable } from '../utils/mapping-analyse-airtable.js';
import { calculerScoreTotal, mergeFormuleDuScoreTotal } from '../utils/formule-score-total.js';
import type { ScoresPourFormule } from '../utils/formule-score-total.js';

/** Appelle updateOffre ; en cas d'erreur, écrit l'erreur dans Résumé et retourne false (ne pas arrêter le batch). */
async function updateOffreOuRésuméErreur(
  driver: { updateOffre: (id: string, champs: ChampsOffreAirtable) => Promise<void> },
  recordId: string,
  champs: ChampsOffreAirtable,
  messages: string[]
): Promise<boolean> {
  try {
    await driver.updateOffre(recordId, champs);
    return true;
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
    return false;
  }
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
  const parametres = lireParametres(dir);
  const parametrageIA = parametres?.parametrageIA ?? null;
  const promptSystem = construirePromptComplet(dir, parametrageIA);
  const formuleParams = mergeFormuleDuScoreTotal(parametres?.formuleDuScoreTotal);
  const messages: string[] = [];
  let nbAnalysees = 0;
  let nbEchecs = 0;
  for (let i = 0; i < candidates.length; i++) {
    if (i >= 1 && options?.shouldAbort?.()) break;
    const offre = candidates[i];
    options?.onProgress?.(offre, i, candidates.length);
    const texteOffre = (offre.texteOffre ?? '').trim();
    const messageUser = construireMessageUserAnalyse(
      {
        poste: offre.poste,
        entreprise: offre.entreprise,
        ville: offre.ville,
        salaire: offre.salaire,
        dateOffre: offre.dateOffre,
        departement: offre.departement,
      },
      texteOffre
    );
    const result = await appelerClaudeCode(dir, promptSystem, messageUser);
    enregistrerAppel(dir, {
      api: 'Claude',
      succes: result.ok,
      codeErreur: result.ok ? undefined : result.code,
      intention: INTENTION_ANALYSE_IA_LOT,
    });
    let resume: string;
    if (result.ok) {
      const parsed = parseJsonReponseIA(result.texte);
      if (parsed.ok) {
        resume = typeof parsed.json.Résumé_IA === 'string' ? parsed.json.Résumé_IA.trim() : result.texte;
        const champs = jsonToChampsOffreAirtable(parsed.json, resume);
        const scores: ScoresPourFormule = {
          ScoreLocalisation: champs.ScoreLocalisation ?? 0,
          ScoreSalaire: champs.ScoreSalaire ?? 0,
          ScoreCulture: champs.ScoreCulture ?? 0,
          ScoreQualitéOffre: champs.ScoreQualiteOffre ?? 0,
          ScoreCritère1: champs.ScoreCritère1 ?? 0,
          ScoreCritère2: champs.ScoreCritère2 ?? 0,
          ScoreCritère3: champs.ScoreCritère3 ?? 0,
          ScoreCritère4: champs.ScoreCritère4 ?? 0,
        };
        champs.Score_Total = calculerScoreTotal(scores, formuleParams);
        const updated = await updateOffreOuRésuméErreur(driver, offre.id, champs, messages);
        if (updated) nbAnalysees += 1;
        else nbEchecs += 1;
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
