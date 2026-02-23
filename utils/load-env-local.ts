import { config } from 'dotenv';
import { join } from 'node:path';

// Charge uniquement .env.local (pas de fallback sur .env).
export function chargerEnvLocal(): void {
  config({ path: join(process.cwd(), '.env.local'), override: true });
}

chargerEnvLocal();
