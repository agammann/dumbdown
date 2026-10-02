# dumbdown

Less jargon. More understanding. Paste code or technical documentation and get a big idea, analogy, walkthrough, terms, example and caveats at your preferred reading level.

[Open dumbdown](https://dumbdown.alx21.chatgpt.site)

## Try it

1. Start with the included debounce example, or paste your own code or documentation. Remove secrets first; the app accepts at most 12,000 characters and rejects longer input without cutting it down.
2. Choose a reading level and explanation mode.
3. Select **Dumb it down**, then compare the explanation with your source. Copy or download it as Markdown.

The initial explanation is a labeled, hand-written sample. Generated explanations can be wrong in either mode. Code is never executed and pasted links are not fetched.

## Choose a mode

**On this device · experimental** is the default. It downloads a model on first use and runs inference in a dedicated browser worker through WebLLM. No account, API key or paid model service is needed. Prompts stay on the device. Qwen 3 1.7B is the default; Qwen 3 4B and Llama 3.2 1B are also available. These small models missed basic return values, sorting behavior and documentation conditions in our checks—even the larger choice. Use this mode to experiment, and verify its claims yourself.

Device mode needs HTTPS or localhost, WebGPU, compatible graphics hardware and enough memory. Downloads range from roughly 1 GB to over 2 GB for the tested models and can be cached when browser storage permits. Stop a download or generation from the interface. After cancelling generation, the app reloads the cached model for a fresh attempt. Support, speed and quality vary by device. There is no automatic paid fallback.

**OpenAI · your API key** is optional. Choose it, enter your own OpenAI API key, and confirm the data and billing notice. Requests use GPT-5.4 through this site's server. Your complete submitted source, content type and reading level go to OpenAI, and your API account pays for usage. A ChatGPT subscription does not include API credit. [Manage your API keys](https://platform.openai.com/api-keys).

The key is kept only in the open page and the active request. **Clear key**, **Cancel**, returning to device mode, reloading or leaving the page clears the key and consent. Nothing is sent until you request an explanation with the button or a native WebMCP action. Cancellation stops waiting; a provider may already have processed and charged for the request. Hosted explanations also need review. There is no operator-key fallback.

The app does not save source, keys or explanations in browser storage or an application database. Reload restores the sample. Downloaded model files are separate browser caches. Markdown exports contain the explanation and its generated example, which can repeat input details, but do not include a separate copy of the original source; save it separately if needed. Hosting, model hosts and the provider can process request metadata under their own policies. See [SECURITY.md](SECURITY.md).

## Local development

Requires Node.js 22.13+ and npm:

```sh
npm ci
npm run dev
```

Open the printed localhost URL. No `.env.local` or operator API key is needed. For optional hosted mode, enter your own key in the page. Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` before submitting changes.

The web app uses React, TypeScript and Vinext/Vite. `lib/browser-model.mjs` manages the browser model and cancellation; `public/browser-model-worker.mjs` hosts local inference. `lib/explanation-instructions.mjs` supplies the web modes' instructions. `lib/visitor-explanation.mjs` validates the optional hosted request, uses a fixed provider/model, bounds request and response sizes, and sanitizes errors. The retired `/api/explain` endpoint still returns 410; optional hosted requests use `/api/explain/visitor`.

## Native WebMCP and earlier Node tools

In browsers implementing native `document.modelContext`, `dumbdown_explain` uses the same selected mode, validation and visible result as the button. Hosted use requires the visitor to set their key and consent in the page first. Other browsers use the normal UI. Native support is experimental and may require browser feature flags; there is no simulated compatibility layer.

The separate Node CLI and stdio MCP scripts remain legacy provider adapters and are not used by this website. Their configuration and provider behavior are unchanged. Their fixture tests do not establish the web models' factual accuracy. Use the web app or its native WebMCP action for the browser workflow.

## Verification and limitations

See [VERIFIED.md](VERIFIED.md) for dated checks and observed model failures. Valid JSON, a working button or a registered browser tool does not establish a correct explanation. A 12,000-character input can still exceed a browser model's token context; the app reports that limit instead of silently dropping input. No physical-device compatibility or general accuracy guarantee is made.

## License

[MIT](LICENSE). Dependencies and model weights retain their own licenses.
