/**
 * Minimal request/response shapes and the security headers every response here
 * carries.
 *
 * Typed structurally rather than against @vercel/node so this builds and tests
 * with no framework dependency. Vercel passes Node's IncomingMessage and
 * ServerResponse, which satisfy these at runtime.
 */

export interface BootstrapRequest {
  readonly method?: string | undefined;
  readonly url?: string | undefined;
  readonly headers: Record<string, string | string[] | undefined>;
}

export interface BootstrapResponse {
  statusCode: number;
  setHeader(name: string, value: string | string[]): unknown;
  end(body?: string): unknown;
}

/**
 * Applied to every response.
 *
 * `no-store` keeps the token panel out of the browser and proxy caches.
 * `no-referrer` stops the callback URL — which carries the authorization code
 * in its query string — from leaking through the Referer header to anything the
 * page touches. `noindex, nofollow` keeps the endpoints out of search indexes.
 * The CSP has no external origins at all, so nothing on the page can exfiltrate
 * what it displays.
 */
export function securityHeaders(response: BootstrapResponse): void {
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  );
}

export function query(request: BootstrapRequest, name: string): string | undefined {
  const url = new URL(request.url ?? "/", "https://placeholder.invalid");
  return url.searchParams.get(name) ?? undefined;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#05070f; color:#9aa6c8;
         font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width:44rem; margin:0 auto; padding:3rem 1.5rem; }
  h1 { color:#fff; font-size:1.5rem; margin:0 0 1rem; letter-spacing:-0.01em; }
  h2 { color:#fff; font-size:1.05rem; margin:2rem 0 .5rem; }
  code, pre { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  pre { background:#0a0e1c; border:1px solid #1b2340; border-radius:10px;
        padding:1rem; overflow-x:auto; color:#dce6ff; font-size:13px; }
  .ok { color:#4d84ff; } .bad { color:#ff8a8a; }
  .note { border-left:2px solid #2a3560; padding-left:1rem; margin:1.5rem 0; }
  button { background:#2f6bff; color:#fff; border:0; border-radius:10px;
           padding:.6rem 1rem; font:inherit; font-weight:600; cursor:pointer; }
</style></head>
<body><main>${body}</main></body></html>`;
}
