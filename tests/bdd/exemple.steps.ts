import { test as base, createBdd } from 'playwright-bdd';

type Fixtures = object;

export const test = base.extend<Fixtures>({});

export const { Given, When, Then } = createBdd(test);

Given('que le projet est configuré en BDD', async () => {
  // Vérification que la config BDD est en place (aucune action navigateur nécessaire).
});
Given('le projet est configuré en BDD', async () => {
  // Alias sans "que"
});

Then('les tests BDD peuvent s\'exécuter', async () => {
  // Scénario de smoke : si on arrive ici, la chaîne Gherkin → bddgen → Playwright fonctionne.
});
