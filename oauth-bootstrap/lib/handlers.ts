/**
 * The two endpoints, as pure functions over the request/response shapes.
 *
 * Kept out of api/ so the whole flow is unit-testable without a server: every
 * case in the required test list — missing code, bad state, expired state,
 * exchange failure, no access_token, wrong site — exercises these directly.
 */

import { loadConfig } from "./config";
import { escapeHtml, page, query, securityHeaders, type BootstrapRequest, type BootstrapResponse } from "./http";
import { authorizeUrl, exchangeCode, OAuthError, scrub, validateToken, type Fetcher } from "./oauth";
import {
  clearStateCookie, deriveStateKey, mintState, readCookie, stateCookie,
  STATE_COOKIE, STATE_TTL_SECONDS, verifyState, type StateFailure,
} from "./state";
import { normalizeToken } from "./token";

export interface HandlerDeps {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: Fetcher;
  readonly now?: () => Date;
}

function fail(response: BootstrapResponse, status: number, title: string, detail: string): void {
  securityHeaders(response);
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.statusCode = status;
  response.end(page(title, `<h1 class="bad">${escapeHtml(title)}</h1><p>${escapeHtml(detail)}</p>`));
}

function missingConfig(response: BootstrapResponse, missing: readonly string[]): void {
  fail(
    response, 500, "Not configured",
    `Set these environment variables in the hosting project, then redeploy: ${missing.join(", ")}. ` +
    "The client secret must be set through the provider's encrypted environment-variable store, never in a file.",
  );
}

/** GET /api/wordpress/oauth/start */
export function handleStart(
  request: BootstrapRequest,
  response: BootstrapResponse,
  deps: HandlerDeps = {},
): void {
  if ((request.method ?? "GET").toUpperCase() !== "GET") {
    return fail(response, 405, "Method not allowed", "Use GET.");
  }

  const { config, missing } = loadConfig(deps.env);
  if (!config) return missingConfig(response, missing);

  const state = mintState(deriveStateKey(config.clientSecret), deps.now ?? (() => new Date()));

  securityHeaders(response);
  response.setHeader("Set-Cookie", stateCookie(state, STATE_TTL_SECONDS));
  response.setHeader("Location", authorizeUrl(config, state));
  response.statusCode = 302;
  response.end();
}

/** GET /api/wordpress/oauth/callback */
export async function handleCallback(
  request: BootstrapRequest,
  response: BootstrapResponse,
  deps: HandlerDeps = {},
): Promise<void> {
  if ((request.method ?? "GET").toUpperCase() !== "GET") {
    return fail(response, 405, "Method not allowed", "Use GET.");
  }

  const { config, missing } = loadConfig(deps.env);
  if (!config) return missingConfig(response, missing);

  const fetchImpl = deps.fetchImpl ?? fetch;
  const cookieHeader = request.headers["cookie"];
  const cookie = readCookie(Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader, STATE_COOKIE);

  // The state cookie is cleared on every outcome, success or failure, so a
  // state can never be reused for a second exchange.
  const clear = (): unknown => response.setHeader("Set-Cookie", clearStateCookie());

  const error = query(request, "error");
  if (error) {
    clear();
    return fail(response, 400, "Authorization declined",
      `WordPress returned "${scrub(error, [config.clientSecret])}". Nothing was exchanged.`);
  }

  // State is verified BEFORE the code is used. An unverified state means the
  // request did not originate from this service, and a code from such a request
  // must not be spent — that is the entire purpose of the parameter.
  const stateResult = verifyState(
    deriveStateKey(config.clientSecret),
    query(request, "state"),
    cookie,
    deps.now ?? (() => new Date()),
  );
  if (!stateResult.ok) {
    clear();
    return fail(response, 400, "State verification failed", STATE_MESSAGES[stateResult.failure ?? "malformed"]);
  }

  const code = query(request, "code");
  if (!code) {
    clear();
    return fail(response, 400, "Missing authorization code", "The callback carried no ?code parameter.");
  }

  try {
    const token = await exchangeCode(config, code, fetchImpl);
    const accessToken = token.access_token as string;
    const validation = await validateToken(config, accessToken, fetchImpl);

    if (!validation.matchesExpectedSite) {
      clear();
      return fail(
        response, 409, "Wrong site",
        `The token reaches ${validation.siteUrl}, but this bootstrap is configured for ${config.site}. ` +
        "The token has not been displayed. Restart and select the correct site.",
      );
    }

    clear();
    securityHeaders(response);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.statusCode = 200;
    // Fingerprinted with the same implementation production uses, so the two
    // numbers can be compared directly. The token itself is unchanged - what is
    // displayed is exactly what WordPress issued.
    const identity = normalizeToken(accessToken);
    response.end(
      successPage(accessToken, identity.length, identity.fingerprint,
        validation.siteId, validation.siteUrl, validation.siteName),
    );
  } catch (caught) {
    clear();
    const oauthError = caught as OAuthError;
    return fail(
      response,
      502,
      oauthError.stage === "exchange" ? "Token exchange failed" : "Token validation failed",
      scrub(oauthError.message, [config.clientSecret, code]),
    );
  }
}

/** Typed by the failure union so a new failure mode cannot ship without a message. */
const STATE_MESSAGES: Record<StateFailure, string> = {
  "missing-state": "The callback carried no state parameter.",
  "missing-cookie": "The state cookie was absent. Start the flow again from /api/wordpress/oauth/start in the same browser — the cookie is what proves the request originated here.",
  mismatch: "The state parameter did not match the state cookie.",
  malformed: "The state value was malformed.",
  "bad-signature": "The state signature did not verify. This request did not originate from this service.",
  expired: "The state expired. It is valid for ten minutes; start again.",
  "future-dated": "The state is dated in the future and was rejected.",
};

/**
 * One-time token panel.
 *
 * The token is rendered into the response body — never a URL, never a redirect,
 * never localStorage, never a fetch to anything. The CSP allows no external
 * origin, so nothing on this page can send it anywhere. It is not stored
 * server-side: reloading this URL will not show it again, because the
 * authorization code has been consumed and the state cookie cleared.
 */
function successPage(
  token: string,
  tokenLength: number,
  tokenFingerprint: string,
  siteId: number,
  siteUrl: string,
  siteName: string,
): string {
  return page(
    "Token ready",
    `<h1 class="ok">Token issued and validated</h1>
<p>Read-only validation passed: the token can reach
<strong>${escapeHtml(siteName || siteUrl)}</strong> (site ID ${siteId}).
Nothing was written — no page, no post, no media.</p>

<h2>Verify the handoff</h2>
<p>These two values identify the token without revealing it. Whatever you paste
into GitHub must produce the same pair, and the auth check prints its own before
it contacts WordPress. If they differ, the value changed in transit and the
credential is not the problem.</p>
<pre>TOKEN_LENGTH=${tokenLength}
TOKEN_FINGERPRINT=${escapeHtml(tokenFingerprint)}</pre>

<h2>Copy this once</h2>
<p><strong>Copy ONLY the token inside the box below.</strong> Not the word
&ldquo;Bearer&rdquo;, not quotes, not a label, not a trailing line break. The
copy button below takes exactly the right characters and nothing else &mdash;
prefer it to selecting by hand.</p>
<pre id="t">${escapeHtml(token)}</pre>
<button onclick="navigator.clipboard.writeText(document.getElementById('t').textContent).then(()=>{this.textContent='Copied - exact bytes, no whitespace'})">Copy token</button>

<div class="note">
<p>This page is <code>no-store</code>, <code>noindex</code> and
<code>no-referrer</code>, and the token is not stored anywhere on the server.
Reloading will not show it again — the authorization code has been spent.</p>
</div>

<h2>Where it goes</h2>
<pre>GitHub -> fmencoder/reputation-ops -> Settings
  -> Environments -> production -> Environment secrets

  NOVRA_WP_ACCESS_TOKEN = (the token box above, nothing else)
  NOVRA_WP_SITE         = ${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}
  site ID for reference = ${siteId}

Set it on the ENVIRONMENT named "production", not at repository level.
An environment secret overrides a repository secret of the same name, so a
stale environment value silently wins over a fresh repository one.</pre>

<h2>Then delete this service</h2>
<p>It has done its job. Removing the Vercel project revokes the only place the
client secret is deployed; the access token in GitHub keeps working, because it
does not depend on this service existing.</p>`,
  );
}
