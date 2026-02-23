/**
 * Enrichissement des offres « Annonce à récupérer » (US-1.4 CA3).
 * Récupération du texte depuis l'URL, mise à jour des champs et du statut.
 */
import type { OffreARecuperer } from '../types/offres-releve.js';
import type { ResultatEnrichissement, ResultatEnrichissementOffre } from '../types/offres-releve.js';

export const STATUT_ANNONCE_A_RECUPERER = 'Annonce à récupérer';
export const STATUT_A_ANALYSER = 'À analyser';

/** Champs Airtable pour une offre (noms de colonnes). */
export interface ChampsOffreAirtable {
  'Texte de l\'offre'?: string;
  Poste?: string;
  Entreprise?: string;
  Ville?: string;
  Département?: string;
  Salaire?: string;
  DateOffre?: string;
  Statut?: string;
}

/** Port : lister les offres à récupérer et mettre à jour une offre. */
export interface EnrichissementOffresDriver {
  getOffresARecuperer(): Promise<OffreARecuperer[]>;
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
    const offre = offres[i];
    options.onProgress?.(offre, i, total);
    const result = await fetcher.recupererContenuOffre(offre.url);
    if (!result.ok) {
      nbEchecs++;
      messages.push(
        `Offre ${offre.id} (${offre.url}) : échec récupération — ${result.message}. Traçabilité : limite consignée.`
      );
      continue;
    }
    if (champsVides(result.champs)) {
      nbEchecs++;
      messages.push(
        `Offre ${offre.id} : enrichissement n'a pas pu être effectué (réponse vide ou non exploitable). Statut resté « Annonce à récupérer ».`
      );
      continue;
    }
    const champs: ChampsOffreAirtable = {};
    if (result.champs.texteOffre) champs["Texte de l'offre"] = result.champs.texteOffre;
    if (result.champs.poste) champs.Poste = result.champs.poste;
    if (result.champs.entreprise) champs.Entreprise = result.champs.entreprise;
    if (result.champs.ville) champs.Ville = result.champs.ville;
    if (result.champs.département) champs.Département = result.champs.département;
    if (result.champs.salaire) champs.Salaire = result.champs.salaire;
    if (result.champs.dateOffre) champs.DateOffre = result.champs.dateOffre;
    const champsPourTransition: ChampsEnrichissement = {
      texteOffre: result.champs.texteOffre,
      poste: result.champs.poste ?? offre.poste,
      entreprise: result.champs.entreprise ?? offre.entreprise,
      ville: result.champs.ville ?? offre.ville,
      département: result.champs.département ?? offre.département,
      salaire: result.champs.salaire ?? offre.salaire,
      dateOffre: result.champs.dateOffre ?? offre.dateOffre,
    };
    if (donneesSuffisantesPourAnalyser(champsPourTransition)) {
      champs.Statut = STATUT_A_ANALYSER;
    }
    await driver.updateOffre(offre.id, champs);
    nbEnrichies++;
  }

  return {
    ok: true,
    nbEnrichies,
    nbEchecs,
    messages,
  };
}
