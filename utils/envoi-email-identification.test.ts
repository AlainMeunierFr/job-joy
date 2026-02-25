/**
 * Tests TDD pour le port d'envoi email identification (US-3.15).
 * From=compte, To=alain@maep.fr, sujet "nouvel utilisateur job-joy", corps=texte consentement.
 */
import type { EnvoyeurEmailIdentification, ParametresEmailIdentification } from '../types/compte.js';
import {
  getParametresEmailIdentification,
  envoyerEmailIdentification,
} from './envoi-email-identification.js';
import { getTexteConsentementIdentification } from './texte-consentement-identification.js';

const DESTINATAIRE_ATTENDU = 'alain@maep.fr';
const SUJET_ATTENDU = 'nouvel utilisateur job-joy';

describe('getParametresEmailIdentification', () => {
  it('retourne to=alain@maep.fr, subject="nouvel utilisateur job-joy" et from=adresse du compte', () => {
    const params = getParametresEmailIdentification('moncompte@domaine.fr');
    expect(params.to).toBe(DESTINATAIRE_ATTENDU);
    expect(params.subject).toBe(SUJET_ATTENDU);
    expect(params.from).toBe('moncompte@domaine.fr');
  });

  it('retourne body = texte du consentement', () => {
    const params = getParametresEmailIdentification('user@test.fr');
    const texteConsentement = getTexteConsentementIdentification();
    expect(params.body).toBe(texteConsentement);
  });
});

describe('envoyerEmailIdentification', () => {
  it('appelle le port envoyer avec from, to, subject, body corrects', async () => {
    const adresseCompte = 'utilisateur@example.com';
    const envoye: ParametresEmailIdentification[] = [];
    const port: EnvoyeurEmailIdentification = {
      async envoyer(params) {
        envoye.push(params);
        return { ok: true };
      },
    };
    await envoyerEmailIdentification(adresseCompte, port);
    expect(envoye).toHaveLength(1);
    expect(envoye[0].from).toBe(adresseCompte);
    expect(envoye[0].to).toBe(DESTINATAIRE_ATTENDU);
    expect(envoye[0].subject).toBe(SUJET_ATTENDU);
    expect(envoye[0].body).toBe(getTexteConsentementIdentification());
  });

  it('retourne le résultat du port (ok: true)', async () => {
    const port: EnvoyeurEmailIdentification = {
      async envoyer() {
        return { ok: true };
      },
    };
    const result = await envoyerEmailIdentification('a@b.fr', port);
    expect(result).toEqual({ ok: true });
  });

  it('retourne le résultat du port (ok: false) en cas d\'échec', async () => {
    const port: EnvoyeurEmailIdentification = {
      async envoyer() {
        return { ok: false, message: 'SMTP refused' };
      },
    };
    const result = await envoyerEmailIdentification('a@b.fr', port);
    expect(result).toEqual({ ok: false, message: 'SMTP refused' });
  });
});
