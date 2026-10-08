import { explanationInstructions } from "./explanation-instructions.mjs";
export const MAX_SOURCE = 12000;
export const LEVELS = ["beginner", "intermediate", "advanced"];
export const inputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    source: {
      type: "string",
      minLength: 1,
      maxLength: MAX_SOURCE,
      description:
        "Code or technical documentation to explain. Do not include secrets.",
    },
    kind: { type: "string", enum: ["code", "documentation"] },
    level: { type: "string", enum: LEVELS },
  },
  required: ["source", "kind", "level"],
};
const text = { type: "string" };
export const explanationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: text,
    summary: text,
    analogy: text,
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { title: text, explanation: text },
        required: ["title", "explanation"],
      },
    },
    terms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { term: text, meaning: text },
        required: ["term", "meaning"],
      },
    },
    example: text,
    caveats: { type: "array", items: text },
  },
  required: [
    "title",
    "summary",
    "analogy",
    "steps",
    "terms",
    "example",
    "caveats",
  ],
};
export function validateInput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Send code or documentation to explain.");
  if (Object.keys(value).some((k) => !["source", "kind", "level"].includes(k)))
    throw new Error("Unexpected input field.");
  if (
    typeof value.source !== "string" ||
    !value.source.trim() ||
    value.source.length > MAX_SOURCE
  )
    throw new Error("Paste between 1 and 12,000 characters.");
  if (
    !["code", "documentation"].includes(value.kind) ||
    !LEVELS.includes(value.level)
  )
    throw new Error("Choose a valid content type and explanation level.");
  if (
    /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{25,}/.test(
      value.source,
    )
  )
    throw new Error(
      "This looks like it contains a secret. Remove the key before explaining it.",
    );
  return { ...value, source: value.source.trim() };
}
export function validateExplanation(v) {
  if (!v || typeof v !== "object")
    throw new Error("The explanation was incomplete. Please try again.");
  for (const k of ["title", "summary", "analogy", "example"])
    if (typeof v[k] !== "string" || v[k].length > 16000)
      throw new Error("The explanation format was invalid. Please try again.");
  for (const [k, fields] of [
    ["steps", ["title", "explanation"]],
    ["terms", ["term", "meaning"]],
  ]) {
    if (
      !Array.isArray(v[k]) ||
      v[k].length > 20 ||
      v[k].some(
        (x) =>
          !x ||
          fields.some((f) => typeof x[f] !== "string" || x[f].length > 8000),
      )
    )
      throw new Error("The explanation format was invalid. Please try again.");
  }
  if (
    !Array.isArray(v.caveats) ||
    v.caveats.length > 20 ||
    v.caveats.some((x) => typeof x !== "string" || x.length > 8000)
  )
    throw new Error("The explanation format was invalid. Please try again.");
  return v;
}
export async function explain(
  input,
  { apiKey, signal, fetchImpl = fetch, model = "gpt-5.4" } = {},
) {
  const clean = validateInput(input);
  if (typeof apiKey !== "string" || !/^sk-[A-Za-z0-9_-]{20,512}$/.test(apiKey))
    throw new Error("Connect an OpenAI API key to generate an explanation.");
  const instructions = explanationInstructions(clean.level);
  const timeout = AbortSignal.timeout(180000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions,
        input: JSON.stringify({ kind: clean.kind, source: clean.source }),
        reasoning: { effort: "medium" },
        max_output_tokens: 12000,
        text: {
          format: {
            type: "json_schema",
            name: "dumbdown_explanation",
            strict: true,
            schema: explanationSchema,
          },
        },
      }),
      signal: combined,
    });
  } catch {
    if (combined.aborted)
      throw new Error(
        signal?.aborted
          ? "Explanation cancelled."
          : "The explanation timed out. Try a smaller snippet.",
      );
    throw new Error(
      "Could not reach OpenAI. Check your connection and try again.",
    );
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new Error(
        "OpenAI rejected this key. Check its project and Responses permissions.",
      );
    if (response.status === 429)
      throw new Error(
        "OpenAI usage or rate limit reached. Check your API billing, then try again.",
      );
    throw new Error(
      "OpenAI could not complete the explanation. Please try again.",
    );
  }
  let data;
  try {
    const reader = response.body?.getReader();
    if (!reader) throw Error("Empty response.");
    const chunks = []; let length = 0;
    const stop = () => { reader.cancel(combined.reason).catch(() => {}); };
    combined.addEventListener("abort", stop, { once: true });
    try {
      combined.throwIfAborted();
      while (true) {
        const { done, value } = await reader.read(); combined.throwIfAborted();
        if (done) break;
        length += value.byteLength;
        if (length > 1024 * 1024) throw Error("Response too large.");
        chunks.push(value);
      }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      data = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } finally {
      combined.removeEventListener("abort", stop); await reader.cancel().catch(() => {}); reader.releaseLock();
    }
  } catch {
    if (combined.aborted) throw Error(signal?.aborted ? "Explanation cancelled." : "The explanation timed out. Try a smaller snippet.");
    throw Error("OpenAI returned an unreadable explanation. Please try again.");
  }
  if (data.status !== "completed")
    throw new Error(
      "OpenAI returned an incomplete explanation. Try a smaller snippet.",
    );
  const content = (data.output || []).flatMap((x) => x.content || []);
  if (content.some((x) => x.type === "refusal"))
    throw new Error(
      "OpenAI declined to explain this content. Try a different snippet.",
    );
  const output = content
    .filter((x) => x.type === "output_text")
    .map((x) => x.text)
    .join("");
  try {
    if (output.includes(apiKey)) throw Error("Unsafe output.");
    return validateExplanation(JSON.parse(output));
  } catch {
    throw new Error("The explanation was incomplete. Please try again.");
  }
}
export function toMarkdown(r) {
  const longestRun = Math.max(0, ...(r.example.match(/`+/g) || []).map(run => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `# ${r.title}\n\n${r.summary}\n\n## Think of it like\n${r.analogy}\n\n## Step by step\n${r.steps.map((s, i) => `${i + 1}. **${s.title}** — ${s.explanation}`).join("\n")}\n\n## Terms decoded\n${r.terms.map((t) => `- **${t.term}:** ${t.meaning}`).join("\n")}\n\n## Example\n\n${fence}text\n${r.example}\n${fence}\n\n## Keep in mind\n${r.caveats.map((c) => "- " + c).join("\n")}\n\nVerify explanations against the source.\n`;
}
