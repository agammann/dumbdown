import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { explain, toMarkdown } from "../lib/explainer.mjs";
try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const [filename, kind = "code", level = "beginner"] = process.argv.slice(2);
if (!filename) {
  console.error(
    "Usage: npm run explain -- path/to/file [code|documentation] [beginner|intermediate|advanced]",
  );
  process.exitCode = 1;
} else {
  try {
    const stat = await fs.stat(filename);
    if (stat.size > 60000)
      throw Error(
        "File is too large. Use a snippet of at most 12,000 characters.",
      );
    const source = await fs.readFile(filename, "utf8");
    const result = await explain(
      { source, kind, level },
      {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
      },
    );
    console.log(toMarkdown(result));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
