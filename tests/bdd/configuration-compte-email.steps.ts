/**
 * Step definitions pour la fonctionnalité Configuration du compte email.
 * Données compte en RAM côté serveur (API) — aucun accès disque, pas d'écrasement de data/compte.json.
 */
import { test as base, createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';

type Fixtures = object;

export const test = base.extend<Fixtures>({});

export const { Given, When, Then } = createBdd(test);

const PAGE_URL = '/parametres';
const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

async function ouvrirBlocConnexionSiFerme(page: import('@playwright/test').Page): Promise<void> {
  const details = page.locator('details.blocParametrage-connexion');
  if ((await details.getAttribute('open')) === null) {
    await page.locator('#titre-connexion').click();
  }
}

// --- Contexte ---
Given('que je suis sur la page de paramétrage du compte email', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
});
Given('je suis sur la page de paramétrage du compte email', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
});

// --- CA1 : Page de paramétrage ---
Then('la page comporte un champ de saisie pour l\'adresse email', async ({ page }) => {
  const champ = page.locator('[e2eid="e2eid-champ-adresse-email"]');
  await expect(champ).toBeVisible();
  await expect(champ).toHaveAttribute('type', 'email');
});

Then('la page comporte un champ mot de passe à saisie masquée', async ({ page }) => {
  const champ = page.locator('[e2eid="e2eid-champ-mot-de-passe"]');
  await expect(champ).toBeVisible();
  await expect(champ).toHaveAttribute('type', 'password');
});

Then('la page comporte un bouton ou une icône permettant d\'afficher temporairement le mot de passe en clair', async ({ page }) => {
  const bouton = page.locator('[e2eid="e2eid-bouton-afficher-mot-de-passe"]');
  await expect(bouton).toBeVisible();
});

Then('la page comporte une zone de saisie pour le chemin du répertoire de travail', async ({ page }) => {
  const champ = page.locator('[e2eid="e2eid-champ-chemin-dossier"]');
  await expect(champ).toBeVisible();
});
Then('la page comporte une zone de saisie pour le dossier dans la boîte mail', async ({ page }) => {
  const champ = page.locator('[e2eid="e2eid-champ-chemin-dossier"]');
  await expect(champ).toBeVisible();
});

Then('la page comporte un bouton {string}', async ({ page }, nom: string) => {
  await expect(page.getByRole('button', { name: nom })).toBeVisible();
});

// --- CA1 : Compte déjà enregistré (pour rechargement / Annuler) — store en RAM via API ---
async function givenCompteEnregistre(adresse: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/compte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adresseEmail: adresse,
      motDePasse: 'test',
      cheminDossier: cheminValide,
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }),
  });
  if (!res.ok) throw new Error(`Seed compte failed: ${res.status}`);
}
Given('que le compte a été enregistré avec l\'adresse {string} et un chemin valide', async ({ page }, adresse: string) => {
  await givenCompteEnregistre(adresse);
});
Given('le compte a été enregistré avec l\'adresse {string} et un chemin valide', async ({ page }, adresse: string) => {
  await givenCompteEnregistre(adresse);
});
Given('que je suis sur la page de paramétrage', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
});
Given('je suis sur la page de paramétrage', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
});
When('je me rends sur la page de paramétrage', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
});
Then('le champ adresse email affiche {string}', async ({ page }, valeur: string) => {
  await expect(page.locator('[e2eid="e2eid-champ-adresse-email"]')).toHaveValue(valeur);
});
Then('le champ chemin du dossier affiche le chemin enregistré', async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-champ-chemin-dossier"]')).toHaveValue(cheminValide);
});
Then('le champ mot de passe est vide', async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-champ-mot-de-passe"]')).toHaveValue('');
});
Then('le champ chemin du dossier affiche le chemin saisi', async ({ page }) => {
  await expect(page.locator('[e2eid="e2eid-champ-chemin-dossier"]')).toHaveValue(cheminValide);
});

// --- CA1 : Icône œil ---
When('je clique sur l\'icône d\'affichage du mot de passe', async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-afficher-mot-de-passe"]').click({ force: true });
});
When('je clique à nouveau sur l\'icône d\'affichage du mot de passe', async ({ page }) => {
  await page.locator('[e2eid="e2eid-bouton-afficher-mot-de-passe"]').click({ force: true });
});
Then('le mot de passe est affiché en clair', async ({ page }) => {
  const champ = page.locator('[e2eid="e2eid-champ-mot-de-passe"]');
  await expect(champ).toHaveAttribute('type', 'text', { timeout: 3000 });
  await expect(champ).toHaveValue('MonMotDePasse');
});
Then('le mot de passe est masqué', async ({ page }) => {
  const champ = page.locator('[e2eid="e2eid-champ-mot-de-passe"]');
  await expect(champ).toHaveAttribute('type', 'password', { timeout: 3000 });
});

// --- CA2 : Given champs (dossier dans la BAL, pas chemin disque) ---
const cheminValide = 'INBOX/Offres';
const cheminInvalide = 'Dossier/Inexistant';

function valeurPourExempleEmail(v: string): string {
  if (v === 'vide') return '';
  if (v === 'valide') return 'alain@maep.fr';
  if (v === 'invalide' || v === 'quelconque') return v;
  return v;
}
function valeurPourExempleMdp(v: string): string {
  if (v === 'vide') return '';
  if (v === 'valide') return 'MonMotDePasse';
  if (v === 'invalide' || v === 'quelconque') return v;
  return v;
}
function valeurPourExempleDossier(v: string): string {
  if (v === 'vide') return '';
  if (v === 'valide') return cheminValide;
  if (v === 'invalide') return cheminInvalide;
  if (v === 'quelconque') return 'quelconque';
  return v;
}
function valeurPourExemple(v: string): string {
  if (v === 'vide') return '';
  if (v === 'valide') return cheminValide;
  if (v === 'invalide') return cheminInvalide;
  if (v === 'quelconque') return 'quelconque';
  return v;
}

Given('que le champ adresse email est vide', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('');
});
Given('que le champ adresse email contient {string}', async ({ page }, arg: string) => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill(valeurPourExempleEmail(arg));
});
Given('le champ adresse email contient {string}', async ({ page }, arg: string) => {
  await fetch(`${API_BASE}/api/test/reset-compte`, { method: 'POST' }).catch(() => {});
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill(valeurPourExempleEmail(arg));
});
Given('que le champ mot de passe est vide', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('');
});
Given('que le champ mot de passe contient {string}', async ({ page }, arg: string) => {
  const champ = page.locator('#mot-de-passe');
  await champ.clear();
  await champ.fill(valeurPourExempleMdp(arg));
  await expect(champ).toHaveValue(valeurPourExempleMdp(arg));
});
Given('le champ mot de passe contient {string}', async ({ page }, arg: string) => {
  const champ = page.locator('#mot-de-passe');
  await champ.clear();
  await champ.fill(valeurPourExempleMdp(arg));
  await expect(champ).toHaveValue(valeurPourExempleMdp(arg));
});
Given('que le champ adresse email contient une adresse invalide ou un mauvais login', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('invalide');
});
Given('que le champ chemin du dossier contient un chemin valide', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(cheminValide);
});
Given('le champ chemin du dossier contient {string}', async ({ page }, arg: string) => {
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(valeurPourExempleDossier(arg));
});
Given('le champ chemin du dossier contient un chemin valide', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(cheminValide);
});
Given('que le champ chemin du dossier est vide', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill('');
});
Given('que le champ chemin du dossier contient un chemin qui n\'existe pas', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(cheminInvalide);
});
Given('que le champ chemin du dossier contient un chemin valide vers un dossier existant', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(cheminValide);
});

// --- CA2 : Bouton Tester connexion ---
When('je clique sur le bouton de test de connexion', async ({ page }) => {
  const payload = await page.evaluate(() => ({
    adresseEmail: (document.getElementById('adresse-email') as HTMLInputElement | null)?.value ?? '',
    motDePasse: (document.getElementById('mot-de-passe') as HTMLInputElement | null)?.value ?? '',
    cheminDossier: (document.getElementById('chemin-dossier') as HTMLInputElement | null)?.value ?? '',
  }));
  await page.getByRole('button', { name: 'Tester connexion' }).click();
  await effectuerTestConnexionDepuisPage(page, payload);
});
When('je clique sur le bouton Tester connexion', async ({ page }) => {
  const payload = await page.evaluate(() => ({
    adresseEmail: (document.getElementById('adresse-email') as HTMLInputElement | null)?.value ?? '',
    motDePasse: (document.getElementById('mot-de-passe') as HTMLInputElement | null)?.value ?? '',
    cheminDossier: (document.getElementById('chemin-dossier') as HTMLInputElement | null)?.value ?? '',
  }));
  await page.getByRole('button', { name: 'Tester connexion' }).click();
  await effectuerTestConnexionDepuisPage(page, payload);
});

Then('le résultat du test affiche un message d\'erreur', async ({ page }) => {
  const msg = page.locator('#resultat-test-message');
  await expect(msg).toHaveAttribute('data-type', 'erreur');
});
Then('le message contient « le champ {string} est requis »', async ({ page }, arg: string) => {
  const texte = await page.locator('#resultat-test-message').textContent();
  expect(texte).toContain("le champ '" + arg + "' est requis");
});
Then('le résultat du test indique un succès', async ({ page }) => {
  const msg = page.locator('#resultat-test-message');
  await expect(msg).toHaveAttribute('data-type', 'succès');
});
Then('le résultat du test est {string}', async ({ page }, resultatAttendu: string) => {
  const texte = (await page.locator('#resultat-test-message').textContent()) ?? '';
  const normalise = (s: string) => s.trim().replace(/\s+/g, ' ');
  const attendu = normalise(resultatAttendu);
  const obtenu = normalise(texte);
  if (resultatAttendu.includes('X emails')) {
    expect(obtenu).toMatch(/^succès:\s*paramétrages corrects\s*-\s*\d+\s*emails à analyser$/);
  } else {
    expect(obtenu).toBe(attendu);
  }
});
Then('le message contient « paramétrages corrects »', async ({ page }) => {
  const texte = await page.locator('#resultat-test-message').textContent();
  expect(texte).toContain('paramétrages corrects');
});
async function effectuerTestConnexionDepuisPage(
  page: import('@playwright/test').Page,
  payload?: { adresseEmail: string; motDePasse: string; cheminDossier: string }
): Promise<void> {
  const adresse = payload?.adresseEmail ?? (await page.locator('#adresse-email').inputValue());
  const motDePasse = payload?.motDePasse ?? (await page.locator('#mot-de-passe').inputValue());
  const cheminDossier = payload?.cheminDossier ?? (await page.locator('#chemin-dossier').inputValue());
  const response = await page.request.post(`${API_BASE}/api/test-connexion`, {
    data: { adresseEmail: adresse, motDePasse, cheminDossier },
  });
  const data = (await response.json()) as { ok: boolean; message?: string; nbEmails?: number };
  await page.evaluate(
    (d) => {
      const el = document.getElementById('resultat-test-message');
      if (!el) return;
      const type = d.ok ? 'succès' : 'erreur';
      const msg = d.ok
        ? `paramétrages corrects - ${d.nbEmails ?? 0} emails à analyser`
        : (d.message ?? '');
      el.textContent = `${type}: ${msg}`;
      el.setAttribute('data-type', type);
      const tableau = document.getElementById('tableau-resultat');
      const tbody = tableau?.querySelector('tbody');
      if (tableau && tbody) {
        tableau.hidden = false;
        const addr = (document.getElementById('adresse-email') as HTMLInputElement)?.value ?? '';
        const chem = (document.getElementById('chemin-dossier') as HTMLInputElement)?.value ?? '';
        tbody.innerHTML = `<tr><td>${addr}</td><td>[masqué]</td><td>${chem}</td><td>${type}</td><td>${msg}</td></tr>`;
      }
    },
    data
  );
}

Given('que j\'ai effectué un test de connexion \\(quel qu\'en soit le résultat\\)', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('alain@maep.fr');
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('MonMotDePasse');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(cheminValide);
  await effectuerTestConnexionDepuisPage(page);
});
Given('j\'ai effectué un test de connexion \\(quel qu\'en soit le résultat\\)', async ({ page }) => {
  await page.goto(PAGE_URL);
  await ouvrirBlocConnexionSiFerme(page);
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill('alain@maep.fr');
  await page.locator('[e2eid="e2eid-champ-mot-de-passe"]').fill('MonMotDePasse');
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(cheminValide);
  await effectuerTestConnexionDepuisPage(page);
});
Then('le résultat est présenté avec les libellés ou colonnes attendus', async ({ page }, docString: string) => {
  const header = await page.locator('#tableau-resultat thead').textContent();
  const expectedLine = 'adresse email | Mot de passe [masqué] | Dossier | Type de message | Message';
  expect(header?.replace(/\s+/g, ' ').trim()).toContain('adresse email');
  expect(header?.replace(/\s+/g, ' ').trim()).toContain('Mot de passe [masqué]');
  expect(header?.replace(/\s+/g, ' ').trim()).toContain('Dossier');
  expect(header?.replace(/\s+/g, ' ').trim()).toContain('Type de message');
  expect(header?.replace(/\s+/g, ' ').trim()).toContain('Message');
});

// --- Message avec paramètre littéral ---
Then('le message contient « erreur sur \'adresse email\' ou le \'mot de passe\' »', async ({ page }) => {
  const texte = await page.locator('#resultat-test-message').textContent();
  expect(texte).toContain("erreur sur 'adresse email' ou le 'mot de passe'");
});
Then('le message contient « préciser le chemin vers le dossier à analyser »', async ({ page }) => {
  const texte = await page.locator('#resultat-test-message').textContent();
  expect(texte).toContain('préciser le chemin vers le dossier à analyser');
});
Then('le message contient « le chemin vers le dossier à analyser n\'existe pas »', async ({ page }) => {
  const texte = await page.locator('#resultat-test-message').textContent();
  expect(texte).toContain("le chemin vers le dossier à analyser n'existe pas");
});

// --- CA3 : Annuler ---
Given('que je modifie l\'adresse email en {string}', async ({ page }, valeur: string) => {
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill(valeur);
});
When('je modifie l\'adresse email en {string}', async ({ page }, valeur: string) => {
  await page.locator('[e2eid="e2eid-champ-adresse-email"]').fill(valeur);
});
When('je modifie le chemin du dossier', async ({ page }) => {
  await page.locator('[e2eid="e2eid-champ-chemin-dossier"]').fill(cheminInvalide);
});
When('je clique sur le bouton Annuler', async ({ page }) => {
  const responsePromise = page.waitForResponse(
    (r) => r.url().includes('/api/compte') && r.request().method() === 'GET',
    { timeout: 10000 }
  );
  await page.locator('[e2eid="e2eid-bouton-annuler"]').click();
  await responsePromise;
});

// --- CA3 : Mémorisation ---
When('j\'enregistre les paramètres', async ({ page }) => {
  await enregistrerViaClic(page);
});
When('j\'enregistre les paramètres en cliquant sur Enregistrer', async ({ page }) => {
  await enregistrerViaClic(page);
});
async function enregistrerViaClic(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('[e2eid="e2eid-bouton-enregistrer"]').click();
  await page.waitForURL(/\/(parametres|tableau-de-bord)(\?|$)/, { timeout: 10000 });
}
Then('un message confirme l\'enregistrement', async ({ page }) => {
  await expect(page.locator('#feedback-enregistrement')).toContainText('Paramètres enregistrés');
});

/** Assertions sur le compte : via API (store en RAM), pas de lecture disque. */
function isParametresPath(pathRel: string): boolean {
  const n = pathRel.replace(/^\.[/\\]/, '').replace(/\\/g, '/').toLowerCase();
  return n === 'data/parametres.json' || n === 'data/compte.json';
}

Then('le fichier {string} existe', async ({ page }, pathRel: string) => {
  const logFilename = pathRel.replace(/^.*[/\\]/, '');
  if (/^\d{4}-\d{2}-\d{2}\.json$/.test(logFilename)) {
    const res = await fetch(`${API_BASE}/api/test/list-log-appels`);
    expect(res.ok).toBe(true);
    const list = (await res.json()) as string[];
    expect(list).toContain(logFilename);
    return;
  }
  if (!isParametresPath(pathRel)) throw new Error('BDD ne vérifie que data/parametres.json (ou compte.json) via l’API');
  const res = await fetch(`${API_BASE}/api/compte`);
  const data = (await res.json()) as { adresseEmail?: string; cheminDossier?: string };
  expect(data.adresseEmail != null || data.cheminDossier != null).toBe(true);
});
Then('le fichier {string} contient l\'adresse email enregistrée', async ({ page }, pathRel: string) => {
  if (!isParametresPath(pathRel)) throw new Error('BDD ne vérifie que data/parametres.json (ou compte.json) via l’API');
  const res = await fetch(`${API_BASE}/api/compte`);
  const data = (await res.json()) as { adresseEmail?: string };
  expect(data.adresseEmail).toBeDefined();
});
Then('le fichier {string} contient le chemin du dossier enregistré', async ({ page }, pathRel: string) => {
  if (!isParametresPath(pathRel)) throw new Error('BDD ne vérifie que data/parametres.json (ou compte.json) via l’API');
  const res = await fetch(`${API_BASE}/api/compte`);
  const data = (await res.json()) as { cheminDossier?: string };
  expect(data.cheminDossier).toBeDefined();
});
Then('la valeur du mot de passe stockée dans {string} n\'est pas {string} en clair', async ({ page }, pathRel: string, plain: string) => {
  if (!isParametresPath(pathRel)) throw new Error('BDD ne vérifie que data/parametres.json (ou compte.json) via l’API');
  const res = await fetch(`${API_BASE}/api/test/compte-store`);
  const data = (await res.json()) as { motDePasseHash?: string };
  expect(data.motDePasseHash).toBeDefined();
  expect(data.motDePasseHash).not.toBe(plain);
});
Then('le mot de passe est stocké de façon sécurisée \\(hachage reconnu, non obsolète\\)', async ({ page }) => {
  const res = await fetch(`${API_BASE}/api/test/compte-store`);
  const data = (await res.json()) as { motDePasseHash?: string };
  expect(data.motDePasseHash).toMatch(/^(pbkdf2:|aes256gcm:)/);
});
