/**
 * Masque une adresse email pour affichage (ne jamais exposer l'email en clair côté client).
 * Ex. alain@maep.fr → a***@m***.fr
 */
export function maskEmail(email: string): string {
  const s = (email ?? '').trim();
  if (!s || !s.includes('@')) return '';
  const at = s.indexOf('@');
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain) return '';
  const a = local.slice(0, 1) + '***';
  const dot = domain.lastIndexOf('.');
  const b = domain.slice(0, 1) + '***' + (dot >= 0 ? domain.slice(dot) : '');
  return a + '@' + b;
}
