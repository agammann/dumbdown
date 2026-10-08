# dumbdown

Less jargon. More understanding. Explain code or technical documentation with a big idea, analogy, walkthrough, terms, example and caveats at your chosen reading level.

[Open dumbdown](https://dumbdown.alx21.chatgpt.site) · [Download v1 source](https://github.com/agammann/dumbdown/releases/tag/v1.0.0) · [Verification](VERIFIED.md)

## Start in the browser

1. Open the site and try the included debounce example, or paste a nonprivate snippet. The initial explanation is a labeled, hand-written sample.
2. Choose **Code** or **Documentation** and your reading level.
3. The initial **OpenAI · your API key** mode requires your API key and consent. For a free local experiment, choose **On this device · experimental** instead. Then select **Dumb it down** and compare the explanation with your original source.
4. **Copy explanation** or **Download** saves Markdown. Keep your original source separately before closing or reloading.

Input is limited to 12,000 characters; longer input is rejected rather than cut down. Remove secrets first. Code is never executed and pasted links are not fetched. A working button and valid JSON do not establish that an explanation is correct.

## Choose a model mode

**OpenAI · your API key** is the initial choice. Enter your own key and confirm the source/billing notice. The site sends the complete validated source, content type and reading level to OpenAI using GPT-5.4. Your API account pays; a ChatGPT subscription does not include API credit. [Manage your API keys](https://platform.openai.com/api-keys). The initial sample is available without a key, and opening the page makes no explanation request.

**On this device · experimental** downloads a model and runs it in a browser worker through WebLLM. No account, API key or paid model service is required; prompts stay on the device. Qwen 3 1.7B is the initial device choice, with Qwen 3 4B also available. These small models have missed important return values, sorting behavior and documentation conditions in our checks. Treat this mode as an experiment and review every claim.

Device mode needs HTTPS or localhost, WebGPU, compatible graphics hardware and enough memory/storage. Downloads range from roughly 1 GB to over 2 GB for the checked models. Model files can be cached when browser storage permits. **Stop download** and **Cancel** stop waiting. After cancelling generation, a fresh attempt reloads the cached model. A 12,000-character snippet can still exceed a model's token context; shorten it if the app reports that limit. There is no automatic paid fallback.

Nothing is sent until you request an explanation using the button or native tool. The key remains in the open page and active request. **Clear key**, **Cancel**, device mode, reload and page exit clear it and the consent. Cancellation cannot undo an already processed or charged provider request. Hosted explanations also require source review.

The browser app does not save source, keys or explanations in browser storage or an application database. Reload restores the sample. Model caches are separate. Exports contain the explanation and its generated example, which can repeat input details; they do not include a separate copy of the original source. Hosting/model/provider systems can process normal request metadata under their own policies. See [privacy and security](SECURITY.md).

## Install the source

Use Node.js **24** and npm. Download `dumbdown_1.0.0_source.zip` and `SHA256SUMS` from Releases, verify the ZIP's SHA256, and extract it into a new folder. On Windows:

```powershell
Get-FileHash .\dumbdown_1.0.0_source.zip -Algorithm SHA256
```

From the extracted root:

```sh
npm ci
npm run dev
```

Open the printed localhost URL, normally port 5173. The first dependency/model download requires internet access. The website needs no operator `.env.local`; the visitor enters their own key in the page for optional hosted mode.

To run the compiled Worker locally:

```sh
npm run build
npm start
```

Stop either local server with Ctrl+C. The managed Linux execution profile used by Sites is separate from the automatically selected local profile.

## CLI

The CLI uses your OpenAI API key and credits, with GPT-5.4 by default. It never executes the input. Set `OPENAI_API_KEY` in the process environment, or copy `.env.example` to ignored `.env.local` in the installation root and enter your key there. Keep that file private. `OPENAI_MODEL` can override the model; other models are outside the v1 verification scope.

```sh
npm run explain -- --help
npm run explain -- ./snippet.js code beginner
node scripts/explain.mjs ./api-notes.txt documentation intermediate > explanation.md
```

Use the direct `node` command when redirecting Markdown, so npm's command banner does not enter the file. Content types are `code` and `documentation`; levels are `beginner`, `intermediate` and `advanced`. Successful Markdown goes to stdout. Errors go to stderr with exit code 1. `node scripts/explain.mjs --version` identifies the installed version.

## MCP and native WebMCP

For a stdio MCP client, use an absolute path to the installed script:

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

Configure the local key as above. The one tool, `dumbdown_explain`, accepts `source`, `kind` and `level`. It shares the CLI's bounds, instructions and default model and returns structured content plus Markdown. Save the result through your client. `.env.local` is resolved relative to the installation even when the client starts elsewhere; restart the server after changing it. Local Node credentials are separate from the visitor's browser key.

In browsers implementing native `document.modelContext`, `dumbdown_explain` uses the selected mode and displays the same result as the button. Hosted use requires a key and consent set in the page; credentials are not a tool argument. Native support is experimental and may require browser feature flags. Other browsers use the normal controls.

## Develop, recover and upgrade

The app uses React, TypeScript and Vite with an explicit Cloudflare Worker. `lib/explanation-instructions.mjs` shares instructions across modes; `lib/explainer.mjs` validates input/output, exports Markdown and calls the Node provider. `lib/visitor-explanation.mjs` bounds the browser hosted request. `lib/browser-model.mjs` manages device inference and cancellation. The compiled Worker embeds public assets and serves three explicit API routes; unknown paths return 404 and retired `/api/explain` returns 410.

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run audit:ci
npx playwright install chromium chrome
npm run test:e2e
npm run test:webmcp
```

Browser regression checks intercept synthetic hosted responses and make no paid calls. The native check requires the real browser API and fails if absent. `DUMBDOWN_BROWSER_EXECUTABLE` can select an installed compatible Chromium executable. See [VERIFIED.md](VERIFIED.md) for actual model checks and their limits.

Save original source and exports before upgrading. Extract each release separately, install its locked dependencies, then copy only your retained private `.env.local` if needed. A browser reload restores the sample rather than recovering unsaved work. A failed retry labels the previous result. [Stability and recovery](docs/STABILITY.md) explains cancellation, device requirements and configuration.

From a clean committed source tree, `npm run package:source` creates the ZIP and checksum files. Main's passing workflow publishes those checked bytes and preserves older releases.

## License

[MIT](LICENSE) for the original code. Retain [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md); dependencies, separately downloaded models and services have their own terms.
