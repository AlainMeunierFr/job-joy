// ============================================================
// CONFIGURATION
// ============================================================
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;

// ============================================================
// LECTURE DU FICHIER EXCEL
// ============================================================
import pkg from 'xlsx';
const { readFile, utils } = pkg;

function lireOffres(fichier) {
  const workbook = readFile(fichier);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = utils.sheet_to_json(sheet);
  
  return rows.map(row => ({
    titre: row['Job offer title'] || "",
    entreprise: row['Company name'] || "",
    ville: row['Job offer location'] || "",
    description: row['Job offer description'] || "",
    url: row['Job offer link'] || "",
  }));
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
        'Ville': record.ville,
        'Texte de l\'offre': record.description.substring(0, 8000),
        'Statut': 'A analyser',
        'Source': 'Mantiks',
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
const fichier = './Mantiks/1.xlsx';
const offres = lireOffres(fichier);
console.log(offres.length + " offres trouvées dans le fichier");

let total = 0;
let erreurs = 0;

for (const offre of offres) {
  process.stdout.write("  " + offre.entreprise + " - " + offre.titre + "... ");
  try {
    await pushToAirtable(offre);
    console.log('✅');
    total++;
  } catch(e) {
    console.log('❌', e.message);
    erreurs++;
  }
  await new Promise(r => setTimeout(r, 300));
}

console.log("\nTerminé : " + total + " offres insérées, " + erreurs + " erreurs");