# Security and privacy

The browser edition reads pasted source locally and runs downloaded model weights in a browser worker. It does not execute code, follow pasted links or upload prompts to a model service. Local model caches are separate from app inputs. Refresh clears the displayed input/result; exported files contain them.

Public hosts supply pinned SDK code, model weights and model runtime files. They and the site host may receive IP addresses and normal request metadata. No analytics or saved explanation history is added by this migration. Never treat a model's explanation as proof of safe code.

The retired explanation HTTP endpoint returns 410. No operator or visitor key is used by the website. Legacy Node provider adapters are separate from the website and require their own explicit configuration.

Report reproducible security issues privately to the repository owner before public disclosure. Include the affected version, expected/observed behavior and bounded evidence without credentials or private source.
