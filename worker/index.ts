import * as connection from "../app/api/connection/route";
import * as retiredExplanation from "../app/api/explain/route";
import * as visitorExplanation from "../app/api/explain/visitor/route";

type Method = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
type Handler = (request: Request) => Response | Promise<Response>;
type Handlers = Partial<Record<Method, Handler>>;
type Environment = { ASSETS: Fetcher };
const methods: Method[] = ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];

// Preserve the existing route-module GET/HEAD/OPTIONS/405 behavior while passing
// the original Request, including its abort signal, to the unchanged handler.
async function dispatch(request: Request, handlers: Handlers) {
  const method = request.method.toUpperCase() as Method;
  if (!methods.includes(method)) return new Response(null, { status: 400 });
  if (method === "OPTIONS" && !handlers.OPTIONS) {
    const allowed = methods.filter(item => typeof handlers[item] === "function");
    if (handlers.GET && !handlers.HEAD) allowed.push("HEAD");
    allowed.push("OPTIONS");
    return new Response(null, { status: 204, headers: { Allow: allowed.sort().join(", ") } });
  }
  const handler = handlers[method] || (method === "HEAD" ? handlers.GET : undefined);
  if (!handler) return new Response(null, { status: 405 });
  const response = await handler(request);
  return method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
}

async function route(request: Request, env: Environment) {
    const url = new URL(request.url);
    try { decodeURIComponent(url.pathname); }
    catch { return new Response(null, { status: 400 }); }
    // Existing API routing accepts internal repeated and trailing slashes,
    // but a leading double slash is not an API alias. Preserve the Request.
    if (url.pathname.startsWith("//")) return new Response(null, { status: 404 });
    const apiPath = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
    if (apiPath === "/api/connection") return dispatch(request, connection);
    if (apiPath === "/api/explain") return dispatch(request, retiredExplanation);
    if (apiPath === "/api/explain/visitor") return dispatch(request, visitorExplanation);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return new Response(null, { status: 404 });
    if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });

    // Assets own HTML redirects, cache policy and unknown-route 404s.
    // public/_headers applies the same security policy when assets bypass us.
    return env.ASSETS.fetch(request);
}

const worker = {
  async fetch(request: Request, env: Environment) {
    const response = await route(request, env);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

export default worker;
