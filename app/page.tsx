"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Braces,
  Code2,
  ExternalLink,
  Lightbulb,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  MAX_SOURCE,
  inputSchema,
  toMarkdown,
  validateInput,
  type ExplainInput,
  type Explanation,
} from "../lib/explainer.mjs";
import { examples, sample } from "../lib/examples";
import { ExplanationView } from "../components/explanation";
import BrowserModelPanel from "../components/browser-model-panel";
import { generate } from "../lib/browser-model.mjs";
import { explanationSchema, validateExplanation } from "../lib/explainer.mjs";
import { explanationInstructions } from "../lib/explanation-instructions.mjs";
type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, boolean>;
  execute: (input: ExplainInput) => Promise<unknown>;
};
type ModelContext = {
  registerTool: (tool: Tool, options?: { signal: AbortSignal }) => void;
  unregisterTool?: (name: string) => void;
};
export default function Home() {
  const [source, setSource] = useState(examples[0].source);
  const [kind, setKind] = useState<ExplainInput["kind"]>("code");
  const [level, setLevel] = useState<ExplainInput["level"]>("beginner");
  const [result, setResult] = useState<Explanation | null>(sample);
  const [sampleVisible, setSampleVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const [, setWebmcp] = useState(false);
  const [changed, setChanged] = useState(false);
  const [mode, setMode] = useState<"device" | "hosted">("device");
  const [consent, setConsent] = useState(false);
  const keyInput = useRef<HTMLInputElement>(null);
  const preferences = useRef({ mode: "device" as "device" | "hosted", consent: false });
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const revision = useRef(0);
  const explainSource = useCallback(
    async (raw: ExplainInput) => {
      if (pending.current)
        throw new Error("An explanation is already running.");
      const input = validateInput(raw);
      const selectedMode = preferences.current.mode;
      const visitorKey = selectedMode === "hosted" ? keyInput.current?.value.trim() || "" : "";
      if (selectedMode === "hosted") {
        if (!/^sk-[A-Za-z0-9_-]{16,512}$/.test(visitorKey)) throw new Error("Enter your own OpenAI API key.");
        if (!preferences.current.consent) throw new Error("Confirm the hosted explanation notice before sending.");
      }
      const requestRevision = ++revision.current;
      pending.current = true;
      const abort = new AbortController();
      controller.current = abort;
      setSource(input.source);
      setKind(input.kind);
      setLevel(input.level);
      setBusy(true);
      setError("");
      setChanged(true);
      try {
        let explanation: Explanation;
        if (selectedMode === "hosted") {
          const response = await fetch("/api/explain/visitor", {
            method: "POST", credentials: "omit", signal: abort.signal,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${visitorKey}` },
            body: JSON.stringify(input),
          });
          const data: unknown = await response.json();
          if (!data || typeof data !== "object") throw new Error("The hosted explanation returned an invalid response.");
          if (!response.ok) throw new Error("error" in data && typeof data.error === "string" ? data.error : "The hosted explanation failed.");
          explanation = validateExplanation("explanation" in data ? data.explanation : undefined);
        } else {
          const generated = await generate([
            { role: "system", content: explanationInstructions(input.level) + " /no_think" },
            { role: "user", content: JSON.stringify(input) },
          ], { schema: explanationSchema, maxTokens: 1800, signal: abort.signal });
          explanation = validateExplanation(generated.value);
        }
        if (requestRevision === revision.current) {
          setResult(explanation);
          setSampleVisible(false);
          setChanged(false);
        }
        return {
          content: [{ type: "text", text: toMarkdown(explanation) }],
        };
      } catch (e) {
        const message = abort.signal.aborted
          ? "Explanation cancelled."
          : e instanceof Error
            ? e.message
            : "Could not generate an explanation.";
        if (requestRevision === revision.current) setError(message);
        throw new Error(message);
      } finally {
        pending.current = false;
        setBusy(false);
        controller.current = null;
      }
    },
    [],
  );
  useEffect(() => {
    const mc = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!mc) return;
    const ac = new AbortController();
    try {
      mc.registerTool(
        {
          name: "dumbdown_explain",
          description:
            "Explain supplied code or technical documentation using this page's selected mode and show the same visible result. Device mode runs an experimental browser model; optional OpenAI mode requires the visitor's key and explicit hosted consent and incurs their API charges. Never executes code or fetches pasted links.",
          inputSchema,
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false,
          },
          execute: async (input) => {
            try {
              return await explainSource(input);
            } catch (e) {
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text:
                      e instanceof Error ? e.message : "Explanation failed.",
                  },
                ],
              };
            }
          },
        },
        { signal: ac.signal },
      );
      queueMicrotask(() => {
        if (!ac.signal.aborted) setWebmcp(true);
      });
    } catch {
      queueMicrotask(() => {
        if (!ac.signal.aborted) setWebmcp(false);
      });
    }
    return () => {
      ac.abort();
      mc.unregisterTool?.("dumbdown_explain");
    };
  }, [explainSource]);
  useEffect(() => () => controller.current?.abort(), []);
  function clearCredentials() {
    if (keyInput.current) keyInput.current.value = "";
    preferences.current.consent = false;
    setConsent(false);
    if (preferences.current.mode === "hosted" && pending.current) {
      revision.current++;
      controller.current?.abort();
    }
  }
  useEffect(() => {
    const clear = () => {
      if (keyInput.current) keyInput.current.value = "";
      preferences.current.consent = false;
      setConsent(false);
      revision.current++;
      controller.current?.abort();
    };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) clear(); };
    clear();
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", restore);
    return () => { window.removeEventListener("pagehide", clear); window.removeEventListener("pageshow", restore); };
  }, []);
  function updateSource(value: string) {
    revision.current++;
    setSource(value);
    setChanged(true);
    setError("");
  }
  function selectExample(i: number) {
    revision.current++;
    setSource(examples[i].source);
    setKind(examples[i].kind);
    setError("");
    if (i === 0) {
      setResult(sample);
      setSampleVisible(true);
      setChanged(false);
    } else {
      setResult(null);
      setSampleVisible(false);
      setChanged(false);
    }
  }
  async function submit() {
    try {
      await explainSource({ source, kind, level });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not explain this snippet.",
      );
    }
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="dumbdown home">
          <span className="brand-mark">
            <Code2 size={24} />
          </span>
          dumbdown<span className="brand-period">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <button
            className={!showConnect ? "nav-link active" : "nav-link"}
            onClick={() => setShowConnect(false)}
          >
            Explain
          </button>
          <button
            className={showConnect ? "nav-link active" : "nav-link"}
            onClick={() => { setShowConnect(true); document.querySelector('[aria-label="Explanation mode"]')?.scrollIntoView({ behavior: "smooth" }); }}
          >
            Mode
          </button>
        </nav>
        <a
          className="github-link"
          href="https://github.com/agammann/dumbdown"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={19} />
          <span>GitHub</span>
        </a>
      </header>
      <main>
        <section className="intro">
          <div>
            <h1>
              Less jargon.
              <br className="mobile-break" /> More <span>understanding.</span>
            </h1>
            <p>Turn code and technical docs into something that clicks.</p>
          </div>
          <div className="intro-symbol" aria-hidden="true">
            <Braces size={34} />
            <ArrowRight size={22} />
            <Lightbulb size={33} />
          </div>
        </section>
        <section className="inference-panel" aria-label="Explanation mode">
          <div className="segmented" role="group" aria-label="Choose explanation mode">
            <button disabled={busy} aria-pressed={mode === "device"} className={mode === "device" ? "selected" : ""} onClick={() => { clearCredentials(); preferences.current.mode = "device"; setMode("device"); }}>On this device · experimental</button>
            <button disabled={busy} aria-pressed={mode === "hosted"} className={mode === "hosted" ? "selected" : ""} onClick={() => { preferences.current.mode = "hosted"; setMode("hosted"); }}>OpenAI · your API key</button>
          </div>
          {mode === "device" ? <><p className="mode-note">Browser models can miss basic code behavior and documentation conditions. Check every explanation against the source. Optional GPT-5.4 can help with harder material using your own API account.</p><BrowserModelPanel /></> : <div className="visitor-settings">
            <label htmlFor="visitor-key">Your OpenAI API key</label>
            <div className="visitor-key-row"><input id="visitor-key" ref={keyInput} type="password" autoComplete="off" spellCheck={false} autoCapitalize="off" placeholder="sk-…" disabled={busy} /><button type="button" onClick={clearCredentials}>Clear key</button></div>
            <p id="hosted-notice">GPT-5.4 receives your complete submitted source, content type and reading level through this site’s server. Your API account pays for requests; a ChatGPT subscription does not include API credit. The app keeps the key in page memory and clears it on Clear key, Cancel, device mode, reload or leaving the page. It does not save source or explanations. <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Manage API keys ↗</a></p>
            <label className="visitor-consent"><input id="hosted-consent" type="checkbox" checked={consent} disabled={busy} onChange={event => { preferences.current.consent = event.target.checked; setConsent(event.target.checked); }} /><span>I want to send this source to OpenAI with my own key and understand that API charges apply.</span></label>
            <p className="mode-note">Nothing is sent until you request an explanation. Cancel stops waiting, but OpenAI may already have processed the request. Hosted explanations can also be wrong; inspect the source.</p>
          </div>}
        </section>
        <div className="preferences">
          <div className="level-control">
            <span id="level-label">Explain it for</span>
            <div
              className="segmented"
              role="group"
              aria-labelledby="level-label"
            >
              {(
                [
                  ["beginner", "New to this"],
                  ["intermediate", "Know the basics"],
                  ["advanced", "Go deeper"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  disabled={busy}
                  aria-pressed={level === value}
                  className={level === value ? "selected" : ""}
                  onClick={() => {
                    setLevel(value);
                    setChanged(true);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="workspace">
          <section className="source-panel" aria-labelledby="source-heading">
            <div className="panel-heading">
              <h2 id="source-heading">
                <span className="section-number orange">01</span>The complicated
                part
              </h2>
              <span className="source-tag">INPUT</span>
            </div>
            <div
              className="content-tabs"
              role="group"
              aria-label="Content type"
            >
              <button
                disabled={busy}
                aria-pressed={kind === "code"}
                className={kind === "code" ? "selected" : ""}
                onClick={() => {
                  setKind("code");
                  setChanged(true);
                }}
              >
                <Code2 size={17} />
                Code
              </button>
              <button
                disabled={busy}
                aria-pressed={kind === "documentation"}
                className={kind === "documentation" ? "selected" : ""}
                onClick={() => {
                  setKind("documentation");
                  setChanged(true);
                }}
              >
                <BookOpen size={17} />
                Documentation
              </button>
            </div>
            <label className="sr-only" htmlFor="source">
              Code or documentation to explain
            </label>
            <textarea
              id="source"
              spellCheck={false}
              value={source}
              disabled={busy}
              onChange={(e) => updateSource(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={
                kind === "code"
                  ? "Paste your code here…"
                  : "Paste the technical documentation here…"
              }
            />
            <div className="examples">
              <span>Try an example</span>
              <div>
                {examples.map((example, i) => (
                  <button
                    disabled={busy}
                    key={example.name}
                    onClick={() => selectExample(i)}
                  >
                    {example.name}
                    <ArrowRight size={13} />
                  </button>
                ))}
              </div>
            </div>
            <div className="source-toolbar">
              <span>{source.length.toLocaleString()} / {MAX_SOURCE.toLocaleString()}</span>
              {busy ? (
                <button
                  className="primary-button"
                  onClick={() => { controller.current?.abort(); if (preferences.current.mode === "hosted") clearCredentials(); }}
                >
                  <LoaderCircle size={18} className="spinner" />
                  Cancel
                </button>
              ) : (
                <button
                  className="primary-button"
                  disabled={!source.trim()}
                  onClick={() => void submit()}
                >
                  <Sparkles size={18} />
                  Dumb it down
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
            <p className="keyboard-hint">
              {busy
                ? "Finding the clearest way to explain it…"
                : "Ctrl / ⌘ + Enter to explain"}
            </p>
          </section>
          <section
            className="result-panel"
            aria-labelledby="result-heading"
            aria-busy={busy}
          >
            <div className="panel-heading">
              <h2 id="result-heading">
                <span className="section-number mint">02</span>The plain-English
                version
              </h2>
            </div>
            <div aria-live="polite">
              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}
              {changed && result && (
                <p className="result-note">
                  Showing the previous explanation. Generate again to update this
                  explanation.
                </p>
              )}
              {busy ? (
                <div className="empty-result">
                  <LoaderCircle className="spinner" size={34} />
                  <h3>Untangling the complicated part.</h3>
                  <p>
                    Finding the big idea, the details, and what to watch out
                    for.
                  </p>
                </div>
              ) : result ? (
                <ExplanationView
                  result={result}
                  isSample={sampleVisible}
                  onError={setError}
                />
              ) : (
                <div className="empty-result">
                  <Lightbulb size={38} />
                  <h3>That “oh, I get it” moment.</h3>
                  <p>
                    Paste your code or docs, choose a level, and let’s make
                    sense of it.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
        <footer>
          <p>
            <ShieldCheck size={16} />
            Your code is never executed. Remove secrets before you paste.
          </p>
          <a
            href="https://github.com/agammann/dumbdown/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
          >
            Open source · MIT license
            <ArrowRight size={14} />
          </a>
        </footer>
      </main>
    </div>
  );
}
