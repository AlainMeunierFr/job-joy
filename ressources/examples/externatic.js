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
        'Entreprise': 'Externatic',
        'URL': record.url,
        'Texte de l\'offre': record.description,
        'Ville': record.lieu,
        'Statut': 'A analyser',
        'Source': 'Externatic',
      }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.id;
}

function extraireOffres(html) {
  const results = [];
  const regex = /<div class="post_list_one-container">([\s\S]*?)<\/span>\s*<\/div>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const bloc = match[1];
    const urlMatch = bloc.match(/href="(https:\/\/www\.externatic\.fr\/offres\/[^"]+)"/);
    const titreMatch = bloc.match(/<a[^>]+>([^<]+)<\/a>/);
    const lieuMatch = bloc.match(/class="term">\s*([\s\S]*?)\s*<\/div>/);
    const salaireMatch = bloc.match(/salary-interval">\s*([\s\S]*?)\s*<\/div>/);

    if (!urlMatch || !titreMatch) continue;

    results.push({
      url: urlMatch[1],
      titre: titreMatch[1].trim(),
      lieu: lieuMatch ? lieuMatch[1].replace(/&nbsp;/g, ' ').trim() : "",
      salaire: salaireMatch ? salaireMatch[1].trim() : "",
    });
  }
  return results;
}

// Main
const pagesDir = './Externatic';
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
    process.stdout.write(`  Fetching ${offre.titre}... `);
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

    await new Promise(r => setTimeout(r, 500));
  }
}

console.log(`\nTerminé : ${total} offres insérées, ${erreurs} erreurs`);