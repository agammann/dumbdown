import { localDevelopmentKey } from "../../../lib/local-key";
export function GET(request: Request) {
  return Response.json(
    { local: !!localDevelopmentKey(request) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
