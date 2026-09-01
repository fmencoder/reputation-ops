/**
 * WordPress.com REST client.
 *
 * WHY THIS EXISTS
 * The MCP connector is an interactive, per-chat capability: it was authenticated
 * at the account level and still unavailable in three consecutive sessions
 * because it was toggled off for the chat. Production deployment cannot depend
 * on that. This client talks to the official public API with a bearer token
 * held in CI secrets, so a deploy succeeds or fails on its own merits rather
 * than on whether a particular conversation had a connector enabled.
 *
 * MCP remains useful as an interactive administrative path. It is no longer the
 * only path.
 *
 * API SURFACE
 * WordPress.com proxies the standard wp/v2 REST API at
 * `https://public-api.wordpress.com/wp/v2/sites/{site}/…`, which is what this
 * uses for pages, posts and media. A few WordPress.com-specific things (site
 * metadata, Custom CSS) live only under `/rest/v1.1/sites/{site}/…`.
 *
 * SECRETS
 * The token is read from the environment by the caller and passed in. It is
 * never logged, never included in an error message, and never written to any
 * artifact. `redact()` below is applied to every error body.
 */

import { normalizeToken } from "./token.js";

export interface WpClientOptions {
  /** Site ID or domain, e.g. "novraintelligence.com". */
  readonly site: string;
  /** OAuth2 bearer token. Never logged. */
  readonly token: string;
  /** Injected for tests; defaults to global fetch. */
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
}

/**
 * Diagnostics for the token this client holds. Length and a truncated digest —
 * never a prefix, a suffix, or any token material.
 */
export interface TokenIdentity {
  readonly length: number;
  readonly fingerprint: string;
  readonly normalizationApplied: boolean;
}

export class WpError extends Error {
  constructor(
    override readonly message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = "WpError";
  }
}

export interface WpMedia {
  readonly id: number;
  readonly source_url: string;
  readonly media_details?: { width?: number; height?: number; filesize?: number };
  readonly mime_type?: string;
  readonly slug?: string;
}

export interface WpPage {
  readonly id: number;
  readonly slug: string;
  readonly status: string;
  readonly link?: string;
  readonly title?: { raw?: string; rendered?: string };
  readonly content?: { raw?: string; rendered?: string };
  readonly modified_gmt?: string;
}

export interface WpSite {
  readonly ID: number;
  readonly name: string;
  readonly URL: string;
  readonly is_private?: boolean;
  readonly is_coming_soon?: boolean;
  readonly launch_status?: string;
}

/**
 * Strip anything token-shaped from text before it reaches a log or an artifact.
 * Defence in depth: the token is never deliberately included, and this makes an
 * accidental inclusion non-fatal.
 */
export function redact(text: string, token?: string): string {
  let out = text;
  if (token && token.length > 6) out = out.split(token).join("[REDACTED]");
  return out
    .replace(/Bearer\s+[A-Za-z0-9._%|-]+/gi, "Bearer [REDACTED]")
    .replace(/"access_token"\s*:\s*"[^"]*"/gi, '"access_token":"[REDACTED]"');
}

export class WpClient {
  private readonly site: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  readonly tokenIdentity: TokenIdentity;

  constructor(options: WpClientOptions) {
    if (!options.site) throw new Error("WpClient requires a site identifier");
    if (!options.token) throw new Error("WpClient requires an access token");
    this.site = options.site;

    // Normalised once, here, so every request in this client sends the same
    // bytes and there is no path that reaches WordPress with a raw value.
    // A token that arrived with a clipboard artifact is repaired; one that
    // arrived malformed throws rather than being sent and blamed on WordPress.
    const normalized = normalizeToken(options.token);
    this.token = normalized.token;
    this.tokenIdentity = {
      length: normalized.length,
      fingerprint: normalized.fingerprint,
      normalizationApplied: normalized.normalizationApplied,
    };
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.baseUrl = options.baseUrl ?? "https://public-api.wordpress.com";
  }

  private v2(path: string): string {
    return `${this.baseUrl}/wp/v2/sites/${encodeURIComponent(this.site)}${path}`;
  }

  private v1(path: string): string {
    return `${this.baseUrl}/rest/v1.1/sites/${encodeURIComponent(this.site)}${path}`;
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.token}`);
    headers.set("Accept", "application/json");

    const response = await this.fetchImpl(url, { ...init, headers });
    const text = await response.text();

    if (!response.ok) {
      const endpoint = url.replace(this.baseUrl, "");
      throw new WpError(
        `${response.status} ${response.statusText}: ${redact(text.slice(0, 400), this.token)}`,
        response.status,
        endpoint,
      );
    }

    if (text.trim() === "") return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new WpError(
        `Response was not JSON: ${redact(text.slice(0, 200), this.token)}`,
        response.status,
        url.replace(this.baseUrl, ""),
      );
    }
  }

  /** Confirms the token works and identifies which site it points at. */
  async getSite(): Promise<WpSite> {
    return this.request<WpSite>(this.v1(""));
  }

  async listMedia(perPage = 100): Promise<readonly WpMedia[]> {
    return this.request<WpMedia[]>(this.v2(`/media?per_page=${perPage}&_fields=id,source_url,slug,mime_type,media_details`));
  }

  /**
   * Upload a file. Uses multipart via the platform FormData/Blob, so there is
   * no form-encoding dependency to keep current.
   */
  async uploadMedia(filename: string, mimeType: string, bytes: Uint8Array): Promise<WpMedia> {
    const form = new FormData();
    // Copy into a fresh ArrayBuffer: a Uint8Array view over a pooled Node Buffer
    // would otherwise hand Blob the whole pool.
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    form.append("file", new Blob([copy.buffer], { type: mimeType }), filename);
    return this.request<WpMedia>(this.v2("/media"), { method: "POST", body: form });
  }

  async listPages(perPage = 100): Promise<readonly WpPage[]> {
    return this.request<WpPage[]>(
      this.v2(`/pages?per_page=${perPage}&status=any&context=edit&_fields=id,slug,status,link,title,modified_gmt`),
    );
  }

  async listPosts(perPage = 100): Promise<readonly WpPage[]> {
    return this.request<WpPage[]>(
      this.v2(`/posts?per_page=${perPage}&status=any&context=edit&_fields=id,slug,status,link,title,modified_gmt`),
    );
  }

  /** `context=edit` returns the stored markup, which is what a read-back must diff. */
  async getPage(id: number): Promise<WpPage> {
    return this.request<WpPage>(this.v2(`/pages/${id}?context=edit`));
  }

  async getPost(id: number): Promise<WpPage> {
    return this.request<WpPage>(this.v2(`/posts/${id}?context=edit`));
  }

  async updatePage(id: number, body: Record<string, unknown>): Promise<WpPage> {
    return this.request<WpPage>(this.v2(`/pages/${id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async updatePost(id: number, body: Record<string, unknown>): Promise<WpPage> {
    return this.request<WpPage>(this.v2(`/posts/${id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async createPage(body: Record<string, unknown>): Promise<WpPage> {
    return this.request<WpPage>(this.v2("/pages"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /** Always created as a draft by the deployer; publication is a separate, human step. */
  async createPost(body: Record<string, unknown>): Promise<WpPage> {
    return this.request<WpPage>(this.v2("/posts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /**
   * Custom CSS.
   *
   * UNVERIFIED against this site. WordPress.com exposes Custom CSS under
   * /rest/v1.1/sites/{site}/customcss, but availability depends on plan and on
   * whether the feature is active. The deployer therefore *probes* it and falls
   * back to the human install gate rather than assuming either outcome — see
   * cssStrategy() in deploy.ts.
   */
  async getCustomCss(): Promise<{ css?: string } | undefined> {
    return this.request<{ css?: string }>(this.v1("/customcss"));
  }

  async setCustomCss(css: string): Promise<{ css?: string }> {
    return this.request<{ css?: string }>(this.v1("/customcss"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ css }),
    });
  }
}

/** Every method on WpClient that mutates the site. */
export const WRITE_METHODS = [
  "uploadMedia", "updatePage", "updatePost", "createPage", "createPost", "setCustomCss",
] as const;

export class ReadOnlyViolationError extends Error {
  constructor(readonly method: string) {
    super(
      `${method} was called on a read-only client. The auth check authenticates, ` +
      "probes and plans; it does not write. This is enforced here rather than " +
      "promised in a comment, because a connectivity check that can write is a " +
      "deployment with no gates in front of it.",
    );
    this.name = "ReadOnlyViolationError";
  }
}

/**
 * Wrap a client so every write throws.
 *
 * The auth-check path runs without the full content-validation gate — that is
 * the whole point of it — so "it performs no writes" cannot rest on the code
 * happening not to call one. The capability is removed, not merely unused.
 */
export function readOnly(client: WpClient): WpClient {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (typeof property === "string" && (WRITE_METHODS as readonly string[]).includes(property)) {
        return () => {
          throw new ReadOnlyViolationError(property);
        };
      }
      const value = Reflect.get(target, property, receiver) as unknown;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
