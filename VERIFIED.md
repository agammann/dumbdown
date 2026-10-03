# Verification

## October 3, 2026 — native Vite toolchain

The single-page app now uses a prerendered React page and an explicit Cloudflare Worker instead of the Next/Vinext/RSC toolchain. The three API handlers, model and prompt modules, export logic and legacy CLI/MCP adapters are unchanged. Unknown paths return 404; `/index.html` redirects to `/`. API trailing-slash aliases remain supported.

- Eighteen automated tests, TypeScript, zero-warning ESLint and the production build passed. The locked dependency audit returned zero findings at all severity levels at the time of the check. This is a dependency audit, not proof that the application has no vulnerabilities.
- A clean Windows install through `npm run install:ci` passed. The independent deployment checkout produced the same five deployment files and five public asset bodies. Offline Drizzle migration generation also passed; no database was contacted or changed.
- The compiled local Worker passed 203 HTTP/browser checks with Chrome 154.0.8037.98. Checks covered API methods and validation, prerendered HTML, exact static assets and four security headers on pages, APIs and assets.
- Chrome's genuine native WebMCP discovery and execution passed with its experimental feature enabled. Invalid input made no request. The tool disappeared on navigation away and was rediscovered after an actual persisted BFCache return and reload.
- Input limits, key/consent guards, safe text rendering, cancellation, pending-state controls, stale-result notices, Markdown code fences and credential clearing passed. Browser application storage remained empty. Desktop, 390px and 320px screenshots were inspected without horizontal overflow.

The browser's four hosted responses in this regression were controlled fixtures intercepted before reaching the application server. No provider key, model download or new inference request was used. These checks establish wiring and lifecycle behavior; the dated model-quality results below remain the available evidence.

An earlier compiled-preview run exposed a Wrangler/Miniflare transport failure after an early response to a body-bearing POST: the following request could return 500 with an unread-stream diagnostic. Empty-body routing probes passed. The failed run is retained; the local transport issue is not claimed fixed.

Production checks initially found the four security headers missing from the homepage and static assets, despite the local checks passing. The final production build embeds the five public asset bodies in the Worker so its response policy also covers the page and assets. The earlier failed deployments remain in the test record.

The corrected public deployment passed 31 credential-free HTTP requests and 115 assertions. Checks confirmed the expected page and exact asset bytes, all four security headers, API methods and validation, OPTIONS and private-path rejection. All five body-bearing guard requests and their subsequent method/connection checks passed; the local unread-stream failure was not reproduced there. These rejected requests used no provider key or model inference. Conditional asset requests are also covered by the automated ETag tests; no general HTTP feature-parity claim follows.

## October 2, 2026 — optional hosted mode and browser fixes

Checks used a local production Worker build on Windows with Chrome 154.0.8037.95 and AMD RDNA 3 WebGPU. Expected facts and forbidden interpretations for three synthetic English examples were frozen before inference. The two JavaScript examples were independently executed in a controlled test harness to establish their output. The app itself never executes pasted code.

### Model output checks

| Case | Expected behavior |
| --- | --- |
| Missing return around fetch | The request starts, but the outer function returns and logs undefined; returning the promise chain lets a caller receive parsed data asynchronously. |
| Default JavaScript sort | String ordering yields `[1, 10, 2]`; sort mutates the array and returns the same reference, so equality is true. Numeric ordering needs a comparator. |
| Conditional API documentation | Preserve integer limits, cursor stop rules, Retry-After seconds, conditional bounded backoff, no automatic 401/403 retries, and unspecified authentication/quota. |

The original Qwen 3 1.7B and 4B browser runs missed essential behavior. Both incorrectly explained array sorting/reference identity; the 4B missing-return explanation incorrectly described a fetched object being logged. The Llama 3.2 1B run hit the generation length limit on two cases and did not explain the required sorting facts on the third. A revised web prompt improved parts of the default 1.7B output but still produced wrong sorting claims and omitted documentation conditions. Device mode therefore remains explicitly experimental. These runs do not rank the models generally.

Three real GPT-5.4 requests through the built app completed in roughly 10–12 seconds each. Two used the visible button and the sorting case used the browser's actual native WebMCP execution API. Full submitted sources were preserved. Manual review found 15 of 16 preregistered criteria in the outputs: all sorting and documentation facts, and correct missing-return behavior. The omitted criterion was the suggested repair, not a false statement about the original code.

After a generic instruction to label minimal corrections for evident bugs, one focused real missing-return follow-up completed. It retained the original undefined behavior, returned the fetch promise in a clearly separate correction, demonstrated consuming it with `.then(...)`, and explained that it resolves to parsed JSON. This covers the repair's intended semantics without using `await` syntax. The original incomplete result is retained in the test record; the other two hosted cases were not rerun after that prompt change.

This is a small functional evaluation, not an accuracy benchmark. No general correctness, language coverage or device compatibility claim follows from these examples.

### Application checks

- Twelve automated tests passed, including the legacy stdio MCP handshake, embedded Markdown fences, and new visitor-route validation, fixed provider/model selection, bounded bodies, sanitized failures, redirect prevention, no retry and cancellation during a response stream.
- TypeScript, ESLint and the production build passed.
- Native `document.modelContext.registerTool` and actual `executeTool` worked with Chrome's experimental WebMCP features enabled. The hosted sorting result used the same route and visible result as the button. Ordinary browsers can use the button without native support.
- Browser checks covered explicit mode/key/consent, unchanged full input, safe text rendering, no silent truncation above 12,000 characters, blocked edits while pending, and preservation of the previous-result notice after failures.
- A real invalid provider key returned a sanitized 401. Missing visitor credentials were rejected without a provider request. The retired endpoint returned 410 in an independent browser check.
- Clear key, Cancel, mode switching, reload and real back/forward-cache restoration cleared credentials and consent. Hosted-only browser storage and cookies remained empty. Controlled responses were used for most failure/lifecycle UI checks; these are not model-quality evidence.
- First model-download cancellation preserved input. All three original browser models failed their cached retry after generation cancellation. Terminating the interrupted worker fixed the tested default model's cached retry, which produced a fresh result. The other two models were not rerun for that repair.
- Desktop, 390px and 320px layouts were checked; desktop and 320px screenshots were visually inspected. A reproduced 6px navigation overflow at 320px was fixed. These are browser viewport checks, not physical-phone tests.
- Markdown exports contain the explanation and generated example. They do not include a separate copy of the original source; the README and privacy documentation now say so.

Local verification is separate from deployment. Model files can remain in browser caches; hosted-mode empty-storage checks do not apply after downloading a local model.

### Production follow-up

One real request on the published optional-mode build preserved the missing-return behavior and the separately labeled promise-chain correction. Seventeen loaded browser assets matched its local build. Missing-key, retired-route, private-file, credential-clearing, real back/forward-cache and mobile-layout checks passed. Browser application storage stayed empty; the hosting platform set visitor/security cookies.

That production response exposed an export formatting defect: an example's own code fences could close the surrounding Markdown fence. The exporter now selects a longer outer fence while preserving the full example. The captured response was replayed for export verification, without another paid inference request, and the downloaded Markdown was parsed to check its code block and following sections.

## Earlier verification

September 30, 2026: seven automated checks, TypeScript and build passed for the browser migration. One real Qwen 3 1.7B array-map example correctly explained `[2, 4, 6]` with no paid-provider request. That narrow success did not establish correctness on the harder October examples.

September 19, 2026: the earlier provider edition had seven automated tests, typecheck, lint, build, live provider calls, native WebMCP and copy/example UI checks. The retained Node CLI/MCP adapter behavior is unchanged. Historical provider results and screenshots do not establish the current website's accuracy or availability.

See [GitHub Actions](https://github.com/agammann/dumbdown/actions) for the relevant commit's automated checks.
