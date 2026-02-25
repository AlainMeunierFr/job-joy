/**
 * Tests pour isElectronPackaged() (US-4.6).
 */
import { isElectronPackaged } from './electron-packaged.js';

describe('isElectronPackaged', () => {
  const originalEnv = process.env.JOB_JOY_ELECTRON_FETCH_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.JOB_JOY_ELECTRON_FETCH_URL = originalEnv;
    } else {
      delete process.env.JOB_JOY_ELECTRON_FETCH_URL;
    }
  });

  it('retourne false quand JOB_JOY_ELECTRON_FETCH_URL est absent', () => {
    delete process.env.JOB_JOY_ELECTRON_FETCH_URL;
    expect(isElectronPackaged()).toBe(false);
  });

  it('retourne false quand JOB_JOY_ELECTRON_FETCH_URL est une chaîne vide', () => {
    process.env.JOB_JOY_ELECTRON_FETCH_URL = '';
    expect(isElectronPackaged()).toBe(false);
  });

  it('retourne true quand JOB_JOY_ELECTRON_FETCH_URL est défini et non vide', () => {
    process.env.JOB_JOY_ELECTRON_FETCH_URL = 'http://127.0.0.1:9999/fetch';
    expect(isElectronPackaged()).toBe(true);
  });
});
