import { explain, validateInput } from "../../../lib/explainer.mjs";
import { localDevelopmentKey } from "../../../lib/local-key";
export async function POST(request: Request) {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
  };
  const reply = (value: unknown, status = 200) =>
    Response.json(value, { status, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply({ error: "Requests must come from this site." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "Use JSON input." }, 415);
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "Missing input." }, 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 60000) {
        await reader.cancel();
        return reply({ error: "The snippet is too large." }, 413);
      }
      chunks.push(value);
    }
  } catch {
    return reply({ error: "Could not read input." }, 400);
  }
  const joined = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    joined.set(c, offset);
    offset += c.length;
  }
  let input;
  try {
    input = validateInput(JSON.parse(new TextDecoder().decode(joined)));
  } catch (e) {
    return reply(
      { error: e instanceof Error ? e.message : "Invalid input." },
      400,
    );
  }
  // Production always requires the visitor's key. Local development may use .env.local.
  const authorization = request.headers.get("authorization") || "";
  const apiKey = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : localDevelopmentKey(request);
  if (!apiKey)
    return reply({ error: "Connect your OpenAI API key first." }, 401);
  try {
    return reply({
      explanation: await explain(input, { apiKey, signal: request.signal }),
    });
  } catch (e) {
    return reply(
      {
        error:
          e instanceof Error ? e.message : "Could not generate an explanation.",
      },
      502,
    );
  }
}
