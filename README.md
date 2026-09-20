# dumbdown

**Less jargon. More understanding.**

dumbdown turns code and technical documentation into plain-language explanations: the big idea, an analogy, a step-by-step walkthrough, jargon definitions, an example, and caveats about missing context.

[Open the web app](https://dumbdown.alx21.chatgpt.site) · [Contribute](CONTRIBUTING.md) · [Security and privacy](SECURITY.md) · [Verification](VERIFIED.md)

![dumbdown desktop interface](docs/desktop.jpg)

## Use it

1. Paste code or technical documentation. Remove secrets and private information first.
2. Choose **New to this**, **Know the basics**, or **Go deeper**.
3. Select **Dumb it down**. Copy the explanation or download it as Markdown.

The opening debounce explanation is explicitly labeled **Hand-written example** and works without an API key. New explanations use the OpenAI Responses API. The public site requires your own API key and uses your API credits. The key is held in the tab's memory, sent to the site's server only to call OpenAI, and is not persisted by dumbdown. Refresh or Disconnect clears it from the app. This is separate from a ChatGPT subscription.

Code is never executed. Links inside pasted documentation are not fetched. AI explanations can be wrong: verify claims against the source and official documentation.

## One explainer, several ways to use it

| Interface             | What it does                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Web app / public site | Paste code or docs and read a colorful, structured explanation on desktop or mobile.                              |
| MCP server            | Lets an assistant call `dumbdown_explain` through a local stdio connection.                                       |
| WebMCP                | Registers the same action with `document.modelContext` in supported browsers and displays the result on the page. |
| CLI                   | Explains one explicitly selected local file and prints Markdown.                                                  |

A separate Discord or Telegram bot is not included; MCP provides the assistant interface without another account or bot service.

## Run locally

Requires Node.js **22.13 or newer** and npm.

```sh
git clone https://github.com/agammann/dumbdown.git
cd dumbdown
npm ci
npm run dev
```

Open the local URL printed by the server (normally `http://localhost:5173`). In local development only, a configured `OPENAI_API_KEY` in the ignored `.env.local` file powers the app automatically. Otherwise, use **Connect** in the app. The production build never falls back to an operator key. The key used for development is not shipped in the repository or client bundle.

For your own setup, use a secure API-key setup flow and store credentials outside source control. Do not paste keys into issues, commits, or chat. The MCP server and CLI read `OPENAI_API_KEY` from their environment or the repository's ignored `.env.local`. Their optional `OPENAI_MODEL` override defaults to `gpt-5-mini`.

## Use with an MCP assistant

Install dependencies, configure your local key securely, and add a stdio server using your client's MCP configuration:

```json
{
  "mcpServers": {
    "dumbdown": {
      "command": "node",
      "args": ["/absolute/path/to/dumbdown/scripts/mcp.mjs"]
    }
  }
}
```

Replace the example path with the actual absolute path. On Windows use forward slashes or escaped backslashes. Configure credentials in the local environment or ignored `.env.local`, not in a committed client configuration.

The tool accepts:

```json
{
  "source": "const double = n => n * 2;",
  "kind": "code",
  "level": "beginner"
}
```

`kind` is `code` or `documentation`. `level` is `beginner`, `intermediate`, or `advanced`. Maximum source length: 12,000 characters. The result includes Markdown and structured content. Failures return `isError: true` with a sanitized message. The server never executes submitted code.

Run `npm run mcp` only when testing manually; MCP clients should invoke `node scripts/mcp.mjs` directly so npm's lifecycle output cannot interfere with stdio.

## WebMCP

Open the web app in a browser with the experimental WebMCP API enabled, connect your API key, then let a browser assistant discover and invoke `dumbdown_explain`. **Connect** reports whether registration is available. Browsers without WebMCP still support the full normal UI. There is no polyfill pretending native browser support exists.

Tool calls use the same validation and visible state as clicking the button. They send the supplied text to OpenAI and use API credits. Local development can use the configured local key. Browser/client support varies; see the [WebMCP draft](https://webmachinelearning.github.io/webmcp/).

## CLI

```sh
npm run explain -- ./example.js code beginner
npm run explain -- ./notes.txt documentation intermediate
```

Files are read only when explicitly named. The CLI does not scan repositories or follow URLs.

## Development and deployment

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The web app uses React, TypeScript, Vinext/Vite, and a Cloudflare Worker-compatible server. The shared explanation module also runs in Node for MCP and CLI. Tests cover validation, bounded inputs, prompt separation, sanitized provider errors, output validation, cancellation, and a real MCP stdio handshake without paid calls. CI does not need an API key.

The public Sites deployment uses the Worker and assets from the production build. `.openai/hosting.json` contains this project's public deployment identity; forks should register their own Site rather than deploying to that ID. Hosted environment bindings are managed separately. Production requests must carry the visitor's key; setting an owner key does not enable anonymous usage.

The API route accepts only same-origin JSON POST requests and does not store explanation history. It caps request size and provider time/output. `store: false` disables Responses storage; it is not a guarantee of zero retention by hosting or model providers. See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Dependencies retain their respective licenses.
