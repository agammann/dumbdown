export type ExplainInput = {
  source: string;
  kind: "code" | "documentation";
  level: "beginner" | "intermediate" | "advanced";
};
export type Explanation = {
  title: string;
  summary: string;
  analogy: string;
  steps: { title: string; explanation: string }[];
  terms: { term: string; meaning: string }[];
  example: string;
  caveats: string[];
};
export const MAX_SOURCE: number;
export const LEVELS: string[];
export const inputSchema: Record<string, unknown>;
export const explanationSchema: Record<string, unknown>;
export function validateInput(value: unknown): ExplainInput;
export function validateExplanation(value: unknown): Explanation;
export function explain(
  input: ExplainInput,
  options?: {
    apiKey?: string;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    model?: string;
  },
): Promise<Explanation>;
export function toMarkdown(result: Explanation): string;
