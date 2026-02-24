/**
 * Tests US-3.3 : cache RAM dernier audit (colonnes "A importer").
 */
import { getDernierAudit, getNombreAImporter, setDernierAudit } from './cache-audit-ram.js';

describe('cache-audit-ram (US-3.3)', () => {
  beforeEach(() => {
    setDernierAudit({});
  });

  it('getNombreAImporter sans setDernierAudit retourne 0', () => {
    expect(getNombreAImporter('a@x.com')).toBe(0);
  });

  it('après setDernierAudit, getDernierAudit retourne le record et getNombreAImporter retourne la valeur', () => {
    setDernierAudit({ 'a@x.com': 3 });
    expect(getDernierAudit()).toEqual({ 'a@x.com': 3 });
    expect(getNombreAImporter('a@x.com')).toBe(3);
  });

  it('email absent du cache retourne 0', () => {
    setDernierAudit({ 'a@x.com': 3 });
    expect(getNombreAImporter('autre@y.com')).toBe(0);
  });
});
