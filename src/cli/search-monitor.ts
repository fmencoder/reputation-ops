/**
 * Search observation capture.
 *
 * Usage:
 *   npm run search:t0        capture the pre-launch baseline (once, ever)
 *   npm run search:monitor   capture an ordinary snapshot and score it
 *
 * Requires SERPAPI_API_KEY. The key is read from the environment, never
 * committed, and never printed.
 *
 * This observes. It does not act on what it observes: no pages are generated in
 * response to a ranking, nothing is submitted to a search engine, and no
 * removal request is filed. Measurement that changes its own subject is not
 * measurement.
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { FileCache } from "../adapters/cache.js";
import { SerpApiClient } from "../adapters/serpapi.js";
import type { Engine, RawResult } from "../core/types.js";
import {
  assertT0Writable, classifyObservation, isBaselineEligible, novraQuerySet,
  type IdentityContext, type Observation, type Snapshot,
} from "../novra/search/observations.js";
import { computeScoreboard, compareToT0, renderScoreboard, type Scoreboard } from "../novra/search/scoreboard.js";

const ROOT = process.cwd();
const DATA = join(ROOT, "data", "search");
const T0_PATH = join(DATA, "T0.json");
const SNAPSHOTS = join(DATA, "snapshots");

const ENGINES: readonly Engine[] = ["google", "bing"];

/**
 * Identity context.
 *
 * `establishedUrls` lists pages already known to concern the subject — the ones
 * this project has corresponded with. They are enumerated rather than matched
 * by keyword, because keyword matching is precisely how a same-name stranger
 * gets swept into the count.
 */
const IDENTITY: IdentityContext = {
  subjectName: "Fredrick Mendez",
  ownedDomains: ["novraintelligence.com"],
  establishedUrls: [
    "https://www.morelaw.com/verdicts/case/CO/188850/",
    "https://hoodline.com/2025/01/boca-raton-man-sentenced-to-over-3-years-for-fraudulently-obtaining-covid-19-relief-funds/",
    "https://news.bloomberglaw.com/us-law-week/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds",
    "https://news.bloomberglaw.com/white-collar-and-criminal-law/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds",
    "https://www.justice.gov/usao-co/pr/florida-man-sentenced-41-months-stealing-covid-19-relief-funds",
  ],
  corroborators: ["NOVRA", "novraintelligence"],
};

const SCOREBOARD_OPTIONS = {
  ownedDomains: IDENTITY.ownedDomains,
  articlePathPrefix: "/insights/",
  aboutPath: "/about",
};

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function capture(client: SerpApiClient): Promise<Snapshot> {
  const observations: Observation[] = [];
  const failures: { query: string; engine: string; reason: string }[] = [];
  const queries = novraQuerySet(IDENTITY.subjectName);

  for (const engine of ENGINES) {
    for (const q of queries) {
      try {
        const results: readonly RawResult[] = await client.search({
          id: `${engine}:${q}`, q, engine,
          rationale: "NOVRA suppression baseline query set",
        });
        for (const result of results) {
          observations.push(
            classifyObservation(
              {
                engine, query: q, position: result.position,
                title: result.title, url: result.url, snippet: result.snippet,
              },
              IDENTITY,
            ),
          );
        }
      } catch (error) {
        failures.push({ query: q, engine, reason: (error as Error).message });
      }
    }
  }

  const capturedAt = new Date().toISOString();
  return {
    id: capturedAt.replace(/[:.]/g, "-"),
    capturedAt,
    isT0: false,
    queries: [...queries],
    observations,
    failures,
  };
}

async function main(): Promise<void> {
  const captureT0 = process.argv.includes("--capture-t0");
  const apiKey = process.env["SERPAPI_API_KEY"];

  await mkdir(SNAPSHOTS, { recursive: true });
  const existingT0 = await readJson<Snapshot>(T0_PATH);

  if (captureT0) {
    // Refuse before spending a single credit. Regenerating T0 is not a
    // recoverable mistake: the baseline is defined as the state before any
    // intervention, and that moment does not come back.
    try {
      assertT0Writable(existingT0);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(3);
    }
  }

  if (!apiKey) {
    console.error(
      "SERPAPI_API_KEY is not set. No search was performed.\n" +
      `T0_CAPTURED=${existingT0 ? "YES" : "NO"}`,
    );
    process.exit(2);
  }

  const client = new SerpApiClient({
    apiKey,
    cache: new FileCache(join(ROOT, ".cache", "serpapi"), 60 * 60),
    rateLimitRpm: 20,
  });

  const snapshot = await capture(client);

  if (captureT0) {
    const eligibility = isBaselineEligible(snapshot);
    if (!eligibility.eligible) {
      console.error(`Refusing to write T0: ${eligibility.reason}`);
      await writeFile(join(SNAPSHOTS, `${snapshot.id}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      process.exit(4);
    }
    await writeFile(T0_PATH, `${JSON.stringify({ ...snapshot, isT0: true }, null, 2)}\n`, "utf8");
    console.log(`T0 captured at ${snapshot.capturedAt} — ${snapshot.observations.length} observations. This file is now immutable.`);
  }

  await writeFile(join(SNAPSHOTS, `${snapshot.id}.json`), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  const current = computeScoreboard(snapshot, SCOREBOARD_OPTIONS);
  const baseline = await readJson<Snapshot>(T0_PATH);
  let t0Board: Scoreboard | null = null;
  if (baseline) t0Board = computeScoreboard(baseline, SCOREBOARD_OPTIONS);

  const rendered = renderScoreboard(current, t0Board ? compareToT0(t0Board, current) : null);
  console.log(rendered);
  await writeFile(join(DATA, "scoreboard.txt"), `${rendered}\n`, "utf8");

  const snapshotCount = (await readdir(SNAPSHOTS)).length;
  console.log(`\nSNAPSHOTS_ON_RECORD=${snapshotCount}`);
  if (snapshot.failures.length > 0) {
    console.log(`QUERIES_FAILED=${snapshot.failures.length} — this snapshot is partial`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
