# Verification

Verified locally on September 19, 2026 (Pacific time).

- Seven automated tests pass, including an actual MCP SDK stdio handshake and validation failure without a paid call.
- TypeScript checking, ESLint, and the production Worker build pass.
- Real OpenAI Responses calls returned schema-validated explanations. The browser button and native WebMCP tool both returned live results.
- Copying an explanation and expanding its example were checked in the browser.
- Production preview returns `local: false`, rejects missing visitor credentials with HTTP 401, and rejects a foreign Origin with HTTP 403.
- Desktop and 390px phone layouts were visually inspected. Phone layout was tested in a local iframe because the browser's viewport override was unavailable; this is not a physical-device test.

## Design review

The implementation preserves the concept's two-column workspace, strong headline, level selector, input tabs, and structured explanation. Cobalt actions, mint analogy cards and headline highlights, and orange markers implement the requested added color. The actual UI intentionally adds connection state, clear sample labeling, expandable details, download, and error handling. Mobile stacks the panels and keeps navigation within the viewport.

![Desktop interface](docs/desktop.jpg)

## Limits

The public app requires each visitor's own OpenAI API key. Local MCP and CLI require a separately configured local key. No Discord/Telegram bot or native mobile app is included. WebMCP is experimental and browser support varies. AI explanations are not correctness proofs, and code is never executed.

See [GitHub Actions](https://github.com/agammann/dumbdown/actions) for the current commit's automated checks. Local checks are separate from hosted availability.
