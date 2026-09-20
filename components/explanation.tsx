import { Check, Copy, Download, Lightbulb } from "lucide-react";
import { type Explanation, toMarkdown } from "../lib/explainer.mjs";
import { useState } from "react";
export function ExplanationView({
  result,
  isSample,
  onError,
}: {
  result: Explanation;
  isSample: boolean;
  onError: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(toMarkdown(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError("Clipboard is unavailable. Use Download instead.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([toMarkdown(result)], { type: "text/markdown" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "dumbdown-explanation.md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  return (
    <div className="explanation">
      <div className="result-label">
        <span className="result-type">
          {isSample ? "Hand-written example" : "AI explanation"}
        </span>
        <span>{isSample ? "No API call" : "Check against your source"}</span>
      </div>
      <h3>{result.title}</h3>
      <p className="summary">{result.summary}</p>
      <div className="analogy">
        <h4>
          <Lightbulb size={19} />
          Think of it like…
        </h4>
        <p>{result.analogy}</p>
      </div>
      <h4 className="steps-heading">Step by step</h4>
      <ol className="steps">
        {result.steps.map((step, i) => (
          <li key={i}>
            <span>{i + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.explanation}</p>
            </div>
          </li>
        ))}
      </ol>
      <details>
        <summary>
          Terms decoded <span>{result.terms.length}</span>
        </summary>
        <dl>
          {result.terms.map((t, i) => (
            <div key={i}>
              <dt>{t.term}</dt>
              <dd>{t.meaning}</dd>
            </div>
          ))}
        </dl>
      </details>
      <details>
        <summary>A concrete example</summary>
        <pre>{result.example}</pre>
      </details>
      <details className="caveats">
        <summary>Keep in mind</summary>
        <ul>
          {result.caveats.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </details>
      <div className="result-actions">
        <button onClick={() => void copy()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
          {copied ? "Copied" : "Copy explanation"}
        </button>
        <button onClick={download}>
          <Download size={16} />
          Download
        </button>
      </div>
    </div>
  );
}
