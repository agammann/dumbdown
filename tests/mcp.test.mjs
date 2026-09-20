import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
test("real stdio MCP handshake, discovery, and validation error without a paid call", async () => {
  const client = new Client({ name: "dumbdown-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../scripts/mcp.mjs", import.meta.url))],
    stderr: "pipe",
  });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.equal(tools[0].name, "dumbdown_explain");
    const r = await client.callTool({
      name: "dumbdown_explain",
      arguments: {
        source: "sk-" + "x".repeat(40),
        kind: "code",
        level: "beginner",
      },
    });
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /secret/);
  } finally {
    await client.close();
  }
});
