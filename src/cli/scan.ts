import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FileCache } from "../adapters/cache.js";
import { SerpApiClient } from "../adapters/serpapi.js";
import { buildQuerySet } from "../core/queries.js";
import { renderReport } from "../core/report.js";
import { runScan } from "../core/scan.js";
import type { RankObservation } from "../core/types.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      "Missing required environment variable " + name + ". See .env.example.",
    );
    process.exit(2);
  }
  return value;
}

function optionalList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const STATE_DIR = ".cache";
const STATE_FILE = join(STATE_DIR, "last-scan.json");

async function loadPrevious(): Promise<RankObservation[]> {
  try {
    return JSON.parse(await readFile(STATE_FILE, "utf8")) as RankObservation[];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const apiKey = required("SERPAPI_API_KEY");
  const subjectName = process.env.SUBJECT_NAME?.trim() || "Fredrick Mendez";

  const client = new SerpApiClient({
    apiKey,
    cache: new FileCache(join(STATE_DIR, "serpapi"), Number(process.env.CACHE_TTL_SECONDS ?? 21600)),
    rateLimitRpm: Number(process.env.RATE_LIMIT_RPM ?? 20),
  });

  const { summary, results } = await runScan({
    client,
    queries: buildQuerySet({ subjectName, locales: optionalList("SUBJECT_LOCALES") }),
    classifyOptions: { subjectName, ownedDomains: optionalList("OWNED_DOMAINS") },
    previous: await loadPrevious(),
    log: (event) => console.log(JSON.stringify(event)),
  });

  await mkdir(STATE_DIR, { recursive: true });
  const observations: RankObservation[] = results.map((r) => ({
    normalizedUrl: r.normalizedUrl,
    queryId: r.queryId,
    engine: r.engine,
    position: r.position,
    observedAt: r.observedAt,
  }));
  await writeFile(STATE_FILE, JSON.stringify(observations, null, 2), "utf8");

  await mkdir("reports", { recursive: true });
  const reportPath = join("reports", summary.scanId.replace(/[:.]/g, "-") + ".md");
  await writeFile(reportPath, renderReport(summary, results), "utf8");
  console.log(JSON.stringify({ event: "report_written", path: reportPath }));

  if (summary.queriesRun === 0) {
    console.error("Every query failed — check SERPAPI_API_KEY and network egress.");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
