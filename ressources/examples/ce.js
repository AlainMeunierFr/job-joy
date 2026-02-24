// ============================================================
// CONFIGURATION
// ============================================================
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;

// ============================================================
// EXTRACTION DES OFFRES DEPUIS LE HTML DE LA PAGE LISTE
// ============================================================
function extraireOffres(html) {
  const results = [];
  const seen = new Set();

  const regex = /href="(https:\/\/www\.cadremploi\.fr\/emploi\/detail_offre\?offreId=(\d+))" class="job-title"[^>]*>([^<]+)<\/a>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const [, url, id, titre] = match;
    if (seen.has(id)) continue;
    seen.add(id);

    // Chercher le lieu juste après le titre
    const idx = html.indexOf(match[0]);
    const bloc = html.substring(idx, idx + 500);
    const lieuMatch = bloc.match(/<p class="text-pale-grey-20">([^<]+)<\/p>/);

    results.push({
      id,
      url,
      titre: titre.trim(),
      lieu: lieuMatch ? lieuMatch[1].trim() : "",
    });
  }

  return results;
}

// ============================================================
// FETCH DU DETAIL VIA PUPPETEER (avec stealth anti-Cloudflare)
// ============================================================
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
const browser = await puppeteer.launch({ headless: true });

async function fetchDetail(url) {
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Accepter les cookies si présents
    const cookieButton = await page.$('button[id*="accept"], button[class*="accept"]');
    if (cookieButton) {
      await cookieButton.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Entreprise : ligne après "Qui a publié cette offre d'emploi ?"
      const entrepriseIdx = bodyText.indexOf('ENTREPRISE\n');
      const entreprise = entrepriseIdx !== -1
        ? bodyText.substring(entrepriseIdx + 11).split('\n')[0].trim()
        : "";

      // Description : entre "Quelles sont les missions ?" et "Quel est le profil idéal ?"
      const debutIdx = bodyText.indexOf('Quelles sont les missions ?');
      const finIdx = bodyText.indexOf('Informations complémentaires');
      const description = debutIdx !== -1
        ? bodyText.substring(debutIdx, finIdx !== -1 ? finIdx : debutIdx + 8000).trim()
        : "";

      return { entreprise, description };
    });

    await page.close();
    return result;
  } catch(e) {
    console.log('    Erreur Puppeteer: ' + e.message);
    return { entreprise: "", description: "" };
  }
}

// ============================================================
// INSERTION DANS AIRTABLE
// ============================================================
async function pushToAirtable(record) {
  const res = await fetch("https://api.airtable.com/v0/" + BASE_ID + "/" + TABLE_ID, {
    method: 'POST',
    headers: {
      'Authorization': "Bearer " + AIRTABLE_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        'Poste': record.titre,
        'Entreprise': record.entreprise,
        'URL': record.url,
        'Id offre': record.id,
        'Ville': record.lieu,
        'Texte de l\'offre': record.description,
        'Statut': 'A analyser',
        'Source': 'Cadremploi',
      }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.id;
}

// ============================================================
// PROGRAMME PRINCIPAL
// ============================================================
import fs from 'fs';
import path from 'path';

const pagesDir = './CE';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
console.log(files.length + " fichier(s) HTML trouvé(s)");

let total = 0;
let erreurs = 0;

for (const file of files) {
  console.log("\nTraitement : " + file);
  const html = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
  const offres = extraireOffres(html);
  console.log("  " + offres.length + " offres extraites");

  for (const offre of offres) {
    process.stdout.write("  " + offre.titre + " (" + offre.lieu + ")... ");
    const detail = await fetchDetail(offre.url);
    offre.entreprise = detail.entreprise;
    offre.description = detail.description;

    if (!offre.description) {
      console.log("⚠️ description vide");
      erreurs++;
      continue;
    }

    try {
      await pushToAirtable(offre);
      console.log('✅');
      total++;
    } catch(e) {
      console.log('❌', e.message);
      erreurs++;
    }

    await new Promise(r => setTimeout(r, 500));
  }
}

await browser.close();
console.log("\nTerminé : " + total + " offres insérées, " + erreurs + " erreurs");