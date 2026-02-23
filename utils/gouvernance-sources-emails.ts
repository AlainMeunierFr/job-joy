export type AlgoSource =
  | 'Linkedin'
  | 'Inconnu'
  | 'HelloWork'
  | 'Welcome to the Jungle'
  | 'Job That Make Sense'
  | 'cadreemploi';

export interface SourceEmail {
  emailExpéditeur: string;
  algo: AlgoSource;
  actif: boolean;
}

export interface EmailAAnalyser {
  id: string;
  from: string;
  html: string;
  receivedAtIso?: string;
}

export interface SchemaSourceEmail {
  emailExpéditeur?: {
    type: string;
  };
  algo?: {
    type: string;
    options: string[];
  };
  actif?: {
    type: string;
  };
}

const ALGOS_ATTENDUS: AlgoSource[] = [
  'Linkedin',
  'Inconnu',
  'HelloWork',
  'Welcome to the Jungle',
  'Job That Make Sense',
  'cadreemploi',
];

const HELLOWORK_EXPEDITEUR_NORMALISE = 'notification@emails.hellowork.com';
const WTTJ_EXPEDITEUR_NORMALISE = 'alerts@welcometothejungle.com';
const JTMS_EXPEDITEUR_NORMALISE = 'jobs@makesense.org';
const CADREEMPLOI_EXPEDITEUR_NORMALISE = 'offres@alertes.cadremploi.fr';

function algoActifParDefaut(algo: AlgoSource): boolean {
  return (
    algo === 'Linkedin' ||
    algo === 'HelloWork' ||
    algo === 'Welcome to the Jungle' ||
    algo === 'Job That Make Sense' ||
    algo === 'cadreemploi'
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

function normaliserEmailExpediteur(emailExpediteur: string): string {
  return extraireAdresseEmail(emailExpediteur).toLowerCase();
}

function algoParExpediteur(emailExpediteur: string): AlgoSource {
  const key = normaliserEmailExpediteur(emailExpediteur);
  if (key === HELLOWORK_EXPEDITEUR_NORMALISE) return 'HelloWork';
  if (key === WTTJ_EXPEDITEUR_NORMALISE) return 'Welcome to the Jungle';
  if (key === JTMS_EXPEDITEUR_NORMALISE) return 'Job That Make Sense';
  if (key === CADREEMPLOI_EXPEDITEUR_NORMALISE) return 'cadreemploi';
  if (key.includes('linkedin.com')) return 'Linkedin';
  return 'Inconnu';
}

export function preparerMigrationSources(schema: SchemaSourceEmail): { ok: true } | { ok: false; message: string } {
  if (!schema.emailExpéditeur || schema.emailExpéditeur.type !== 'text') {
    return { ok: false, message: 'Le champ emailExpéditeur doit être un texte.' };
  }
  if (!schema.algo || schema.algo.type !== 'singleSelect') {
    return { ok: false, message: 'Le champ algo doit être un single select.' };
  }
  if (!schema.actif || schema.actif.type !== 'checkbox') {
    return { ok: false, message: 'Le champ actif doit être une case à cocher.' };
  }
  const options = [...schema.algo.options];
  const attendu = [...ALGOS_ATTENDUS];
  if (options.length !== attendu.length || options.some((v, i) => v !== attendu[i])) {
    return {
      ok: false,
      message:
        'Le champ algo doit contenir exactement Linkedin, Inconnu, HelloWork, Welcome to the Jungle, Job That Make Sense et cadreemploi.',
    };
  }
  return { ok: true };
}

export function auditerSourcesDepuisEmails(options: {
  emailsExpediteurs: string[];
  sourcesExistantes: SourceEmail[];
}): { creees: SourceEmail[] } {
  const sourcesConnues = new Set(
    options.sourcesExistantes.map((s) => normaliserEmailExpediteur(s.emailExpéditeur))
  );
  const creees: SourceEmail[] = [];

  for (const from of options.emailsExpediteurs) {
    const key = normaliserEmailExpediteur(from);
    if (sourcesConnues.has(key)) continue;
    if (!key) continue;
    const algo = algoParExpediteur(key);
    const source: SourceEmail = {
      emailExpéditeur: key,
      algo,
      actif: algoActifParDefaut(algo),
    };
    creees.push(source);
    sourcesConnues.add(key);
  }

  return { creees };
}

export interface OptionsTraitementSources {
  emails: EmailAAnalyser[];
  sourcesExistantes: SourceEmail[];
  parseursDisponibles: AlgoSource[];
  onProgress?: (message: string) => void;
  traiterEmail?: (email: EmailAAnalyser, source: SourceEmail) => Promise<{ ok: boolean }>;
  deplacerVersTraite?: (email: EmailAAnalyser, source: SourceEmail) => Promise<void>;
  capturerHtmlExemple?: (sourceKey: string, html: string) => Promise<void>;
}

export interface ResultatTraitementSources {
  creees: SourceEmail[];
  corrections: Array<{
    emailExpéditeur: string;
    ancienAlgo: AlgoSource;
    nouveauAlgo: AlgoSource;
    ancienActif?: boolean;
    nouveauActif?: boolean;
  }>;
  traitementsExecutés: number;
  deplacementsEffectués: number;
}

export async function traiterEmailsSelonStatutSource(
  options: OptionsTraitementSources
): Promise<ResultatTraitementSources> {
  const parseurs = new Set(options.parseursDisponibles);
  const sourcesMap = new Map(
    options.sourcesExistantes.map((s) => [normaliserEmailExpediteur(s.emailExpéditeur), { ...s }])
  );
  const capturesParExpediteur = new Map<string, number>();

  const creees: SourceEmail[] = [];
  const corrections: Array<{
    emailExpéditeur: string;
    ancienAlgo: AlgoSource;
    nouveauAlgo: AlgoSource;
    ancienActif?: boolean;
    nouveauActif?: boolean;
  }> = [];
  let traitementsExecutés = 0;
  let deplacementsEffectués = 0;

  for (let i = 0; i < options.emails.length; i++) {
    const email = options.emails[i];
    options.onProgress?.(`${i + 1}/${options.emails.length}`);
    const key = normaliserEmailExpediteur(email.from);
    if (!key) continue;
    let source = sourcesMap.get(key);

    if (!source) {
      const algo = algoParExpediteur(key);
      source = {
        emailExpéditeur: key,
        algo,
        actif: algoActifParDefaut(algo),
      };
      sourcesMap.set(key, source);
      creees.push(source);
    }

    const algoAttendu = algoParExpediteur(key);
    if (algoAttendu !== 'Inconnu' && source.algo !== algoAttendu) {
      const ancienAlgo = source.algo;
      source.algo = algoAttendu;
      corrections.push({
        emailExpéditeur: source.emailExpéditeur,
        ancienAlgo,
        nouveauAlgo: algoAttendu,
      });
    }

    const parseurDisponible = parseurs.has(source.algo);
    if (source.algo !== 'Inconnu' && !parseurDisponible) {
      const ancienAlgo = source.algo;
      source.algo = 'Inconnu';
      corrections.push({
        emailExpéditeur: source.emailExpéditeur,
        ancienAlgo,
        nouveauAlgo: 'Inconnu',
      });
    }

    if (source.algo === 'Inconnu') {
      const dejaCaptures = capturesParExpediteur.get(key) ?? 0;
      if (dejaCaptures < 3) {
        await options.capturerHtmlExemple?.(source.emailExpéditeur, email.html);
        capturesParExpediteur.set(key, dejaCaptures + 1);
      }
      if (source.actif) {
        await options.deplacerVersTraite?.(email, source);
        deplacementsEffectués += 1;
      }
      continue;
    }

    if (!source.actif) {
      continue;
    }

    if (!parseurDisponible) {
      continue;
    }

    const traitement = await options.traiterEmail?.(email, source);
    const traitementOk = traitement?.ok ?? true;
    if (!traitementOk) {
      continue;
    }
    traitementsExecutés += 1;

    await options.deplacerVersTraite?.(email, source);
    deplacementsEffectués += 1;
  }

  return {
    creees,
    corrections,
    traitementsExecutés,
    deplacementsEffectués,
  };
}
