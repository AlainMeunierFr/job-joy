#!/usr/bin/env node
import '../utils/load-env-local.js';
import { join } from 'node:path';
import { runAuditSources, type ResultatAuditSources } from './run-audit-sources.js';

const DATA_DIR = join(process.cwd(), 'data');

function afficherSynthese(result: Extract<ResultatAuditSources, { ok: true }>, log: (message: string) => void): void {
  log(`Audit sources terminé : ${result.nbEmailsScannes} email(s) scanné(s).`);
  log(`Sources créées : ${result.nbSourcesCreees}`);
  log(`Sources existantes : ${result.nbSourcesExistantes}`);
  log('Synthèse:');
  for (const ligne of result.synthese) {
    log(`- ${ligne.emailExpéditeur} | ${ligne.algo} | ${ligne.actif} | ${ligne.nbEmails}`);
  }
  log(`Sous-totaux prévisionnels: emailsÀArchiver=${result.sousTotauxPrevisionnels.emailsÀArchiver}, emailsÀAnalyser=${result.sousTotauxPrevisionnels.emailsÀAnalyser}`);
}

export async function runAuditSourcesCli(
  deps: {
    runAudit?: typeof runAuditSources;
    log?: (message: string) => void;
    logError?: (message: string) => void;
  } = {}
): Promise<number> {
  const runAudit = deps.runAudit ?? runAuditSources;
  const log = deps.log ?? console.log;
  const logError = deps.logError ?? console.error;

  const result = await runAudit(DATA_DIR, {
    onProgress: (message) => log(message),
  });

  if (!result.ok) {
    logError(result.message);
    return 1;
  }

  afficherSynthese(result, log);
  return 0;
}

async function main(): Promise<void> {
  try {
    process.exitCode = await runAuditSourcesCli();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

const isCliExecution = (process.argv[1] ?? '').includes('audit-sources-cli');
if (isCliExecution) {
  void main();
}
