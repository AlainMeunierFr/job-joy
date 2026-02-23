/**
 * Enrichissement des offres « Annonce à récupérer » (US-1.4 CA3).
 * Récupération du texte depuis l'URL, mise à jour des champs et du statut.
 */
import type { OffreARecuperer } from '../types/offres-releve.js';
import type { ResultatEnrichissement, ResultatEnrichissementOffre } from '../types/offres-releve.js';

export const STATUT_A_COMPLETER = 'A compléter';
export const STATUT_A_ANALYSER = 'À analyser';
export const STATUT_EXPIRE = 'Expiré';
export const STATUT_IGNORE = 'Ignoré';

/** Détecte un message d'échec indiquant une offre expirée/supprimée (ex. HelloWork 404/410 ou structure page introuvable). */
function indiqueOffreExpiree(message: string): boolean {
  const m = (message ?? '').toLowerCase();
  return (
    m.includes('404') ||
    m.includes('410') ||
    m.includes('expir') ||
    m.includes('gone') ||
    m.includes('agentiajsonoffre introuvable')
  );
}

/**
 * Champs Airtable pour une offre.
 * Noms exacts des colonnes tels que définis dans airtable-driver-reel.ts (création table Offres).
 */
export interface ChampsOffreAirtable {
  'Texte de l\'offre'?: string;
  Résumé?: string;
  Poste?: string;
  Entreprise?: string;
  Ville?: string;
  Département?: string;
  Salaire?: string;
  DateOffre?: string;
  Statut?: string;
  CritèreRéhibitoire1?: boolean;
  CritèreRéhibitoire2?: boolean;
  CritèreRéhibitoire3?: boolean;
  CritèreRéhibitoire4?: boolean;
  ScoreCritère1?: number;
  ScoreCritère2?: number;
  ScoreCritère3?: number;
  ScoreCritère4?: number;
  ScoreLocalisation?: number;
  ScoreSalaire?: number;
  ScoreCulture?: number;
  /** Nom exact Airtable (sans accent). */
  ScoreQualiteOffre?: number;
}

/** Offre en statut « À analyser » pour le worker Analyse IA (poste/ville pour libellé, texte pour prompt). */
export interface OffreAAnalyser {
  id: string;
  poste?: string;
  ville?: string;
  texteOffre?: string;
}

/** Port : lister les offres à récupérer et mettre à jour une offre. */
export interface EnrichissementOffresDriver {
  getOffresARecuperer(): Promise<OffreARecuperer[]>;
  /** Offres dont le statut est « À analyser » (pour worker Analyse IA). */
  getOffresAAnalyser?(): Promise<OffreAAnalyser[]>;
  updateOffre(recordId: string, champs: ChampsOffreAirtable): Promise<void>;
}

/** Port : récupérer le contenu exploitable d'une page d'offre depuis son URL. */
export interface FetcherContenuOffre {
  recupererContenuOffre(url: string): Promise<ResultatEnrichissementOffre>;
}

export interface OptionsEnrichissement {
  driver: EnrichissementOffresDriver;
  fetcher: FetcherContenuOffre;
  /** Appelé au début de chaque offre traitée (index 0-based, total = nombre d'offres). */
  onProgress?: (offre: OffreARecuperer, index: number, total: number) => void;
  /** Appelé à chaque changement de statut (pour mise à jour chirurgicale du tableau). */
  onTransition?: (offre: OffreARecuperer, statutAvant: string, statutApres: string) => void;
  /** Si retourne true, la boucle s'arrête immédiatement (ex. bouton Arrêter le traitement). */
  shouldAbort?: () => boolean;
}

type ChampsEnrichissement = {
  texteOffre?: string;
  poste?: string;
  entreprise?: string;
  ville?: string;
  département?: string;
  salaire?: string;
  dateOffre?: string;
};

function champsVides(champs: ChampsEnrichissement): boolean {
  if (!champs || typeof champs !== 'object') return true;
  return !(
    (champs.texteOffre && champs.texteOffre.trim()) ||
    (champs.poste && champs.poste.trim()) ||
    (champs.entreprise && champs.entreprise.trim()) ||
    (champs.ville && champs.ville.trim()) ||
    (champs.département && champs.département.trim()) ||
    (champs.salaire && champs.salaire.trim()) ||
    (champs.dateOffre && champs.dateOffre.trim())
  );
}

function donneesSuffisantesPourAnalyser(champs: ChampsEnrichissement): boolean {
  const texteOk = !!(champs.texteOffre && champs.texteOffre.trim());
  const metaOk = !!(
    (champs.poste && champs.poste.trim()) ||
    (champs.entreprise && champs.entreprise.trim()) ||
    (champs.ville && champs.ville.trim()) ||
    (champs.département && champs.département.trim()) ||
    (champs.salaire && champs.salaire.trim()) ||
    (champs.dateOffre && champs.dateOffre.trim())
  );
  return texteOk && metaOk;
}

/**
 * Exécute l'enrichissement : pour chaque offre « Annonce à récupérer », tente de récupérer le contenu
 * depuis l'URL ; en succès met à jour les champs et le statut « À analyser », sinon trace l'échec.
 */
export async function executerEnrichissementOffres(
  options: OptionsEnrichissement
): Promise<ResultatEnrichissement> {
  const { driver, fetcher } = options;
  const messages: string[] = [];
  let nbEnrichies = 0;
  let nbEchecs = 0;

  const offres = await driver.getOffresARecuperer();
  const total = offres.length;
  for (let i = 0; i < offres.length; i++) {
    if (options.shouldAbort?.()) break;
    const offre = offres[i];
    options.onProgress?.(offre, i, total);
    const result = await fetcher.recupererContenuOffre(offre.url);
    if (!result.ok) {
      nbEchecs++;
      messages.push(
        `Offre ${offre.id} (${offre.url}) : échec récupération — ${result.message}. Traçabilité : limite consignée.`
      );
      if (indiqueOffreExpiree(result.message)) {
        try {
          options.onTransition?.(offre, STATUT_A_COMPLETER, STATUT_EXPIRE);
          await driver.updateOffre(offre.id, { Statut: STATUT_EXPIRE });
        } catch {
          // Ignore si la mise à jour échoue (ex. option Expiré absente côté Airtable, le driver peut la créer au retry)
        }
      } else {
        // Échec sans signal « expiré » (anti-crawler, timeout, contenu non exploitable) → Ignoré pour sortir du pool
        try {
          options.onTransition?.(offre, STATUT_A_COMPLETER, STATUT_IGNORE);
          await driver.updateOffre(offre.id, { Statut: STATUT_IGNORE });
        } catch {
          // ignore
        }
      }
      continue;
    }
    if (champsVides(result.champs)) {
      nbEchecs++;
      messages.push(
        `Offre ${offre.id} : enrichissement n'a pas pu être effectué (réponse vide ou non exploitable). Statut passé à « Ignoré » pour sortir du pool.`
      );
      try {
        options.onTransition?.(offre, STATUT_A_COMPLETER, STATUT_IGNORE);
        await driver.updateOffre(offre.id, { Statut: STATUT_IGNORE });
      } catch {
        // ignore
      }
      continue;
    }
    // Phase 2 ne met à jour que : Texte de l'offre, DateOffre, Salaire (poste / entreprise / ville déjà en phase 1).
    const champs: ChampsOffreAirtable = {};
    if (result.champs.texteOffre) champs["Texte de l'offre"] = result.champs.texteOffre;
    if (result.champs.salaire) champs.Salaire = result.champs.salaire;
    if (result.champs.dateOffre) champs.DateOffre = result.champs.dateOffre;
    const champsPourTransition: ChampsEnrichissement = {
      texteOffre: result.champs.texteOffre,
      poste: offre.poste,
      entreprise: offre.entreprise,
      ville: offre.ville,
      département: offre.département,
      salaire: result.champs.salaire ?? offre.salaire,
      dateOffre: result.champs.dateOffre ?? offre.dateOffre,
    };
    if (donneesSuffisantesPourAnalyser(champsPourTransition)) {
      champs.Statut = STATUT_A_ANALYSER;
    }
    if (champs.Statut) {
      options.onTransition?.(offre, STATUT_A_COMPLETER, champs.Statut);
    }
    try {
      await driver.updateOffre(offre.id, champs);
      nbEnrichies++;
    } catch (err) {
      nbEchecs++;
      messages.push(
        `Offre ${offre.id} : mise à jour Airtable échouée — ${err instanceof Error ? err.message : String(err)}.`
      );
    }
  }

  return {
    ok: true,
    nbEnrichies,
    nbEchecs,
    messages,
  };
}
