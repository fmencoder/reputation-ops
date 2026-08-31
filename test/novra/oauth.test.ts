/**
 * OAuth bootstrap tests.
 *
 * Fake credentials, mocked WordPress. Nothing here reaches the network and
 * nothing here can mint a real token.
 *
 * The recurring assertion is negative: after every path — success, every
 * failure mode, every malformed input — the client secret, the authorization
 * code and the access token must not appear anywhere they could leak. A secret
 * that only leaks on the error path is still a leaked secret, and the error
 * path is the one nobody looks at.
 */

import { describe, expect, it } from "vitest";

import { handleCallback, handleStart } from "../../oauth-bootstrap/lib/handlers";
import { securityHeaders, type BootstrapRequest, type BootstrapResponse } from "../../oauth-bootstrap/lib/http";
import { authorizeUrl, exchangeCode, scrub, validateToken, OAuthError } from "../../oauth-bootstrap/lib/oauth";
import {
  clearStateCookie, deriveStateKey, mintState, readCookie, stateCookie,
  STATE_COOKIE, verifyState,
} from "../../oauth-bootstrap/lib/state";

const SECRET = "fake-client-secret-not-real-0000";
const CODE = "fake-authorization-code-1234";
const TOKEN = "fake-access-token-abcdefghijkl";

const ENV = {
  NOVRA_WP_CLIENT_ID: "147112",
  NOVRA_WP_CLIENT_SECRET: SECRET,
  NOVRA_WP_OAUTH_REDIRECT_URI: "https://bootstrap.example/api/wordpress/oauth/callback",
  NOVRA_WP_SITE: "novraintelligence.com",
} as unknown as NodeJS.ProcessEnv;

const CONFIG = {
  clientId: "147112",
  clientSecret: SECRET,
  redirectUri: "https://bootstrap.example/api/wordpress/oauth/callback",
  site: "novraintelligence.com",
  apiBase: "https://wp.test",
};

class FakeResponse implements BootstrapResponse {
  statusCode = 200;
  headers: Record<string, string | string[]> = {};
  body = "";
  setHeader(name: string, value: string | string[]): void {
    this.headers[name] = value;
  }
  end(body?: string): void {
    this.body = body ?? "";
  }
  /** Everything a client could observe, concatenated. */
  get observable(): string {
    return JSON.stringify(this.headers) + this.body;
  }
}

function request(url: string, cookie?: string): BootstrapRequest {
  return { method: "GET", url, headers: cookie ? { cookie } : {} };
}

/** Records every fetch so a test can assert what left the process. */
function fakeFetch(responses: { status: number; body: unknown }[]): {
  impl: typeof fetch;
  calls: { url: string; body: string }[];
} {
  const calls: { url: string; body: string }[] = [];
  let index = 0;
  const impl = (async (input: unknown, init?: { body?: unknown }) => {
    const bodyInit = init?.body;
    calls.push({
      url: String(input),
      body: bodyInit instanceof URLSearchParams ? bodyInit.toString() : String(bodyInit ?? ""),
    });
    const next = responses[Math.min(index++, responses.length - 1)] ?? { status: 500, body: {} };
    return new Response(typeof next.body === "string" ? next.body : JSON.stringify(next.body), {
      status: next.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const SITE_OK = { status: 200, body: { ID: 246, URL: "https://novraintelligence.com", name: "NOVRA Intelligence" } };
const TOKEN_OK = { status: 200, body: { access_token: TOKEN, token_type: "bearer", blog_id: 246, blog_url: "https://novraintelligence.com" } };

/** Mint a state and the cookie carrying it, as a real /start would. */
function startedFlow(now = () => new Date("2026-08-31T12:00:00Z")): { state: string; cookie: string } {
  const state = mintState(deriveStateKey(SECRET), now);
  return { state, cookie: `${STATE_COOKIE}=${state}` };
}

describe("state", () => {
  const key = deriveStateKey(SECRET);
  const now = (): Date => new Date("2026-08-31T12:00:00Z");

  it("accepts a freshly minted state presented with its cookie", () => {
    const state = mintState(key, now);
    expect(verifyState(key, state, state, now).ok).toBe(true);
  });

  it("rejects a missing state", () => {
    expect(verifyState(key, undefined, "x", now).failure).toBe("missing-state");
  });

  it("rejects a missing cookie", () => {
    expect(verifyState(key, mintState(key, now), undefined, now).failure).toBe("missing-cookie");
  });

  it("rejects a state that does not match its cookie", () => {
    expect(verifyState(key, mintState(key, now), mintState(key, now), now).failure).toBe("mismatch");
  });

  it("rejects a forged signature", () => {
    const state = mintState(key, now);
    const forged = `${state.split(".").slice(0, 2).join(".")}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect(verifyState(key, forged, forged, now).failure).toBe("bad-signature");
  });

  it("rejects a state signed with a different secret", () => {
    const other = deriveStateKey("a-completely-different-secret-000");
    const state = mintState(other, now);
    expect(verifyState(key, state, state, now).failure).toBe("bad-signature");
  });

  it("rejects an expired state", () => {
    const state = mintState(key, () => new Date("2026-08-31T12:00:00Z"));
    const later = (): Date => new Date("2026-08-31T12:11:00Z");
    expect(verifyState(key, state, state, later).failure).toBe("expired");
  });

  it("rejects a future-dated state", () => {
    const state = mintState(key, () => new Date("2026-08-31T13:00:00Z"));
    expect(verifyState(key, state, state, now).failure).toBe("future-dated");
  });

  it("rejects malformed input", () => {
    expect(verifyState(key, "nope", "nope", now).failure).toBe("malformed");
  });

  it("issues a cookie that survives the cross-site return but is not script-readable", () => {
    const cookie = stateCookie("abc", 600);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    // Lax, not Strict: the callback is a cross-site top-level navigation from
    // WordPress.com, and Strict would drop the cookie on every legitimate flow.
    expect(cookie).toContain("SameSite=Lax");
    expect(clearStateCookie()).toContain("Max-Age=0");
  });

  it("parses one cookie out of a header carrying several", () => {
    expect(readCookie(`a=1; ${STATE_COOKIE}=xyz; b=2`, STATE_COOKIE)).toBe("xyz");
    expect(readCookie(undefined, STATE_COOKIE)).toBeUndefined();
  });
});

describe("authorize URL", () => {
  it("requests no scope, so the token is site-scoped rather than account-wide", () => {
    const url = new URL(authorizeUrl(CONFIG, "state-value"));
    expect(url.searchParams.get("scope")).toBeNull();
    expect(url.searchParams.get("blog")).toBe("novraintelligence.com");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state-value");
  });

  it("never puts the client secret in the authorization URL", () => {
    expect(authorizeUrl(CONFIG, "s")).not.toContain(SECRET);
  });
});

describe("token exchange", () => {
  it("sends the secret in the POST body, never in the URL", async () => {
    const { impl, calls } = fakeFetch([TOKEN_OK]);
    await exchangeCode(CONFIG, CODE, impl);
    expect(calls[0]?.url).not.toContain(SECRET);
    expect(calls[0]?.url).not.toContain(CODE);
    expect(calls[0]?.body).toContain("grant_type=authorization_code");
  });

  it("fails when WordPress returns an error", async () => {
    const { impl } = fakeFetch([{ status: 400, body: { error: "invalid_grant", error_description: "Code expired" } }]);
    await expect(exchangeCode(CONFIG, CODE, impl)).rejects.toThrow(/Code expired/);
  });

  it("fails when the response carries no access_token", async () => {
    const { impl } = fakeFetch([{ status: 200, body: { token_type: "bearer" } }]);
    await expect(exchangeCode(CONFIG, CODE, impl)).rejects.toThrow(/no access_token/);
  });

  it("rejects an unexpected token_type", async () => {
    const { impl } = fakeFetch([{ status: 200, body: { access_token: TOKEN, token_type: "mac" } }]);
    await expect(exchangeCode(CONFIG, CODE, impl)).rejects.toThrow(/token_type/);
  });

  it("fails on a non-JSON response without echoing it raw", async () => {
    const { impl } = fakeFetch([{ status: 502, body: `<html>gateway error for client_secret=${SECRET}</html>` }]);
    await expect(exchangeCode(CONFIG, CODE, impl)).rejects.toThrow(/non-JSON/);
    await exchangeCode(CONFIG, CODE, impl).catch((error: OAuthError) => {
      expect(error.message).not.toContain(SECRET);
    });
  });

  it("scrubs an upstream body that echoes the secret or the code", async () => {
    const { impl } = fakeFetch([{
      status: 400,
      body: { error: "invalid_request", error_description: `bad client_secret=${SECRET} and code=${CODE}` },
    }]);
    await exchangeCode(CONFIG, CODE, impl).catch((error: OAuthError) => {
      expect(error.message).not.toContain(SECRET);
      expect(error.message).not.toContain(CODE);
      expect(error.message).toContain("[REDACTED]");
    });
  });
});

describe("read-only token validation", () => {
  it("uses GET only — bootstrap never writes", async () => {
    const { impl, calls } = fakeFetch([SITE_OK]);
    const result = await validateToken(CONFIG, TOKEN, impl);
    expect(calls).toHaveLength(1);
    expect(result.matchesExpectedSite).toBe(true);
    expect(result.siteId).toBe(246);
  });

  it("reports a site mismatch rather than accepting the token", async () => {
    const { impl } = fakeFetch([{ status: 200, body: { ID: 999, URL: "https://someone-else.example", name: "Other" } }]);
    expect((await validateToken(CONFIG, TOKEN, impl)).matchesExpectedSite).toBe(false);
  });

  it("treats www and scheme differences as the same site", async () => {
    const { impl } = fakeFetch([{ status: 200, body: { ID: 246, URL: "http://www.novraintelligence.com", name: "N" } }]);
    expect((await validateToken(CONFIG, TOKEN, impl)).matchesExpectedSite).toBe(true);
  });

  it("fails when the token cannot read the site, without echoing the token", async () => {
    const { impl } = fakeFetch([{ status: 403, body: `denied for ${TOKEN}` }]);
    await validateToken(CONFIG, TOKEN, impl).catch((error: OAuthError) => {
      expect(error.message).not.toContain(TOKEN);
    });
  });
});

describe("start endpoint", () => {
  it("redirects to WordPress with a state cookie set", () => {
    const response = new FakeResponse();
    handleStart(request("/api/wordpress/oauth/start"), response, { env: ENV });
    expect(response.statusCode).toBe(302);
    const location = String(response.headers["Location"]);
    expect(location).toMatch(/^https:\/\/public-api\.wordpress\.com\/oauth2\/authorize/);
    expect(String(response.headers["Set-Cookie"])).toContain(STATE_COOKIE);
  });

  it("does not leak the client secret into the redirect or the cookie", () => {
    const response = new FakeResponse();
    handleStart(request("/api/wordpress/oauth/start"), response, { env: ENV });
    expect(response.observable).not.toContain(SECRET);
  });

  it("names the missing variables rather than running half-configured", () => {
    const response = new FakeResponse();
    handleStart(request("/api/wordpress/oauth/start"), response, { env: {} as NodeJS.ProcessEnv });
    expect(response.statusCode).toBe(500);
    expect(response.body).toContain("NOVRA_WP_CLIENT_SECRET");
    expect(response.body).not.toContain(SECRET);
  });

  it("rejects a non-GET request", () => {
    const response = new FakeResponse();
    handleStart({ method: "POST", url: "/x", headers: {} }, response, { env: ENV });
    expect(response.statusCode).toBe(405);
  });
});

describe("callback endpoint", () => {
  const now = () => new Date("2026-08-31T12:00:30Z");

  it("exchanges, validates and shows the token once", async () => {
    const { state, cookie } = startedFlow();
    const { impl, calls } = fakeFetch([TOKEN_OK, SITE_OK]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}&state=${encodeURIComponent(state)}`, cookie),
      response,
      { env: ENV, fetchImpl: impl, now },
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(TOKEN);
    expect(response.body).toContain("NOVRA_WP_ACCESS_TOKEN");
    expect(calls).toHaveLength(2);
    // The state cookie is cleared, so the flow cannot be replayed.
    expect(String(response.headers["Set-Cookie"])).toContain("Max-Age=0");
  });

  it("never puts the token in a redirect or a URL", async () => {
    const { state, cookie } = startedFlow();
    const { impl } = fakeFetch([TOKEN_OK, SITE_OK]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}&state=${encodeURIComponent(state)}`, cookie),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(response.headers["Location"]).toBeUndefined();
    expect(JSON.stringify(response.headers)).not.toContain(TOKEN);
  });

  it("sends no-store, no-referrer and noindex on the token page", async () => {
    const { state, cookie } = startedFlow();
    const { impl } = fakeFetch([TOKEN_OK, SITE_OK]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}&state=${encodeURIComponent(state)}`, cookie),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(String(response.headers["Cache-Control"])).toContain("no-store");
    expect(response.headers["Referrer-Policy"]).toBe("no-referrer");
    expect(String(response.headers["X-Robots-Tag"])).toContain("noindex");
    expect(String(response.headers["Content-Security-Policy"])).toContain("default-src 'none'");
  });

  it("refuses a callback with no code", async () => {
    const { state, cookie } = startedFlow();
    const { impl, calls } = fakeFetch([TOKEN_OK]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?state=${encodeURIComponent(state)}`, cookie),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(response.statusCode).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("refuses a callback with no state, without spending the code", async () => {
    const { impl, calls } = fakeFetch([TOKEN_OK]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}`),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(response.statusCode).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("refuses a mismatched state without spending the code", async () => {
    const { cookie } = startedFlow();
    const other = mintState(deriveStateKey(SECRET));
    const { impl, calls } = fakeFetch([TOKEN_OK]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}&state=${encodeURIComponent(other)}`, cookie),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(response.statusCode).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("refuses an expired state", async () => {
    const { state, cookie } = startedFlow();
    const { impl, calls } = fakeFetch([TOKEN_OK]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}&state=${encodeURIComponent(state)}`, cookie),
      response,
      { env: ENV, fetchImpl: impl, now: () => new Date("2026-08-31T12:20:00Z") },
    );
    expect(response.statusCode).toBe(400);
    expect(response.body).toContain("expired");
    expect(calls).toHaveLength(0);
  });

  it("reports an exchange failure without echoing the secret or the code", async () => {
    const { state, cookie } = startedFlow();
    const { impl } = fakeFetch([{
      status: 400,
      body: { error: "invalid_grant", error_description: `rejected code=${CODE} secret=${SECRET}` },
    }]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}&state=${encodeURIComponent(state)}`, cookie),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(response.statusCode).toBe(502);
    expect(response.observable).not.toContain(SECRET);
    expect(response.observable).not.toContain(CODE);
  });

  it("reports a response with no access_token", async () => {
    const { state, cookie } = startedFlow();
    const { impl } = fakeFetch([{ status: 200, body: { token_type: "bearer" } }]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}&state=${encodeURIComponent(state)}`, cookie),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(response.statusCode).toBe(502);
    expect(response.body).toContain("no access_token");
  });

  it("withholds the token entirely when the wrong site is returned", async () => {
    const { state, cookie } = startedFlow();
    const { impl } = fakeFetch([
      TOKEN_OK,
      { status: 200, body: { ID: 999, URL: "https://someone-else.example", name: "Other" } },
    ]);
    const response = new FakeResponse();
    await handleCallback(
      request(`/api/wordpress/oauth/callback?code=${CODE}&state=${encodeURIComponent(state)}`, cookie),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(response.statusCode).toBe(409);
    expect(response.observable).not.toContain(TOKEN);
    expect(response.body).toContain("has not been displayed");
  });

  it("handles a declined authorization without an exchange", async () => {
    const { impl, calls } = fakeFetch([TOKEN_OK]);
    const response = new FakeResponse();
    await handleCallback(
      request("/api/wordpress/oauth/callback?error=access_denied"),
      response, { env: ENV, fetchImpl: impl, now },
    );
    expect(response.statusCode).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe("scrubbing and headers", () => {
  it("removes every credential shape it knows", () => {
    const dirty = `client_secret=${SECRET}&code=${CODE} "access_token":"${TOKEN}" Bearer ${TOKEN}`;
    const clean = scrub(dirty, [SECRET, CODE, TOKEN]);
    for (const value of [SECRET, CODE, TOKEN]) expect(clean).not.toContain(value);
  });

  it("leaves short strings alone rather than redacting ordinary words", () => {
    expect(scrub("a normal message", ["abc"])).toBe("a normal message");
  });

  it("sets every required security header", () => {
    const response = new FakeResponse();
    securityHeaders(response);
    for (const header of [
      "Cache-Control", "Referrer-Policy", "X-Robots-Tag",
      "X-Content-Type-Options", "X-Frame-Options", "Content-Security-Policy",
    ]) {
      expect(response.headers[header]).toBeDefined();
    }
    // No CORS header at all — there is no cross-origin caller, so a wildcard
    // would be granting access to nobody's benefit.
    expect(response.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
