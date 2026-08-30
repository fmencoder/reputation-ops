import type { Engine, RawResult, SearchQuery } from "../core/types.js";
import type { FileCache } from "./cache.js";

const ENGINE_PARAM: Record<Engine, string> = {
  google: "google",
  bing: "bing",
  duckduckgo: "duckduckgo",
};

export interface SerpApiOptions {
  readonly apiKey: string;
  readonly cache: FileCache;
  /** Requests per minute ceiling, enforced client-side. */
  readonly rateLimitRpm: number;
  readonly maxRetries?: number;
  readonly fetchImpl?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
}

export class SerpApiError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "SerpApiError";
  }
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface SerpApiPayload {
  organic_results?: {
    position?: number;
    title?: string;
    link?: string;
    snippet?: string;
    displayed_link?: string;
    date?: string;
  }[];
  error?: string;
}

/**
 * SerpApi client with client-side rate limiting, bounded retries and caching.
 *
 * Retries only transient conditions (429 and 5xx). An invalid key or a malformed
 * query is surfaced immediately — retrying those just burns the rate budget and
 * delays a clear error the operator needs to see.
 */
export class SerpApiClient {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxRetries: number;
  private readonly minIntervalMs: number;
  private nextSlotAt = 0;

  constructor(private readonly options: SerpApiOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.maxRetries = options.maxRetries ?? 3;
    this.minIntervalMs = options.rateLimitRpm > 0 ? 60_000 / options.rateLimitRpm : 0;
  }

  private async throttle(): Promise<void> {
    if (this.minIntervalMs <= 0) return;
    const now = Date.now();
    const waitMs = this.nextSlotAt - now;
    if (waitMs > 0) await this.sleep(waitMs);
    this.nextSlotAt = Math.max(now, this.nextSlotAt) + this.minIntervalMs;
  }

  async search(query: SearchQuery): Promise<readonly RawResult[]> {
    const cached = await this.options.cache.get<RawResult[]>(query.id);
    if (cached) return cached;

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", ENGINE_PARAM[query.engine]);
    url.searchParams.set("q", query.q);
    url.searchParams.set("api_key", this.options.apiKey);

    let lastError: SerpApiError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      await this.throttle();
      try {
        const response = await this.fetchImpl(url, { method: "GET" });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          throw new SerpApiError(
            "SerpApi returned HTTP " + response.status,
            response.status,
            retryable,
          );
        }

        const payload = (await response.json()) as SerpApiPayload;
        if (payload.error) {
          throw new SerpApiError("SerpApi error: " + payload.error, response.status, false);
        }

        const results = (payload.organic_results ?? []).map((r, index) => ({
          position: r.position ?? index + 1,
          title: r.title ?? "",
          url: r.link ?? "",
          snippet: r.snippet ?? "",
          ...(r.displayed_link === undefined ? {} : { displayedDomain: r.displayed_link }),
          ...(r.date === undefined ? {} : { publishedDate: r.date }),
        })) satisfies RawResult[];

        await this.options.cache.set(query.id, results);
        return results;
      } catch (error) {
        const serpError =
          error instanceof SerpApiError
            ? error
            : new SerpApiError("Network failure: " + String(error), undefined, true);

        lastError = serpError;
        if (!serpError.retryable || attempt === this.maxRetries) throw serpError;
        await this.sleep(2 ** attempt * 1000);
      }
    }

    throw lastError ?? new SerpApiError("Unreachable retry state", undefined, false);
  }
}
