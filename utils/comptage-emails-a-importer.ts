/**
 * US-3.5 CA2 : Comptage des emails à importer (lecture seule).
 * Ne fait que compter ; n'appelle aucune création d'offre ni déplacement/archivage d'emails.
 */
export interface ReaderEmailsAImporter {
  getEmailsAImporter(): Promise<unknown[]>;
}

/**
 * Compte les emails à importer en utilisant uniquement le reader (pas de création ni archivage).
 */
export async function compterEmailsAImporter(
  reader: ReaderEmailsAImporter
): Promise<number> {
  const emails = await reader.getEmailsAImporter();
  return emails.length;
}
