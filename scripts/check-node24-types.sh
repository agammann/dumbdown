#!/usr/bin/env bash
set -euo pipefail
temp_root="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
probe="$temp_root/dumbdown-node26-only.ts"
printf 'import { create } from "node:vfs"; create();\n' > "$probe"
args=(--noEmit --skipLibCheck --module NodeNext --moduleResolution NodeNext --target ES2023 --types node --typeRoots "$PWD/node_modules/@types" "$probe")
npx tsc "${args[@]}"
npm install --no-save --ignore-scripts --no-audit --no-fund --prefer-offline @types/node@24.0.0
node -e 'if (require("./node_modules/@types/node/package.json").version !== "24.0.0") process.exit(1)'
if npx tsc "${args[@]}" > "$temp_root/dumbdown-node24-probe.log" 2>&1; then
  echo 'Node 24 declarations unexpectedly accepted node:vfs'
  exit 1
fi
grep -F 'TS2307' "$temp_root/dumbdown-node24-probe.log"
grep -F 'node:vfs' "$temp_root/dumbdown-node24-probe.log"
npx tsc --noEmit --incremental false
