import { env } from "cloudflare:workers";
export function localDevelopmentKey(request: Request): string | undefined {
  // This branch is disabled in production builds, regardless of Host headers.
  if (process.env.NODE_ENV !== "development") return undefined;
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  )
    return undefined;
  return (env as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;
}
