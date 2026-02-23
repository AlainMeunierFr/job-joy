/**
 * Tests pour le lecteur d'emails mock (US-1.4).
 */
import { createLecteurEmailsMock } from './lecteur-emails-mock.js';

describe('createLecteurEmailsMock', () => {
  it('retourne ok: true et la liste d’emails fournie', async () => {
    const lecteur = createLecteurEmailsMock({
      emails: [{ html: '<p>Hello</p>' }, { html: '<div>Job</div>' }],
    });
    const r = await lecteur.lireEmails('a@b.fr', 'p', 'INBOX', 'linkedin.com');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.emails).toHaveLength(2);
      expect(r.emails[0].html).toBe('<p>Hello</p>');
      expect(r.emails[1].html).toBe('<div>Job</div>');
    }
  });

  it('retourne ok: false avec le message d’erreur configuré', async () => {
    const lecteur = createLecteurEmailsMock({ erreur: 'Connexion refusée' });
    const r = await lecteur.lireEmails('a@b.fr', 'p', 'INBOX', 'x');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Connexion refusée');
  });

  it('retourne ok: true et emails vides par défaut', async () => {
    const lecteur = createLecteurEmailsMock();
    const r = await lecteur.lireEmails('a@b.fr', 'p', 'INBOX', 'x');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emails).toEqual([]);
  });
});
