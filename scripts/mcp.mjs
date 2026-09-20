import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { explain, toMarkdown } from "../lib/explainer.mjs";
try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const server = new McpServer({ name: "dumbdown", version: "0.1.0" });
server.registerTool(
  "dumbdown_explain",
  {
    title: "Explain code or technical documentation",
    description:
      "Turn code or technical documentation into a plain-language explanation, analogy, walkthrough, definitions, example, and caveats. Sends supplied text to OpenAI using the locally configured key and API credits. Never executes code. Remove secrets first.",
    inputSchema: {
      source: z.string().min(1).max(12000),
      kind: z.enum(["code", "documentation"]),
      level: z.enum(["beginner", "intermediate", "advanced"]),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: true,
    },
  },
  async (input, extra) => {
    try {
      const result = await explain(input, {
        apiKey: process.env.OPENAI_API_KEY,
        signal: extra.signal,
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
      });
      return {
        content: [{ type: "text", text: toMarkdown(result) }],
        structuredContent: result,
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: e instanceof Error ? e.message : "Explanation failed.",
          },
        ],
      };
    }
  },
);
await server.connect(new StdioServerTransport());
