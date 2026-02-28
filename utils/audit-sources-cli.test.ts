import { runAuditSourcesCli } from '../scripts/audit-sources-cli.js';

describe('audit-sources-cli', () => {
  it('execute uniquement l\'audit et logue la synthese complete', async () => {
    const runAudit = jest.fn().mockResolvedValue({
      ok: true as const,
      nbEmailsScannes: 4,
      nbSourcesCreees: 1,
      nbSourcesExistantes: 1,
      synthese: [
        { emailExpéditeur: 'jobs@linkedin.com', source: 'Linkedin' as const, actif: 'Oui' as const, nbEmails: 3 },
        { emailExpéditeur: 'alerte@wttj.com', source: 'Inconnu' as const, actif: 'Non' as const, nbEmails: 1 },
      ],
      sousTotauxPrevisionnels: {
        emailsÀArchiver: 3,
        emailsÀAnalyser: 3,
      },
    });
    const logs: string[] = [];
    const errors: string[] = [];

    const exitCode = await runAuditSourcesCli({
      runAudit,
      log: (m) => logs.push(m),
      logError: (m) => errors.push(m),
    });

    expect(exitCode).toBe(0);
    expect(runAudit).toHaveBeenCalledTimes(1);
    expect(logs).toEqual(
      expect.arrayContaining([
        'Audit sources terminé : 4 email(s) scanné(s).',
        'Sources créées : 1',
        'Sources existantes : 1',
        'Synthèse:',
        '- jobs@linkedin.com | Linkedin | Oui | 3',
        '- alerte@wttj.com | Inconnu | Non | 1',
        'Sous-totaux prévisionnels: emailsÀArchiver=3, emailsÀAnalyser=3',
      ])
    );
    expect(errors).toEqual([]);
  });
});
