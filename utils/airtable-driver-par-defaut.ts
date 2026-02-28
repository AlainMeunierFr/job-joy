/**
 * Driver Airtable par défaut (US-1.3). Utilisé quand aucune base n’est configurée (ex. CLI sans airtable.base).
 * Remplacer par createAirtableDriverReel pour un flux réel.
 */
import type { AirtableConfigDriver } from './configuration-airtable.js';

export const airtableDriverParDefaut: AirtableConfigDriver = {
  async creerBaseEtTables(): Promise<{ baseId: string; offresId: string }> {
    throw new Error(
      'Création base Airtable non configurée. Renseigner l’URL ou l’ID de la base dans parametres.json > airtable.base.'
    );
  },
};
