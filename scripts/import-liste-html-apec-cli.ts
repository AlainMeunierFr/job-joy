#!/usr/bin/env node
/**
 * US-6.1 phase 1 (pause) : affiche les URL extraites des fichiers HTML APEC (dossier liste html/apec).
 * Aucun appel Airtable, aucune écriture. Pour validation en ligne de commande.
 */
import '../utils/load-env-local.js';
import { resolve } from 'node:path';
import { getDataDir } from '../utils/data-dir.js';
import { getListeHtmlSourceDir } from '../utils/liste-html-paths.js';
import {
  extraireUrlsApecDepuisDossierDirEtDeplacer,
  extraireUrlsApecDepuisDossierEtDeplacer,
} from '../utils/apec-liste-html-parser.js';

const PLUGIN_APEC = 'apec';

export async function runImportListeHtmlApecCli(
  deps: {
    log?: (message: string) => void;
    logError?: (message: string) => void;
  } = {}
): Promise<number> {
  const log = deps.log ?? console.log;
  const logError = deps.logError ?? console.error;

  const argDir = process.argv[2];
  let urls: Awaited<ReturnType<typeof extraireUrlsApecDepuisDossierEtDeplacer>>;
  try {
    urls = argDir
      ? await extraireUrlsApecDepuisDossierDirEtDeplacer(resolve(argDir))
      : await extraireUrlsApecDepuisDossierEtDeplacer(getDataDir(), PLUGIN_APEC);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      const path = argDir ? resolve(argDir) : getListeHtmlSourceDir(getDataDir(), PLUGIN_APEC);
      logError(`Dossier non trouvé : ${path}`);
      log('Déposez des fichiers HTML de recherche APEC dans ce dossier, ou indiquez un chemin en argument.');
      return 1;
    }
    throw err;
  }

  if (urls.length === 0) {
    log('Aucune URL extraite.');
    return 0;
  }
  log(`${urls.length} URL(s) extraite(s) :`);
  urls.forEach((r, i) => log(`${i + 1}. ${r.url}`));
  return 0;
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runImportListeHtmlApecCli();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

const isCliExecution = (process.argv[1] ?? '').includes('import-liste-html-apec-cli');
if (isCliExecution) {
  void main();
}
