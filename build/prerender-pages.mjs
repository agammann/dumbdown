import { build } from "esbuild";
import { mkdir, mkdtemp, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const placeholder = "<!--dumbdown:prerender-->";

// Render the existing TSX components for the Vite HTML entry point. This uses
// Node only during dev/build; the deployed Worker contains no renderer or files.
/** @returns {import("vite").Plugin} */
export function prerenderPages() {
  let root;
  let renderer;

  async function loadRenderer() {
    const parent = path.join(root, ".sites-runtime", "prerender");
    await mkdir(parent, { recursive: true });
    const directory = await mkdtemp(path.join(parent, "render-"));
    const filename = path.join(directory, "entry.mjs");
    try {
      await build({
        absWorkingDir: root,
        entryPoints: ["build/prerender-entry.tsx"],
        outfile: filename,
        bundle: true,
        packages: "external",
        platform: "node",
        format: "esm",
        target: "es2022",
        jsx: "automatic",
        logLevel: "silent",
        sourcemap: false,
      });
      return (await import(pathToFileURL(filename).href)).renderPage;
    } finally {
      await rm(filename, { force: true });
      await rmdir(directory);
    }
  }

  return {
    name: "dumbdown-prerender-pages",
    configResolved(config) { root = config.root; },
    handleHotUpdate(context) {
      if (!context.file.includes(`${path.sep}.sites-runtime${path.sep}`)) renderer = undefined;
    },
    transformIndexHtml: {
      order: "pre",
      async handler(html, context) {
        const relative = path.relative(root, context.filename).replaceAll("\\", "/");
        if (relative !== "index.html") return html;
        if (html.split(placeholder).length !== 2) throw new Error("Expected one Dumbdown prerender placeholder.");
        renderer ||= loadRenderer();
        return html.replace(placeholder, (await renderer)());
      },
    },
  };
}
