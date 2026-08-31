import { collapseToClusters } from "./cluster.js";
import type { ClassifiedResult, ScanSummary } from "./types.js";

function pct(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return Math.round((part / whole) * 100) + "%";
}

/**
 * Share of first-page attention held by each sentiment class.
 *
 * This is the number that actually tracks progress: suppression works by owned
 * and neutral pages accumulating weight, not by anything being taken down.
 */
export function shareOfVoice(results: readonly ClassifiedResult[]): {
  negative: number;
  neutral: number;
  positive: number;
  total: number;
} {
  // Collapse duplicate surfaces first. One article reachable at two URLs is one
  // article: counting both would inflate its share and make a later
  // consolidation look like progress when visibility has not changed.
  const firstPage = collapseToClusters(results).filter(
    (r) => r.position <= 10 && r.sentiment !== "unrelated",
  );
  const sum = (s: ClassifiedResult["sentiment"]): number =>
    firstPage.filter((r) => r.sentiment === s).reduce((acc, r) => acc + r.serpWeight, 0);

  const negative = sum("negative");
  const neutral = sum("neutral");
  const positive = sum("positive");
  return { negative, neutral, positive, total: negative + neutral + positive };
}

/** Render the control report as Markdown. */
export function renderReport(
  summary: ScanSummary,
  results: readonly ClassifiedResult[],
): string {
  const sov = shareOfVoice(results);
  const lines: string[] = [];

  lines.push("# Search visibility report");
  lines.push("");
  lines.push("Scan `" + summary.scanId + "` — " + summary.finishedAt);
  lines.push("");
  lines.push(
    "Queries run: " +
      summary.queriesRun +
      " (failed: " +
      summary.queriesFailed +
      ") · Results: " +
      summary.resultsSeen +
      " · New URLs: " +
      summary.newUrls.length,
  );
  lines.push("");

  lines.push("## First-page share of voice");
  lines.push("");
  lines.push("| Class | Weight | Share |");
  lines.push("| --- | ---: | ---: |");
  lines.push("| Negative | " + sov.negative + " | " + pct(sov.negative, sov.total) + " |");
  lines.push("| Neutral | " + sov.neutral + " | " + pct(sov.neutral, sov.total) + " |");
  lines.push("| Positive | " + sov.positive + " | " + pct(sov.positive, sov.total) + " |");
  lines.push("");

  const ranked = [...results]
    .filter((r) => r.sentiment !== "unrelated")
    .sort((a, b) => b.serpWeight - a.serpWeight)
    .slice(0, 20);

  lines.push("## Top results by SERP weight");
  lines.push("");
  lines.push("| # | Engine | Rank | Sentiment | Control | Domain | Title |");
  lines.push("| ---: | --- | ---: | --- | --- | --- | --- |");
  ranked.forEach((r, i) => {
    lines.push(
      "| " + (i + 1) + " | " + r.engine + " | " + r.position + " | " + r.sentiment +
        " | " + r.control + " | " + r.domain + " | " + r.title.replace(/\|/g, "\\|") + " |",
    );
  });
  lines.push("");

  lines.push("## Alerts");
  lines.push("");
  if (summary.alerts.length === 0) {
    lines.push("None.");
  } else {
    for (const alert of summary.alerts) {
      lines.push("- **" + alert.kind + "** — " + alert.normalizedUrl + " — " + alert.detail);
    }
  }
  lines.push("");

  return lines.join("\n");
}
