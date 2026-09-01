/**
 * Bootstrap runtime regression test.
 *
 * WHY THIS EXISTS
 * The bootstrap crashed in production with FUNCTION_INVOCATION_FAILED while
 * every unit test passed and the typecheck was clean. Nothing was wrong with
 * the logic: the handler was compiled to ES modules with extensionless relative
 * imports, which a bundler resolves and Node's ESM resolver does not. The whole
 * defect lived in the gap between "compiles" and "loads", and no test in the
 * suite was looking at that gap.
 *
 * So this one compiles the API entrypoints the way the platform does — one file
 * at a time, imports left as written, no bundling — and then loads and invokes
 * the output. Bundling would hide the bug, because bundling is precisely what
 * the local build does and the runtime does not.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = process.cwd();
const BOOTSTRAP = join(ROOT, "oauth-bootstrap");

let outDir: string;

interface CapturedResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: string;
  setHeader(name: string, value: string | string[]): void;
  end(body?: string): void;
}

function capture(): CapturedResponse {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name] = value; },
    end(body) { this.body = body ?? ""; },
  };
}

const ENV = {
  NOVRA_WP_CLIENT_ID: "147112",
  NOVRA_WP_CLIENT_SECRET: "fake-client-secret-for-this-test-only",
  NOVRA_WP_OAUTH_REDIRECT_URI: "https://novra-oauth-bootstrap.vercel.app/api/wordpress/oauth/callback",
  NOVRA_WP_SITE: "novraintelligence.com",
} as unknown as NodeJS.ProcessEnv;

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "novra-runtime-"));

  // Per-file transpile with the module format the bootstrap's own tsconfig
  // pins. `--bundle` is deliberately absent: bundling rewrites the specifiers
  // and would make a resolution failure impossible to observe.
  execFileSync(
    "npx",
    [
      "esbuild",
      "api/wordpress/oauth/start.ts",
      "api/wordpress/oauth/callback.ts",
      "lib/handlers.ts", "lib/config.ts", "lib/http.ts",
      "lib/oauth.ts", "lib/state.ts", "lib/token.ts",
      "--platform=node", "--target=node20", "--format=cjs",
      `--outdir=${outDir}`, "--outbase=.",
    ],
    { cwd: BOOTSTRAP, stdio: "pipe" },
  );

  // Matches oauth-bootstrap/package.json. If that pin is ever removed, Node
  // reinterprets these files and this test starts failing — which is the point.
  writeFileSync(join(outDir, "package.json"), '{"type":"commonjs"}\n');
});

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (request: unknown, response: CapturedResponse) => unknown;

function load(entry: "start" | "callback"): Handler {
  const path = join(outDir, "api", "wordpress", "oauth", `${entry}.js`);
  // A require() here is the whole assertion: it exercises Node's real module
  // resolver against the emitted specifiers.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaded = require(path) as { default?: Handler };
  const handler = loaded.default ?? (loaded as unknown as Handler);
  expect(typeof handler).toBe("function");
  return handler;
}

describe("the emitted entrypoints load under Node", () => {
  it("resolves start.ts and its transitive imports", () => {
    expect(() => load("start")).not.toThrow();
  });

  it("resolves callback.ts and its transitive imports", () => {
    expect(() => load("callback")).not.toThrow();
  });
});

describe("/api/wordpress/oauth/start", () => {
  const request = { method: "GET", url: "/api/wordpress/oauth/start", headers: {} };

  it("redirects to WordPress when configured", () => {
    const previous = { ...process.env };
    Object.assign(process.env, ENV);
    try {
      const response = capture();
      load("start")(request, response);

      expect(response.statusCode).toBe(302);
      const location = String(response.headers["Location"]);
      expect(location).toMatch(/^https:\/\/public-api\.wordpress\.com\/oauth2\/authorize\?/);

      // The security properties this fix must not have cost.
      const url = new URL(location);
      expect(url.searchParams.get("scope")).toBeNull();
      expect(url.searchParams.get("blog")).toBe("novraintelligence.com");
      expect(url.searchParams.get("state")).toBeTruthy();
      expect(String(response.headers["Set-Cookie"])).toContain("HttpOnly");
      expect(String(response.headers["Set-Cookie"])).toContain("SameSite=Lax");
      expect(String(response.headers["Cache-Control"])).toContain("no-store");
      expect(response.headers["Referrer-Policy"]).toBe("no-referrer");
      expect(String(response.headers["X-Robots-Tag"])).toContain("noindex");

      // Nothing credential-shaped may appear in a redirect.
      expect(location).not.toContain(String(ENV["NOVRA_WP_CLIENT_SECRET"]));
    } finally {
      process.env = previous;
    }
  });

  it("returns the controlled Not-configured page rather than crashing", () => {
    const previous = { ...process.env };
    for (const key of Object.keys(ENV)) delete process.env[key];
    try {
      const response = capture();
      load("start")(request, response);

      // A 500 here is the service reporting its own missing configuration.
      // FUNCTION_INVOCATION_FAILED is the platform reporting a crash. They look
      // alike from a browser and are completely different things.
      expect(response.statusCode).toBe(500);
      expect(response.body).toContain("Not configured");
      for (const key of Object.keys(ENV)) expect(response.body).toContain(key);
    } finally {
      process.env = previous;
    }
  });
});

describe("/api/wordpress/oauth/callback", () => {
  it("rejects a callback with no state without crashing", async () => {
    const previous = { ...process.env };
    Object.assign(process.env, ENV);
    try {
      const response = capture();
      await load("callback")({ method: "GET", url: "/api/wordpress/oauth/callback?code=x", headers: {} }, response);
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain("State verification failed");
    } finally {
      process.env = previous;
    }
  });
});
