/**
 * Relève des offres LinkedIn depuis les emails (US-1.4 CA1, CA2).
 * Orchestration : source LinkedIn active → lecture emails → extraction → création Offres.
 */
import type { SourceLinkedInResult } from '../types/offres-releve.js';
import type { OffreInsert } from '../types/offres-releve.js';
import type { ResultatCreerOffres, MethodeCreationOffre } from '../types/offres-releve.js';
import type { ResultatReleve } from '../types/offres-releve.js';
import { extractOffresFromHtml } from './extraction-offres-email.js';

export const STATUT_A_COMPLETER = 'A compléter';

/** Port : récupérer la source LinkedIn et créer des lignes Offres (upsert : créées + mises à jour). US-7.2 CA5 : methodeCreation alimente la colonne « Méthode de création ». */
export interface RelèveOffresDriver {
  getSourceLinkedIn(): Promise<SourceLinkedInResult>;
  creerOffres(offres: OffreInsert[], sourceId: string, methodeCreation?: MethodeCreationOffre): Promise<ResultatCreerOffres>;
}

/** Port : lire les emails du dossier dont l'expéditeur contient la valeur donnée. Optionnellement déplace les messages lus vers un dossier d'archivage. */
export interface LecteurEmails {
  lireEmails(
    adresseEmail: string,
    motDePasse: string,
    cheminDossier: string,
    expéditeurContient: string,
    cheminDossierArchive?: string
  ): Promise<
    | { ok: true; emails: Array<{ html: string; receivedAtIso?: string }> }
    | { ok: false; message: string }
  >;
}

export interface OptionsReleve {
  adresseEmail: string;
  motDePasse: string;
  cheminDossier: string;
  /** Dossier où déplacer les emails traités (optionnel). */
  cheminDossierArchive?: string;
  /** Callback optionnel pour remonter une progression en temps réel. */
  onProgress?: (message: string) => void;
  /** Callback optionnel pour inspecter le HTML brut des emails LinkedIn lus. */
  onEmailLu?: (email: { sourceNom: string; index: number; total: number; html: string }) => void;
  driver: RelèveOffresDriver;
  lecteurEmails: LecteurEmails;
}

/**
 * Exécute la relève : vérifie la source LinkedIn, lit les emails, extrait les offres, crée les lignes Offres.
 */
export async function executerReleveOffresLinkedIn(
  options: OptionsReleve
): Promise<ResultatReleve> {
  const { driver, lecteurEmails, adresseEmail, motDePasse, cheminDossier, cheminDossierArchive, onProgress, onEmailLu } = options;

  const source = await driver.getSourceLinkedIn();
  if (!source.found) {
    return {
      ok: false,
      raison: 'source_absente',
      message:
        "La source LinkedIn est absente ou indisponible dans les sources (data/sources.json). L'utilisateur doit être informé.",
    };
  }
  if (!source.activerCreation) {
    return {
      ok: false,
      raison: 'source_inactive',
      message:
        "La source LinkedIn est inactive. L'utilisateur est informé et le traitement des emails LinkedIn ne poursuit pas.",
    };
  }
  const emailExpéditeur = (source.emailExpéditeur ?? '').trim();
  const sourceNom = emailExpéditeur || 'LinkedIn';
  if (!emailExpéditeur) {
    return {
      ok: false,
      raison: 'erreur_lecture_emails',
      message: "Le champ emailExpéditeur de la source LinkedIn n'est pas configuré.",
    };
  }

  const lecture = await lecteurEmails.lireEmails(
    adresseEmail,
    motDePasse,
    cheminDossier,
    emailExpéditeur,
    cheminDossierArchive
  );
  if (!lecture.ok) {
    return {
      ok: false,
      raison: 'erreur_lecture_emails',
      message: lecture.message,
    };
  }

  const allOffres: OffreInsert[] = [];
  const nbEmailsLinkedin = lecture.emails.length;
  onProgress?.(`Emails LinkedIn trouvés : ${nbEmailsLinkedin}`);
  const now = new Date().toISOString();

  function champProgress(v?: string): string {
    const s = (v ?? '').trim();
    return s ? s.replace(/\s+/g, ' ').slice(0, 80) : '-';
  }

  for (let i = 0; i < lecture.emails.length; i++) {
    const email = lecture.emails[i];
    onEmailLu?.({ sourceNom, index: i + 1, total: nbEmailsLinkedin, html: email.html ?? '' });
    onProgress?.(`${i + 1}/${nbEmailsLinkedin}`);
    const extraites = extractOffresFromHtml(email.html ?? '');
    onProgress?.(`${i + 1}/${nbEmailsLinkedin} -> ${extraites.length} annonce(s)`);
    for (let j = 0; j < extraites.length; j++) {
      const o = extraites[j];
      onProgress?.(
        `${i + 1}/${nbEmailsLinkedin} -> ${j + 1}/${extraites.length} : ${champProgress(o.titre)} - ${champProgress(o.entreprise)} - ${champProgress(o.lieu)}`
      );
      allOffres.push({
        idOffre: o.id,
        url: o.url,
        dateAjout: now,
        dateOffre: email.receivedAtIso ?? now,
        statut: STATUT_A_COMPLETER,
        poste: o.titre,
        entreprise: o.entreprise,
        lieu: o.lieu,
        ville: o.ville ?? o.lieu,
        département: o.département,
        salaire: o.salaire,
      });
    }
  }

  if (allOffres.length === 0) {
    return { ok: true, nbEmailsLinkedin, nbOffresCreees: 0 };
  }

  try {
    const sourceNom = source.sourceNom ?? source.sourceId;
    const result = await driver.creerOffres(allOffres, sourceNom, 'email');
    return {
      ok: true,
      nbEmailsLinkedin,
      nbOffresCreees: result.nbCreees,
      nbOffresDejaPresentes: result.nbDejaPresentes,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      raison: 'erreur_ecriture',
      message: `Échec écriture Offres : ${message}`,
    };
  }
}
