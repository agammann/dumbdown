import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { packageWorkerAssets } from "../build/worker-assets.mjs";

const root = path.resolve(".sites-runtime/worker-assets-tests");
await mkdir(root, { recursive: true });
const directory = await mkdtemp(path.join(root, "case-"));
const fixtures = new Map([
  ["index.html", Buffer.from('<!doctype html><title>Fixture</title><p>\u2014</p><script src="/assets/home-fixture.js"></script>')],
  ["assets/home-fixture.js", Buffer.from('export const text = "\u00e9";')],
  ["assets/home-fixture.css", Buffer.from("body { color: blue; }")],
  ["browser-model-worker.mjs", Buffer.from("self.onmessage = () => {};\n")],
  ["favicon.svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
]);
let worker;
test.before(async () => {
  for (const [filename, body] of fixtures) {
    const target = path.join(directory, "dist/client", filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  }
  await writeFile(path.join(directory, "dist/client/_headers"), "/*\n  X-Frame-Options: DENY\n");
  await writeFile(path.join(directory, "dist/client/.assetsignore"), "wrangler.json\n.dev.vars\n");
  await mkdir(path.join(directory, "dist/server"), { recursive: true });
  const compiled = await build({ entryPoints: ["worker/index.ts"], bundle: true, write: false, platform: "browser", format: "esm", logLevel: "silent" });
  await writeFile(path.join(directory, "dist/server/index.js"), compiled.outputFiles[0].contents);
  await writeFile(path.join(directory, "dist/server/wrangler.json"), JSON.stringify({ main: "index.js", assets: { directory: "../client" }, compatibility_flags: ["nodejs_compat"] }));
  const summary = await packageWorkerAssets(directory);
  assert.equal(summary.assets, 5);
  worker = (await import(pathToFileURL(path.join(directory, "dist/server/index.js")).href)).default;
});
test.after(async () => {
  assert.equal(path.dirname(directory), root);
  await rm(directory, { recursive: true, force: true });
});
const request = (pathname, options) => new Request(`https://example.test${pathname}`, options);

test("packaged Worker preserves every asset byte, MIME, HEAD length and security policy without static files", async () => {
  await assert.rejects(readdir(path.join(directory, "dist/client")), { code: "ENOENT" });
  const config = JSON.parse(await readFile(path.join(directory, "dist/server/wrangler.json"), "utf8"));
  assert.equal(config.assets, undefined);
  assert.deepEqual(config.compatibility_flags, ["nodejs_compat"]);
  for (const [filename, bytes] of fixtures) {
    const url = filename === "index.html" ? "/" : `/${filename}`;
    const response = await worker.fetch(request(url), {});
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.equal(response.headers.get("X-Frame-Options"), "DENY");
    assert.equal(response.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
    const expectedMime = filename.endsWith(".html") ? "text/html" : filename.endsWith(".css") ? "text/css" : filename.endsWith(".svg") ? "image/svg+xml" : "text/javascript";
    assert.equal(response.headers.get("Content-Type").split(";")[0], expectedMime);
    const head = await worker.fetch(request(url, { method: "HEAD" }), {});
    assert.equal(await head.text(), "");
    assert.equal(head.headers.get("Content-Length"), String(bytes.length));
    assert.equal(head.headers.get("ETag"), response.headers.get("ETag"));
    assert.deepEqual(await readFile(path.join(directory, ".sites-runtime/asset-reference", filename)), bytes);
  }
});

test("packaged routing preserves canonical query, empty unknown responses and unchanged API guards", async () => {
  const canonical = await worker.fetch(request("/index.html?fixture=yes"), {});
  assert.equal(canonical.status, 307);
  assert.equal(canonical.headers.get("Location"), "/?fixture=yes");
  for (const pathname of ["/missing", "/assets/missing.js", "/_headers", "/.assetsignore", "/wrangler.json", "/.dev.vars"]) {
    const response = await worker.fetch(request(pathname), {});
    assert.equal(response.status, 404);
    assert.equal(await response.text(), "");
  }
  assert.equal((await worker.fetch(request("/", { method: "POST" }), {})).status, 405);
  const connection = await worker.fetch(request("/api/connection"), {});
  assert.deepEqual(await connection.json(), { local: false, browser: true, paidInference: true, requiresVisitorKey: true });
  assert.equal((await worker.fetch(request("/api/explain", { method: "POST" }), {})).status, 410);
  assert.equal((await worker.fetch(request("/api/explain/visitor", { method: "POST", headers: { Origin: "https://example.test" } }), {})).status, 401);
});

test("conditional asset requests use content ETags without losing security headers or serving a body", async () => {
  const first = await worker.fetch(request("/"), {});
  const etag = first.headers.get("ETag");
  for (const method of ["GET", "HEAD"]) {
    for (const value of [etag, `W/${etag}`, `"different", ${etag}`, "*"]) {
      const response = await worker.fetch(request("/", { method, headers: { "If-None-Match": value } }), {});
      assert.equal(response.status, 304);
      assert.equal(await response.text(), "");
      assert.equal(response.headers.get("ETag"), etag);
      assert.equal(response.headers.get("Content-Length"), null);
      assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    }
  }
  const fresh = await worker.fetch(request("/", { headers: { "If-None-Match": '"different"' } }), {});
  assert.equal(fresh.status, 200);
  assert.deepEqual(Buffer.from(await fresh.arrayBuffer()), fixtures.get("index.html"));
});
