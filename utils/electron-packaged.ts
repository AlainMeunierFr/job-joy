/**
 * Détection du mode Electron packagé (US-4.6).
 * En package Electron, le process fournit une URL de fetch pour l'enrichissement sans Playwright.
 */

/**
 * Retourne true si l'app tourne en mode Electron packagé (URL de fetch fournie), false sinon.
 */
export function isElectronPackaged(): boolean {
  const url = process.env.JOB_JOY_ELECTRON_FETCH_URL;
  return typeof url === 'string' && url.trim() !== '';
}
