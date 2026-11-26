# Contributing

Small, focused contributions are welcome. Open an issue describing a bug or proposal before a large change. Never include API keys, private source code, or personal information in issues or fixtures.

Use Node 24.x or Node 26.13.1+ within Node 26, run `npm ci`, then `npm run dev`. Before a pull request, run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run audit:ci`. Check the affected browser flow and mobile layout. A live OpenAI call is optional for contributors and uses your own API credits. Clearly label mocked and live verification.

`npm run typecheck` selects the native TypeScript 7 compiler explicitly. The classic `typescript` package supplies the compiler API required by `typescript-eslint`.

Preserve the shared explainer contract across the web app, MCP server, and CLI. Keep provider errors sanitized and source content untrusted. New public routes must not fall back to an operator's API key. Test changes to validation and credential handling.

Submitted contributions are made under the project's MIT license. Dependency licenses remain their own.
