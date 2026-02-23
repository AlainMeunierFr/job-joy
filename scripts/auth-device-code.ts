#!/usr/bin/env node
import '../utils/load-env-local.js';
/**
 * Obtient un token OAuth Microsoft (flux device code) et enregistre le refresh token.
 * Une seule fois : après ça, l'app régénère l'access token toute seule.
 *
 * Prérequis : AZURE_CLIENT_ID (et optionnellement AZURE_TENANT_ID) dans .env.local.
 * Usage : npm run cli:auth-microsoft
 */
import { getConfigAuthMicrosoft, acquireTokenByDeviceCode, saveTokens } from '../utils/auth-microsoft.js';

async function main(): Promise<void> {
  const config = getConfigAuthMicrosoft();
  if (!config.clientId) {
    console.error('Définis AZURE_CLIENT_ID (ID d\'application Azure) dans .env.local.');
    process.exitCode = 1;
    return;
  }

  console.log('Authentification Microsoft (device code). Scopes:', config.scopes.join(', '));
  console.log('');

  const result = await acquireTokenByDeviceCode(config, (message) => {
    console.log(message);
  });

  console.log('');
  console.log('Token obtenu avec succès.');

  const refreshToken = (result as unknown as { refreshToken?: string }).refreshToken;
  if (refreshToken) {
    saveTokens({
      refreshToken,
      clientId: config.clientId,
      tenantId: config.tenantId,
    });
    console.log('Refresh token enregistré dans data/microsoft-tokens.json.');
    console.log('L\'app régénérera l\'access token automatiquement.');
  } else {
    console.log('Aucun refresh token reçu ; vérifiez les scopes de l\'app Azure pour obtenir offline_access.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
