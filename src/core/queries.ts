import type { Engine, SearchQuery } from "./types.js";

const ENGINES: readonly Engine[] = ["google", "bing", "duckduckgo"];

export interface QuerySetInput {
  readonly subjectName: string;
  /** Cities/states the subject is associated with, used for locale modifiers. */
  readonly locales: readonly string[];
}

/**
 * Build the monitoring query set.
 *
 * Every query is the subject's own name, optionally narrowed by a locale or a
 * neutral professional modifier. The set deliberately excludes charge- and
 * offense-specific terms: this tool measures what a person searching the name
 * actually encounters, and seeding it with offense keywords would both distort
 * that measurement and turn the query log into a list of adverse-term probes.
 */
export function buildQuerySet(input: QuerySetInput): readonly SearchQuery[] {
  const name = input.subjectName.trim();
  if (!name) throw new Error("subjectName is required to build a query set");

  const specs: { q: string; rationale: string }[] = [
    { q: `"${name}"`, rationale: "Baseline exact-name SERP — the first impression." },
  ];

  for (const locale of input.locales) {
    const trimmed = locale.trim();
    if (!trimmed) continue;
    specs.push({
      q: `"${name}" ${trimmed}`,
      rationale: `Locale-qualified search a local contact would run (${trimmed}).`,
    });
  }

  for (const modifier of ["biography", "profile", "linkedin"]) {
    specs.push({
      q: `"${name}" ${modifier}`,
      rationale: `Tracks whether owned/professional assets surface for "${modifier}".`,
    });
  }

  const queries: SearchQuery[] = [];
  for (const engine of ENGINES) {
    for (const spec of specs) {
      queries.push({
        id: `${engine}:${spec.q}`,
        q: spec.q,
        engine,
        rationale: spec.rationale,
      });
    }
  }
  return queries;
}
