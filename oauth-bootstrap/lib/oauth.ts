/**
 * WordPress.com authorization-code flow.
 *
 * Everything that touches the client secret, the authorization code or the
 * access token lives here and runs server-side only. None of these three values
 * is ever placed in a URL, a redirect, a log line, or anything sent to a
 * browser except the one-time token panel the operator explicitly asked for.
 */

export interface OAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  /** Site the token must be able to reach, e.g. "novraintelligence.com". */
  readonly site: string;
  readonly apiBase?: string;
}

const DEFAULT_API_BASE = "https://public-api.wordpress.com";

/**
 * Build the authorization URL.
 *
 * `scope` is deliberately NOT sent. WordPress.com issues a token scoped to a
 * single site when no scope is requested; passing `scope=global` would return a
 * token valid for every site on the account. A deployment token for one site
 * has no business being able to reach the others.
 *
 * `blog` pre-selects NOVRA so the operator cannot land on the wrong site by
 * misclicking the picker.
 */
export function authorizeUrl(config: OAuthConfig, state: string): string {
  const url = new URL("/oauth2/authorize", config.apiBase ?? DEFAULT_API_BASE);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("blog", config.site);
  return url.toString();
}

export interface TokenResponse {
  readonly access_token?: string;
  readonly token_type?: string;
  readonly blog_id?: string | number;
  readonly blog_url?: string;
  readonly scope?: string;
  readonly error?: string;
  readonly error_description?: string;
}

export class OAuthError extends Error {
  constructor(
    override readonly message: string,
    readonly stage: "exchange" | "validate" | "identity",
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

/**
 * Strip anything credential-shaped out of text before it can reach a response
 * body or a log.
 *
 * Applied to every error path. WordPress error bodies echo request parameters
 * in some failure modes, so a raw upstream body is not safe to surface.
 */
export function scrub(text: string, secrets: readonly (string | undefined)[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) out = out.split(secret).join("[REDACTED]");
  }
  return out
    .replace(/"access_token"\s*:\s*"[^"]*"/gi, '"access_token":"[REDACTED]"')
    .replace(/\b(client_secret|code|access_token)=[^&\s"]+/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._%|-]+/gi, "Bearer [REDACTED]");
}

export type Fetcher = typeof fetch;

export async function exchangeCode(
  config: OAuthConfig,
  code: string,
  fetchImpl: Fetcher = fetch,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetchImpl(`${config.apiBase ?? DEFAULT_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });

  const text = await response.text();
  let parsed: TokenResponse;
  try {
    parsed = JSON.parse(text) as TokenResponse;
  } catch {
    throw new OAuthError(
      `Token endpoint returned a non-JSON response (HTTP ${response.status}): ` +
      scrub(text.slice(0, 200), [config.clientSecret, code]),
      "exchange",
    );
  }

  if (!response.ok || parsed.error) {
    throw new OAuthError(
      `Token exchange failed (HTTP ${response.status}): ` +
      scrub(parsed.error_description ?? parsed.error ?? text.slice(0, 200), [config.clientSecret, code]),
      "exchange",
    );
  }

  if (!parsed.access_token) {
    throw new OAuthError("Token endpoint returned no access_token.", "exchange");
  }
  if (parsed.token_type && parsed.token_type.toLowerCase() !== "bearer") {
    throw new OAuthError(`Unexpected token_type "${parsed.token_type}"; expected bearer.`, "exchange");
  }

  return parsed;
}

export interface TokenValidation {
  readonly siteId: number;
  readonly siteUrl: string;
  readonly siteName: string;
  readonly matchesExpectedSite: boolean;
}

function normaliseHost(value: string): string {
  const withScheme = value.includes("://") ? value : `https://${value}`;
  try {
    return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.toLowerCase().replace(/^www\./, "");
  }
}

/**
 * Confirm the token works and points at the intended site — with GET requests
 * only.
 *
 * Bootstrap never writes. A token that is about to be handed to a deployment
 * pipeline should be proven by reading, not by creating a test page that then
 * has to be cleaned up.
 */
export async function validateToken(
  config: OAuthConfig,
  accessToken: string,
  fetchImpl: Fetcher = fetch,
): Promise<TokenValidation> {
  const base = config.apiBase ?? DEFAULT_API_BASE;
  const response = await fetchImpl(`${base}/rest/v1.1/sites/${encodeURIComponent(config.site)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new OAuthError(
      `Token could not read ${config.site} (HTTP ${response.status}): ` +
      scrub(text.slice(0, 200), [config.clientSecret, accessToken]),
      "validate",
    );
  }

  let site: { ID?: number; URL?: string; name?: string };
  try {
    site = JSON.parse(text) as typeof site;
  } catch {
    throw new OAuthError("Site endpoint returned a non-JSON response.", "validate");
  }

  if (typeof site.ID !== "number" || !site.URL) {
    throw new OAuthError("Site endpoint returned no site identity.", "identity");
  }

  return {
    siteId: site.ID,
    siteUrl: site.URL,
    siteName: site.name ?? "",
    matchesExpectedSite: normaliseHost(site.URL) === normaliseHost(config.site),
  };
}
