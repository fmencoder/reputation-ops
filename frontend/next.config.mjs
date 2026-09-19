/**
 * Media Library host. Declared once: next/image needs it as a remote pattern,
 * and the CSP needs it in img-src, and the two drifting apart is how a CSP
 * silently starts blocking the images the loader is still willing to fetch.
 *
 * It is only reachable when NEXT_PUBLIC_MEDIA_ORIGIN is set. It is not set in
 * the repository and is not set on the Vercel project, so today every image is
 * served from the frontend's own origin — but the code path exists, and a CSP
 * that omits the host would break the moment somebody sets the variable.
 */
const MEDIA_HOST = "https://novraintelligence.wordpress.com";

/**
 * Content-Security-Policy, built from what the application actually loads.
 *
 * Measured rather than assumed: a Chromium run over all nine routes plus a 404
 * requested exactly two origins — self and fonts.googleapis.com — used zero
 * <style> elements, and carried no inline event-handler attributes.
 *
 * Two directives are looser than the rest, and both are load-bearing:
 *
 * 'unsafe-inline' in script-src — the App Router ships its RSC payload as
 * inline `self.__next_f.push(...)` blocks, about two per page, whose content
 * changes every build. The alternatives are worse: a nonce requires reading
 * headers() in the request path, which opts every route out of static
 * generation and turns 17 prerendered pages into server renders; hashes would
 * have to be recomputed and rewritten into this file on every build. The
 * residual risk is bounded by there being no user input, no query-parameter
 * reflection, no authentication and no third-party script on this site — and
 * by base-uri, object-src, frame-ancestors and form-action below, which close
 * the usual escalation routes even if an injection existed.
 *
 * 'unsafe-inline' in style-src — next/image writes style="color:transparent"
 * onto every image it renders (12 per page on the homepage). Style attributes
 * cannot be covered by a nonce or a hash, so the only way to drop this is to
 * stop using next/image.
 *
 * Everything else is closed. Note there is no 'unsafe-eval': the production
 * bundle does not need it, and it is the directive that turns an injection
 * into arbitrary execution.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  // No form exists on this site; contact is a mailto: link, which is a
  // navigation rather than a submission. Revisit this if a form is added.
  "form-action 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Google Fonts serves the stylesheet from googleapis and the font files from
  // gstatic. gstatic is not observable from the build sandbox because egress to
  // it is blocked, so the stylesheet never resolves here and never requests a
  // font — it is included on the documented behaviour of the service, and is
  // the one entry in this policy not confirmed by a local request.
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' ${MEDIA_HOST}`,
  // Client-side route changes fetch RSC payloads from this origin. The
  // WordPress REST API is read at build time on the server, never the browser,
  // so it does not belong here.
  "connect-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  /*
   * One year, no includeSubDomains, no preload — both deliberate.
   *
   * includeSubDomains would assert that every current and future host under
   * novraintelligence.com is HTTPS-only. That cannot be verified from here:
   * egress to the domain is blocked by policy, so no subdomain was enumerated
   * or tested. Asserting it blind would break any plain-HTTP subdomain with no
   * way for a visitor to click through.
   *
   * preload is a one-way door — removal from the browser-baked list takes
   * months — and it implies includeSubDomains anyway.
   */
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Legacy companion to frame-ancestors, for browsers that predate CSP3.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    // Everything this site does not use, denied outright. It uses none of them.
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "usb=()",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress serves every public URL with a trailing slash. The migration is
  // only safe if the new frontend answers on exactly the same paths, so this
  // is not a style preference — it is URL parity.
  trailingSlash: true,
  reactStrictMode: true,
  // The framework's own version banner tells an attacker which advisories to
  // try. It buys nothing in return.
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Only used when NEXT_PUBLIC_MEDIA_ORIGIN points at the Media Library.
    remotePatterns: [
      { protocol: "https", hostname: "novraintelligence.wordpress.com", pathname: "/wp-content/uploads/**" },
    ],
  },
  eslint: { dirs: ["app", "components", "lib"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
