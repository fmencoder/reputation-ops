/**
 * CSRF state for the OAuth authorization-code flow.
 *
 * Stateless by design: the state is signed rather than stored, so this
 * bootstrap needs no database, no KV store and no session backend — which
 * matters because it is meant to be deleted the moment it has done its job, and
 * a service with persistent storage is a service someone forgets to delete.
 *
 * The check is double-submit: the same value must arrive as the `state` query
 * parameter *and* in an HttpOnly cookie, and the signature must verify. An
 * attacker who can forge one cannot forge the other.
 *
 * The signing key is derived from the client secret via HKDF with its own info
 * label, so the secret is never used directly as a MAC key and a state
 * signature reveals nothing about it. This avoids a fifth environment variable
 * without reusing a key across purposes.
 */

import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

export const STATE_COOKIE = "novra_oauth_state";
export const STATE_TTL_SECONDS = 600;

export function deriveStateKey(clientSecret: string): Buffer {
  if (!clientSecret) throw new Error("client secret is required to derive the state key");
  return Buffer.from(
    hkdfSync("sha256", Buffer.from(clientSecret, "utf8"), Buffer.from("novra-oauth"), Buffer.from("state-signing-v1"), 32),
  );
}

function sign(key: Buffer, payload: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Constant-time compare that does not leak length through an early return. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    // Still burn a comparison so the timing does not distinguish "wrong length"
    // from "wrong value".
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function mintState(key: Buffer, now: () => Date = () => new Date()): string {
  const nonce = randomBytes(32).toString("base64url");
  const issuedAt = Math.floor(now().getTime() / 1000);
  const payload = `${nonce}.${issuedAt}`;
  return `${payload}.${sign(key, payload)}`;
}

export type StateFailure =
  | "missing-state"
  | "missing-cookie"
  | "mismatch"
  | "malformed"
  | "bad-signature"
  | "expired"
  | "future-dated";

export interface StateResult {
  readonly ok: boolean;
  readonly failure?: StateFailure;
}

export function verifyState(
  key: Buffer,
  state: string | undefined,
  cookie: string | undefined,
  now: () => Date = () => new Date(),
  ttlSeconds: number = STATE_TTL_SECONDS,
): StateResult {
  if (!state) return { ok: false, failure: "missing-state" };
  if (!cookie) return { ok: false, failure: "missing-cookie" };
  if (!safeEqual(state, cookie)) return { ok: false, failure: "mismatch" };

  const parts = state.split(".");
  if (parts.length !== 3) return { ok: false, failure: "malformed" };
  const [nonce, issuedAtRaw, signature] = parts as [string, string, string];
  if (!nonce || !issuedAtRaw || !signature) return { ok: false, failure: "malformed" };

  if (!safeEqual(signature, sign(key, `${nonce}.${issuedAtRaw}`))) {
    return { ok: false, failure: "bad-signature" };
  }

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return { ok: false, failure: "malformed" };

  const nowSeconds = Math.floor(now().getTime() / 1000);
  // A small skew allowance forward; a state stamped meaningfully in the future
  // is a forged or replayed value, not a clock difference.
  if (issuedAt > nowSeconds + 60) return { ok: false, failure: "future-dated" };
  if (nowSeconds - issuedAt > ttlSeconds) return { ok: false, failure: "expired" };

  return { ok: true };
}

export function stateCookie(value: string, maxAgeSeconds: number): string {
  // SameSite=Lax, not Strict: the callback arrives as a cross-site top-level
  // navigation from WordPress.com, and Strict would drop the cookie and break
  // every legitimate flow.
  return [
    `${STATE_COOKIE}=${value}`,
    "Path=/api/wordpress/oauth",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function clearStateCookie(): string {
  return stateCookie("", 0);
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}
