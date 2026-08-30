const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "gclid", "fbclid", "msclkid", "ref", "referrer", "source", "amp",
]);

/** Strip `www.`, lowercase, drop a trailing dot. Returns "" for unparseable input. */
export function toDomain(rawUrl: string): string {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase().replace(/\.$/, "");
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}

/**
 * Canonical identity for a result across engines and scans.
 *
 * Drops the scheme's variability, tracking params, fragments, trailing slashes
 * and AMP suffixes so the same article seen on Google and Bing collapses to one
 * row. Unparseable input is returned trimmed rather than thrown away, so a bad
 * URL still tracks as its own stable key instead of silently merging with others.
 */
export function normalizeUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl.trim();
  }

  parsed.protocol = "https:";
  parsed.hash = "";
  parsed.hostname = toDomain(rawUrl) || parsed.hostname;

  for (const param of [...parsed.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(param.toLowerCase())) parsed.searchParams.delete(param);
  }
  parsed.searchParams.sort();

  let path = parsed.pathname.replace(/\/amp\/?$/i, "/").replace(/\.amp$/i, "");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  parsed.pathname = path === "" ? "/" : path;

  const query = parsed.searchParams.toString();
  return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}${query ? `?${query}` : ""}`;
}
