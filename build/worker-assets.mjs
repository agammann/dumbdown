import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// This function is embedded in the final Worker. It has no Node dependencies.
export function createAssetService(records) {
  const assets = new Map(records.map(record => [record.pathname, record]));
  return {
    async fetch(request) {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });
      const url = new URL(request.url);
      if (url.pathname === "/index.html") {
        return new Response(null, { status: 307, headers: { Location: `/${url.search}` } });
      }
      const asset = assets.get(url.pathname === "/" ? "/index.html" : url.pathname);
      if (!asset) return new Response(null, { status: 404 });
      const headers = new Headers({
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=0, must-revalidate",
        ETag: asset.etag,
      });
      const matches = request.headers.get("If-None-Match")?.split(",")
        .some(value => value.trim() === "*" || value.trim().replace(/^W\//, "") === asset.etag);
      if (matches) return new Response(null, { status: 304, headers });
      headers.set("Content-Length", String(asset.bytes));
      const body = request.method === "HEAD" ? null : Uint8Array.from(atob(asset.base64), character => character.charCodeAt(0));
      return new Response(body, { headers });
    },
  };
}

async function filesBelow(directory, relative = "") {
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    const filename = path.join(directory, name);
    const stat = await lstat(filename);
    if (stat.isSymbolicLink()) throw new Error("Asset output must not contain symlinks.");
    const child = relative ? `${relative}/${name}` : name;
    if (stat.isDirectory()) files.push(...await filesBelow(filename, child));
    else if (stat.isFile()) files.push(child);
    else throw new Error("Asset output must contain only regular files.");
  }
  return files;
}

export async function packageWorkerAssets(projectRoot) {
  const root = await realpath(projectRoot);
  const client = path.join(root, "dist/client");
  const reference = path.join(root, ".sites-runtime/asset-reference");
  const server = path.join(root, "dist/server/index.js");
  const configPath = path.join(root, "dist/server/wrangler.json");
  async function owned(filename) {
    const relative = path.relative(root, await realpath(filename));
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error("Generated output must remain inside the project.");
    }
    if ((await lstat(filename)).isSymbolicLink()) throw new Error("Generated output must not be a symlink.");
  }
  await owned(client);
  await owned(server);
  await owned(configPath);
  const files = await filesBelow(client);
  const publicFiles = files.filter(name => ![".assetsignore", "_headers"].includes(name));
  const expected = [
    /^index\.html$/, /^assets\/home-[\w-]+\.js$/, /^assets\/home-[\w-]+\.css$/,
    /^browser-model-worker\.mjs$/, /^favicon\.svg$/,
  ];
  if (publicFiles.length !== expected.length || expected.some(pattern => publicFiles.filter(name => pattern.test(name)).length !== 1)) {
    throw new Error("Expected exactly the five public Dumbdown assets.");
  }
  const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
  const bodies = await Promise.all(publicFiles.map(async filename => ({ filename, body: await readFile(path.join(client, filename)) })));
  if (bodies.reduce((total, asset) => total + asset.body.length, 0) > 2 * 1024 * 1024) throw new Error("Embedded public assets exceed the 2 MiB build limit.");
  const records = bodies.map(({ filename, body }) => ({
    pathname: `/${filename}`, contentType: types[path.extname(filename)], bytes: body.length,
    etag: `"${createHash("sha256").update(body).digest("hex")}"`, base64: body.toString("base64"),
  }));
  const contents = `import worker from ${JSON.stringify(server.replaceAll("\\", "/"))};\nconst assets = (${createAssetService.toString()})(${JSON.stringify(records)});\nexport default { fetch(request, env, ctx) { return worker.fetch(request, { ...env, ASSETS: assets }, ctx); } };\n`;
  const result = await build({
    stdin: { contents, resolveDir: root, sourcefile: "embedded-worker-entry.mjs" },
    bundle: true, write: false, platform: "browser", format: "esm", target: "es2022", logLevel: "silent",
  });
  if (result.outputFiles.length !== 1) throw new Error("Expected one self-contained Worker module.");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  delete config.assets;

  // Keep the original five bodies only as ignored local verification evidence.
  await mkdir(path.dirname(reference), { recursive: true });
  await owned(path.dirname(reference));
  try { await owned(reference); await filesBelow(reference); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  await rm(reference, { recursive: true, force: true });
  for (const { filename, body } of bodies) {
    const target = path.join(reference, filename);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  }
  await writeFile(server, result.outputFiles[0].contents);
  await writeFile(configPath, `${JSON.stringify(config)}\n`);
  await rm(client, { recursive: true });
  return { assets: records.length, assetBytes: bodies.reduce((total, asset) => total + asset.body.length, 0), workerBytes: result.outputFiles[0].contents.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await packageWorkerAssets(fileURLToPath(new URL("../", import.meta.url)))));
}
