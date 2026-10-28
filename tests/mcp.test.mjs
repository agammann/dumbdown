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

test("Zod upgrade preserves MCP schema discovery and rejects invalid inputs before a provider call", async () => {
  const client = new Client({ name: "dumbdown-schema-test", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../scripts/mcp.mjs", import.meta.url))],
    env: { PATH: process.env.PATH, OPENAI_API_KEY: "" },
    stderr: "pipe",
  });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const schema = tools[0].inputSchema;
    assert.equal(schema.properties.source.minLength, 1);
    assert.equal(schema.properties.source.maxLength, 12000);
    assert.deepEqual(schema.properties.kind.enum, ["code", "documentation"]);
    assert.deepEqual(schema.properties.level.enum, ["beginner", "intermediate", "advanced"]);
    assert.deepEqual([...schema.required].sort(), ["kind", "level", "source"]);
    for (const input of [
      { source: "", kind: "code", level: "beginner" },
      { source: "x".repeat(12001), kind: "code", level: "beginner" },
      { source: "const x = 1", kind: "invalid", level: "beginner" },
      { source: "const x = 1", kind: "code" },
    ]) {
      const response = await client.callTool({ name: "dumbdown_explain", arguments: input });
      assert.equal(response.isError, true);
      assert.match(response.content[0].text, /validat|invalid/i);
    }
    const response = await client.callTool({ name: "dumbdown_explain", arguments: { source: "const x = 1", kind: "code", level: "beginner" } });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /API key|OPENAI_API_KEY/i, 'valid input reaches the local missing-key boundary without contacting a provider');
  } finally {
    await client.close();
  }
});
