export default async function (req: Request) {
  if (req.method === "GET") return new Response("OK");

  const body = await req.json();
  const url = body.url || "";
  const description = body.description || "";
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  const systemPrompt = Deno.env.get("SYSTEM_PROMPT") || "";

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      temperature: 0,
      system: systemPrompt,
      messages: [{
        role: "user",
        content:
          `Analyse cette offre et retourne le JSON. URL: ${url}. Contenu: ${description}`,
      }],
    }),
  });

  const claudeData = await claudeRes.json();
  const jsonText = claudeData.content[0].text;
  return new Response(jsonText, {
    headers: { "content-type": "application/json" },
  });
}