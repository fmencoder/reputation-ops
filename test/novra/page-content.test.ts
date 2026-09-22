/**
 * The snapshot must not delete approved page content.
 *
 * build-snapshot.mjs derives page copy from the legacy WordPress HTML in
 * site/pages/, which describes exactly six pages. It used to write that
 * six-key object straight over frontend/content/pages.json, so anything
 * authored into that file for a page WordPress never had was deleted on every
 * run — `capabilities`, `globalDevelopment`, and the subtler `home.institutional`,
 * a field on a page that IS derived.
 *
 * These tests run against the real approved pages.json rather than a toy
 * fixture, so they fail if the content they protect is ever renamed.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mergePageContent, findLostContent } from "../../frontend/scripts/lib/page-content.mjs";

type Pages = Record<string, Record<string, unknown>>;

const approved: Pages = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "frontend", "content", "pages.json"), "utf8"),
).pages;

/** What the scrape of site/pages/*.html can produce: six pages, and the
 *  fields those templates actually carry. Deliberately written out rather than
 *  imported, so that a change to the generator's shape shows up here. */
const DERIVED_KEYS = ["home", "insights", "research", "technology", "about", "contact"] as const;
const derivedFrom = (pages: Pages): Pages => {
  const fields: Record<string, string[]> = {
    home: ["eyebrow", "headline", "lead", "domains"],
    insights: ["eyebrow", "headline", "lead", "domains"],
    research: ["eyebrow", "headline", "lead", "intro", "openQuestions"],
    technology: ["eyebrow", "headline", "lead", "cards", "convergence"],
    about: [
      "eyebrow", "headline", "lead", "identity", "portrait",
      "researchFocus", "profile", "manifesto", "publication",
    ],
    contact: ["eyebrow", "headline", "lead", "email", "note"],
  };
  return Object.fromEntries(
    DERIVED_KEYS.map((name) => [
      name,
      Object.fromEntries(fields[name].map((f) => [f, pages[name][f]])),
    ]),
  );
};

describe("snapshot page-content merge", () => {
  it("keeps the two pages that have no source HTML", () => {
    const { pages } = mergePageContent(approved, derivedFrom(approved));
    expect(Object.keys(pages)).toContain("capabilities");
    expect(Object.keys(pages)).toContain("globalDevelopment");
  });

  it("keeps their approved content byte-for-byte", () => {
    const { pages } = mergePageContent(approved, derivedFrom(approved));
    expect(pages.capabilities).toEqual(approved.capabilities);
    expect(pages.globalDevelopment).toEqual(approved.globalDevelopment);
  });

  it("keeps the institutional-relationship disclosure and its heading", () => {
    const { pages } = mergePageContent(approved, derivedFrom(approved));
    const gd = pages.globalDevelopment as Record<string, unknown>;
    expect(typeof gd.standing).toBe("string");
    expect(String(gd.standing).length).toBeGreaterThan(80);
    expect(gd).toHaveProperty("standingHeading");
    /*
     * Assert the substance of the approved wording, not a phrase from an
     * earlier draft. The disclosure was revised in c9f2c76: it no longer
     * enumerates named institutions, it disclaims the relationships a reader
     * would otherwise infer. These four are the load-bearing denials.
     */
    for (const denial of [
      /endorsement/i,
      /partnership/i,
      /contractual engagement/i,
      /advisory or vendor relationship/i,
    ]) {
      expect(String(gd.standing)).toMatch(denial);
    }
  });

  it("keeps an authored field on a page that IS derived", () => {
    // home.institutional is the case a page-level merge would still lose.
    expect(approved.home).toHaveProperty("institutional");
    const { pages } = mergePageContent(approved, derivedFrom(approved));
    expect(pages.home).toHaveProperty("institutional");
    expect(pages.home.institutional).toEqual(approved.home.institutional);
  });

  it("lets the source HTML win for the fields it does describe", () => {
    const derived = derivedFrom(approved);
    derived.home = { ...derived.home, eyebrow: "FROM THE HTML" };
    const { pages } = mergePageContent(approved, derived);
    expect(pages.home.eyebrow).toBe("FROM THE HTML");
    // ...without disturbing the authored field beside it
    expect(pages.home.institutional).toEqual(approved.home.institutional);
  });

  it("loses nothing at all, by the generator's own invariant check", () => {
    const { pages } = mergePageContent(approved, derivedFrom(approved));
    expect(findLostContent(approved, pages)).toEqual([]);
  });

  it("reports what it preserved", () => {
    const { preservedPages, preservedFields } = mergePageContent(approved, derivedFrom(approved));
    expect(preservedPages).toEqual(["capabilities", "globalDevelopment"]);
    expect(preservedFields).toEqual(["home.institutional"]);
  });

  it("is idempotent — a second run changes nothing", () => {
    const derived = derivedFrom(approved);
    const once = mergePageContent(approved, derived).pages;
    const twice = mergePageContent(once, derived).pages;
    expect(twice).toEqual(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });

  it("still adds a page the generator newly derives", () => {
    const derived = { ...derivedFrom(approved), brandNew: { eyebrow: "NEW" } };
    const { pages } = mergePageContent(approved, derived);
    expect(pages.brandNew).toEqual({ eyebrow: "NEW" });
  });

  it("findLostContent actually detects a regression", () => {
    // Prove the guard is not vacuous: a wholesale overwrite must be reported.
    const wholesale = derivedFrom(approved);
    const lost = findLostContent(approved, wholesale);
    expect(lost).toContain("capabilities");
    expect(lost).toContain("globalDevelopment");
    expect(lost).toContain("home.institutional");
  });
});
