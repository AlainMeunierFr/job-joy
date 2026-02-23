/**
 * Composition : choisit l'implémentation du port ConnecteurEmail.
 * Selon provider (formulaire) ou env COMPTE_USE_GRAPH : IMAP, Microsoft Graph, ou stub Gmail.
 */
import type { ConnecteurEmail, OptionsImap, ProviderCompte } from '../types/compte.js';
import { getConnecteurEmailMock } from './connecteur-email-mock.js';
import { getConnecteurEmailImap } from './connecteur-email-imap.js';
import { getConnecteurEmailGraph } from './connecteur-email-graph.js';
import { getValidAccessToken } from './auth-microsoft.js';

export interface OverridesConnecteur {
  /** Type de compte choisi dans le formulaire. */
  provider?: ProviderCompte | string;
  /** Token OAuth (Microsoft) : pour test depuis le formulaire uniquement ; sinon régénération auto. */
  accessToken?: string;
}

/**
 * Retourne le connecteur à utiliser.
 * En BDD (mock) : options ignorées.
 * Si overrides.provider === 'gmail' : stub "à implémenter".
 * Si overrides.provider === 'microsoft' : Graph (token via getValidAccessToken ou overrides.accessToken).
 * Sinon : IMAP (options obligatoires).
 */
export function getConnecteurEmail(
  imapOptions?: OptionsImap,
  overrides?: OverridesConnecteur
): ConnecteurEmail {
  if (process.env.BDD_MOCK_CONNECTEUR === '1') {
    return getConnecteurEmailMock();
  }
  const provider = overrides?.provider;
  if (provider === 'gmail') {
    return {
      async connecterEtCompter(): Promise<{ ok: false; message: string }> {
        return { ok: false, message: 'Gmail : à implémenter plus tard.' };
      },
    };
  }
  if (provider === 'microsoft') {
    const tokenFromForm = (overrides?.accessToken ?? '').trim();
    const getToken = tokenFromForm
      ? () => Promise.resolve(tokenFromForm)
      : () => getValidAccessToken();
    return getConnecteurEmailGraph(getToken);
  }
  if (!imapOptions?.host?.trim()) {
    return {
      async connecterEtCompter(): Promise<{ ok: false; message: string }> {
        return { ok: false, message: "le champ 'serveur IMAP' est requis" };
      },
    };
  }
  return getConnecteurEmailImap({
    host: imapOptions.host.trim(),
    port: Number(imapOptions.port) || 993,
    secure: imapOptions.secure !== false,
  });
}
