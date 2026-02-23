/**
 * Tests TDD pour la validation des paramètres du compte email (US-1.1).
 * Baby step 1 : validation champs vides.
 */
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validerParametresCompte } from './validation-compte.js';

describe('validerParametresCompte', () => {
  describe('champs vides (baby step 1)', () => {
    it("adresse email vide → message « le champ 'adresse email' est requis »", () => {
      const r = validerParametresCompte('', 'secret', 'C:\\Dossier');
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        "le champ 'adresse email' est requis"
      );
    });

    it("adresse email undefined → traité comme vide (champ requis)", () => {
      const r = validerParametresCompte(
        undefined as unknown as string,
        'secret',
        'C:\\D'
      );
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        "le champ 'adresse email' est requis"
      );
    });

    it("adresse email uniquement espaces → message « le champ 'adresse email' est requis »", () => {
      const r = validerParametresCompte('   ', 'secret', 'C:\\Dossier');
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        "le champ 'adresse email' est requis"
      );
    });

    it("mot de passe vide → message « le champ 'mot de passe' est requis »", () => {
      const r = validerParametresCompte('a@b.fr', '', 'C:\\Dossier');
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        "le champ 'mot de passe' est requis"
      );
    });

    it("mot de passe uniquement espaces → message « le champ 'mot de passe' est requis »", () => {
      const r = validerParametresCompte('a@b.fr', '   ', 'C:\\Dossier');
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        "le champ 'mot de passe' est requis"
      );
    });

    it("mot de passe null → traité comme vide (champ requis)", () => {
      const r = validerParametresCompte(
        'a@b.fr',
        null as unknown as string,
        'C:\\D'
      );
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        "le champ 'mot de passe' est requis"
      );
    });

    it("chemin dossier undefined → traité comme vide (préciser le chemin)", () => {
      const r = validerParametresCompte('a@b.fr', 's', undefined as unknown as string, {
        pathExists: () => true,
      });
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        'préciser le chemin vers le dossier à analyser'
      );
    });
  });

  describe('dossier (baby step 2)', () => {
    const pathExists = (p: string) => p === 'C:\\DossierValide';

    it("dossier vide → « préciser le chemin vers le dossier à analyser »", () => {
      const r = validerParametresCompte('a@b.fr', 'secret', '', { pathExists });
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        'préciser le chemin vers le dossier à analyser'
      );
    });

    it("dossier uniquement espaces → « préciser le chemin vers le dossier à analyser »", () => {
      const r = validerParametresCompte('a@b.fr', 'secret', '   ', { pathExists });
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        'préciser le chemin vers le dossier à analyser'
      );
    });

    it("chemin inexistant → « le chemin vers le dossier à analyser n'existe pas »", () => {
      const r = validerParametresCompte(
        'a@b.fr',
        'secret',
        'C:\\Inexistant',
        { pathExists }
      );
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        "le chemin vers le dossier à analyser n'existe pas"
      );
    });

    it('chemin valide et existant → ok', () => {
      const r = validerParametresCompte(
        'a@b.fr',
        'secret',
        'C:\\DossierValide',
        { pathExists }
      );
      expect(r.ok).toBe(true);
    });
  });

  describe('identifiants (baby step 3)', () => {
    const pathExists = () => true;

    it("connexion refusée (login/mot de passe invalides) → « erreur sur 'adresse email' ou le 'mot de passe' »", () => {
      const verifierConnexion = () => ({
        ok: false as const,
        message: "erreur sur 'adresse email' ou le 'mot de passe'",
      });
      const r = validerParametresCompte('bad@x.fr', 'wrong', 'C:\\D', {
        pathExists,
        verifierConnexion,
      });
      expect(r.ok).toBe(false);
      expect((r as { message: string }).message).toBe(
        "erreur sur 'adresse email' ou le 'mot de passe'"
      );
    });

    it('connexion ok → validation ok', () => {
      const verifierConnexion = () => ({ ok: true as const });
      const r = validerParametresCompte('a@b.fr', 'secret', 'C:\\D', {
        pathExists,
        verifierConnexion,
      });
      expect(r.ok).toBe(true);
    });

    it('sans verifierConnexion, après champs et dossier ok → validation ok', () => {
      const r = validerParametresCompte('a@b.fr', 'secret', 'C:\\D', {
        pathExists,
      });
      expect(r.ok).toBe(true);
    });

    it('sans options, utilise existsSync par défaut pour le dossier', () => {
      const dossierExistant = join(tmpdir());
      expect(existsSync(dossierExistant)).toBe(true);
      const r = validerParametresCompte('a@b.fr', 'secret', dossierExistant);
      expect(r.ok).toBe(true);
    });
  });
});
