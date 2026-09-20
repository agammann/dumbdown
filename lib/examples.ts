import type { Explanation } from "./explainer.mjs";
export const examples = [
  {
    name: "Debounce",
    kind: "code" as const,
    source: `function debounce(fn, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}`,
  },
  {
    name: "Async / await",
    kind: "code" as const,
    source: `async function getUser(id) {
  const response = await fetch('/api/users/' + id);
  if (!response.ok) {
    throw new Error('Could not load user');
  }
  return await response.json();
}`,
  },
  {
    name: "API docs",
    kind: "documentation" as const,
    source:
      "Example API documentation: GET /items returns a paginated list. Set limit to a value between 1 and 100. If the response contains next_cursor, pass it as the cursor parameter in the next request. When next_cursor is null, there are no more pages. A 429 response means the request limit was exceeded; wait for the number of seconds in the Retry-After header before retrying.",
  },
];
export const sample: Explanation = {
  title: "Wait until things settle down.",
  summary:
    "This function makes a version of another function that waits for a pause before running. If it gets called again during the wait, it starts the timer over. After the calls stop, the original function runs once with the most recent arguments.",
  analogy:
    "Think of an elevator door. Each new person arriving restarts the wait. Once nobody arrives for a while, the door closes. Here, each function call restarts that wait—even if the arguments are unchanged.",
  steps: [
    {
      title: "Remember the timer",
      explanation: "timeoutId keeps track of the pending timer between calls.",
    },
    {
      title: "Restart the wait",
      explanation:
        "Each call cancels the old timer and creates a new one using delay.",
    },
    {
      title: "Run the latest call",
      explanation:
        "After a quiet period, fn runs with the latest arguments and the caller’s this value.",
    },
  ],
  terms: [
    {
      term: "Debounce",
      meaning: "Wait for repeated activity to stop before taking action.",
    },
    { term: "...args", meaning: "Collect every argument into an array." },
    {
      term: "Closure",
      meaning:
        "A function remembers variables from the place where it was created.",
    },
  ],
  example:
    "const saveLater = debounce(saveDraft, 500);\nsaveLater('h');\nsaveLater('hello');\n// After about 500 ms without another call:\n// saveDraft('hello') runs.",
  caveats: [
    "delay is a minimum wait, not an exact execution time. A busy event loop can delay it.",
    "The wrapper does not return the original function’s result and has no cancel or flush method.",
  ],
};
