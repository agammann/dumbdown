import { ArrowRight, Plug, X } from "lucide-react";
import { useState } from "react";
export function Connections({
  connected,
  webmcp,
  onConnect,
  onClose,
  onError,
}: {
  connected: boolean;
  webmcp: boolean;
  onConnect: (key: string) => void;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section className="connect-panel" aria-labelledby="connect-heading">
      <div className="connect-heading">
        <div>
          <h2 id="connect-heading">
            <Plug size={22} /> Make a connection
          </h2>
          <p>
            Use your own OpenAI API credits. Your key stays in this tab’s memory
            and is sent to this site’s server only to call OpenAI. It is not
            saved by dumbdown.
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Close connections"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^sk-[A-Za-z0-9_-]{20,512}$/.test(draft.trim())) {
            onError("Enter a valid OpenAI API key.");
            return;
          }
          onConnect(draft.trim());
          setDraft("");
          onClose();
        }}
      >
        <label htmlFor="api-key">OpenAI API key</label>
        <div className="key-row">
          <input
            id="api-key"
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              connected ? "A key is connected" : "Paste your API key"
            }
            required
          />
          <button className="primary-button" type="submit">
            Connect key
            <ArrowRight size={17} />
          </button>
          {connected && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                onConnect("");
                setDraft("");
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </form>
      <div className="integrations">
        <div>
          <h3>MCP · in your assistant</h3>
          <p>
            Run the included MCP server locally. It reads your local key and
            exposes <code>dumbdown_explain</code>.
          </p>
          <a
            href="https://github.com/agammann/dumbdown#use-with-an-mcp-assistant"
            target="_blank"
            rel="noreferrer"
          >
            Setup instructions <ArrowRight size={15} />
          </a>
        </div>
        <div>
          <h3>WebMCP · in your browser</h3>
          <p>
            {webmcp
              ? "Available here. Your browser assistant can call dumbdown_explain and display the result."
              : "Requires a browser with WebMCP enabled. The web app works without it."}
          </p>
          <span className="connection-status">
            {webmcp
              ? "Browser tool registered"
              : "Not available in this browser"}
          </span>
        </div>
      </div>
    </section>
  );
}
