import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';

const TEMPLATE_FILENAME = 'env.local.template';

/** Charge .env.local : en mode packagé (JOB_JOY_USER_DATA) depuis userData, sinon depuis process.cwd(). Au premier lancement en packagé, copie le template (doc en commentaires) puis complète PARAMETRES_ENCRYPTION_KEY. */
function loadEnv(): void {
  const userData = process.env.JOB_JOY_USER_DATA;
  if (userData?.trim()) {
    const envPath = join(userData.trim(), '.env.local');
    if (!existsSync(envPath)) {
      const keyHex = randomBytes(32).toString('hex');
      const templatePath = join(process.cwd(), 'ressources', TEMPLATE_FILENAME);
      let content: string;
      if (existsSync(templatePath)) {
        content = readFileSync(templatePath, 'utf-8');
        content = content.replace(/^PARAMETRES_ENCRYPTION_KEY=.*$/m, `PARAMETRES_ENCRYPTION_KEY=${keyHex}`);
      } else {
        content = `# Généré au premier lancement (Job-Joy packagé). Ne pas supprimer : nécessaire au déchiffrement des paramètres.\nPARAMETRES_ENCRYPTION_KEY=${keyHex}\n`;
      }
      writeFileSync(envPath, content, 'utf-8');
    }
    config({ path: envPath, override: true });
  } else {
    const cwd = process.cwd();
    const envPath = join(cwd, '.env');
    const envLocalPath = join(cwd, '.env.local');
    if (existsSync(envPath)) config({ path: envPath });
    config({ path: envLocalPath, override: true });
  }
}

/** Charge ou recharge .env.local (chemin optionnel). Utilisé par les handlers qui rechargent après édition. */
export function chargerEnvLocal(customPath?: string): void {
  if (customPath) {
    config({ path: customPath, override: true });
  } else {
    loadEnv();
  }
}

loadEnv();
