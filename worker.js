/**
 * GOUFE MCU HUB — serverless AI endpoint for Cloudflare Workers.
 * Required secrets/settings:
 *   OPENAI_API_KEY (secret)
 *   ALLOWED_ORIGIN (text, e.g. https://niceguylid.github.io)
 * Optional:
 *   OPENAI_MODEL (text; defaults to gpt-6-astra)
 *
 * Never place OPENAI_API_KEY in index.html or commit it to this repository.
 */
const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders }
});

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = (env.ALLOWED_ORIGIN || "").trim().replace(/\/$/, "");
    const cors = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    if (!allowedOrigin) return json({ error: "Server configuration is incomplete: ALLOWED_ORIGIN is missing." }, 500);
    if (origin && origin !== allowedOrigin) return json({ error: "Origin not allowed." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return json({ service: "GOUFE MCU AI", status: "online" }, 200, cors);
    }
    if (request.method !== "POST" || url.pathname !== "/api/chat") {
      return json({ error: "Not found." }, 404, cors);
    }
    if (!env.OPENAI_API_KEY) return json({ error: "Server configuration is incomplete: OPENAI_API_KEY is missing." }, 500, cors);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Send a valid JSON request." }, 400, cors); }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return json({ error: "Write a question first." }, 400, cors);
    if (message.length > 2000) return json({ error: "Question is too long (maximum 2,000 characters)." }, 413, cors);

    const allowedRoles = new Set(["user", "assistant"]);
    const history = Array.isArray(body.history) ? body.history
      .filter(item => item && allowedRoles.has(item.role) && typeof item.content === "string")
      .slice(-8)
      .map(item => ({ role: item.role, content: item.content.slice(0, 2000) })) : [];

    const input = [
      ...history,
      { role: "user", content: message }
    ];
    const instructions = [
      "You are the GOUFE MCU Assistant, a friendly, knowledgeable guide to Marvel comics and the Marvel Cinematic Universe.",
      "Answer the user's actual question in a clear, conversational way. Explain MCU lore, characters, films, Infinity Stones, timelines, and theories.",
      "The user may ask about topics beyond Marvel; answer helpfully when appropriate, but be clear when a claim is uncertain.",
      "Do not invent official release dates or claim a fan theory is confirmed canon. If timeline placement or current production status is uncertain, say so.",
      "Respect the user's language and tone. If they write Indonesian, answer in natural Indonesian.",
      "Avoid reproducing long copyrighted passages or song lyrics. Summarize in your own words.",
      "You are an AI assistant, not an official Marvel Studios service."
    ].join(" ");

    try {
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-6-astra",
          instructions,
          input,
          max_output_tokens: 700,
          store: false
        })
      });

      const result = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        console.error("OpenAI API error status:", upstream.status);
        return json({
          error: upstream.status === 429
            ? "AI usage limit reached. Try again later."
            : "The AI provider returned an error. Check the model, API account, and billing settings."
        }, upstream.status === 429 ? 429 : 502, cors);
      }

      const answer = typeof result.output_text === "string" ? result.output_text.trim()
        : (result.output || []).flatMap(item => item.content || [])
          .filter(item => item.type === "output_text" && typeof item.text === "string")
          .map(item => item.text).join("\n").trim();

      if (!answer) return json({ error: "The AI returned no text. Please try again." }, 502, cors);
      return json({ answer }, 200, cors);
    } catch (error) {
      console.error("MCU AI upstream request failed:", error?.message || "unknown error");
      return json({ error: "Could not connect to the AI provider. Try again later." }, 502, cors);
    }
  }
};
