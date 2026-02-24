import fs from 'fs';
import path from 'path';
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;

async function fetchDescription(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      }
    });
    const html = await res.text();
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!jsonMatch) return "";
    const data = JSON.parse(jsonMatch[1]);
    return data.description
      ?.replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || "";
  } catch(e) {
    console.error('Erreur fetch', url, e.message);
    return "";
  }
}

async function pushToAirtable(record) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        'Poste': record.titre,
        'Entreprise': record.entreprise,
        'URL': record.url,
        'Texte de l\'offre': record.description,
        'Statut': 'A analyser',
        'Source': 'Welcome to the Jungle',
      }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.id;
}

function extraireOffres(html) {
  const results = [];
  const seen = new Set();

  const urlRegex = /https:\/\/www\.welcometothejungle\.com\/fr\/companies\/[^"'\s<>]+\/jobs\/[^"'\s<>]+/g;
  const urls = [...new Set(html.match(urlRegex) || [])];

  for (const url of urls) {
    const idx = html.indexOf(url);
    const bloc = html.substring(Math.max(0, idx - 300), idx + 200);

    const titreMatch = bloc.match(/aria-label="Consultez l&#39;offre ([^"]+)"/);
    const entMatch = bloc.match(/alt="([^"]+)"/);

    if (!titreMatch || !entMatch) continue;

    results.push({
      url,
      titre: titreMatch[1].trim(),
      entreprise: entMatch[1].trim(),
    });
  }

  return results;
}

// Main
const pagesDir = './WTTJ';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
console.log(`${files.length} fichier(s) HTML trouvé(s)`);

let total = 0;
let erreurs = 0;

for (const file of files) {
  console.log(`\nTraitement : ${file}`);
  const html = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
  const offres = extraireOffres(html);
  console.log(`  ${offres.length} offres extraites`);

  for (const offre of offres) {
    process.stdout.write(`  Fetching ${offre.entreprise} - ${offre.titre}... `);
    offre.description = await fetchDescription(offre.url);
    
    if (!offre.description) {
      console.log('⚠️ description vide');
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

    // Pause pour ne pas surcharger les APIs
    await new Promise(r => setTimeout(r, 500));
  }
}

console.log(`\nTerminé : ${total} offres insérées, ${erreurs} erreurs`);