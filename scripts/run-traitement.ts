/**
 * Exécution du traitement de relève (étape 1) : lecture emails -> insertion Offres.
 * L'enrichissement URL (étape 2) est désormais géré séparément en tâche de fond.
 */
import { join } from 'node:path';
import { lireCompte } from '../utils/compte-io.js';
import { getMotDePasseImapDecrypt } from '../utils/parametres-io.js';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { createAirtableReleveDriver } from '../utils/airtable-releve-driver.js';
import { createLecteurEmailsImap } from '../utils/lecteur-emails-imap.js';
import { createLecteurEmailsGraph } from '../utils/lecteur-emails-graph.js';
import { createLecteurEmailsMock } from '../utils/lecteur-emails-mock.js';
import { executerReleveOffresLinkedIn } from '../utils/relève-offres-linkedin.js';
import { STATUT_A_COMPLETER } from '../utils/relève-offres-linkedin.js';
import { traiterEmailsSelonStatutSource, type SourceEmail } from '../utils/gouvernance-sources-emails.js';
import type { PluginSource } from '../utils/gouvernance-sources-emails.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { getValidAccessToken } from '../utils/auth-microsoft.js';
import { createAutoFixtureHook } from './email-fixtures.js';
import { createSourcePluginsRegistry } from '../utils/source-plugins.js';

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
        'plugin' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'
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
    sourceId: string
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

/**
 * Lance relève des offres LinkedIn puis enrichissement.
 * Utilise DATA_DIR du process ou dataDir passé (pour tests).
 */
export async function runTraitement(dataDir: string, options: OptionsRunTraitement = {}): Promise<ResultatTraitement> {
  const dir = dataDir || join(process.cwd(), 'data');
  const onProgress = options.onProgress;
  const onEmailLu = options.onEmailLu ?? createAutoFixtureHook();
  const sourcePlugins = createSourcePluginsRegistry();

  const compte = options.deps?.compte ?? lireCompte(dir);
  if (!compte) {
    return { ok: false, message: 'Aucun compte email configuré. Enregistre les paramètres (formulaire ou data/parametres.json).' };
  }
  const airtable = options.deps?.airtable ?? lireAirTable(dir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.sources?.trim() || !airtable?.offres?.trim()) {
    return { ok: false, message: 'Configuration Airtable incomplète (apiKey, base, sources, offres).' };
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

  const baseId = normaliserBaseId(airtable.base);
  const driverReleve = options.deps?.driverReleve ?? createAirtableReleveDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    sourcesId: airtable.sources,
    offresId: airtable.offres,
  });

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
    const indexParEmail = new Map(sources.map((s) => [s.emailExpéditeur.toLowerCase(), s]));
    const now = new Date().toISOString();
    let nbOffresCreees = 0;
    let nbOffresDejaPresentes = 0;
    const aDeplacer: string[] = [];
    let nbEmailsLinkedin = 0;
    const capturesParSource = new Map<string, number>();

    onProgress?.(`Emails LinkedIn trouvés : ${lecture.emails.length}`);
    const parseursDisponibles: PluginSource[] = [
      'Linkedin',
      'HelloWork',
      'Welcome to the Jungle',
      'Job That Make Sense',
      'Cadre Emploi',
    ];
    const gouvernance = await traiterEmailsSelonStatutSource({
      emails: lecture.emails,
      onProgress,
      sourcesExistantes: sources.map((s) => ({
        emailExpéditeur: s.emailExpéditeur,
        plugin: s.plugin,
        type: s.type ?? 'email',
        activerCreation: s.activerCreation,
        activerEnrichissement: s.activerEnrichissement,
        activerAnalyseIA: s.activerAnalyseIA,
      })),
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
        const emailPlugin = sourcePlugins.getEmailPlugin(source.plugin);
        if (!emailPlugin) return { ok: false };
        // À l'insertion le texte de l'annonce n'est pas encore disponible (URL non ouverte) → statut « Annonce à récupérer »
        const offres = emailPlugin.extraireOffresDepuisEmail(email.html ?? '').map((o) => ({
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
        const result = await driverReleve.creerOffres(offres, sourceRuntime.sourceId);
        if (source.plugin === 'Linkedin') {
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
      await driverReleve.mettreAJourSource(sourceRuntime.sourceId, { plugin: correction.nouveauPlugin });
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
