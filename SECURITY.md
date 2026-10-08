# Security and privacy

Code is never executed and pasted links are never fetched. Remove secrets before pasting. Input validation rejects some recognizable secret patterns, but it cannot identify every credential or private detail. An explanation is not proof that code is correct or safe.

Device mode downloads pinned SDK code, model weights and runtime files from public hosts, then runs inference in a browser worker. Prompts are not sent to a hosted model in this mode. Model caches are separate from application inputs. Site and model hosts can receive IP addresses and normal request metadata.

Hosted mode is initially selected but makes no explanation request until the visitor supplies their own key, confirms the page's data/billing notice and submits a request using the button or native tool. `/api/explain/visitor` sends the full validated source, content type and reading level through this site's server to the fixed OpenAI Responses endpoint using GPT-5.4. It requests `store: false`, has bounded request/response sizes and a timeout, does not follow provider redirects, and returns sanitized errors. These settings do not override the provider's own retention and processing policies. Requests use only the supplied key; there is no operator-key fallback or automatic retry.

The app keeps credentials only in the open page and active request. Clear key, Cancel, device mode, reload, page exit and restored-page lifecycle handling clear the key and consent. Cancellation cannot undo an already processed provider request or its charge. The app does not write keys, source or explanations to browser storage, cookies, an application database or its own request logs. Infrastructure and provider systems may have separate logging policies. No analytics or saved explanation history is added.

The public hosting platform may set visitor and security cookies. These are separate from the app's source, explanation and key handling.

Reload restores the sample. Markdown exports contain the explanation and generated example, which may repeat input details; they do not include a separate copy of the original source. Handle exports according to the sensitivity of that content.

The retired `/api/explain` HTTP endpoint returns 410. Legacy Node CLI/MCP adapters are separate and retain their explicit local configuration. Native WebMCP uses the same web workflow and cannot supply an API key through its input schema.

Report reproducible security issues privately to the repository owner before public disclosure. Include the affected version, expected/observed behavior and bounded evidence without credentials or private source.
