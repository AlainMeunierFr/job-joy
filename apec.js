import 'dotenv/config';
// ============================================================
// CONFIGURATION
// ============================================================
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_ID = process.env.AIRTABLE_TABLE_ID;

// ============================================================
// PARAMÈTRES DE RECHERCHE APEC
// ============================================================
const SEARCH_PARAMS = {
  lieux: [],
  fonctions: [],
  statutPoste: [],
  typesContrat: ["101888"],
  typesConvention: ["143684","143685","143686","143687"],
  niveauxExperience: [],
  idsEtablissement: [],
  secteursActivite: [],
  typesTeletravail: [],
  idNomZonesDeplacement: [],
  positionNumbersExcluded: [],
  typeClient: "CADRE",
  sorts: [{ type: "SCORE", direction: "DESCENDING" }],
  activeFiltre: true,
  pointGeolocDeReference: { distance: 0 },
  salaireMinimum: "60",
  salaireMaximum: "200"
};

// ============================================================
// MOTS-CLÉS DE RECHERCHE APEC
// ============================================================
const SEARCHES = [
  { motsCles: "product owner" },
  { motsCles: "product manager" },
  { motsCles: "CPO" },
  { motsCles: "CPTO" },
];

// ============================================================
// FILTRE SUR LE TITRE : offres hors scope ignorées
// ============================================================
function titreRelevant(intitule) {
  const titre = intitule.toLowerCase();
  return titre.includes('product owner') ||
         titre.includes('product manager') ||
         titre.includes('cpo') ||
         titre.includes('cpto') ||
         titre.includes('chief product') ||
         titre.includes('head of product') ||
         titre.includes('directeur produit') ||
         titre.includes('responsable produit') ||
         titre.includes('scrum master') ||
         titre.includes('coach agile') ||
         titre.includes('agile coach');
}

// ============================================================
// DÉCODAGE DES ENTITÉS HTML
// ============================================================
function decodeHtml(str) {
  return str
    .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è').replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à').replace(/&acirc;/g, 'â').replace(/&ocirc;/g, 'ô')
    .replace(/&ucirc;/g, 'û').replace(/&ugrave;/g, 'ù').replace(/&iuml;/g, 'ï')
    .replace(/&ccedil;/g, 'ç').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»').replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&oelig;/g, 'œ').replace(/&aelig;/g, 'æ').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// ============================================================
// APPEL API APEC : LISTE DES OFFRES
// ============================================================
async function fetchOffres(startIndex, search) {
  const res = await fetch('https://www.apec.fr/cms/webservices/rechercheOffre', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://www.apec.fr/',
      'Origin': 'https://www.apec.fr',
    },
    body: JSON.stringify({
      ...SEARCH_PARAMS,
      motsCles: search.motsCles,
      pagination: { range: 20, startIndex }
    })
  });
  return await res.json();
}

// ============================================================
// APPEL API APEC : DÉTAIL D'UNE OFFRE
// ============================================================
async function fetchDetail(numeroOffre) {
  try {
    const res = await fetch("https://www.apec.fr/cms/webservices/offre/public?numeroOffre=" + numeroOffre, {
      headers: {
        'Accept': 'application/json',
        'Referer': 'https://www.apec.fr/',
        'User-Agent': 'Mozilla/5.0',
      }
    });
    const data = await res.json();

    const nettoyer = (html) => decodeHtml((html || "")
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim());

    return [
      nettoyer(data.texteHtml),
      nettoyer(data.texteHtmlProfil),
      nettoyer(data.texteHtmlEntreprise)
    ].filter(t => t).join(' --- ');

  } catch(e) {
    console.log('Erreur detail:', e.message);
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
        'Poste': record.intitule,
        'Entreprise': record.nomCommercial || "",
        'URL': "https://www.apec.fr/candidat/recherche-emploi.html/emploi/detail-offre/" + record.numeroOffre,
        'Id offre': String(record.id),
        'Ville': record.lieuTexte || "",
        'Texte de l\'offre': record.description,
        'Statut': 'A analyser',
        'Source': 'APEC',
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
const seen = new Set();
let total = 0;
let erreurs = 0;
let horsScope = 0;

for (const search of SEARCHES) {
  console.log("\n=== Recherche : " + search.motsCles + " ===");
  let startIndex = 0;

  while (true) {
    console.log("  Récupération offres " + (startIndex + 1) + "...");
    const data = await fetchOffres(startIndex, search);
    const offres = data.resultats || [];
    console.log("  " + offres.length + " offres reçues");
    if (offres.length === 0) break;

    for (const offre of offres) {

      // Dédoublonnage inter-recherches
      if (seen.has(offre.id)) {
        console.log("  [DOUBLON] " + offre.intitule);
        continue;
      }
      seen.add(offre.id);

      // Filtre sur le titre
      if (!titreRelevant(offre.intitule)) {
        console.log("  [HORS SCOPE] " + offre.intitule);
        horsScope++;
        continue;
      }

      // Récupération du détail et insertion Airtable
      process.stdout.write("  " + offre.intitule + " (" + offre.lieuTexte + ")... ");

      offre.description = await fetchDetail(offre.numeroOffre);
      if (!offre.description) offre.description = offre.texteOffre || "";

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

    startIndex += 20;
  }
}

console.log("\nTerminé : " + total + " offres insérées, " + horsScope + " hors scope, " + erreurs + " erreurs");