/**
 * Log des appels API (Claude, Airtable) pour suivi consommation (US-2.5).
 * Stockage : dataDir/log-appels-api/AAAA-MM-JJ.json
 */
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';

const SOUS_DOSSIER = 'log-appels-api';

export interface EntreeLogAppel {
  api: string;
  dateTime: string;
  succes: boolean;
  codeErreur?: string;
  /** Intention métier (US-3.4), optionnel pour rétrocompat. */
  intention?: string;
}

export interface OptionsEnregistrerAppel {
  api: string;
  succes: boolean;
  codeErreur?: string;
  /** Intention métier (US-3.4), optionnel. */
  intention?: string;
}

/**
 * Crée le dossier dataDir/log-appels-api/ s'il n'existe pas.
 */
export function assurerDossierLogAppels(dataDir: string): void {
  const chemin = join(dataDir, SOUS_DOSSIER);
  mkdirSync(chemin, { recursive: true });
}

function dateDuJourISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Ajoute une entrée dans le fichier de log du jour (ou de la date fournie pour les tests).
 */
export function enregistrerAppel(
  dataDir: string,
  options: OptionsEnregistrerAppel,
  dateISO?: string
): void {
  assurerDossierLogAppels(dataDir);
  const jour = dateISO ?? dateDuJourISO();
  const entree: EntreeLogAppel = {
    api: options.api,
    dateTime: new Date().toISOString(),
    succes: options.succes,
  };
  if (options.succes === false && options.codeErreur !== undefined) {
    entree.codeErreur = options.codeErreur;
  }
  if (options.intention !== undefined && options.intention !== '') {
    entree.intention = options.intention;
  }
  const dossier = join(dataDir, SOUS_DOSSIER);
  const cheminFichier = join(dossier, `${jour}.json`);
  let entrées: EntreeLogAppel[] = [];
  try {
    const raw = readFileSync(cheminFichier, 'utf-8');
    entrées = JSON.parse(raw);
    if (!Array.isArray(entrées)) entrées = [];
  } catch {
    // fichier absent ou invalide
  }
  entrées.push(entree);
  writeFileSync(cheminFichier, JSON.stringify(entrées, null, 0), 'utf-8');
}

/**
 * Retourne le tableau d'entrées du fichier de log du jour (dateISO au format AAAA-MM-JJ).
 * Retourne [] si le fichier est absent ou invalide.
 */
export function lireLogsDuJour(dataDir: string, dateISO: string): EntreeLogAppel[] {
  const cheminFichier = join(dataDir, SOUS_DOSSIER, `${dateISO}.json`);
  if (!existsSync(cheminFichier)) return [];
  try {
    const raw = readFileSync(cheminFichier, 'utf-8');
    const entrées = JSON.parse(raw);
    return Array.isArray(entrées) ? entrées : [];
  } catch {
    return [];
  }
}

/**
 * Agrégation pour le tableau de bord : totaux par jour et par API.
 * Retourne { [date AAAA-MM-JJ]: { Claude: number, Airtable: number, ... } }.
 * Le dossier log-appels-api doit exister (sinon retourne {}).
 */
export function agregerConsommationParJourEtApi(
  dataDir: string
): Record<string, Record<string, number>> {
  const dossier = join(dataDir, SOUS_DOSSIER);
  if (!existsSync(dossier)) return {};
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.json'));
  const resultat: Record<string, Record<string, number>> = {};
  for (const f of fichiers) {
    const dateISO = f.slice(0, -5);
    if (dateISO.length !== 10) continue;
    const entrées = lireLogsDuJour(dataDir, dateISO);
    const parApi: Record<string, number> = {};
    for (const e of entrées) {
      if (typeof e.api === 'string' && e.api) {
        parApi[e.api] = (parApi[e.api] ?? 0) + 1;
      }
    }
    resultat[dateISO] = parApi;
  }
  return resultat;
}

/**
 * Agrégation par intention (US-3.4) : totaux par jour et par intention.
 * Retourne { [date AAAA-MM-JJ]: { [intention]: number } }.
 * Les entrées sans intention (ou intention vide) sont ignorées.
 */
export function agregerConsommationParJourEtIntention(
  dataDir: string
): Record<string, Record<string, number>> {
  const dossier = join(dataDir, SOUS_DOSSIER);
  if (!existsSync(dossier)) return {};
  const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.json'));
  const resultat: Record<string, Record<string, number>> = {};
  for (const f of fichiers) {
    const dateISO = f.slice(0, -5);
    if (dateISO.length !== 10) continue;
    const entrées = lireLogsDuJour(dataDir, dateISO);
    const parIntention: Record<string, number> = {};
    for (const e of entrées) {
      const intention = typeof e.intention === 'string' ? e.intention.trim() : '';
      if (intention) {
        parIntention[intention] = (parIntention[intention] ?? 0) + 1;
      }
    }
    resultat[dateISO] = parIntention;
  }
  return resultat;
}
