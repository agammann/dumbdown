import test from 'node:test';
import assert from 'node:assert/strict';
import { visitorExplanation } from '../lib/visitor-explanation.mjs';

const key = 'sk-visitor-test-placeholder';
const input = { source: 'const n = 2 + 2;', kind: 'code', level: 'beginner' };
const output = () => ({ title: 'Add two numbers', summary: 'n is 4.', analogy: 'Two pairs make four items.', steps: [1, 2, 3].map(n => ({ title: 'Step ' + n, explanation: 'Read the provided arithmetic.' })), terms: [], example: 'n // 4', caveats: ['This snippet has no surrounding context.'] });
const request = (body = input, headers = {}, signal) => new Request('https://example.test/api/explain/visitor', { method: 'POST', signal, headers: { Origin: 'https://example.test', Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const completion = value => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });

test('visitor route sends complete validated source to fixed provider and model without storage or redirects', async () => {
  let calls = 0;
  const response = await visitorExplanation(request(), { fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(options.redirect, 'manual');
    assert.equal(options.headers.Authorization, `Bearer ${key}`);
    const body = JSON.parse(options.body); assert.deepEqual(JSON.parse(body.input), input);
    assert.equal(body.model, 'gpt-5.4'); assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
    assert.equal(body.max_output_tokens, 12000); assert.equal(body.text.format.schema.properties.steps.minItems, 3);
    return completion(output());
  } });
  assert.equal(response.status, 200); assert.equal(response.headers.get('Cache-Control'), 'no-store'); assert.equal(calls, 1);
  assert.deepEqual((await response.json()).explanation, output());
});

test('missing key, foreign origin, oversized source and unexpected fields never call the provider', async () => {
  let calls = 0;
  for (const [body, headers, expected] of [[input, { Authorization: '' }, 401], [input, { Origin: 'https://other.test' }, 403], [{ ...input, source: 'x'.repeat(12001) }, {}, 400], [{ ...input, model: 'other' }, {}, 400], [{ ...input, source: key }, {}, 400]]) {
    const response = await visitorExplanation(request(body, headers), { fetchImpl: async () => { calls++; throw Error('unexpected'); } });
    assert.equal(response.status, expected);
  }
  assert.equal(calls, 0);
});

test('provider failure bodies, redirects, incomplete output and credentials are not exposed or retried', async () => {
  for (const [upstream, expected] of [
    [() => new Response('secret ' + key, { status: 401 }), 401],
    [() => new Response('limited', { status: 429 }), 429],
    [() => new Response('', { status: 302, headers: { Location: 'https://other.test' } }), 502],
    [() => Response.json({ status: 'incomplete' }), 502],
    [() => completion({ ...output(), summary: '' }), 502],
    [() => completion({ ...output(), steps: [] }), 502],
    [() => completion({ ...output(), summary: key }), 502],
    [() => new Response('x'.repeat(1024 * 1024 + 1)), 502],
  ]) {
    let calls = 0;
    const response = await visitorExplanation(request(), { fetchImpl: async () => { calls++; return upstream(); } });
    assert.equal(response.status, expected); assert.equal(calls, 1); assert.ok(!(await response.text()).includes(key));
  }
});

test('cancel during a stalled response stops the stream and returns no partial explanation', async () => {
  const controller = new AbortController(); let canceled = false;
  const result = visitorExplanation(request(input, {}, controller.signal), { fetchImpl: async () => new Response(new ReadableStream({
    start(stream) { stream.enqueue(new TextEncoder().encode('{')); setTimeout(() => controller.abort(), 10); }, cancel() { canceled = true; },
  })) });
  assert.equal((await result).status, 499); assert.equal(canceled, true);
});
