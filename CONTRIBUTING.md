# Contributing

Small, focused contributions are welcome. Open an issue describing a bug or proposal before a large change. Never include API keys, private source code, or personal information in issues or fixtures.

Use Node 22.13 or newer, run `npm ci`, then `npm run dev`. Before a pull request, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Check the affected browser flow and mobile layout. A live OpenAI call is optional for contributors and uses your own API credits; clearly label mocked versus live verification.

Preserve the shared explainer contract across the web app, MCP server, and CLI. Keep provider errors sanitized and source content untrusted. New public routes must not fall back to an operator's API key. Test changes to validation and credential handling.

Submitted contributions are made under the project's MIT license. Dependency licenses remain their own.
