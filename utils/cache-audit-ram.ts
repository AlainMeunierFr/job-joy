/**
 * Cache RAM du dernier audit (US-3.3).
 * Stocke par email (normalisé) le nombre d'offres "à importer" issu du dernier audit.
 */

let dernierAudit: Record<string, number> = {};

function normaliserEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function setDernierAudit(record: Record<string, number>): void {
  dernierAudit = {};
  for (const [email, count] of Object.entries(record)) {
    dernierAudit[normaliserEmail(email)] = count;
  }
}

export function getDernierAudit(): Record<string, number> {
  return { ...dernierAudit };
}

export function getNombreAImporter(email: string): number {
  return dernierAudit[normaliserEmail(email)] ?? 0;
}

/** Décrémente le nombre "A importer" pour une source (ex. après traitement d’un email). */
export function decrementAImporter(email: string, by: number): void {
  const key = normaliserEmail(email);
  if (!key) return;
  const prev = dernierAudit[key] ?? 0;
  dernierAudit[key] = Math.max(0, prev - by);
}
