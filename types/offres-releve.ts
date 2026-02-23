/**
 * Types métier pour la relève des offres LinkedIn (US-1.4).
 * Même nom pour les propriétés JSON et les champs TypeScript.
 */

/** Résultat de la recherche de la source LinkedIn dans la table Sources (identifiée par email expéditeur + plugin). */
export type SourceLinkedInResult =
  | { found: false }
  | { found: true; actif: boolean; emailExpéditeur: string; sourceId: string };

/** Une offre extraite du HTML d'un email LinkedIn (avant enregistrement). */
export interface OffreExtraite {
  /** Identifiant d'offre LinkedIn (ex. numéro de vue). */
  id: string;
  /** URL de la page d'offre. */
  url: string;
  /** Titre / poste si présent dans l'email. */
  titre?: string;
  /** Entreprise si présente. */
  entreprise?: string;
  /** Lieu historique (fallback legacy, ex. LinkedIn). */
  lieu?: string;
  /** Ville normalisée quand disponible. */
  ville?: string;
  /** Département normalisé (2 chiffres) quand disponible. */
  département?: string;
  /** Salaire si présent dans l'email. */
  salaire?: string;
}

/** Champs pour créer une ligne dans la table Offres (relève). */
export interface OffreInsert {
  idOffre: string;
  url: string;
  dateAjout: string; // ISO dateTime
  /** Date de référence de l'offre (initialisée en étape 1 avec la date de l'email). */
  dateOffre?: string;
  statut: string;
  /** Titre/Poste si extrait de l'email. */
  poste?: string;
  entreprise?: string;
  /** Fallback historique (compatibilité). */
  lieu?: string;
  ville?: string;
  département?: string;
  salaire?: string;
}

/** Résultat de creerOffres (upsert : créées + déjà présentes et mises à jour). */
export type ResultatCreerOffres = { nbCreees: number; nbDejaPresentes: number };

/** Résultat de l'exécution de la relève des offres LinkedIn. */
export type ResultatReleve =
  | { ok: true; nbEmailsLinkedin: number; nbOffresCreees: number; nbOffresDejaPresentes?: number }
  | { ok: false; raison: 'source_absente' | 'source_inactive' | 'erreur_lecture_emails' | 'erreur_ecriture'; message: string };

/** Ligne Offre telle que lue depuis Airtable (pour enrichissement). */
export interface OffreARecuperer {
  id: string; // record id
  url: string;
  statut: string;
  /** Email de la source (ligne du tableau), dérivé de la liste Sources + lien. */
  emailExpéditeur?: string;
  poste?: string;
  entreprise?: string;
  ville?: string;
  département?: string;
  salaire?: string;
  dateOffre?: string;
}

/** Résultat de l'enrichissement d'une offre (fetch page). */
export type ResultatEnrichissementOffre =
  | { ok: true; champs: { texteOffre?: string; poste?: string; entreprise?: string; ville?: string; département?: string; salaire?: string; dateOffre?: string } }
  | { ok: false; message: string };

/** Résultat global de l'enrichissement des offres à récupérer. */
export type ResultatEnrichissement =
  | { ok: true; nbEnrichies: number; nbEchecs: number; messages: string[] }
  | { ok: false; message: string };
