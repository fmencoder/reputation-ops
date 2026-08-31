/**
 * Publisher source watch.
 *
 * Usage: npm run source:watch
 *
 * Fetches each watched page, records what changed, and flags nothing else.
 * Specifically it does not: file a search-engine removal or outdated-content
 * report, send a follow-up email, or assert a legal ground. Every one of those
 * is a representation made by a person about facts they are accountable for,
 * and automation preparing the evidence is not the same as automation making
 * the claim.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  evaluateCheck, followUpDue, refreshReadiness,
  SOURCE_TARGETS, type FetchOutcome, type SourceCheck,
} from "../novra/source-watch.js";

const ROOT = process.cwd();
const DATA = join(ROOT, "data", "source-watch");
const LEDGER = join(DATA, "checks.json");
const SUBJECT = "Fredrick Mendez";

const hash = (input: string): string => createHash("sha256").update(input, "utf8").digest("hex");

/**
 * Fetch a watched page.
 *
 * Identifies itself honestly. A watch that disguises itself as a browser to
 * evade a publisher's access controls is a different activity from checking
 * whether a public page has changed, and this is the second one.
 */
async function fetchPage(url: string): Promise<FetchOutcome> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "NOVRA-source-watch/1.0 (change monitoring for a correction request; contact via novraintelligence.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      return { status: response.status, finalUrl: response.url, body: null };
    }
    return { status: response.status, finalUrl: response.url, body: await response.text() };
  } catch (error) {
    return { status: null, finalUrl: null, body: null, error: (error as Error).message };
  }
}

async function main(): Promise<void> {
  await mkdir(DATA, { recursive: true });

  let previous: Record<string, SourceCheck> = {};
  try {
    previous = JSON.parse(await readFile(LEDGER, "utf8")) as Record<string, SourceCheck>;
  } catch {
    previous = {};
  }

  const checks: SourceCheck[] = [];
  const today = new Date();

  for (const target of SOURCE_TARGETS) {
    for (const url of target.urls) {
      const outcome = await fetchPage(url);
      const check = evaluateCheck(target.id, url, outcome, {
        subjectName: SUBJECT,
        hash,
        previous: previous[url],
        now: () => today,
      });
      checks.push(check);

      const readiness = refreshReadiness(check);
      console.log(
        `${target.publisher.padEnd(14)} ${check.change.padEnd(22)} ` +
        `http=${check.httpStatus ?? "-"} name_occurrences=${check.subjectNameOccurrences} ` +
        `refresh_eligible=${readiness.eligible}`,
      );
      if (check.change !== "UNCHANGED") console.log(`  ${check.detail}`);
    }

    const followUp = followUpDue(target, today, false);
    if (followUp.due) {
      console.log(
        `  FOLLOWUP_DUE=YES for ${target.publisher} — ${followUp.reason}. ` +
        "Nothing has been sent. One substantive follow-up only, and only with explicit send authorization.",
      );
    }
  }

  const ledger: Record<string, SourceCheck> = { ...previous };
  for (const check of checks) ledger[check.url] = check;
  await writeFile(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

  const eligible = checks.filter((c) => refreshReadiness(c).eligible);
  console.log(`\nSOURCE_CHANGES_VERIFIED=${eligible.length}`);
  console.log(
    eligible.length > 0
      ? "GOOGLE_OUTDATED_CONTENT_ELIGIBLE=YES — evidence prepared; submission is a human action"
      : "GOOGLE_OUTDATED_CONTENT_ELIGIBLE=NO — no live page has changed",
  );
  console.log("AUTOMATED_SUBMISSIONS=NONE (by design)");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
