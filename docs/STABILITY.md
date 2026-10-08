# Version 1 support and recovery

The supported source environment is Node.js 24 with npm, on Windows x64 and Linux. The release verification records the exact tested versions. The web app's ordinary controls work without native WebMCP. Its native tool requires experimental browser support; it uses the selected mode and the same visible explanation.

Optional hosted web explanations and the CLI/stdio adapters use your own OpenAI API key and API credit. GPT-5.4 is the tested model. The Node adapters accept an explicit `OPENAI_MODEL` override, but another model is outside the tested v1 scope. The public site never substitutes an operator key for a visitor key.

Device mode is an experiment with separately downloaded WebGPU models. Loading and cancellation can work while an explanation is factually wrong. Check the reading level and every claim against the original snippet. Model and browser caches can be cleared through browser settings; they do not contain a saved explanation history created by the app.

## Preserve your work

The web app does not automatically save source or explanations. Copy or download useful results and keep the original source separately before reloading, closing or upgrading. An explanation can repeat details from its input; treat the export with the same care. CLI output is Markdown on stdout, so redirect it to a file if you want to save it.

Clear key, Cancel, device mode, reload and navigation clear web credentials and consent. Local CLI/MCP keys remain in your environment or ignored `.env.local` file until you remove them. Avoid storing a key in a shared folder or committing it. Cancel stops waiting; an already processed provider request may still be charged.

## Recover after a failure

Keep the source in the editor. Correct a rejected key or input, confirm consent when needed, and request a new explanation. A failed retry keeps the prior result labeled as a previous explanation. After cancelling device generation, request again to reload the cached model. A browser without WebGPU reports that limitation and never silently starts a paid request.

If a local installation breaks, stop it and extract the same release into a new folder, then run `npm ci`, the documented checks and `npm run build`. Copy only a deliberately retained local `.env.local` when needed; keep it out of the source archive. No application database migration or saved browser workspace needs to be moved.

For upgrades, save useful outputs and source first, stop the old local server/MCP client, and use a separate extraction of the new version. Keep the old extraction until the new one passes your first workflow. Support requests should identify the source version, Node/browser/model version, interface and a minimal nonprivate snippet with the expected and observed result. Include no API key.
