import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface CacheEnvelope<T> {
  readonly storedAt: number;
  readonly value: T;
}

/**
 * Small on-disk response cache.
 *
 * SerpApi bills per search, and a monitoring scan re-runs the same query set on
 * a schedule. Caching by query keeps repeated or retried runs from spending
 * credits on identical requests within the TTL.
 */
export class FileCache {
  constructor(
    private readonly dir: string,
    private readonly ttlSeconds: number,
    private readonly now: () => number = Date.now,
  ) {}

  private pathFor(key: string): string {
    const digest = createHash("sha256").update(key).digest("hex").slice(0, 32);
    return join(this.dir, digest + ".json");
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (this.ttlSeconds <= 0) return undefined;
    try {
      const raw = await readFile(this.pathFor(key), "utf8");
      const envelope = JSON.parse(raw) as CacheEnvelope<T>;
      const ageSeconds = (this.now() - envelope.storedAt) / 1000;
      return ageSeconds <= this.ttlSeconds ? envelope.value : undefined;
    } catch {
      // A missing or corrupt entry is a cache miss, never a scan failure.
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.ttlSeconds <= 0) return;
    const envelope: CacheEnvelope<T> = { storedAt: this.now(), value };
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.pathFor(key), JSON.stringify(envelope), "utf8");
  }
}
