import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['worker/index.ts'], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent' });
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const request = (path, method = 'GET') => new Request(`https://example.test${path}`, { method });
const noAssets = { ASSETS: { fetch() { throw new Error('API request reached assets'); } } };

test('API modules retain HEAD, OPTIONS, retired POST and unsupported-method contracts', async () => {
  const connection = await worker.fetch(request('/api/connection'), noAssets);
  assert.deepEqual(await connection.json(), { local: false, browser: true, paidInference: true, requiresVisitorKey: true });
  assert.equal(connection.headers.get('Cache-Control'), 'no-store');
  const head = await worker.fetch(request('/api/connection', 'HEAD'), noAssets);
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  assert.equal((await worker.fetch(request('/api/connection/'), noAssets)).status, 200);
  assert.equal((await worker.fetch(request('/api/explain/', 'POST'), noAssets)).status, 410);
  for (const [path, allow] of [['/api/connection', 'GET, HEAD, OPTIONS'], ['/api/explain', 'OPTIONS, POST'], ['/api/explain/visitor', 'OPTIONS, POST']]) {
    const options = await worker.fetch(request(path, 'OPTIONS'), noAssets);
    assert.equal(options.status, 204); assert.equal(options.headers.get('Allow'), allow);
    const denied = await worker.fetch(request(path, 'PUT'), noAssets);
    assert.equal(denied.status, 405); assert.equal(await denied.text(), '');
  }
  assert.equal((await worker.fetch(request('/api/explain', 'POST'), noAssets)).status, 410);
  assert.equal((await worker.fetch(request('/api/explain/visitor', 'POST'), noAssets)).status, 403);
  const missingKey = new Request('https://example.test/api/explain/visitor', { method: 'POST', headers: { Origin: 'https://example.test' } });
  assert.equal((await worker.fetch(missingKey, noAssets)).status, 401);
});

test('security headers cover API and asset responses without losing asset status, body or cache headers', async () => {
  const original = request('/missing'); let seen;
  const asset = await worker.fetch(original, { ASSETS: { fetch(input) { seen = input; return new Response('missing', { status: 404, headers: { 'Cache-Control': 'max-age=60' } }); } } });
  assert.equal(seen, original); assert.equal(asset.status, 404); assert.equal(await asset.text(), 'missing');
  assert.equal(asset.headers.get('Cache-Control'), 'max-age=60');
  for (const response of [asset, await worker.fetch(request('/api/connection'), noAssets)]) {
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(response.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()');
  }
});

test('API slash aliases dispatch without redirects and unknown routes never become the application page', async () => {
  const alias = await worker.fetch(request('/api//connection/?fixture=1'), noAssets);
  assert.equal(alias.status, 200); assert.equal(alias.headers.get('Location'), null);
  assert.equal((await worker.fetch(request('//api/connection'), noAssets)).status, 404);
  assert.equal((await worker.fetch(request('/api/unknown'), noAssets)).status, 404);
  assert.equal((await worker.fetch(request('/%invalid'), noAssets)).status, 400);
  assert.equal((await worker.fetch(request('/', 'POST'), noAssets)).status, 405);
});
