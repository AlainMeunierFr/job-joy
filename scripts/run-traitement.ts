/**
 * Exécution du traitement de relève (étape 1) : lecture emails -> insertion Offres.
 * L'enrichissement URL (étape 2) est désormais géré séparément en tâche de fond.
 */
import { join } from 'node:path';
import { lireCompte } from '../utils/compte-io.js';
import { getMotDePasseImapDecrypt } from '../utils/parametres-io.js';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { createAirtableReleveDriver } from '../utils/airtable-releve-driver.js';
import { createReleveOffresSqliteDriver } from '../utils/releve-offres-sqlite.js';
import { initOffresRepository } from '../utils/repository-offres-sqlite.js';
import { createSourcesLegacyAdapterFromV2 } from './sources-v2-legacy-adapter.js';
import { createLecteurEmailsImap } from '../utils/lecteur-emails-imap.js';
import { createLecteurEmailsGraph } from '../utils/lecteur-emails-graph.js';
import { createLecteurEmailsMock } from '../utils/lecteur-emails-mock.js';
import { executerReleveOffresLinkedIn } from '../utils/relève-offres-linkedin.js';
import { STATUT_A_COMPLETER } from '../utils/relève-offres-linkedin.js';
import {
  traiterEmailsSelonStatutSource,
  auditerSourcesDepuisEmails,
  type SourceEmail,
} from '../utils/gouvernance-sources-emails.js';
import type { SourceNom } from '../utils/gouvernance-sources-emails.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { getValidAccessToken } from '../utils/auth-microsoft.js';
import { createAutoFixtureHook } from './email-fixtures.js';
import { createSourceRegistry } from '../utils/source-plugins.js';
import { toFullPathListeHtml } from '../utils/liste-html-paths.js';
import { lireFichiersHtmlEnAttente } from '../utils/lire-fichiers-html-en-attente.js';
import {
  extraireOffresApecFromHtml,
  extraireIdOffreApec,
  type OffreApecExtraite,
} from '../utils/apec-liste-html-parser.js';
import { deplacerFichierVersTraite } from '../utils/liste-html-traite.js';
import type { OffreExtraite } from '../types/offres-releve.js';

export type ResultatTraitement =
  | { ok: true; nbEmailsLinkedin?: number; nbOffresCreees?: number; nbOffresDejaPresentes?: number }
  | { ok: false; message: string };

export interface OptionsRunTraitement {
  onProgress?: (message: string) => void;
  onEmailLu?: (email: { sourceNom: string; index: number; total: number; html: string }) => void;
  /** Appelé après chaque email traité avec succès (offres créées), pour mise à jour cache et parallélisme. */
  onSourceProgress?: (emailExpediteur: string, nbProcessed: number) => void;
  deps?: {
    compte?: ReturnType<typeof lireCompte>;
    airtable?: ReturnType<typeof lireAirTable>;
    motDePasse?: string;
    driverReleve?: ReturnType<typeof createAirtableReleveDriver>;
    lecteurEmails?: ReturnType<typeof createLecteurEmailsMock>;
  };
}

type SourceRuntime = SourceEmail & { sourceId: string };
type EmailRuntime = { id: string; from: string; html: string; receivedAtIso?: string };

interface DriverReleveGouvernance {
  listerSources: () => Promise<SourceRuntime[]>;
  creerSource: (source: SourceEmail) => Promise<SourceRuntime>;
  mettreAJourSource: (
    sourceId: string,
    patch: Partial<
      Pick<
        SourceEmail,
        'source' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'
      >
    >
  ) => Promise<void>;
  creerOffres: (
    offres: Array<{
      idOffre: string;
      url: string;
      dateAjout: string;
      dateOffre?: string;
      statut: string;
      poste?: string;
      entreprise?: string;
      lieu?: string;
      ville?: string;
      département?: string;
      salaire?: string;
    }>,
    sourceId: string,
    methodeCreation?: 'email' | 'liste html' | 'manuelle'
  ) => Promise<{ nbCreees: number; nbDejaPresentes: number }>;
}

interface LecteurEmailsGouvernance {
  lireEmailsGouvernance: (
    adresseEmail: string,
    motDePasse: string,
    cheminDossier: string
  ) => Promise<{ ok: true; emails: EmailRuntime[] } | { ok: false; message: string }>;
  deplacerEmailsVersDossier: (
    adresseEmail: string,
    motDePasse: string,
    ids: string[],
    cheminDossierArchive: string
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
}

function hasGouvernanceDriver(driver: unknown): driver is DriverReleveGouvernance {
  return (
    !!driver &&
    typeof driver === 'object' &&
    typeof (driver as DriverReleveGouvernance).listerSources === 'function' &&
    typeof (driver as DriverReleveGouvernance).creerSource === 'function' &&
    typeof (driver as DriverReleveGouvernance).mettreAJourSource === 'function'
  );
}

function hasGouvernanceLecteur(lecteur: unknown): lecteur is LecteurEmailsGouvernance {
  return (
    !!lecteur &&
    typeof lecteur === 'object' &&
    typeof (lecteur as LecteurEmailsGouvernance).lireEmailsGouvernance === 'function' &&
    typeof (lecteur as LecteurEmailsGouvernance).deplacerEmailsVersDossier === 'function'
  );
}

/** US-7.2 / US-7.3 : driver composite — paramétrage workers = JSON (sources.json) ; offres Airtable = colonne source en chaîne. */
export function createCompositeReleveDriver(
  dataDir: string,
  airtableOptions: { apiKey: string; baseId: string; offresId: string }
): DriverReleveGouvernance & {
  getSourceLinkedIn: () => Promise<{ found: false } | { found: true; activerCreation: boolean; emailExpéditeur: string; sourceId: string }>;
  creerOffres: (offres: OffreInsert[], sourceId: string) => Promise<{ nbCreees: number; nbDejaPresentes: number }>;
} {
  const sourcesDriver = createSourcesLegacyAdapterFromV2(dataDir);
  const airtableDriver = createAirtableReleveDriver(airtableOptions);
  return {
    async listerSources() {
      return sourcesDriver.listerSources();
    },
    async creerSource(source: SourceEmail) {
      return sourcesDriver.creerSource(source);
    },
    async mettreAJourSource(sourceId: string, patch: Parameters<NonNullable<typeof sourcesDriver.mettreAJourSource>>[1]) {
      await sourcesDriver.mettreAJourSource?.(sourceId, patch);
    },
    async getSourceLinkedIn() {
      const list = await sourcesDriver.listerSources();
      const linkedin = list.find((s) => s.source === 'Linkedin');
      return linkedin
        ? { found: true as const, activerCreation: linkedin.activerCreation, emailExpéditeur: linkedin.emailExpéditeur, sourceId: linkedin.sourceId }
        : { found: false as const };
    },
    async creerOffres(offres: OffreInsert[], sourceId: string, methodeCreation: 'email' | 'liste html' | 'manuelle' = 'email') {
      const list = await sourcesDriver.listerSources();
      const s = list.find((x) => x.sourceId === sourceId);
      const nom = s?.source ?? sourceId;
      return airtableDriver.creerOffres(offres, nom, methodeCreation);
    },
  };
}

/** US-7.7 : driver composite relève qui écrit les offres dans SQLite (au lieu d'Airtable). */
export function createCompositeReleveDriverSqlite(dataDir: string): DriverReleveGouvernance & {
  getSourceLinkedIn: () => Promise<{ found: false } | { found: true; activerCreation: boolean; emailExpéditeur: string; sourceId: string }>;
  creerOffres: (offres: OffreInsert[], sourceId: string, methodeCreation?: 'email' | 'liste html' | 'manuelle') => Promise<{ nbCreees: number; nbDejaPresentes: number }>;
} {
  const sourcesDriver = createSourcesLegacyAdapterFromV2(dataDir);
  const repository = initOffresRepository(join(dataDir, 'offres.sqlite'));
  const sqliteDriver = createReleveOffresSqliteDriver({
    repository,
    getSourceLinkedIn: async () => {
      const list = await sourcesDriver.listerSources();
      const linkedin = list.find((s) => s.source === 'Linkedin');
      return linkedin
        ? { found: true as const, activerCreation: linkedin.activerCreation, emailExpéditeur: linkedin.emailExpéditeur, sourceId: linkedin.sourceId }
        : { found: false as const };
    },
  });
  return {
    async listerSources() {
      return sourcesDriver.listerSources();
    },
    async creerSource(source: SourceEmail) {
      return sourcesDriver.creerSource(source);
    },
    async mettreAJourSource(sourceId: string, patch: Parameters<NonNullable<typeof sourcesDriver.mettreAJourSource>>[1]) {
      await sourcesDriver.mettreAJourSource?.(sourceId, patch);
    },
    getSourceLinkedIn: sqliteDriver.getSourceLinkedIn.bind(sqliteDriver),
    async creerOffres(offres: OffreInsert[], sourceId: string, methodeCreation: 'email' | 'liste html' | 'manuelle' = 'email') {
      const list = await sourcesDriver.listerSources();
      const s = list.find((x) => x.sourceId === sourceId);
      const nom = s?.source ?? sourceId;
      return sqliteDriver.creerOffres(offres, nom, methodeCreation);
    },
  };
}

type OffreInsert = Parameters<DriverReleveGouvernance['creerOffres']>[0][number] & { dateOffre?: string };

/**
 * Lance relève des offres LinkedIn puis enrichissement.
 * Utilise DATA_DIR du process ou dataDir passé (pour tests).
 */
export async function runTraitement(dataDir: string, options: OptionsRunTraitement = {}): Promise<ResultatTraitement> {
  const dir = dataDir || join(process.cwd(), 'data');
  const onProgress = options.onProgress;
  const onEmailLu = options.onEmailLu ?? createAutoFixtureHook();
  const sourcePlugins = createSourceRegistry();

  const compte = options.deps?.compte ?? lireCompte(dir);
  if (!compte) {
    return { ok: false, message: 'Aucun compte email configuré. Enregistre les paramètres (formulaire ou data/parametres.json).' };
  }
  const provider = compte.provider ?? 'imap';
  const useMicrosoft = provider === 'microsoft';
  const imapHost = (compte.imapHost ?? '').trim();
  if (!useMicrosoft && !imapHost) {
    return { ok: false, message: 'Compte sans serveur IMAP. Configure imapHost (ou utilise Microsoft).' };
  }
  const motDePasse = options.deps?.motDePasse ?? getMotDePasseImapDecrypt(dir) ?? '';
  if (!useMicrosoft && !motDePasse) {
    return { ok: false, message: 'Mot de passe IMAP absent. Enregistre-le via l’application (stocké chiffré avec PARAMETRES_ENCRYPTION_KEY).' };
  }

  const driverReleve = options.deps?.driverReleve ?? createCompositeReleveDriverSqlite(dir);

  const useMock = process.env.BDD_MOCK_CONNECTEUR === '1';
  const lecteurEmails = options.deps?.lecteurEmails ?? (
    useMock
      ? createLecteurEmailsMock()
      : useMicrosoft
        ? createLecteurEmailsGraph(() => getValidAccessToken())
        : createLecteurEmailsImap({
            host: imapHost,
            port: compte.imapPort ?? 993,
            secure: compte.imapSecure !== false,
          })
  );

  const cheminDossierArchive = (compte.cheminDossierArchive ?? '').trim() || undefined;
  let resultReleve: Awaited<ReturnType<typeof executerReleveOffresLinkedIn>>;
  if (hasGouvernanceDriver(driverReleve) && hasGouvernanceLecteur(lecteurEmails)) {
    const lecture = await lecteurEmails.lireEmailsGouvernance(
      compte.adresseEmail,
      motDePasse,
      compte.cheminDossier ?? ''
    );
    if (!lecture.ok) {
      return { ok: false, message: lecture.message };
    }
    const sources = await driverReleve.listerSources();
    const emailsExpediteurs = lecture.emails.map((e) => e.from);
    const audit = auditerSourcesDepuisEmails({
      emailsExpediteurs,
      sourcesExistantes: sources.map((s) => ({
        emailExpéditeur: s.emailExpéditeur,
        source: s.source,
        type: s.type ?? 'email',
        activerCreation: s.activerCreation,
        activerEnrichissement: s.activerEnrichissement,
        activerAnalyseIA: s.activerAnalyseIA,
      })),
    });
    const indexParEmail = new Map(sources.map((s) => [s.emailExpéditeur.toLowerCase(), s]));
    for (const source of audit.creees) {
      const created = await driverReleve.creerSource(source);
      indexParEmail.set(created.emailExpéditeur.toLowerCase(), created);
    }
    const now = new Date().toISOString();
    let nbOffresCreees = 0;
    let nbOffresDejaPresentes = 0;
    const aDeplacer: string[] = [];
    let nbEmailsLinkedin = 0;
    const capturesParSource = new Map<string, number>();

    onProgress?.(`Emails LinkedIn trouvés : ${lecture.emails.length}`);
    const parseursDisponibles: SourceNom[] = [
      'Linkedin',
      'HelloWork',
      'Welcome to the Jungle',
      'Job That Make Sense',
      'Cadre Emploi',
    ];
    const sourcesExistantes: SourceEmail[] = [
      ...sources.map((s) => ({
        emailExpéditeur: s.emailExpéditeur,
        source: s.source,
        type: (s.type ?? 'email') as SourceEmail['type'],
        activerCreation: s.activerCreation,
        activerEnrichissement: s.activerEnrichissement,
        activerAnalyseIA: s.activerAnalyseIA,
      })),
      ...audit.creees,
    ];
    const gouvernance = await traiterEmailsSelonStatutSource({
      emails: lecture.emails,
      onProgress,
      sourcesExistantes,
      parseursDisponibles,
      capturerHtmlExemple: async (sourceNom, html) => {
        const key = sourceNom.toLowerCase();
        const deja = capturesParSource.get(key) ?? 0;
        const index = deja + 1;
        capturesParSource.set(key, index);
        const totalPourSource = 3;
        onEmailLu?.({ sourceNom, index, total: totalPourSource, html });
      },
      traiterEmail: async (email, source) => {
        const sourceRuntime = indexParEmail.get(source.emailExpéditeur.toLowerCase());
        if (!sourceRuntime) return { ok: false };
        const emailSource = sourcePlugins.getEmailSource(source.source);
        if (!emailSource) return { ok: false };
        // À l'insertion le texte de l'annonce n'est pas encore disponible (URL non ouverte) → statut « Annonce à récupérer »
        const offres = emailSource.extraireOffresDepuisEmail(email.html ?? '').map((o: OffreExtraite) => ({
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
        }));
        if (offres.length === 0) return { ok: false };
        const result = await driverReleve.creerOffres(offres, sourceRuntime.sourceId, 'email');
        if (source.source === 'Linkedin') {
          nbEmailsLinkedin += 1;
        }
        nbOffresCreees += result.nbCreees;
        nbOffresDejaPresentes += result.nbDejaPresentes;
        options.onSourceProgress?.(source.emailExpéditeur, 1);
        return { ok: true };
      },
      deplacerVersTraite: async (email) => {
        aDeplacer.push(email.id);
      },
    });

    for (const source of gouvernance.creees) {
      const created = await driverReleve.creerSource(source);
      indexParEmail.set(created.emailExpéditeur.toLowerCase(), created);
    }
    for (const correction of gouvernance.corrections) {
      const sourceRuntime = indexParEmail.get(correction.emailExpéditeur.toLowerCase());
      if (!sourceRuntime) continue;
      await driverReleve.mettreAJourSource(sourceRuntime.sourceId, { source: correction.nouveauSourceNom });
    }
    if (cheminDossierArchive && aDeplacer.length > 0) {
      const deplacement = await lecteurEmails.deplacerEmailsVersDossier(
        compte.adresseEmail,
        motDePasse,
        aDeplacer,
        cheminDossierArchive
      );
      if (!deplacement.ok) {
        return { ok: false, message: deplacement.message };
      }
    }

    // Phase 1 création : sources "liste html" (fichiers HTML du dossier → offres en base). US-6.1
    const sourcesListeHtml = sources.filter(
      (s) =>
        (s.type === 'liste html' || s.emailExpéditeur.startsWith('liste html/')) &&
        s.activerCreation !== false &&
        sourcePlugins.hasCreationListeHtml(s.source)
    );
    for (const source of sourcesListeHtml) {
      const adresse = source.emailExpéditeur;
      const pluginDir = toFullPathListeHtml(dir, adresse);
      const fichiers = await lireFichiersHtmlEnAttente(pluginDir);
      const total = fichiers.length;
      if (total === 0) continue;
      onProgress?.(`Liste html ${adresse} : ${total} fichier(s) à traiter.`);
      const seenIds = new Set<string>();
      const offresPourSource: Array<{
        idOffre: string;
        url: string;
        dateAjout: string;
        statut: string;
      }> = [];
      for (let i = 0; i < fichiers.length; i++) {
        const { filePath, content } = fichiers[i];
        const offres: OffreApecExtraite[] = extraireOffresApecFromHtml(content);
        for (const { url } of offres) {
          const id = extraireIdOffreApec(url) ?? url;
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          offresPourSource.push({
            idOffre: id,
            url,
            dateAjout: now,
            statut: STATUT_A_COMPLETER,
          });
        }
        await deplacerFichierVersTraite(filePath, pluginDir);
        onProgress?.(`${i + 1}/${total} — création…`);
      }
      if (offresPourSource.length > 0) {
        const result = await driverReleve.creerOffres(
          offresPourSource.map((o) => ({
            ...o,
            poste: undefined,
            entreprise: undefined,
            lieu: undefined,
            ville: undefined,
            département: undefined,
            salaire: undefined,
          })),
          source.sourceId,
          'liste html'
        );
        nbOffresCreees += result.nbCreees;
        nbOffresDejaPresentes += result.nbDejaPresentes;
        options.onSourceProgress?.(adresse, total);
      }
    }

    resultReleve = { ok: true, nbEmailsLinkedin, nbOffresCreees, nbOffresDejaPresentes };
  } else {
    resultReleve = await executerReleveOffresLinkedIn({
      adresseEmail: compte.adresseEmail,
      motDePasse,
      cheminDossier: compte.cheminDossier ?? '',
      cheminDossierArchive,
      onProgress,
      onEmailLu,
      driver: driverReleve,
      lecteurEmails,
    });
  }

  if (!resultReleve.ok) {
    return { ok: false, message: resultReleve.message };
  }

  return {
    ok: true,
    nbEmailsLinkedin: resultReleve.nbEmailsLinkedin,
    nbOffresCreees: resultReleve.nbOffresCreees,
    nbOffresDejaPresentes: resultReleve.nbOffresDejaPresentes,
  };
}

/** US-3.3 : alias sémantique pour la phase 1 (création d'offres). */
export const runCreation = runTraitement;
