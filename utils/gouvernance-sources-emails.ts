/** US-6.6 : 15 noms canoniques + Inconnu (orphelins). Externatic et Talent.io retirés de la liste canonique. */
export type SourceNom =
  | 'Linkedin'
  | 'HelloWork'
  | 'APEC'
  | 'Cadre Emploi'
  | 'Welcome to the Jungle'
  | 'Job That Make Sense'
  | 'Indeed'
  | 'France Travail'
  | 'LesJeudis'
  | 'Michael Page'
  | 'Robert Walters'
  | 'Hays'
  | 'Monster'
  | 'Glassdoor'
  | 'Makesense'
  | 'Inconnu';

export type TypeSource = 'email' | 'liste html' | 'liste csv';

export interface SourceEmail {
  emailExpéditeur: string;
  source: SourceNom;
  type: TypeSource;
  activerCreation: boolean;
  activerEnrichissement: boolean;
  activerAnalyseIA: boolean;
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
  source?: {
    type: string;
    options: string[];
  };
  type?: {
    type: string;
    options?: string[];
  };
  activerCreation?: {
    type: string;
  };
  activerEnrichissement?: {
    type: string;
  };
  activerAnalyseIA?: {
    type: string;
  };
}

/** US-6.6 : aligné sur liste canonique (15 + Inconnu). */
const SOURCES_NOMS_ATTENDUS: SourceNom[] = [
  'Linkedin',
  'HelloWork',
  'APEC',
  'Cadre Emploi',
  'Welcome to the Jungle',
  'Job That Make Sense',
  'Indeed',
  'France Travail',
  'LesJeudis',
  'Michael Page',
  'Robert Walters',
  'Hays',
  'Monster',
  'Glassdoor',
  'Makesense',
  'Inconnu',
];

const HELLOWORK_EXPEDITEUR_NORMALISE = 'notification@emails.hellowork.com';
const WTTJ_EXPEDITEUR_NORMALISE = 'alerts@welcometothejungle.com';
const JTMS_EXPEDITEUR_NORMALISE = 'jobs@makesense.org';
const CADREEMPLOI_EXPEDITEUR_NORMALISE = 'offres@alertes.cadremploi.fr';

function sourceActiveParDefaut(sourceNom: SourceNom): boolean {
  return (
    sourceNom === 'Linkedin' ||
    sourceNom === 'HelloWork' ||
    sourceNom === 'Welcome to the Jungle' ||
    sourceNom === 'Job That Make Sense' ||
    sourceNom === 'Cadre Emploi'
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

export function sourceNomParExpediteur(emailExpediteur: string): SourceNom {
  const key = normaliserEmailExpediteur(emailExpediteur);
  if (key === HELLOWORK_EXPEDITEUR_NORMALISE) return 'HelloWork';
  if (key === WTTJ_EXPEDITEUR_NORMALISE) return 'Welcome to the Jungle';
  if (key === JTMS_EXPEDITEUR_NORMALISE) return 'Job That Make Sense';
  if (key === CADREEMPLOI_EXPEDITEUR_NORMALISE) return 'Cadre Emploi';
  if (key.includes('linkedin.com')) return 'Linkedin';
  return 'Inconnu';
}

export function preparerMigrationSources(schema: SchemaSourceEmail): { ok: true } | { ok: false; message: string } {
  if (!schema.emailExpéditeur || schema.emailExpéditeur.type !== 'text') {
    return { ok: false, message: 'Le champ emailExpéditeur doit être un texte.' };
  }
  if (!schema.source || schema.source.type !== 'singleSelect') {
    return { ok: false, message: 'Le champ source doit être un single select.' };
  }
  if (!schema.type || schema.type.type !== 'singleSelect') {
    return { ok: false, message: 'Le champ type doit être une sélection unique.' };
  }
  const typeOptions = [...(schema.type.options ?? [])];
  const typeAttendu = ['email', 'liste html', 'liste csv'];
  if (typeOptions.length !== typeAttendu.length || typeAttendu.some((v, i) => typeOptions[i] !== v)) {
    return { ok: false, message: 'Le champ type doit contenir exactement : email, liste html, liste csv.' };
  }
  if (!schema.activerCreation || schema.activerCreation.type !== 'checkbox') {
    return { ok: false, message: 'Le champ activerCreation doit être une case à cocher.' };
  }
  if (!schema.activerEnrichissement || schema.activerEnrichissement.type !== 'checkbox') {
    return { ok: false, message: 'Le champ activerEnrichissement doit être une case à cocher.' };
  }
  if (!schema.activerAnalyseIA || schema.activerAnalyseIA.type !== 'checkbox') {
    return { ok: false, message: 'Le champ activerAnalyseIA doit être une case à cocher.' };
  }
  const options = [...schema.source.options];
  const attendu = [...SOURCES_NOMS_ATTENDUS];
  if (options.length !== attendu.length || options.some((v, i) => v !== attendu[i])) {
    return {
      ok: false,
      message:
        `Le champ source doit contenir exactement : ${SOURCES_NOMS_ATTENDUS.join(', ')}.`,
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
    const sourceNom = sourceNomParExpediteur(key);
    const source: SourceEmail = {
      emailExpéditeur: key,
      source: sourceNom,
      type: 'email',
      activerCreation: sourceActiveParDefaut(sourceNom),
      activerEnrichissement: sourceActiveParDefaut(sourceNom),
      activerAnalyseIA: true,
    };
    creees.push(source);
    sourcesConnues.add(key);
  }

  return { creees };
}

export interface OptionsTraitementSources {
  emails: EmailAAnalyser[];
  sourcesExistantes: SourceEmail[];
  parseursDisponibles: SourceNom[];
  onProgress?: (message: string) => void;
  traiterEmail?: (email: EmailAAnalyser, source: SourceEmail) => Promise<{ ok: boolean }>;
  deplacerVersTraite?: (email: EmailAAnalyser, source: SourceEmail) => Promise<void>;
  capturerHtmlExemple?: (sourceKey: string, html: string) => Promise<void>;
}

export interface ResultatTraitementSources {
  creees: SourceEmail[];
  corrections: Array<{
    emailExpéditeur: string;
    ancienSourceNom: SourceNom;
    nouveauSourceNom: SourceNom;
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
    ancienSourceNom: SourceNom;
    nouveauSourceNom: SourceNom;
    ancienActif?: boolean;
    nouveauActif?: boolean;
  }> = [];
  let traitementsExecutés = 0;
  let deplacementsEffectués = 0;

  if (options.emails.length > 0) {
    options.onProgress?.(`0/${options.emails.length}`);
  }
  for (let i = 0; i < options.emails.length; i++) {
    const email = options.emails[i];
    options.onProgress?.(`${i + 1}/${options.emails.length}`);
    const key = normaliserEmailExpediteur(email.from);
    if (!key) continue;
    const source = sourcesMap.get(key);
    // CA2 US-6.2 : ne traiter que les emails dont l'expéditeur est déjà une source en base.
    if (!source) {
      continue;
    }

    const sourceNomAttendu = sourceNomParExpediteur(key);
    if (sourceNomAttendu !== 'Inconnu' && source.source !== sourceNomAttendu) {
      const ancienSourceNom = source.source;
      source.source = sourceNomAttendu;
      corrections.push({
        emailExpéditeur: source.emailExpéditeur,
        ancienSourceNom,
        nouveauSourceNom: sourceNomAttendu,
      });
    }

    const parseurDisponible = parseurs.has(source.source);
    if (source.source !== 'Inconnu' && !parseurDisponible) {
      const ancienSourceNom = source.source;
      source.source = 'Inconnu';
      corrections.push({
        emailExpéditeur: source.emailExpéditeur,
        ancienSourceNom,
        nouveauSourceNom: 'Inconnu',
      });
    }

    if (source.source === 'Inconnu') {
      const dejaCaptures = capturesParExpediteur.get(key) ?? 0;
      if (dejaCaptures < 3) {
        await options.capturerHtmlExemple?.(source.emailExpéditeur, email.html);
        capturesParExpediteur.set(key, dejaCaptures + 1);
      }
      if (source.activerCreation) {
        await options.deplacerVersTraite?.(email, source);
        deplacementsEffectués += 1;
      }
      continue;
    }

    if (!source.activerCreation) {
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
