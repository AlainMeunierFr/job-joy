/**
 * Port d'inscription « nouvel utilisateur » (US-3.15).
 * En production : envoi systématique vers Val.town (URL en dur). Val.town stocke la clé Airtable et écrit dans la base.
 * Pas de variable d'environnement ni de condition.
 */
import type { EnvoyeurEmailIdentification, ParametresEmailIdentification, ResultatEnvoiEmailIdentification } from '../types/compte.js';
import { extraireBaseIdDepuisUrl, extraireTableIdDepuisUrl, normaliserBaseId } from './airtable-url.js';

const API_BASE = 'https://api.airtable.com/v0';

/** Endpoint Val.town : l'app POST l'email ; Val.town détient la clé API et écrit dans Airtable. */
const VALTOWN_ENDPOINT_URL = 'https://alainmeunierfr--c81a360612ae11f198d342dde27851f2.web.val.run';

/** URL de la table Airtable « nouvel utilisateur » (mode API direct, si utilisé). */
const INSCRIPTION_AIRTABLE_TABLE_URL = 'https://airtable.com/appXXX/tblYYY';

/** Préfixe Airtable pour préremplir un champ (doc : https://support.airtable.com/docs/prefilling-a-form-via-encoded-url). */
const PREFILL_PREFIX = 'prefill_';

function isValTownUrl(value: string): boolean {
  const v = value.trim();
  return v.startsWith('http://') || v.startsWith('https://');
}

/** Port Val.town : envoie toujours l'email à l'endpoint (POST JSON { email }). Aucune config requise. */
export function createEnvoyeurIdentificationValTown(): EnvoyeurEmailIdentification {
  return {
    async envoyer(params: ParametresEmailIdentification): Promise<ResultatEnvoiEmailIdentification> {
      try {
        const res = await fetch(VALTOWN_ENDPOINT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          body: JSON.stringify({ email: params.from }),
        });
        if (!res.ok) {
          const text = await res.text();
          return { ok: false, message: `Val.town ${res.status}: ${text.slice(0, 200)}` };
        }
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, message };
      }
    },
  };
}

/**
 * Port formulaire Airtable : construit l'URL préremplie (prefill_email=...) et retourne openUrl pour que le client ouvre dans le navigateur.
 * L'utilisateur n'a plus qu'à cliquer « Envoyer » sur le formulaire (pas de soumission auto côté Airtable natif).
 */
export function createEnvoyeurIdentificationFormUrl(): EnvoyeurEmailIdentification | null {
  const baseUrl = process.env.INSCRIPTION_CONSENTEMENT_FORM_URL?.trim();
  if (!baseUrl) return null;
  const fieldName = process.env.INSCRIPTION_CONSENTEMENT_FORM_FIELD?.trim() || 'email';
  return {
    async envoyer(params: ParametresEmailIdentification): Promise<ResultatEnvoiEmailIdentification> {
      const sep = baseUrl.includes('?') ? '&' : '?';
      const openUrl = `${baseUrl}${sep}${PREFILL_PREFIX}${encodeURIComponent(fieldName)}=${encodeURIComponent(params.from)}`;
      return { ok: true, openUrl };
    },
  };
}

function getConfig(): { apiKey: string; baseId: string; tableId: string } | null {
  const raw = process.env.AIRTABLE_NOUVEL_UTILISATEUR?.trim();
  if (!raw || isValTownUrl(raw)) return null; // Val.town utilise la même var comme URL
  const apiKey = raw;
  const url = process.env.AIRTABLE_NOUVEL_UTILISATEUR_URL?.trim() || INSCRIPTION_AIRTABLE_TABLE_URL;
  if (url) {
    const baseId = extraireBaseIdDepuisUrl(url);
    const tableId = extraireTableIdDepuisUrl(url);
    if (baseId && tableId) return { apiKey, baseId, tableId };
  }
  const baseId = process.env.AIRTABLE_NOUVEL_UTILISATEUR_BASE?.trim();
  const tableId = process.env.AIRTABLE_NOUVEL_UTILISATEUR_TABLE?.trim();
  if (baseId && tableId) return { apiKey, baseId: normaliserBaseId(baseId), tableId };
  return null;
}

/**
 * Crée un port qui enregistre l'email dans la table Airtable (champ "email" uniquement ; Created time par Airtable).
 */
export function createEnvoyeurIdentificationAirtable(): EnvoyeurEmailIdentification | null {
  const cfg = getConfig();
  if (!cfg) return null;

  return {
    async envoyer(params: ParametresEmailIdentification): Promise<ResultatEnvoiEmailIdentification> {
      const { apiKey, baseId, tableId } = cfg;
      const url = `${API_BASE}/${baseId}/${encodeURIComponent(tableId)}`;
      const body = {
        records: [{ fields: { email: params.from } }],
      };
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const text = await res.text();
          let msg = `Airtable ${res.status}`;
          try {
            const j = JSON.parse(text);
            if (j.error?.message) msg = j.error.message;
          } catch {
            if (text) msg = text.slice(0, 200);
          }
          return { ok: false, message: msg };
        }
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, message };
      }
    },
  };
}
