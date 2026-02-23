import { join } from 'node:path';
import { lireCompte } from '../utils/compte-io.js';
import { getMotDePasseImapDecrypt } from '../utils/parametres-io.js';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { createAirtableReleveDriver } from '../utils/airtable-releve-driver.js';
import { createLecteurEmailsImap } from '../utils/lecteur-emails-imap.js';
import { createLecteurEmailsGraph } from '../utils/lecteur-emails-graph.js';
import { createLecteurEmailsMock } from '../utils/lecteur-emails-mock.js';
import { normaliserBaseId } from '../utils/airtable-url.js';
import { getValidAccessToken } from '../utils/auth-microsoft.js';
import type { AlgoSource, SourceEmail } from '../utils/gouvernance-sources-emails.js';

export type ResultatAuditSources =
  | {
      ok: true;
      nbEmailsScannes: number;
      nbSourcesCreees: number;
      nbSourcesExistantes: number;
      synthese: Array<{
        emailExpéditeur: string;
        algo: AlgoSource;
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
    patch: Partial<Pick<SourceEmail, 'algo' | 'actif'>>
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
    driverReleve?: ReturnType<typeof createAirtableReleveDriver>;
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

function algoParExpediteur(emailExpediteur: string): AlgoSource {
  const key = emailExpediteur.toLowerCase().trim();
  if (key === 'notification@emails.hellowork.com') return 'HelloWork';
  if (key === 'alerts@welcometothejungle.com') return 'Welcome to the Jungle';
  if (key === 'jobs@makesense.org') return 'Job That Make Sense';
  if (key === 'offres@alertes.cadremploi.fr') return 'cadreemploi';
  if (key.includes('linkedin.com')) return 'Linkedin';
  return 'Inconnu';
}

function actifParDefautPourAlgo(algo: AlgoSource): boolean {
  return (
    algo === 'Linkedin' ||
    algo === 'HelloWork' ||
    algo === 'Welcome to the Jungle' ||
    algo === 'Job That Make Sense' ||
    algo === 'cadreemploi'
  );
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
  // Auto-corrige les sources existantes connues (LinkedIn/HelloWork/WTTJ) même avant l'analyse des emails du dossier.
  // Cela évite de laisser une source bloquée en "Inconnu" après un changement manuel Airtable.
  if (driverReleve.mettreAJourSource) {
    for (const source of sourcesExistantes) {
      const key = normaliserEmailExpediteur(source.emailExpéditeur);
      const algoAttendu = algoParExpediteur(key);
      const actifAttendu = actifParDefautPourAlgo(algoAttendu);
      if (algoAttendu === 'Inconnu') continue;
      const doitCorrigerAlgo = source.algo !== algoAttendu;
      const doitCorrigerActif = source.actif !== actifAttendu;
      if (!doitCorrigerAlgo && !doitCorrigerActif) continue;
      await driverReleve.mettreAJourSource(source.sourceId, {
        ...(doitCorrigerAlgo ? { algo: algoAttendu } : {}),
        ...(doitCorrigerActif ? { actif: actifAttendu } : {}),
      });
      if (doitCorrigerAlgo) source.algo = algoAttendu;
      if (doitCorrigerActif) source.actif = actifAttendu;
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
    algo: AlgoSource;
    actif: 'Oui' | 'Non';
    nbEmails: number;
  }> = [];
  let nbSourcesCreees = 0;
  let nbSourcesExistantes = 0;

  for (const [key, nbEmails] of compteParExpediteur.entries()) {
    const sourceExistante = indexParEmail.get(key);
    if (sourceExistante) {
      const algoAttendu = algoParExpediteur(key);
      const actifAttendu = actifParDefautPourAlgo(algoAttendu);
      const doitCorrigerAlgo = algoAttendu !== 'Inconnu' && sourceExistante.algo !== algoAttendu;
      const doitCorrigerActif = algoAttendu !== 'Inconnu' && sourceExistante.actif !== actifAttendu;
      if ((doitCorrigerAlgo || doitCorrigerActif) && sourceExistante.sourceId && driverReleve.mettreAJourSource) {
        await driverReleve.mettreAJourSource(sourceExistante.sourceId, {
          ...(doitCorrigerAlgo ? { algo: algoAttendu } : {}),
          ...(doitCorrigerActif ? { actif: actifAttendu } : {}),
        });
        if (doitCorrigerAlgo) sourceExistante.algo = algoAttendu;
        if (doitCorrigerActif) sourceExistante.actif = actifAttendu;
      }
      nbSourcesExistantes += 1;
      synthese.push({
        emailExpéditeur: key,
        algo: sourceExistante.algo,
        actif: sourceExistante.actif ? 'Oui' : 'Non',
        nbEmails,
      });
      continue;
    }
    const algo = algoParExpediteur(key);
    const actifParDefaut = actifParDefautPourAlgo(algo); // algo connu => activer par défaut
    const source: SourceEmail = {
      emailExpéditeur: key,
      algo,
      actif: actifParDefaut,
    };
    const created = await driverReleve.creerSource(source);
    indexParEmail.set(normaliserEmailExpediteur(created.emailExpéditeur), created);
    synthese.push({
      emailExpéditeur: key,
      algo: source.algo,
      actif: actifParDefaut ? 'Oui' : 'Non',
      nbEmails,
    });
    nbSourcesCreees += 1;
  }

  synthese.sort((a, b) => b.nbEmails - a.nbEmails);
  const sousTotauxPrevisionnels = synthese.reduce(
    (acc, ligne) => {
      if (ligne.actif === 'Oui') {
        acc.emailsÀArchiver += ligne.nbEmails;
      }
      if (
        (
          ligne.algo === 'Linkedin' ||
          ligne.algo === 'HelloWork' ||
          ligne.algo === 'Welcome to the Jungle' ||
          ligne.algo === 'Job That Make Sense' ||
          ligne.algo === 'cadreemploi'
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
