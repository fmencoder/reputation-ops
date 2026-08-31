/**
 * Gate tests: placeholders, policy, schema, launch state, T0 immutability, and
 * the identity rules that decide whether a search result is even about the
 * subject.
 */

import { describe, expect, it } from "vitest";

import { scanPlaceholders, blockingPlaceholders } from "../../src/novra/placeholders.js";
import { checkPolicy, checkSameAs } from "../../src/novra/policy.js";
import { auditSchema, auditFrontMatter, parseFrontMatter } from "../../src/novra/schema-audit.js";
import { auditPages } from "../../src/novra/html-audit.js";
import {
  applyAutomationUpdates, evaluateGates, initialState, mayLaunch,
  parseLaunchState, serializeLaunchState, type LaunchState,
} from "../../src/novra/launch-state.js";
import {
  assertT0Writable, classifyObservation, isBaselineEligible, novraQuerySet,
  resolveIdentity, T0ImmutableError, type IdentityContext, type Snapshot,
} from "../../src/novra/search/observations.js";
import { computeScoreboard } from "../../src/novra/search/scoreboard.js";
import { evaluateCheck, followUpDue, refreshReadiness, SOURCE_TARGETS } from "../../src/novra/source-watch.js";

describe("placeholder gate", () => {
  it("blocks a placeholder on a deployable page", () => {
    const hits = scanPlaceholders([{ path: "site/pages/contact.html", content: "<p>PLACEHOLDER_CONTACT_EMAIL</p>" }]);
    expect(blockingPlaceholders(hits)).toHaveLength(1);
  });

  it("does not block an internal runbook", () => {
    const hits = scanPlaceholders([{ path: "docs/status-report.md", content: "TBD_PUBLIC and [UNVERIFIED]" }]);
    expect(blockingPlaceholders(hits)).toHaveLength(0);
    expect(hits.every((h) => h.severity === "internal")).toBe(true);
  });

  it("treats a status: template document's placeholders as template variables", () => {
    const content = '---\ntitle: "About"\nstatus: template\n---\n\nPLACEHOLDER_FULL_NAME';
    const hits = scanPlaceholders([{ path: "content/000-author-page.md", content }]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.severity).toBe("template");
  });

  it("detects every configured token form", () => {
    const hits = scanPlaceholders([{
      path: "site/pages/x.html",
      content: "PLACEHOLDER_A\n[UNVERIFIED]\nTODO_PUBLIC\nTBD_PUBLIC\nREPLACE_ME",
    }]);
    // "[" sorts after the uppercase letters in the default collation.
    expect(hits.map((h) => h.token).sort()).toEqual(
      ["PLACEHOLDER_A", "REPLACE_ME", "TBD_PUBLIC", "TODO_PUBLIC", "[UNVERIFIED]"],
    );
  });
});

describe("policy gate", () => {
  it("flags a BuildFlow reference even inside an HTML comment", () => {
    const findings = checkPolicy([{ path: "site/pages/about.html", content: "<!-- built on BuildFlow -->" }]);
    expect(findings.map((f) => f.rule)).toContain("buildflow-disclosure");
  });

  it("allows BuildFlow in internal repository files", () => {
    expect(checkPolicy([{ path: "docs/status-report.md", content: "BuildFlow integration notes" }])).toHaveLength(0);
  });

  it("flags a rendered fabricated counter but not the comment explaining its removal", () => {
    const rendered = checkPolicy([{ path: "site/pages/about.html", content: "<p>50+ research papers</p>" }]);
    expect(rendered.map((f) => f.rule)).toContain("fabricated-metric");

    const explained = checkPolicy([{
      path: "site/pages/about.html",
      content: "<!-- the board rendered 50+ Research Papers; removed as unsupported -->",
    }]);
    expect(explained.map((f) => f.rule)).not.toContain("fabricated-metric");
  });

  it("does not flag arithmetic prose inside an article", () => {
    const findings = checkPolicy([{
      path: "content/001.md",
      content: "The task ends at 60% success and 40% failure, plus confidently wrong completions.",
    }]);
    expect(findings.map((f) => f.rule)).not.toContain("fabricated-score");
  });

  it("flags a headline achievement score", () => {
    const findings = checkPolicy([{ path: "site/pages/insights.html", content: "<h2>98.7% Impact Score</h2>" }]);
    expect(findings.map((f) => f.rule)).toContain("fabricated-score");
  });

  it("flags an SVG used as an image source in deployable HTML", () => {
    const findings = checkPolicy([{ path: "site/pages/x.html", content: '<img src="/assets/panel.svg">' }]);
    expect(findings.map((f) => f.rule)).toContain("svg-image-source");
  });

  it("rejects any sameAs entry that is not on the verified list", () => {
    expect(checkSameAs({ sameAs: ["https://linkedin.com/in/someone"] }, [])).toHaveLength(1);
    expect(checkSameAs({ sameAs: ["PLACEHOLDER_PROFILE"] }, [])[0]?.rule).toBe("sameas-placeholder");
    expect(checkSameAs({}, [])).toHaveLength(0);
    expect(checkSameAs({ sameAs: ["https://ok.example/p"] }, ["https://ok.example/p"])).toHaveLength(0);
  });
});

describe("schema gate", () => {
  const valid = {
    website: {
      "@type": "WebSite", "@id": "https://novraintelligence.com/#website",
      publisher: { "@id": "https://novraintelligence.com/about/#person" },
    },
    person: {
      "@type": "Person", "@id": "https://novraintelligence.com/about/#person",
      name: "Fredrick Mendez",
      description: "Technology executive and strategist focused on artificial intelligence and autonomous systems.",
    },
    article_template: {
      "@type": "Article",
      author: { "@id": "https://novraintelligence.com/about/#person" },
      publisher: { "@id": "https://novraintelligence.com/about/#person" },
      isPartOf: { "@id": "https://novraintelligence.com/#website" },
    },
  };
  const options = { domain: "novraintelligence.com", verifiedProfiles: [] as string[] };

  it("passes a correct document", () => {
    expect(auditSchema(valid, options).filter((f) => f.severity === "error")).toHaveLength(0);
  });

  it("rejects an Organization node", () => {
    const document = { ...valid, organization: { "@type": "Organization", name: "NOVRA" } };
    expect(auditSchema(document, options).map((f) => f.rule)).toContain("forbidden-schema-type");
  });

  it("rejects the Frederick spelling, which belongs to other people", () => {
    const document = { ...valid, person: { ...valid.person, name: "Frederick Mendez" } };
    expect(auditSchema(document, options).map((f) => f.rule)).toContain("person-name-variant");
  });

  it("rejects unverified attainment properties", () => {
    const document = { ...valid, person: { ...valid.person, award: "Best Engineer" } };
    expect(auditSchema(document, options).map((f) => f.rule)).toContain("person-unverified-property");
  });

  it("rejects an Article whose author does not resolve to the Person", () => {
    const document = { ...valid, article_template: { ...valid.article_template, author: { name: "NOVRA Intelligence" } } };
    expect(auditSchema(document, options).map((f) => f.rule)).toContain("article-author");
  });
});

describe("front matter", () => {
  it("parses the flat key: value form", () => {
    const { data, ok } = parseFrontMatter('---\ntitle: "A"\nslug: a-b\n---\nbody');
    expect(ok).toBe(true);
    expect(data["slug"]).toBe("a-b");
  });

  it("rejects a future publication date", () => {
    const source = '---\ntitle: "A"\nslug: a\nmeta_description: "d"\nstatus: draft\ndate: 2030-01-01\n---\n';
    const findings = auditFrontMatter("content/x.md", source, new Date("2026-08-31"));
    expect(findings.map((f) => f.rule)).toContain("front-matter-future-date");
  });

  it("requires a hero to carry its alt text and dimensions", () => {
    const source = '---\ntitle: "A"\nslug: a\nmeta_description: "d"\nstatus: draft\nhero: /assets/x.webp\n---\n';
    expect(auditFrontMatter("content/x.md", source, new Date()).map((f) => f.rule))
      .toContain("front-matter-hero-incomplete");
  });
});

describe("html audit", () => {
  const options = { domain: "novraintelligence.com", knownPaths: ["/", "/about/"] };
  const wrap = (body: string, path = "/"): { path: string; html: string } => ({
    path,
    html:
      `<title>T</title><meta name="description" content="${"d".repeat(60)}">` +
      `<link rel="canonical" href="https://novraintelligence.com${path}"><h1>H</h1>${body}`,
  });

  it("flags a missing alt", () => {
    const findings = auditPages([wrap('<img src="/a.webp" width="1" height="1">')], options);
    expect(findings.map((f) => f.rule)).toContain("img-alt-missing");
  });

  it("flags missing intrinsic dimensions", () => {
    const findings = auditPages([wrap('<img src="/a.webp" alt="a described image here">')], options);
    expect(findings.map((f) => f.rule)).toContain("img-dimensions-missing");
  });

  it("flags a skipped heading level", () => {
    expect(auditPages([wrap("<h3>Sub</h3>")], options).map((f) => f.rule)).toContain("heading-order-skip");
  });

  it("flags a broken internal link and accepts a known one", () => {
    expect(auditPages([wrap('<a href="/nowhere/">x</a>')], options).map((f) => f.rule)).toContain("link-target-unknown");
    expect(auditPages([wrap('<a href="/about/">x</a>')], options).map((f) => f.rule)).not.toContain("link-target-unknown");
  });

  it("flags two pages claiming the same canonical", () => {
    const a = wrap("<p>a</p>", "/");
    const b = { path: "/about/", html: a.html };
    expect(auditPages([a, b], options).map((f) => f.rule)).toContain("canonical-duplicate");
  });

  it("flags malformed inline JSON-LD", () => {
    const page = wrap('<script type="application/ld+json">{ bad json }</script>');
    expect(auditPages([page], options).map((f) => f.rule)).toContain("jsonld-malformed");
  });
});

describe("launch gates", () => {
  const base = initialState(() => new Date("2026-08-31T00:00:00Z"));

  it("starts with every gate open and the site in Coming Soon", () => {
    expect(base.siteVisibility).toBe("COMING_SOON");
    expect(evaluateGates(base).ready).toBe(false);
    expect(mayLaunch(base).allowed).toBe(false);
  });

  it("refuses to let automation raise a human gate", () => {
    const { next, refused } = applyAutomationUpdates(base, {
      HUMAN_LAUNCH_APPROVAL: { value: true, evidence: "CI is green" },
      CONTACT_EMAIL_CONFIRMED: { value: true, evidence: "looks fine" },
      T0_CAPTURED: { value: true, evidence: "baseline written" },
    });
    expect([...refused].sort()).toEqual(["CONTACT_EMAIL_CONFIRMED", "HUMAN_LAUNCH_APPROVAL"]);
    expect(next.gates.HUMAN_LAUNCH_APPROVAL.value).toBe(false);
    expect(next.gates.T0_CAPTURED.value).toBe(true);
  });

  it("blocks launch when only the human approval is missing", () => {
    let state: LaunchState = base;
    for (const gate of ["CSS_INSTALLED", "T0_CAPTURED", "MEDIA_SYNC_COMPLETE", "CORE_PAGES_DEPLOYED", "FINAL_QA_PASS"] as const) {
      state = applyAutomationUpdates(state, { [gate]: { value: true, evidence: "verified" } }).next;
    }
    state = {
      ...state,
      gates: {
        ...state.gates,
        CONTACT_EMAIL_CONFIRMED: { value: true, setBy: "human", updatedAt: "", evidence: "confirmed by owner" },
      },
    };
    const verdict = mayLaunch(state);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reasons.join(" ")).toMatch(/HUMAN_LAUNCH_APPROVAL/);
  });

  it("allows launch only when a human recorded the approval", () => {
    let state: LaunchState = base;
    for (const gate of ["CSS_INSTALLED", "T0_CAPTURED", "MEDIA_SYNC_COMPLETE", "CORE_PAGES_DEPLOYED", "FINAL_QA_PASS"] as const) {
      state = applyAutomationUpdates(state, { [gate]: { value: true, evidence: "verified" } }).next;
    }
    const human = { value: true, setBy: "human" as const, updatedAt: "", evidence: "approved in writing" };
    const approved: LaunchState = {
      ...state,
      gates: { ...state.gates, CONTACT_EMAIL_CONFIRMED: human, HUMAN_LAUNCH_APPROVAL: human },
    };
    expect(mayLaunch(approved).allowed).toBe(true);

    const forged: LaunchState = {
      ...approved,
      gates: { ...approved.gates, HUMAN_LAUNCH_APPROVAL: { ...human, setBy: "automation" } },
    };
    expect(mayLaunch(forged).allowed).toBe(false);
  });

  it("round-trips through the committed file format", () => {
    const parsed = parseLaunchState(serializeLaunchState(base));
    expect(parsed.siteVisibility).toBe("COMING_SOON");
    expect(evaluateGates(parsed).open).toHaveLength(7);
  });
});

describe("search identity and T0", () => {
  const context: IdentityContext = {
    subjectName: "Fredrick Mendez",
    ownedDomains: ["novraintelligence.com"],
    establishedUrls: ["https://www.morelaw.com/verdicts/case/CO/188850/"],
    corroborators: ["NOVRA"],
  };

  it("publishes five fixed queries so snapshots stay comparable", () => {
    expect(novraQuerySet()).toHaveLength(5);
  });

  it("treats an owned domain as confirmed identity", () => {
    expect(resolveIdentity("https://novraintelligence.com/about/", "Fredrick Mendez", context).identity)
      .toBe("confirmed");
  });

  it("records a same-name stranger as UNKNOWN, not as a subject result", () => {
    const observation = classifyObservation({
      engine: "google", query: '"Fredrick Mendez"', position: 4,
      title: "Fredrick Mendez — Realtor of the Year",
      url: "https://realty.example/agents/fredrick-mendez",
      snippet: "Award-winning agent serving the tri-state area.",
    }, context);
    expect(observation.identity).toBe("unknown");
    expect(observation.classification).toBe("UNKNOWN");
    expect(observation.classificationReason).toMatch(/another person of the same name/);
  });

  it("does not count an adverse term on an unidentified page as NEGATIVE", () => {
    const observation = classifyObservation({
      engine: "google", query: '"Fredrick Mendez"', position: 2,
      title: "Fredrick Mendez sentenced",
      url: "https://news.example/other-case",
      snippet: "A jury found him guilty of fraud.",
    }, context);
    expect(observation.classification).toBe("UNKNOWN");
  });

  it("classifies an established URL as NEGATIVE on its own evidence", () => {
    const observation = classifyObservation({
      engine: "google", query: '"Fredrick Mendez"', position: 1,
      title: "Case record", url: "https://www.morelaw.com/verdicts/case/CO/188850/",
      snippet: "Sentenced for fraud.",
    }, context);
    expect(observation.identity).toBe("confirmed");
    expect(observation.classification).toBe("NEGATIVE");
  });

  it("marks a result without the name as UNRELATED", () => {
    const observation = classifyObservation({
      engine: "bing", query: '"Fredrick Mendez" AI', position: 7,
      title: "Machine learning weekly", url: "https://ml.example/",
      snippet: "Nothing to do with anyone in particular.",
    }, context);
    expect(observation.classification).toBe("UNRELATED");
  });

  it("refuses to overwrite an existing T0", () => {
    const existing = {
      id: "t0", capturedAt: "2026-08-31T00:00:00Z", isT0: true,
      queries: [], observations: [], failures: [],
    } satisfies Snapshot;
    expect(() => assertT0Writable(existing)).toThrow(T0ImmutableError);
    expect(() => assertT0Writable(null)).not.toThrow();
  });

  it("refuses a partial capture as a baseline", () => {
    const partial: Snapshot = {
      id: "s", capturedAt: "", isT0: false, queries: [],
      observations: [{
        timestamp: "", engine: "google", query: "q", position: 1, title: "t",
        url: "https://novraintelligence.com/", domain: "novraintelligence.com",
        classification: "POSITIVE", classificationReason: "", identity: "confirmed",
      }],
      failures: [{ query: "q2", engine: "bing", reason: "429" }],
    };
    expect(isBaselineEligible(partial).eligible).toBe(false);
  });

  it("excludes UNKNOWN results from the third-party count", () => {
    const snapshot: Snapshot = {
      id: "s", capturedAt: "2026-08-31T00:00:00Z", isT0: false, queries: [],
      failures: [],
      observations: [
        { timestamp: "", engine: "google", query: "q", position: 3, title: "t", url: "https://stranger.example/x", domain: "stranger.example", classification: "UNKNOWN", classificationReason: "", identity: "unknown" },
        { timestamp: "", engine: "google", query: "q", position: 5, title: "t", url: "https://www.morelaw.com/verdicts/case/CO/188850/", domain: "morelaw.com", classification: "NEGATIVE", classificationReason: "", identity: "confirmed" },
      ],
    };
    const board = computeScoreboard(snapshot, {
      ownedDomains: ["novraintelligence.com"], articlePathPrefix: "/insights/", aboutPath: "/about",
    });
    expect(board.thirdPartyPositions).toHaveLength(1);
    expect(board.top10.UNKNOWN).toBe(1);
    expect(board.novraHighestPosition).toBeNull();
  });
});

describe("source watch", () => {
  const hash = (input: string): string => `h${input.length}`;
  const context = { subjectName: "Fredrick Mendez", hash };
  const page = (body: string): string => `<html><head><title>Case</title></head><body>${body}</body></html>`;

  it("watches the canonical URLs recorded in the repository, Bloomberg's pair included", () => {
    expect(SOURCE_TARGETS.map((t) => t.id).sort()).toEqual(["bloomberglaw", "hoodline", "morelaw"]);
    expect(SOURCE_TARGETS.find((t) => t.id === "bloomberglaw")?.urls).toHaveLength(2);
  });

  it("records a first observation as the comparison point, not a change", () => {
    const check = evaluateCheck("morelaw", "https://x.example/a", { status: 200, finalUrl: "https://x.example/a", body: page("Fredrick Mendez") }, context);
    expect(check.change).toBe("UNCHANGED");
    expect(check.detail).toMatch(/first observation/);
  });

  it("reports GONE on a 404", () => {
    const check = evaluateCheck("morelaw", "https://x.example/a", { status: 404, finalUrl: null, body: null }, context);
    expect(check.change).toBe("GONE");
    expect(refreshReadiness(check).eligible).toBe(true);
  });

  it("reports REMOVED when the name disappears from a page that had it", () => {
    const previous = evaluateCheck("morelaw", "https://x.example/a", { status: 200, finalUrl: "https://x.example/a", body: page("Fredrick Mendez was named") }, context);
    const check = evaluateCheck("morelaw", "https://x.example/a", { status: 200, finalUrl: "https://x.example/a", body: page("A defendant was named") }, { ...context, previous });
    expect(check.change).toBe("REMOVED");
  });

  it("reports CANONICAL_CHANGED", () => {
    const withCanonical = (href: string): string =>
      `<html><head><title>Case</title><link rel="canonical" href="${href}"></head><body>Fredrick Mendez</body></html>`;
    const previous = evaluateCheck("morelaw", "https://x.example/a", { status: 200, finalUrl: "https://x.example/a", body: withCanonical("https://x.example/a") }, context);
    const check = evaluateCheck("morelaw", "https://x.example/a", { status: 200, finalUrl: "https://x.example/a", body: withCanonical("https://x.example/b") }, { ...context, previous });
    expect(check.change).toBe("CANONICAL_CHANGED");
  });

  it("does not treat an unchanged page as eligible for a search refresh", () => {
    const previous = evaluateCheck("morelaw", "https://x.example/a", { status: 200, finalUrl: "https://x.example/a", body: page("Fredrick Mendez") }, context);
    const check = evaluateCheck("morelaw", "https://x.example/a", { status: 200, finalUrl: "https://x.example/a", body: page("Fredrick Mendez") }, { ...context, previous });
    expect(check.change).toBe("UNCHANGED");
    expect(refreshReadiness(check).eligible).toBe(false);
  });

  it("always marks a submission as requiring a human, even when eligible", () => {
    const check = evaluateCheck("morelaw", "https://x.example/a", { status: 410, finalUrl: null, body: null }, context);
    expect(refreshReadiness(check).humanSubmissionRequired).toBe(true);
  });

  it("flags a follow-up only inside the window and only once", () => {
    const target = SOURCE_TARGETS[0]!;
    expect(followUpDue(target, new Date("2026-09-01"), false).due).toBe(false);
    expect(followUpDue(target, new Date("2026-09-08"), false).due).toBe(true);
    expect(followUpDue(target, new Date("2026-09-08"), true).due).toBe(false);
    expect(followUpDue(target, new Date("2026-09-20"), false).due).toBe(false);
  });
});
