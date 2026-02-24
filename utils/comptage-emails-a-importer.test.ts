/**
 * Tests US-3.5 CA2 : comptage des emails à importer (lecture seule, sans création ni archivage).
 */
import { compterEmailsAImporter } from './comptage-emails-a-importer.js';
import type { ReaderEmailsAImporter } from './comptage-emails-a-importer.js';

describe('comptage-emails-a-importer', () => {
  it('étant donné un reader mock qui retourne N emails, la fonction retourne N', async () => {
    const N = 5;
    const reader: ReaderEmailsAImporter = {
      getEmailsAImporter: jest.fn().mockResolvedValue(Array(N).fill({})),
    };
    const count = await compterEmailsAImporter(reader);
    expect(count).toBe(N);
    expect(reader.getEmailsAImporter).toHaveBeenCalledTimes(1);
  });

  it('aucun appel à création ni archivage n\'a été effectué (reader avec spies non invoqués)', async () => {
    const creerOffres = jest.fn();
    const archiverEmails = jest.fn();
    const reader: ReaderEmailsAImporter & { creerOffres: jest.Mock; archiverEmails: jest.Mock } = {
      getEmailsAImporter: jest.fn().mockResolvedValue([{}, {}]),
      creerOffres,
      archiverEmails,
    };
    await compterEmailsAImporter(reader);
    expect(reader.getEmailsAImporter).toHaveBeenCalledTimes(1);
    expect(creerOffres).not.toHaveBeenCalled();
    expect(archiverEmails).not.toHaveBeenCalled();
  });
});
