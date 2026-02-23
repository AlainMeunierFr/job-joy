/**
 * Vérifie que le JS inline des pages Paramètres et Tableau de bord est syntaxiquement valide.
 */
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distPath = join(root, 'dist');

async function checkPage(name, getHtml) {
  const html = await getHtml();
  const regex = /<script>([\s\S]*?)<\/script>/g;
  let n = 0;
  let err;
  for (const m of html.matchAll(regex)) {
    n++;
    const script = m[1];
    try {
      new vm.Script(script);
    } catch (e) {
      err = { block: n, message: e.message };
      const posMatch = e.message.match(/Position (\d+)/);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const start = Math.max(0, pos - 80);
        err.snippet = script.slice(start, pos + 60).replace(/\n/g, '\\n');
      }
      break;
    }
  }
  if (err) {
    console.log(name, 'ERREUR bloc', err.block, err.message);
    if (err.snippet) console.log('Snippet:', err.snippet);
    return false;
  }
  console.log(name, 'OK');
  return true;
}

async function main() {
  const { pathToFileURL } = await import('url');
  const { getPageParametres } = await import(pathToFileURL(join(distPath, 'app', 'page-html.js')).href);
  const { getPageTableauDeBord } = await import(pathToFileURL(join(distPath, 'app', 'layout-html.js')).href);
  const dataDir = join(root, 'data');
  const ok1 = await checkPage('Paramètres', () => getPageParametres(dataDir));
  const ok2 = await checkPage('Tableau de bord', () => getPageTableauDeBord());
  process.exit(ok1 && ok2 ? 0 : 1);
}
main();
