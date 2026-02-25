/**
 * Tests API POST /api/test-connexion (bouton « Tester connexion »).
 * Couvre IMAP et Microsoft (avec jeton ou token) pour éviter les régressions.
 */
import type { ServerResponse } from 'node:http';
import type { ConnecteurEmail, OptionsImap } from '../types/compte.js';
import { handlePostTestConnexion, type GetConnecteurEmailFn } from './api-handlers.js';

function createMockRes(): ServerResponse & { writeHead: jest.Mock; end: jest.Mock } {
  return {
    writeHead: jest.fn(),
    end: jest.fn(),
  } as unknown as ServerResponse & { writeHead: jest.Mock; end: jest.Mock };
}

function parseResBody(res: ReturnType<typeof createMockRes>): Record<string, unknown> {
  expect(res.end).toHaveBeenCalledTimes(1);
  return JSON.parse((res.end as jest.Mock).mock.calls[0][0]);
}

describe('handlePostTestConnexion', () => {
  it('Microsoft avec jeton disponible : retourne 200 et nbEmails en cas de succès', async () => {
    const connecteur: ConnecteurEmail = {
      connecterEtCompter: async () => ({ ok: true, nbEmails: 5 }),
    };
    const getConnecteur: GetConnecteurEmailFn = (_imap, overrides) => {
      if (overrides?.provider === 'microsoft') return connecteur;
      return { connecterEtCompter: async () => ({ ok: false, message: 'unexpected' }) };
    };
    const res = createMockRes();
    await handlePostTestConnexion(getConnecteur, {
      provider: 'microsoft',
      adresseEmail: 'user@outlook.com',
      cheminDossier: 'INBOX',
    }, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/json; charset=utf-8' }));
    const body = parseResBody(res);
    expect(body).toEqual({ ok: true, nbEmails: 5 });
  });

  it('Microsoft : retourne 200 et message d’erreur quand le connecteur échoue', async () => {
    const connecteur: ConnecteurEmail = {
      connecterEtCompter: async () => ({ ok: false, message: 'Token expiré ou invalide.' }),
    };
    const getConnecteur: GetConnecteurEmailFn = (_imap, overrides) => {
      if (overrides?.provider === 'microsoft') return connecteur;
      return { connecterEtCompter: async () => ({ ok: false, message: 'unexpected' }) };
    };
    const res = createMockRes();
    await handlePostTestConnexion(getConnecteur, {
      provider: 'microsoft',
      adresseEmail: 'user@outlook.com',
      cheminDossier: 'INBOX',
    }, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    const body = parseResBody(res);
    expect(body).toEqual({ ok: false, message: 'Token expiré ou invalide.' });
  });

  it('Microsoft : retourne 200 avec message explicite si adresse email manquante', async () => {
    const getConnecteur: GetConnecteurEmailFn = () => ({ connecterEtCompter: async () => ({ ok: false, message: 'unused' }) });
    const res = createMockRes();
    await handlePostTestConnexion(getConnecteur, {
      provider: 'microsoft',
      adresseEmail: '',
      cheminDossier: 'INBOX',
    }, res);

    const body = parseResBody(res);
    expect(body.ok).toBe(false);
    expect(body.message).toContain('adresse email');
  });

  it('Microsoft : retourne 200 avec message si chemin dossier manquant', async () => {
    const getConnecteur: GetConnecteurEmailFn = () => ({ connecterEtCompter: async () => ({ ok: false, message: 'unused' }) });
    const res = createMockRes();
    await handlePostTestConnexion(getConnecteur, {
      provider: 'microsoft',
      adresseEmail: 'user@outlook.com',
      cheminDossier: '',
    }, res);

    const body = parseResBody(res);
    expect(body.ok).toBe(false);
    expect(body.message).toMatch(/dossier/);
  });

  it('IMAP avec options valides : retourne 200 et nbEmails en cas de succès', async () => {
    const connecteur: ConnecteurEmail = {
      connecterEtCompter: async () => ({ ok: true, nbEmails: 0 }),
    };
    const getConnecteur: GetConnecteurEmailFn = (imapOptions: OptionsImap | undefined) => {
      if (imapOptions?.host) return connecteur;
      return { connecterEtCompter: async () => ({ ok: false, message: 'serveur requis' }) };
    };
    const res = createMockRes();
    await handlePostTestConnexion(getConnecteur, {
      provider: 'imap',
      adresseEmail: 'user@example.com',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      imapHost: 'imap.example.com',
      imapPort: 993,
      imapSecure: true,
    }, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    const body = parseResBody(res);
    expect(body).toEqual({ ok: true, nbEmails: 0 });
  });

  it('IMAP : retourne 200 avec message de validation si serveur manquant', async () => {
    const getConnecteur: GetConnecteurEmailFn = () => ({ connecterEtCompter: async () => ({ ok: false, message: 'unused' }) });
    const res = createMockRes();
    await handlePostTestConnexion(getConnecteur, {
      provider: 'imap',
      adresseEmail: 'user@example.com',
      motDePasse: 'secret',
      cheminDossier: 'INBOX',
      imapHost: '',
    }, res);

    const body = parseResBody(res);
    expect(body.ok).toBe(false);
    expect(body.message).toMatch(/serveur|IMAP/i);
  });

  it('Gmail : retourne 200 avec message « En construction »', async () => {
    const getConnecteur: GetConnecteurEmailFn = () => ({ connecterEtCompter: async () => ({ ok: false, message: 'unused' }) });
    const res = createMockRes();
    await handlePostTestConnexion(getConnecteur, {
      provider: 'gmail',
      adresseEmail: 'user@gmail.com',
      cheminDossier: 'INBOX',
    }, res);

    const body = parseResBody(res);
    expect(body.ok).toBe(false);
    expect(body.message).toMatch(/construction/i);
  });
});
