import { decodeBase64 } from "https://deno.land/std@0.208.0/encoding/base64.ts";

export default async function (req: Request) {
  if (req.method === "GET") return new Response("OK");
  const body = await req.json();
  const html = body.html || "";

  const trackingUrls = [
    ...html.matchAll(/https:\/\/emails\.hellowork\.com\/clic\/[^\s"<>]+/g),
  ]
    .map((m) => m[0].replace(/&amp;/g, "&"));

  const seen = new Set<string>();
  const results: {
    id: string;
    url: string;
    description: string;
    statut: string;
  }[] = [];
  const errors: { id: string; reason: string }[] = [];

  for (const trackingUrl of trackingUrls) {
    const parts = trackingUrl.split("/");
    const b64 = parts[7] || "";
    const b64standard = b64.replace(/-/g, "+").replace(/_/g, "/");
    const padding = 4 - (b64standard.length % 4);
    const b64padded = padding !== 4
      ? b64standard + "=".repeat(padding)
      : b64standard;

    let id = "";
    try {
      const decoded = new TextDecoder().decode(decodeBase64(b64padded));
      const idMatch = decoded.match(/emplois(?:\/|%2F)(\d+)/i);
      if (!idMatch) continue;

      id = idMatch[1];
      if (seen.has(id)) continue;
      seen.add(id);

      const url = `https://www.hellowork.com/fr-fr/emplois/${id}.html`;
      const pageRes = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      // Offre expirée
      if (pageRes.status === 404 || pageRes.status === 410) {
        results.push({ id, url, description: "", statut: "Obsolète" });
        continue;
      }

      // Erreur technique : on log sans insérer
      if (!pageRes.ok) {
        errors.push({ id, reason: `HTTP ${pageRes.status}` });
        continue;
      }

      const pageHtml = await pageRes.text();
      const jsonMatch = pageHtml.match(
        /id="AgentIaJsonOffre"[^>]*>({.*?})<\/script>/s,
      );

      // Structure changée : on log sans insérer
      if (!jsonMatch) {
        errors.push({
          id,
          reason: "AgentIaJsonOffre introuvable - structure changée ?",
        });
        continue;
      }

      const offerData = JSON.parse(jsonMatch[1]);
      results.push({
        id,
        url,
        description: offerData.Description || "",
        statut: "A analyser",
      });
    } catch (e: any) {
      if (id) errors.push({ id, reason: `Exception: ${e.message}` });
    }
  }

  return Response.json({ results, errors });
}