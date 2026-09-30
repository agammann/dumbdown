# dumbdown

Less jargon. More understanding. Explain code and technical documentation with a big idea, analogy, walkthrough, terms, example and caveats.

[Open dumbdown](https://dumbdown.alx21.chatgpt.site)

## Browser edition

Paste code or documentation, choose a reading level, and select **Dumb it down**. The model downloads on first use. No account, API key or paid AI API is needed. Copy or export the result as Markdown. The initial debounce explanation remains a hand-written example.

The first run downloads model files from public hosts. Text generation runs in a dedicated browser worker using WebLLM; prompts are not sent to a hosted model. The default is Qwen 3 1.7B, with larger Qwen 3 4B and smaller Llama 3.2 1B choices. Model downloads are cached when browser storage permits.

Use HTTPS (or localhost) and a current browser with WebGPU and compatible graphics hardware. A model choice does not guarantee that every device has enough memory. Download speed, inference speed and answer quality depend on the device and model. Stop a download or generation from the interface; errors preserve existing inputs. There is no paid model fallback. Hosting and model-download bandwidth remain separate from AI API fees.

Code is never executed and pasted links are not fetched. Inputs and results stay in the page until refreshed; exports contain the input. Browser explanations can be wrong, so compare them with the source. Hosting and model hosts may process ordinary request metadata. The retired `/api/explain` route returns 410 and does not invoke a provider, including when an old operator key is present.

## Local development

Requires Node.js 22.13+ and npm. Run `npm ci`, then `npm run dev`, and open the printed localhost URL. No `.env.local` key is needed. Run `npm test`, `npm run typecheck` and `npm run build` for checks.

The web app uses React, TypeScript and Vinext/Vite. Browser model files are lazy-loaded from pinned public SDK URLs. `lib/browser-model.mjs` manages model selection, support checks, progress and cancellation; `public/browser-model-worker.mjs` hosts inference.

## WebMCP and earlier Node tools

In browsers implementing native `document.modelContext`, `dumbdown_explain` uses the same local generation, input validation and visible result as the button. Other browsers use the normal UI. There is no simulated WebMCP support.

The separate Node CLI and stdio MCP scripts are retained as legacy provider adapters. They are not used by this website and are not browser inference entry points. Their old provider tests use fixtures; those tests do not establish browser model quality. Use the web app or its native WebMCP action for the no-paid-API workflow.

## Verification and limitations

The browser migration is checked separately from the historical provider implementation. See [VERIFIED.md](VERIFIED.md). Matching a schema does not establish factual correctness. Long inputs can exceed the browser model context and produce a visible error.

## License

[MIT](LICENSE). Dependencies and model weights retain their own licenses.
