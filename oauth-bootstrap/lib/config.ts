/**
 * Environment configuration.
 *
 * Every value is read from the process environment and nothing has a default
 * that would let the service run half-configured. A missing secret produces a
 * clear 500 naming the variable, never a fallback and never a guess.
 */

import type { OAuthConfig } from "./oauth";

export interface ConfigResult {
  readonly config?: OAuthConfig;
  readonly missing: readonly string[];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConfigResult {
  const clientId = env["NOVRA_WP_CLIENT_ID"];
  const clientSecret = env["NOVRA_WP_CLIENT_SECRET"];
  const redirectUri = env["NOVRA_WP_OAUTH_REDIRECT_URI"];
  const site = env["NOVRA_WP_SITE"];

  const missing: string[] = [];
  if (!clientId) missing.push("NOVRA_WP_CLIENT_ID");
  if (!clientSecret) missing.push("NOVRA_WP_CLIENT_SECRET");
  if (!redirectUri) missing.push("NOVRA_WP_OAUTH_REDIRECT_URI");
  if (!site) missing.push("NOVRA_WP_SITE");
  if (missing.length > 0) return { missing };

  return {
    missing: [],
    config: {
      clientId: clientId as string,
      clientSecret: clientSecret as string,
      redirectUri: redirectUri as string,
      site: site as string,
    },
  };
}
