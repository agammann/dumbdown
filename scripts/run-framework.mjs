import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
const managedLinux = readExecutionProfile() === "managed-linux";

if (managedLinux && command === "build") {
  const result = spawnSync("bash", [
    fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

const cli = new URL("../node_modules/vite/bin/vite.js", import.meta.url);
if (command === "build") {
  const result = spawnSync(process.execPath, [fileURLToPath(cli), command, ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  const { packageWorkerAssets } = await import("../build/worker-assets.mjs");
  console.log(JSON.stringify(await packageWorkerAssets(fileURLToPath(new URL("../", import.meta.url)))));
} else {
  // Import in this process so the preview owner retains its PID and signals.
  process.argv = [process.execPath, fileURLToPath(cli), command,
    ...(!managedLinux ? ["--port", "5173"] : []), ...args];
  await import(cli.href);
}
