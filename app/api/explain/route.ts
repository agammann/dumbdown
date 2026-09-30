export function POST() {
  return Response.json({ error: "Explanations run in your browser. Reload the page to use the browser model." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
