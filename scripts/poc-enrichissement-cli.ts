#!/usr/bin/env node
/**
 * POC Enrichissement en ligne de commande — une passe, logs détaillés.
 * But : voir exactement ce qui est récupéré, ce qui est envoyé à Airtable, et si le statut est mis à jour.
 *
 * Usage:
 *   npm run poc:enrichissement
 *   npm run poc:enrichissement -- --limit 1
 *   npm run poc:enrichissement -- --source HelloWork --limit 5
 *
 * Options:
 *   --limit N      Traiter au plus N offres (défaut: 3)
 *   --source PLUGIN  Ne traiter que les offres de cette source (ex: HelloWork, Linkedin, Cadre Emploi, Welcome to the Jungle, Job That Make Sense)
 */
import '../utils/load-env-local.js';
import { join } from 'node:path';
import { lireAirTable } from '../utils/parametres-airtable.js';
import { createAirtableEnrichissementDriver } from '../utils/airtable-enrichissement-driver.js';
import { createSourcePluginsRegistry } from '../utils/source-plugins.js';
import { STATUT_A_ANALYSER, STATUT_EXPIRE } from '../utils/enrichissement-offres.js';
import type { ChampsOffreAirtable } from '../utils/enrichissement-offres.js';

const DATA_DIR = join(process.cwd(), 'data');

function champsVides(champs: Record<string, string | undefined>): boolean {
  if (!champs || typeof champs !== 'object') return true;
  return !(
    (champs.texteOffre && champs.texteOffre.trim()) ||
    (champs.poste && champs.poste.trim()) ||
    (champs.entreprise && champs.entreprise.trim()) ||
    (champs.ville && champs.ville.trim()) ||
    (champs.département && champs.département.trim()) ||
    (champs.salaire && champs.salaire.trim()) ||
    (champs.dateOffre && champs.dateOffre.trim())
  );
}

function donneesSuffisantesPourAnalyser(champs: Record<string, string | undefined>): boolean {
  const texteOk = !!(champs.texteOffre && champs.texteOffre.trim());
  const metaOk = !!(
    (champs.poste && champs.poste.trim()) ||
    (champs.entreprise && champs.entreprise.trim()) ||
    (champs.ville && champs.ville.trim()) ||
    (champs.département && champs.département.trim()) ||
    (champs.salaire && champs.salaire.trim()) ||
    (champs.dateOffre && champs.dateOffre.trim())
  );
  return texteOk && metaOk;
}

function parseLimit(): number {
  const i = process.argv.indexOf('--limit');
  if (i === -1 || !process.argv[i + 1]) return 3;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

function parseSourceFilter(): string | null {
  const i = process.argv.indexOf('--source');
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1].trim() || null;
}

/** Plugins connus (pour afficher la liste si --source invalide). */
const PLUGINS_CONNUS = [
  'HelloWork',
  'Linkedin',
  'Welcome to the Jungle',
  'Job That Make Sense',
  'Cadre Emploi',
] as const;

function pluginMatch(pluginPlugin: string, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  const p = pluginPlugin.trim().toLowerCase();
  if (p === f) return true;
  if (f === 'linkedin' && p === 'linkedin') return true;
  if (f === 'wttj') return p === 'welcome to the jungle';
  if (f === 'welcome to the jungle') return p === 'welcome to the jungle';
  if (f === 'jtms') return p === 'job that make sense';
  return p.includes(f) || f.includes(p);
}

async function main(): Promise<void> {
  const limit = parseLimit();
  const sourceFilter = parseSourceFilter();
  console.log('POC Enrichissement CLI — limite =', limit);
  if (sourceFilter) console.log('Filtre source =', sourceFilter);
  console.log('Config: data dir =', DATA_DIR);

  const airtable = lireAirTable(DATA_DIR);
  if (!airtable?.apiKey?.trim() || !airtable?.base?.trim() || !airtable?.offres?.trim()) {
    console.error('Configuration Airtable incomplète (apiKey, base, offres).');
    process.exitCode = 1;
    return;
  }

  const { normaliserBaseId } = await import('../utils/airtable-url.js');
  const { ensureAirtableEnums } = await import('../utils/airtable-ensure-enums.js');
  const baseId = normaliserBaseId(airtable.base);
  const sourcesId = airtable.sources?.trim() ?? '';
  const offresId = airtable.offres.trim();
  if (sourcesId) {
    const enums = await ensureAirtableEnums(airtable.apiKey.trim(), baseId, sourcesId, offresId);
    if (!enums.statut) {
      console.error('');
      console.error('ERREUR: La synchro des options du champ Statut (ex. « Expiré ») a échoué.');
      console.error('Sans cela, les mises à jour de statut (ex. offres expirées HelloWork) échoueront avec 422.');
      console.error('');
      console.error('À faire :');
      console.error('  1. Donner au token Airtable les scopes schema.bases:read et schema.bases:write,');
      console.error('     OU');
      console.error('  2. Ajouter manuellement l’option « Expiré » dans le champ Statut de la table Offres (Airtable).');
      console.error('');
      console.warn('Avertissement: synchro options Statut au demarrage echouee. Typecast sera utilise a chaque mise a jour (comme Sources.plugin).');
    }
  }
  const driver = createAirtableEnrichissementDriver({
    apiKey: airtable.apiKey.trim(),
    baseId,
    offresId,
    sourcesId: sourcesId || undefined,
  });

  const registry = createSourcePluginsRegistry();
  const candidates = await driver.getOffresARecuperer();
  let eligibles = candidates.filter((o) => {
    const plugin = registry.getOfferFetchPluginByUrl(o.url);
    return !!plugin && plugin.stage2Implemented;
  });

  if (sourceFilter) {
    const before = eligibles.length;
    eligibles = eligibles.filter((o) => {
      const plugin = registry.getOfferFetchPluginByUrl(o.url);
      return plugin && pluginMatch(plugin.plugin, sourceFilter);
    });
    if (eligibles.length === 0 && before > 0) {
      console.error('Aucune offre pour la source "' + sourceFilter + '". Plugins connus:', PLUGINS_CONNUS.join(', '));
      process.exitCode = 1;
      return;
    }
    if (eligibles.length === 0 && before === 0) {
      console.log('Rien à traiter.');
      return;
    }
    console.log('Éligibles pour la source', sourceFilter + ':', eligibles.length);
  }

  console.log('Candidats (Statut = Annonce à récupérer, source active):', candidates.length);
  if (!sourceFilter) console.log('Éligibles (plugin phase 2):', eligibles.length);
  if (eligibles.length === 0) {
    console.log('Rien à traiter.');
    return;
  }

  const toProcess = eligibles.slice(0, limit);
  console.log('Traitement de', toProcess.length, 'offre(s)\n');

  for (let i = 0; i < toProcess.length; i++) {
    const offre = toProcess[i];
    const plugin = registry.getOfferFetchPluginByUrl(offre.url)?.plugin ?? '?';
    console.log('--- Offre', i + 1, '/', toProcess.length, '| id=', offre.id, '| plugin=', plugin);
    console.log('    URL:', offre.url);

    const result = await registry.getOfferFetchPluginByUrl(offre.url)!.recupererContenuOffre(offre.url);
    if (!result.ok) {
      console.log('    fetch: ÉCHEC —', result.message);
      const is410 = /410|expir|gone/i.test(result.message);
      if (is410) {
        try {
          await driver.updateOffre(offre.id, { Statut: STATUT_EXPIRE });
          console.log('    → Statut mis à « Expiré » (PATCH OK)');
        } catch (err) {
          console.log('    → PATCH Expiré: ERREUR —', err instanceof Error ? err.message : String(err));
        }
      }
      console.log('');
      continue;
    }
    console.log('    fetch: OK');
    const ch = result.champs ?? {};
    console.log('    champs: texteOffre length=', (ch.texteOffre?.length ?? 0), '| poste=', ch.poste ?? '(vide)', '| entreprise=', ch.entreprise ?? '(vide)');

    const vides = champsVides(ch);
    const suffisant = donneesSuffisantesPourAnalyser(ch);
    console.log('    champsVides?', vides, '| donneesSuffisantesPourAnalyser?', suffisant);

    const champs: ChampsOffreAirtable = {};
    if (ch.texteOffre) champs["Texte de l'offre"] = ch.texteOffre;
    if (ch.poste) champs.Poste = ch.poste;
    if (ch.entreprise) champs.Entreprise = ch.entreprise;
    if (ch.ville) champs.Ville = ch.ville;
    if (ch.département) champs.Département = ch.département;
    if (ch.salaire) champs.Salaire = ch.salaire;
    if (ch.dateOffre) champs.DateOffre = ch.dateOffre;
    if (suffisant) {
      champs.Statut = STATUT_A_ANALYSER;
      console.log('    → Statut sera mis à « À analyser »');
    } else {
      console.log('    → Statut NON mis à jour (données insuffisantes)');
    }
    console.log('    updateOffre keys:', Object.keys(champs).join(', '));

    try {
      await driver.updateOffre(offre.id, champs);
      console.log('    PATCH Airtable: OK');
    } catch (err) {
      console.log('    PATCH Airtable: ERREUR —', err instanceof Error ? err.message : String(err));
    }
    console.log('');
  }

  console.log('POC terminé.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
