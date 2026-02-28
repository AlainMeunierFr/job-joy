import { join } from 'node:path';
import { lireCompte } from '../utils/compte-io.js';
import { getMotDePasseImapDecrypt } from '../utils/parametres-io.js';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { createLecteurEmailsImap } from '../utils/lecteur-emails-imap.js';
import { createLecteurEmailsGraph } from '../utils/lecteur-emails-graph.js';
import { createLecteurEmailsMock } from '../utils/lecteur-emails-mock.js';
import { getValidAccessToken } from '../utils/auth-microsoft.js';
import type { SourceNom, SourceEmail } from '../utils/gouvernance-sources-emails.js';
import { sourceNomParExpediteur } from '../utils/gouvernance-sources-emails.js';
import {
  creerSourcesManquantesPourListeHtml,
  normaliserCheminListeHtml,
  sourceNomPourSlugListeHtml,
} from '../utils/audit-sources-liste-html.js';
import { listerDossiersSourceListeHtml, getListeHtmlSourceDir } from '../utils/liste-html-paths.js';
import { createSourcesLegacyAdapterFromV2 } from './sources-v2-legacy-adapter.js';

export type ResultatAuditSources =
  | {
      ok: true;
      nbEmailsScannes: number;
      nbSourcesCreees: number;
      nbSourcesExistantes: number;
      synthese: Array<{
        emailExpéditeur: string;
        source: SourceNom;
        actif: 'Oui' | 'Non';
        nbEmails: number;
      }>;
      sousTotauxPrevisionnels: {
        emailsÀArchiver: number;
        emailsÀAnalyser: number;
      };
    }
  | { ok: false; message: string };

type SourceRuntime = SourceEmail & { sourceId: string };
type EmailRuntime = { id: string; from: string; html: string };

interface DriverReleveGouvernance {
  listerSources: () => Promise<SourceRuntime[]>;
  creerSource: (source: SourceEmail) => Promise<SourceRuntime>;
  mettreAJourSource?: (
    sourceId: string,
    patch: Partial<
      Pick<
        SourceEmail,
        'source' | 'type' | 'activerCreation' | 'activerEnrichissement' | 'activerAnalyseIA'
      >
    >
  ) => Promise<void>;
}

interface LecteurEmailsGouvernance {
  lireEmailsGouvernance: (
    adresseEmail: string,
    motDePasse: string,
    cheminDossier: string
  ) => Promise<{ ok: true; emails: EmailRuntime[] } | { ok: false; message: string }>;
}

export interface OptionsRunAuditSources {
  onProgress?: (message: string) => void;
  deps?: {
    compte?: ReturnType<typeof lireCompte>;
    airtable?: ReturnType<typeof lireAirTable>;
    motDePasse?: string;
    driverReleve?: DriverReleveGouvernance;
    lecteurEmails?: ReturnType<typeof createLecteurEmailsMock>;
  };
}

function hasGouvernanceDriver(driver: unknown): driver is DriverReleveGouvernance {
  return (
    !!driver &&
    typeof driver === 'object' &&
    typeof (driver as DriverReleveGouvernance).listerSources === 'function' &&
    typeof (driver as DriverReleveGouvernance).creerSource === 'function'
  );
}

function hasGouvernanceLecteur(lecteur: unknown): lecteur is LecteurEmailsGouvernance {
  return (
    !!lecteur &&
    typeof lecteur === 'object' &&
    typeof (lecteur as LecteurEmailsGouvernance).lireEmailsGouvernance === 'function'
  );
}

function extraireAdresseEmail(input: string): string {
  const raw = (input ?? '').trim();
  if (!raw) return '';
  const betweenAngles = raw.match(/<([^>]+)>/);
  if (betweenAngles?.[1]) return betweenAngles[1].trim();
  const emailLike = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailLike?.[0]) return emailLike[0].trim();
  return raw;
}

function normaliserEmailExpediteur(from: string): string {
  return extraireAdresseEmail(from).toLowerCase();
}

export async function runAuditSources(
  dataDir: string,
  options: OptionsRunAuditSources = {}
): Promise<ResultatAuditSources> {
  const dir = dataDir || join(process.cwd(), 'data');
  const onProgress = options.onProgress;

  const compte = options.deps?.compte ?? lireCompte(dir);
  if (!compte) {
    return { ok: false, message: 'Aucun compte email configuré. Enregistre les paramètres (formulaire ou data/parametres.json).' };
  }
  const airtable = options.deps?.airtable ?? lireAirTable(dir);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim()) {
    return { ok: false, message: 'Configuration Airtable incomplète (apiKey, base). Les sources sont lues depuis data/sources.json (US-7.2).' };
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

  const driverReleve = options.deps?.driverReleve ?? createSourcesLegacyAdapterFromV2(dir);

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

  if (!hasGouvernanceDriver(driverReleve) || !hasGouvernanceLecteur(lecteurEmails)) {
    return { ok: false, message: 'Le mode audit nécessite un driver Sources et un lecteur emails compatibles gouvernance.' };
  }

  const lecture = await lecteurEmails.lireEmailsGouvernance(
    compte.adresseEmail,
    motDePasse,
    compte.cheminDossier ?? ''
  );
  if (!lecture.ok) {
    return { ok: false, message: lecture.message };
  }

  onProgress?.(`Emails scannés : ${lecture.emails.length}`);
  const sourcesExistantes = await driverReleve.listerSources();
  // Auto-corrige la source des lignes existantes (ex. Inconnu → Linkedin pour email ; liste html/apec → APEC).
  if (driverReleve.mettreAJourSource) {
    for (const source of sourcesExistantes) {
      const key = normaliserEmailExpediteur(source.emailExpéditeur);
      const estListeHtml = !key.includes('@');
      let sourceNomAttendu: SourceNom;
      let patch: { source: SourceNom; activerCreation?: boolean } | { source: SourceNom };
      if (estListeHtml) {
        const slug = key.includes('liste html/') ? key.replace(/^.*liste html\//, '').trim() || key : key;
        sourceNomAttendu = sourceNomPourSlugListeHtml(slug);
        patch = { source: sourceNomAttendu, activerCreation: true };
      } else {
        sourceNomAttendu = sourceNomParExpediteur(key);
        if (sourceNomAttendu === 'Inconnu') continue;
        patch = { source: sourceNomAttendu };
      }
      const doitCorrigerSource = source.source !== sourceNomAttendu;
      const doitActiverCreation = estListeHtml && !source.activerCreation;
      if (!doitCorrigerSource && !doitActiverCreation) continue;
      await driverReleve.mettreAJourSource(source.sourceId, doitActiverCreation ? patch : { source: sourceNomAttendu });
      source.source = sourceNomAttendu;
      if (estListeHtml) source.activerCreation = true;
    }
  }
  const indexParEmail = new Map(
    sourcesExistantes.map((s) => [normaliserEmailExpediteur(s.emailExpéditeur), s])
  );
  const compteParExpediteur = new Map<string, number>();
  for (const email of lecture.emails) {
    const key = normaliserEmailExpediteur(email.from);
    if (!key) continue;
    compteParExpediteur.set(key, (compteParExpediteur.get(key) ?? 0) + 1);
  }

  const synthese: Array<{
    emailExpéditeur: string;
    source: SourceNom;
    actif: 'Oui' | 'Non';
    nbEmails: number;
  }> = [];
  let nbSourcesCreees = 0;
  let nbSourcesExistantes = 0;

  // CA2 US-6.2 : ne jamais créer de source pour un expéditeur trouvé dans la boîte mail.
  // Synthèse et décompte uniquement pour les expéditeurs déjà présents dans listerSources().
  for (const [key, nbEmails] of compteParExpediteur.entries()) {
    const sourceExistante = indexParEmail.get(key);
    if (!sourceExistante) {
      continue;
    }
    const sourceNomAttendu = sourceNomParExpediteur(key);
    const doitCorrigerSource = sourceNomAttendu !== 'Inconnu' && sourceExistante.source !== sourceNomAttendu;
    if (doitCorrigerSource && sourceExistante.sourceId && driverReleve.mettreAJourSource) {
      await driverReleve.mettreAJourSource(sourceExistante.sourceId, { source: sourceNomAttendu });
      sourceExistante.source = sourceNomAttendu;
    }
    nbSourcesExistantes += 1;
    synthese.push({
      emailExpéditeur: key,
      source: sourceExistante.source,
      actif: sourceExistante.activerCreation ? 'Oui' : 'Non',
      nbEmails,
    });
  }

  // US-6.1 : créer les sources manquantes pour les dossiers "liste html".
  const sourcesPourListeHtml = Array.from(indexParEmail.values()).map((s) => ({
    emailExpéditeur: s.emailExpéditeur,
  }));
  const { nbCreees: nbListeHtmlCreees, creees: creeesListeHtml } =
    await creerSourcesManquantesPourListeHtml({
      dataDir: dir,
      listerDossiers: listerDossiersSourceListeHtml,
      getSourceDir: getListeHtmlSourceDir,
      sourcesExistantes: sourcesPourListeHtml,
      creerSource: driverReleve.creerSource,
    });
  nbSourcesCreees += nbListeHtmlCreees;
  for (const created of creeesListeHtml) {
    const key = normaliserCheminListeHtml(created.emailExpéditeur);
    const sourceNom = created.source ?? 'Inconnu';
    indexParEmail.set(key, {
      sourceId: created.sourceId,
      emailExpéditeur: created.emailExpéditeur,
      source: sourceNom,
      type: 'liste html',
      activerCreation: true,
      activerEnrichissement: false,
      activerAnalyseIA: true,
    });
    synthese.push({
      emailExpéditeur: created.emailExpéditeur,
      source: sourceNom,
      actif: 'Oui',
      nbEmails: 0,
    });
  }

  synthese.sort((a, b) => b.nbEmails - a.nbEmails);
  const sousTotauxPrevisionnels = synthese.reduce(
    (acc, ligne) => {
      if (ligne.actif === 'Oui') {
        acc.emailsÀArchiver += ligne.nbEmails;
      }
      if (
        (
          ligne.source === 'Linkedin' ||
          ligne.source === 'HelloWork' ||
          ligne.source === 'Welcome to the Jungle' ||
          ligne.source === 'Job That Make Sense' ||
          ligne.source === 'Cadre Emploi'
        ) &&
        ligne.actif === 'Oui'
      ) {
        acc.emailsÀAnalyser += ligne.nbEmails;
      }
      return acc;
    },
    { emailsÀArchiver: 0, emailsÀAnalyser: 0 }
  );

  return {
    ok: true,
    nbEmailsScannes: lecture.emails.length,
    nbSourcesCreees,
    nbSourcesExistantes,
    synthese,
    sousTotauxPrevisionnels,
  };
}
