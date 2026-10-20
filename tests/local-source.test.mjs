import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readLocalSource } from "../lib/local-source.mjs";

test("local source reader preserves a selected file and caps the opened descriptor", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "dumbdown-source-"));
  try {
    const small = path.join(directory, "small.ts");
    const large = path.join(directory, "large.ts");
    writeFileSync(small, "const greeting = 'hello';\n");
    writeFileSync(large, "x".repeat(60001));
    assert.equal(await readLocalSource(small), "const greeting = 'hello';\n");
    await assert.rejects(readLocalSource(large), /too large/);
    const linked = path.join(directory, "linked.ts");
    try {
      symlinkSync(small, linked, "file");
      assert.equal(await readLocalSource(linked), "const greeting = 'hello';\n");
    } catch (error) {
      if (process.platform !== "win32" || error.code !== "EPERM") throw error;
    }
  } finally {
    if (!directory.startsWith(tmpdir() + path.sep)) throw Error("Unexpected test fixture");
    rmSync(directory, { recursive: true, force: true });
  }
});
