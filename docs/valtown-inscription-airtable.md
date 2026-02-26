# Proxy POST → Airtable (Val.town)

**App** : aucune config. L'URL Val.town est en dur dans le code (`utils/envoi-identification-airtable.ts`). L'envoi se fait systématiquement (case cochée + Tester connexion ou Enregistrer).

**Val.town** : val HTTP + 3 variables d’env : `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_ID`. Colonne Airtable : `email`.

```typescript
const CHAMP_EMAIL = "email";

export default async function (request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { email } = (await request.json()) as { email?: string };
  if (!email?.trim()) return new Response("Missing email", { status: 400 });

  const apiKey = Deno.env.get("AIRTABLE_API_KEY");
  const baseId = Deno.env.get("AIRTABLE_BASE_ID");
  const tableId = Deno.env.get("AIRTABLE_TABLE_ID");
  if (!apiKey || !baseId || !tableId) return new Response("Env not set", { status: 500 });

  const fields: Record<string, string> = {};
  fields[CHAMP_EMAIL] = email.trim();

  const res = await fetch(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ records: [{ fields }] }),
  });

  if (!res.ok) return new Response(await res.text(), { status: res.status });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
```

*Le premier appel peut être lent (cold start Val.town) ; les suivants sont plus rapides.*
