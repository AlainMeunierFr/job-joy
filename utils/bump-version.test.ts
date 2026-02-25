/**
 * Tests US-3.11 : bumpVersion semver (major.minor.patch).
 * major=marketing, minor=schéma, patch=évolution et correction.
 */
import { bumpVersion } from './bump-version.js';

describe('bumpVersion', () => {
  it("bumpVersion('1.0.0', 'hotfix') → '1.0.1'", () => {
    expect(bumpVersion('1.0.0', 'hotfix')).toBe('1.0.1');
  });

  it("bumpVersion('1.0.1', 'feature') → '1.0.2'", () => {
    expect(bumpVersion('1.0.1', 'feature')).toBe('1.0.2');
  });

  it("bumpVersion('1.0.2', 'schema') → '1.1.0'", () => {
    expect(bumpVersion('1.0.2', 'schema')).toBe('1.1.0');
  });

  it("bumpVersion('1.1.0', 'major') → '2.0.0'", () => {
    expect(bumpVersion('1.1.0', 'major')).toBe('2.0.0');
  });

  it("version 2 segments '1.0' acceptée (hotfix → '1.0.1')", () => {
    expect(bumpVersion('1.0', 'hotfix')).toBe('1.0.1');
  });

  it("cas limite : '0.0.0' + major → '1.0.0'", () => {
    expect(bumpVersion('0.0.0', 'major')).toBe('1.0.0');
  });

  it("version 1 segment '1' traitée comme 1.0.0 (hotfix → '1.0.1')", () => {
    expect(bumpVersion('1', 'hotfix')).toBe('1.0.1');
  });

  it("segment non numérique traité comme 0 (ex. '1.0.x' hotfix → '1.0.1')", () => {
    expect(bumpVersion('1.0.x', 'hotfix')).toBe('1.0.1');
  });
});
