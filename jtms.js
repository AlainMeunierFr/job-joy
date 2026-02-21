import 'dotenv/config';
// ============================================================
// CONFIGURATION
// ============================================================
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;

// ============================================================
// EXTRACTION DES OFFRES DEPUIS LE HTML DE LA PAGE
// ============================================================
function extraireOffres(html) {
  const results = [];
  const seen = new Set();

  const urlRegex = /href="(https:\/\/jobs\.makesense\.org\/fr\/jobs\/[^"]+)"/g;
  let match;

  while ((match = urlRegex.exec(html)) !== null) {
    const url = match[1].split('?')[0];
    if (seen.has(url)) continue;
    seen.add(url);

    const idx = html.indexOf(match[1]);
    const bloc = html.substring(idx, idx + 3000);

    const titreMatch = bloc.match(/class="content__title">\s*([^<]+?)\s*</);
    const entrepriseMatch = bloc.match(/alt="([^"]+) logotype"/);

    results.push({
      url,
      titre: titreMatch ? titreMatch[1].trim() : "",
      entreprise: entrepriseMatch ? entrepriseMatch[1].trim() : "",
    });
  }

  return results;
}

// ============================================================
// FETCH DU TEXTE DE L'OFFRE (avec Puppeteer)
// ============================================================
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });

async function fetchDescription(url) {
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Accepter les cookies si présents
    const cookieButton = await page.$('button[id*="accept"], button[class*="accept"]');
    if (cookieButton) {
      await cookieButton.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    const bodyText = await page.evaluate(() => document.body.innerText);
    
    // Extraire depuis "Description de la mission"
    const idx = bodyText.indexOf('Description de la mission');
    if (idx !== -1) {
      return bodyText.substring(idx).substring(0, 8000).trim();
    }

    return "";
  } catch(e) {
    console.log('    Erreur: ' + e.message);
    return "";
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
        'Texte de l\'offre': record.description,
        'Statut': 'A analyser',
        'Source': 'Jobs that Make Sense',
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

const pagesDir = './JTMS';
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
    process.stdout.write("  " + offre.entreprise + " - " + offre.titre + "... ");
    offre.description = await fetchDescription(offre.url);

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

console.log("\nTerminé : " + total + " offres insérées, " + erreurs + " erreurs");