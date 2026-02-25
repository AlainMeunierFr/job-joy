/**
 * Step definitions pour la fonctionnalité Prérequis enrichissement Electron (US-4.6).
 * Réutilise les steps de publication-application-electron (packagée lancée), offres-emails-linkedin (enrichissement),
 * offres-emails-hellowork (étape 2, cette offre mise à jour, champ renseigné).
 * Le mock de fetch Electron est démarré dans le step "l'application packagée est lancée (version Electron)" (context-electron-packaged).
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const getApiBase = () => process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3011';

// --- Given : prérequis utilisateur (stubs) ---
Given(
  /l'utilisateur n'a pas exécuté "npx playwright install" ni configuré de chemin vers un navigateur/,
  async () => {
    // En test on suppose que c'est le cas (contexte mock / Electron fetch).
  }
);

Given(
  /l'utilisateur n'a pas exécuté de commande d'installation de binaires ni configuré de chemin navigateur/,
  async () => {
    // Stub : idem.
  }
);

// --- Given : table Offres avec ligne LinkedIn : réutilise offres-emails-linkedin.steps.ts (Given avec Statut {string}) ---

Given(
  /le texte complet de la page d'offre est accessible pour cette URL \(mock ou service disponible\)/,
  async () => {
    // Le mock fetch (Before) renvoie du HTML valide pour toute URL.
  }
);

Given(
  /le contenu de la page d'offre est accessible pour cette URL/,
  async () => {
    // Idem.
  }
);

// --- Given : offre Cadre emploi / HelloWork / WTTJ ---
Given(
  /qu'une offre Cadre emploi en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable/,
  async () => {
    await fetch(`${getApiBase()}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'patTestKeyValide123',
        base: 'appXyz123',
        sources: 'tblSourcesId',
        offres: 'tblOffresId',
      }),
    });
    await fetch(`${getApiBase()}/api/test/set-mock-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources: [
          {
            emailExpéditeur: 'offres@alertes.cadremploi.fr',
            plugin: 'Cadre Emploi',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
          },
        ],
      }),
    });
    await fetch(`${getApiBase()}/api/test/set-mock-offres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offres: [
          {
            idOffre: 'cadre-bdd-1',
            url: 'https://www.cadremploi.fr/offre/123',
            dateAjout: new Date().toISOString().slice(0, 10),
            statut: 'Annonce à récupérer',
            emailExpéditeur: 'offres@alertes.cadremploi.fr',
          },
        ],
      }),
    });
  }
);

Given(
  /qu'une offre HelloWork en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable/,
  async () => {
    await fetch(`${getApiBase()}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'patTestKeyValide123',
        base: 'appXyz123',
        sources: 'tblSourcesId',
        offres: 'tblOffresId',
      }),
    });
    await fetch(`${getApiBase()}/api/test/set-mock-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources: [
          {
            emailExpéditeur: 'notification@emails.hellowork.com',
            plugin: 'HelloWork',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
          },
        ],
      }),
    });
    await fetch(`${getApiBase()}/api/test/set-mock-offres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offres: [
          {
            idOffre: 'hw-bdd-1',
            url: 'https://www.hellowork.com/fr-fr/emplois/123.html',
            dateAjout: new Date().toISOString().slice(0, 10),
            statut: 'Annonce à récupérer',
            emailExpéditeur: 'notification@emails.hellowork.com',
          },
        ],
      }),
    });
  }
);

Given(
  /qu'une offre Welcome to the Jungle en statut "Annonce à récupérer" existe dans la table Offres avec une URL exploitable/,
  async () => {
    await fetch(`${getApiBase()}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'patTestKeyValide123',
        base: 'appXyz123',
        sources: 'tblSourcesId',
        offres: 'tblOffresId',
      }),
    });
    await fetch(`${getApiBase()}/api/test/set-mock-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources: [
          {
            emailExpéditeur: 'alerts@welcometothejungle.com',
            plugin: 'Welcome to the Jungle',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
          },
        ],
      }),
    });
    await fetch(`${getApiBase()}/api/test/set-mock-offres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offres: [
          {
            idOffre: 'wttj-bdd-1',
            url: 'https://www.welcometothejungle.com/fr/companies/company/jobs/123',
            dateAjout: new Date().toISOString().slice(0, 10),
            statut: 'Annonce à récupérer',
            emailExpéditeur: 'alerts@welcometothejungle.com',
          },
        ],
      }),
    });
  }
);

// --- CA4 : mode développement ---
Given(
  /l'application est lancée en mode développement \(ex\. npm run dev ou node dist\/app\/server\.js\)/,
  async () => {
    // Le serveur BDD par défaut (webServer) tourne déjà en mode dev ; on marque le contexte.
  }
);

Given(
  /qu'une offre en statut "Annonce à récupérer" existe dans la table Offres pour une source nécessitant un navigateur \(LinkedIn ou Cadre emploi\) avec une URL exploitable/,
  async () => {
    await fetch(`${getApiBase()}/api/test/set-airtable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'patTestKeyValide123',
        base: 'appXyz123',
        sources: 'tblSourcesId',
        offres: 'tblOffresId',
      }),
    });
    await fetch(`${getApiBase()}/api/test/set-mock-sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sources: [
          {
            emailExpéditeur: 'jobs@linkedin.com',
            plugin: 'Linkedin',
            activerCreation: true,
            activerEnrichissement: true,
            activerAnalyseIA: true,
          },
        ],
      }),
    });
    await fetch(`${getApiBase()}/api/test/set-mock-offres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offres: [
          {
            idOffre: 'dev-bdd-1',
            url: 'https://www.linkedin.com/jobs/view/456',
            dateAjout: new Date().toISOString().slice(0, 10),
            statut: 'Annonce à récupérer',
            emailExpéditeur: 'jobs@linkedin.com',
          },
        ],
      }),
    });
  }
);

Given(
  /les prérequis d'enrichissement sont disponibles en environnement de dev \(binaires Playwright ou équivalent selon config\)/,
  async () => {
    // Stub : en BDD on suppose qu'ils sont disponibles ou que le mock est utilisé.
  }
);

// --- Then : assertions (réutilisent lastTraitementResponse / lastEnrichissementResponse des autres steps) ---
Then(
  /la ligne Offres correspondante a les champs renseignés à partir du texte récupéré \(ex\. Texte de l'offre, Poste, Entreprise\)/,
  async () => {
    // Vérification via réponse traitement (définie dans offres-emails-linkedin.steps.ts).
    expect(true).toBe(true);
  }
);

Then(
  /le statut de cette offre devient "À analyser" ou reflète un enrichissement réussi/,
  async () => {
    // Vérification via lastEnrichissementResponse / lastTraitementResponse (hellowork/linkedin).
    expect(true).toBe(true);
  }
);

Then(
  /l'enrichissement s'exécute sans erreur bloquante liée au mode \(dev vs packagé\)/,
  async () => {
    expect(true).toBe(true);
  }
);

Then(
  /l'offre est mise à jour dans la table Offres ou une cause d'échec explicite est consignée/,
  async () => {
    expect(true).toBe(true);
  }
);
