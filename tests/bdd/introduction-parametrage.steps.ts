/**
 * Step definitions pour Introduction au process de paramétrage (US-4.5).
 * Contexte "que je suis sur la page Paramètres" défini dans redirection-parametres-config-incomplete.steps.ts.
 */
import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { test } from './configuration-compte-email.steps.js';

export const { Given, When, Then } = createBdd(test);

const INTRO_SELECTOR = '[data-layout="intro-parametrage"]';

// --- Bloc Avant propos : en premier, repliable, ouvert/fermé selon config ---
Then(
  /la page Paramètres affiche un bloc introductif identifié comme section d'introduction \(titre ou libellé explicite\)/,
  async ({ page }) => {
    const bloc = page.locator(INTRO_SELECTOR);
    await expect(bloc).toBeVisible();
    await expect(bloc).toContainText(/avant propos|introduction/i);
  }
);

Then(
  /ce bloc introductif est affiché en premier sur la page, avant tout bloc de configuration \(Airtable, compte email, API IA, etc\.\)/,
  async ({ page }) => {
    const intro = page.locator(INTRO_SELECTOR);
    await expect(intro).toBeVisible();
    const airtableBloc = page.locator('[data-layout="configuration-airtable"]');
    await expect(airtableBloc).toBeVisible();
    const introBox = await intro.boundingBox();
    const airtableBox = await airtableBloc.boundingBox();
    expect(introBox).toBeTruthy();
    expect(airtableBox).toBeTruthy();
    expect(introBox!.y).toBeLessThan(airtableBox!.y);
  }
);

Then(
  /le bloc introductif est un bloc repliable \(details\) avec le libellé "Avant propos"/,
  async ({ page }) => {
    const bloc = page.locator(INTRO_SELECTOR);
    await expect(bloc).toBeVisible();
    await expect(bloc).toHaveAttribute('data-layout', 'intro-parametrage');
    const summary = bloc.locator('summary');
    await expect(summary).toHaveCount(1);
    await expect(summary).toContainText('Avant propos');
  }
);

Then(
  /le bloc introductif a le même style de container que les autres sections \(blocParametrage\)/,
  async ({ page }) => {
    const bloc = page.locator(INTRO_SELECTOR);
    await expect(bloc).toHaveClass(/blocParametrage/);
    await expect(bloc.locator('summary')).toHaveClass(/blocParametrageSummary/);
    await expect(bloc.locator('.blocParametrageContent')).toHaveCount(1);
  }
);

Then(/^le bloc introductif est déroulé \(ouvert\)$/, async ({ page }) => {
  const bloc = page.locator(INTRO_SELECTOR);
  await expect(bloc).toBeVisible();
  await expect(bloc).toHaveAttribute('open', '');
});

Then(/^le bloc introductif est enroulé \(fermé\)$/, async ({ page }) => {
  const bloc = page.locator(INTRO_SELECTOR);
  await expect(bloc).toBeVisible();
  await expect(bloc).not.toHaveAttribute('open');
});

