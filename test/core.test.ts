import { describe, expect, it, vi } from "vitest";
import { FileCache } from "../src/adapters/cache.js";
import { SerpApiClient, SerpApiError } from "../src/adapters/serpapi.js";
import { classify, serpWeight } from "../src/core/classify.js";
import { computeDeltas, deriveAlerts } from "../src/core/diff.js";
import { buildQuerySet } from "../src/core/queries.js";
import { shareOfVoice } from "../src/core/report.js";
import { runScan } from "../src/core/scan.js";
import type { ClassifiedResult, RankObservation, SearchQuery } from "../src/core/types.js";
import { normalizeUrl, toDomain } from "../src/core/url.js";

const OPTS = { subjectName: "Fredrick Mendez", ownedDomains: ["example.com"] };

describe("normalizeUrl", () => {
  it("collapses tracking params, fragments, www and trailing slashes", () => {
    expect(normalizeUrl("http://www.Example.com/a/?utm_source=x&b=2#frag")).toBe(
      "https://example.com/a?b=2",
    );
  });

  it("treats the AMP variant as the same page", () => {
    expect(normalizeUrl("https://news.site/story/amp/")).toBe(normalizeUrl("https://news.site/story"));
  });

  it("orders query params so param order does not fork identity", () => {
    expect(normalizeUrl("https://s.com/p?b=2&a=1")).toBe(normalizeUrl("https://s.com/p?a=1&b=2"));
  });

  it("keeps unparseable input as its own stable key", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
    expect(toDomain("not a url")).toBe("");
  });
});

describe("classify", () => {
  const raw = { position: 1, title: "Fredrick Mendez sentenced", url: "https://news.site/x", snippet: "" };

  it("marks government domains as public record, never owned", () => {
    const r = classify({ ...raw, url: "https://www.justice.gov/pr/x" }, "q", "google", OPTS);
    expect(r.control).toBe("government");
  });

  it("recognises configured owned domains", () => {
    const r = classify({ ...raw, url: "https://blog.example.com/bio" }, "q", "google", OPTS);
    expect(r.control).toBe("owned");
  });

  it("only classifies sentiment for pages that name the subject", () => {
    const other = classify(
      { ...raw, title: "Someone else convicted of fraud" },
      "q", "google", OPTS,
    );
    expect(other.sentiment).toBe("unrelated");
    expect(classify(raw, "q", "google", OPTS).sentiment).toBe("negative");
  });

  it("weights rank 1 above rank 10, and incidental mentions below exact matches", () => {
    expect(serpWeight(1, true)).toBeGreaterThan(serpWeight(10, true));
    expect(serpWeight(1, false)).toBeLessThan(serpWeight(1, true));
    expect(serpWeight(0, true)).toBe(0);
  });
});

describe("buildQuerySet", () => {
  it("covers every engine and rejects an empty subject", () => {
    const qs = buildQuerySet({ subjectName: "Fredrick Mendez", locales: ["Denver"] });
    expect(new Set(qs.map((q) => q.engine))).toEqual(new Set(["google", "bing", "duckduckgo"]));
    expect(() => buildQuerySet({ subjectName: "  ", locales: [] })).toThrow();
  });

  it("does not seed offence-specific probe terms", () => {
    const qs = buildQuerySet({ subjectName: "Fredrick Mendez", locales: [] });
    const joined = qs.map((q) => q.q).join(" ").toLowerCase();
    for (const term of ["fraud", "prison", "guilty", "sentencing"]) {
      expect(joined).not.toContain(term);
    }
  });
});

describe("computeDeltas", () => {
  const result = (url: string, position: number): ClassifiedResult =>
    classify({ position, title: "Fredrick Mendez", url, snippet: "" }, "q1", "google", OPTS);

  it("reports improvement, decline and disappearance", () => {
    const previous: RankObservation[] = [
      { normalizedUrl: "https://a.com/1", queryId: "q1", engine: "google", position: 5, observedAt: "" },
      { normalizedUrl: "https://gone.com/1", queryId: "q1", engine: "google", position: 7, observedAt: "" },
    ];
    const deltas = computeDeltas([result("https://a.com/1", 2), result("https://new.com/1", 9)], previous);

    expect(deltas.find((d) => d.normalizedUrl === "https://a.com/1")?.trend).toBe("up");
    expect(deltas.find((d) => d.normalizedUrl === "https://new.com/1")?.trend).toBe("new");
    expect(deltas.find((d) => d.normalizedUrl === "https://gone.com/1")?.trend).toBe("dropped_out");
  });
});

describe("deriveAlerts", () => {
  it("fires on a negative result breaking into the top 3", () => {
    const current = [
      classify(
        { position: 2, title: "Fredrick Mendez sentenced", url: "https://n.com/1", snippet: "" },
        "q1", "google", OPTS,
      ),
    ];
    const previous: RankObservation[] = [
      { normalizedUrl: "https://n.com/1", queryId: "q1", engine: "google", position: 8, observedAt: "" },
    ];
    const alerts = deriveAlerts(current, computeDeltas(current, previous));
    expect(alerts.map((a) => a.kind)).toContain("negative_entered_top_3");
  });

  it("stays quiet when a negative result holds a rank it already had", () => {
    const current = [
      classify(
        { position: 2, title: "Fredrick Mendez sentenced", url: "https://n.com/1", snippet: "" },
        "q1", "google", OPTS,
      ),
    ];
    const previous: RankObservation[] = [
      { normalizedUrl: "https://n.com/1", queryId: "q1", engine: "google", position: 2, observedAt: "" },
    ];
    expect(deriveAlerts(current, computeDeltas(current, previous))).toHaveLength(0);
  });
});

describe("shareOfVoice", () => {
  it("counts only first-page, subject-related results", () => {
    const results = [
      classify({ position: 1, title: "Fredrick Mendez fraud", url: "https://n.com/1", snippet: "" }, "q", "google", OPTS),
      classify({ position: 2, title: "Fredrick Mendez biography", url: "https://example.com/bio", snippet: "" }, "q", "google", OPTS),
      classify({ position: 40, title: "Fredrick Mendez fraud", url: "https://n.com/2", snippet: "" }, "q", "google", OPTS),
      classify({ position: 3, title: "Unrelated page", url: "https://x.com/1", snippet: "" }, "q", "google", OPTS),
    ];
    const sov = shareOfVoice(results);
    expect(sov.negative).toBeGreaterThan(0);
    expect(sov.positive).toBeGreaterThan(0);
    expect(sov.total).toBe(sov.negative + sov.neutral + sov.positive);
  });
});

function stubClient(handler: () => Promise<Response>): SerpApiClient {
  return new SerpApiClient({
    apiKey: "test",
    cache: new FileCache("/nonexistent-cache", 0),
    rateLimitRpm: 0,
    maxRetries: 2,
    fetchImpl: handler as unknown as typeof fetch,
    sleep: async () => {},
  });
}

const QUERY: SearchQuery = { id: "google:q", q: "q", engine: "google", rationale: "test" };

describe("SerpApiClient", () => {
  it("retries transient 5xx and then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ organic_results: [{ position: 1, title: "t", link: "https://a.com" }] })),
      );
    const results = await stubClient(fetchImpl).search(QUERY);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(results[0]?.url).toBe("https://a.com");
  });

  it("does not retry an invalid API key", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: "Invalid API key" }), { status: 200 }));
    await expect(stubClient(fetchImpl).search(QUERY)).rejects.toThrow(SerpApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("runScan", () => {
  it("continues past a failing query and records the failure", async () => {
    let call = 0;
    const client = {
      search: async () => {
        call++;
        if (call === 1) throw new SerpApiError("boom", 500, true);
        return [{ position: 1, title: "Fredrick Mendez", url: "https://a.com/1", snippet: "" }];
      },
    } as unknown as SerpApiClient;

    const queries: SearchQuery[] = [
      { id: "a", q: "a", engine: "google", rationale: "" },
      { id: "b", q: "b", engine: "bing", rationale: "" },
    ];
    const { summary } = await runScan({ client, queries, classifyOptions: OPTS, previous: [] });

    expect(summary.queriesFailed).toBe(1);
    expect(summary.queriesRun).toBe(1);
    expect(summary.resultsSeen).toBe(1);
  });
});
