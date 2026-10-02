import { validateInput, explanationSchema, validateExplanation } from './explainer.mjs';
import { explanationInstructions } from './explanation-instructions.mjs';

class VisitorError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
const boundedText = maxLength => ({ type: 'string', minLength: 1, maxLength });
const visitorSchema = {
  ...explanationSchema, properties: {
    title: boundedText(200), summary: boundedText(2000), analogy: boundedText(2000), example: boundedText(8000),
    steps: { ...explanationSchema.properties.steps, minItems: 3, maxItems: 6, items: { ...explanationSchema.properties.steps.items, properties: { title: boundedText(200), explanation: boundedText(2000) } } },
    terms: { ...explanationSchema.properties.terms, maxItems: 5, items: { ...explanationSchema.properties.terms.items, properties: { term: boundedText(200), meaning: boundedText(2000) } } },
    caveats: { type: 'array', minItems: 1, maxItems: 3, items: boundedText(2000) },
  },
};
function validateVisitorExplanation(value) {
  const result = validateExplanation(value);
  const valid = (text, max) => typeof text === 'string' && text.trim().length > 0 && text.length <= max;
  if (!valid(result.title, 200) || !valid(result.summary, 2000) || !valid(result.analogy, 2000) || !valid(result.example, 8000) || result.steps.length < 3 || result.steps.length > 6 || result.terms.length > 5 || result.caveats.length < 1 || result.caveats.length > 3 || result.steps.some(step => !valid(step.title, 200) || !valid(step.explanation, 2000)) || result.terms.some(term => !valid(term.term, 200) || !valid(term.meaning, 2000)) || result.caveats.some(caveat => !valid(caveat, 2000))) throw Error('Incomplete explanation.');
  return result;
}
async function limitedText(message, limit, signal) {
  const reader = message.body?.getReader();
  if (!reader) throw new VisitorError('The request or response was empty.');
  const chunks = []; let size = 0;
  const stop = () => { reader.cancel(signal.reason).catch(() => {}); };
  signal.addEventListener('abort', stop, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { value, done } = await reader.read(); signal.throwIfAborted(); if (done) break;
      size += value.byteLength;
      if (size > limit) throw new VisitorError('The request or response is too large.', 413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } finally { signal.removeEventListener('abort', stop); await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
function providerError(status) {
  if (status === 401) return new VisitorError('OpenAI rejected this key. Check your API key and try again.', 401);
  if (status === 403 || status === 404) return new VisitorError('This key cannot access GPT-5.4. Check its model permissions.', 403);
  if (status === 429) return new VisitorError('OpenAI reported a usage or rate limit. Check your API billing and limits.', 429);
  return new VisitorError('OpenAI could not complete the explanation. Try again later.', 502);
}

// This route uses only the visitor-supplied key, never an operator environment key.
export async function visitorExplanation(request, { fetchImpl = fetch } = {}) {
  let signal;
  try {
    if (request.method !== 'POST') throw new VisitorError('Method not allowed.', 405);
    if (request.headers.get('Origin') !== new URL(request.url).origin) throw new VisitorError('Open dumbdown to request an explanation.', 403);
    const key = /^Bearer (sk-[A-Za-z0-9_-]{16,512})$/.exec(request.headers.get('Authorization') || '')?.[1];
    if (!key) throw new VisitorError('Enter your own OpenAI API key.', 401);
    if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) throw new VisitorError('Send a JSON explanation request.');
    signal = AbortSignal.any([request.signal, AbortSignal.timeout(180000)]);
    const raw = await limitedText(request, 128 * 1024, signal);
    let input;
    try { input = validateInput(JSON.parse(raw)); }
    catch (error) { throw new VisitorError(error instanceof SyntaxError ? 'Send a valid JSON explanation request.' : error.message); }
    if (raw.includes(key) || JSON.stringify(input).includes(key)) throw new VisitorError('Keep the API key in its key field, not in your source.');
    signal.throwIfAborted();
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST', redirect: 'manual', signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'gpt-5.4', store: false, reasoning: { effort: 'medium' }, max_output_tokens: 12000,
        instructions: explanationInstructions(input.level), input: JSON.stringify(input),
        text: { format: { type: 'json_schema', name: 'dumbdown_explanation', strict: true, schema: visitorSchema } },
      }),
    });
    if (!response.ok) { await response.body?.cancel(); throw providerError(response.status); }
    let data;
    try { data = JSON.parse(await limitedText(response, 1024 * 1024, signal)); }
    catch { throw new VisitorError('OpenAI returned an unreadable explanation. Try again.', 502); }
    signal.throwIfAborted();
    if (data.status !== 'completed') throw new VisitorError('The explanation did not finish. Try a smaller excerpt or retry.', 502);
    const content = (data.output || []).flatMap(item => item.type === 'message' ? item.content || [] : []);
    if (content.some(part => part.type === 'refusal')) throw new VisitorError('The model could not explain this source.', 422);
    const output = content.filter(part => part.type === 'output_text').map(part => part.text).join('');
    if (!output || output.includes(key)) throw new VisitorError('The explanation could not be returned safely.', 502);
    let explanation;
    try { explanation = validateVisitorExplanation(JSON.parse(output)); }
    catch { throw new VisitorError('The explanation format was incomplete. Try again.', 502); }
    if (JSON.stringify(explanation).includes(key)) throw new VisitorError('The explanation could not be returned safely.', 502);
    return json({ explanation, model: 'gpt-5.4' });
  } catch (error) {
    if (request.signal.aborted) return json({ error: 'Explanation cancelled.' }, 499);
    if (signal?.aborted) return json({ error: 'The explanation timed out. Try a smaller excerpt or retry.' }, 504);
    return json({ error: error instanceof VisitorError ? error.message : 'The explanation could not be completed. Try again.' }, error instanceof VisitorError ? error.status : 502);
  }
}
