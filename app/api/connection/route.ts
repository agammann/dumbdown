export function GET() {
  return Response.json({ local: false, browser: true, paidInference: true, requiresVisitorKey: true }, { headers: { "Cache-Control": "no-store" } });
}
