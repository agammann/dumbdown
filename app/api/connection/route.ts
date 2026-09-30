export function GET() {
  return Response.json({ local: false, browser: true, paidInference: false }, { headers: { "Cache-Control": "no-store" } });
}
