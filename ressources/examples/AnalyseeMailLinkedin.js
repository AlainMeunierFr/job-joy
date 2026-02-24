export default async function (req: Request) {
  if (req.method === "GET") return new Response("OK");

  const body = await req.json();
  const html = body.html || "";

  const results: {
    id: string;
    url: string;
    titre: string;
    entreprise: string;
    lieu: string;
  }[] = [];
  const seen = new Set<string>();
  const idsOrder: { id: string; idx: number }[] = [];

  // Extraire les IDs dans l'ordre, en gardant seulement ceux avec un jobcard_body
  const idRegex = /jobs\/view\/(\d+)\//g;
  let m;
  while ((m = idRegex.exec(html)) !== null) {
    const id = m[1];
    if (!seen.has(id)) {
      const ahead = html.substring(m.index, m.index + 600);
      if (ahead.includes("jobcard_body")) {
        seen.add(id);
        idsOrder.push({ id, idx: m.index });
      }
    }
  }

  for (const { id, idx } of idsOrder) {
    const jcbIdx = html.indexOf("jobcard_body", idx);
    if (jcbIdx === -1 || jcbIdx > idx + 1000) continue;
    const bloc = html.substring(jcbIdx, jcbIdx + 1200);

    const titreMatch = bloc.match(/>([^<]{5,80})<\/a>/);
    const infoMatch = bloc.match(/<p[^>]+>([^<]+·[^<]+)<\/p>/);

    const titre = titreMatch ? titreMatch[1].trim() : "";
    const info = infoMatch ? infoMatch[1].trim() : "";
    const parts = info.split(" · ");
    const entreprise = parts[0]?.trim() || "";
    const lieu = parts[1]?.trim() || "";

    results.push({
      id,
      url: "https://www.linkedin.com/jobs/view/" + id + "/",
      titre,
      entreprise,
      lieu,
    });
  }

  return Response.json(results);
}