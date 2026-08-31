/**
 * Structured-data validation.
 *
 * Schema.org is a set of machine-readable assertions. An Organization node
 * asserts a legal organization exists; a sameAs entry asserts two profiles are
 * the same person; a jobTitle asserts a title. Each is checkable by anyone, and
 * this project's whole premise is that what it publishes survives checking. So
 * the rules here are about what may be *claimed*, not only about well-formedness.
 */

export interface SchemaFinding {
  readonly rule: string;
  readonly severity: "error" | "warning";
  readonly node: string;
  readonly detail: string;
}

/**
 * Types that assert an organization exists. NOVRA Intelligence is a masthead —
 * a publication name — and NOVRA_AI_LEGAL_ENTITY=NOT_YET_REGISTERED, so none of
 * these may be emitted until a real entity exists and its registered name is
 * supplied.
 */
const FORBIDDEN_TYPES = [
  "Organization", "Corporation", "FinancialService", "InvestmentOrDeposit",
  "ResearchOrganization", "EducationalOrganization", "LocalBusiness", "NewsMediaOrganization",
];

/** Properties that assert unverified attainment. */
const FORBIDDEN_PERSON_PROPERTIES = [
  "award", "hasCredential", "alumniOf", "worksFor", "memberOf",
  "netWorth", "numberOfEmployees", "aggregateRating",
];

export interface SchemaDocument {
  readonly website?: Record<string, unknown>;
  readonly person?: Record<string, unknown>;
  readonly article_template?: Record<string, unknown>;
  readonly [key: string]: unknown;
}

function typeOf(node: Record<string, unknown> | undefined): string {
  const value = node?.["@type"];
  return typeof value === "string" ? value : "";
}

function isRef(value: unknown, id: string): boolean {
  return (
    typeof value === "object" && value !== null &&
    (value as Record<string, unknown>)["@id"] === id
  );
}

export interface SchemaAuditOptions {
  readonly domain: string;
  /** URLs positively verified as controlled by the subject. Empty is correct today. */
  readonly verifiedProfiles: readonly string[];
}

export function auditSchema(
  document: SchemaDocument,
  options: SchemaAuditOptions,
): readonly SchemaFinding[] {
  const findings: SchemaFinding[] = [];
  const personId = `https://${options.domain}/about/#person`;
  const websiteId = `https://${options.domain}/#website`;

  // Forbidden node types anywhere in the document.
  const serialized = JSON.stringify(document);
  for (const type of FORBIDDEN_TYPES) {
    if (new RegExp(`"@type"\\s*:\\s*"${type}"`).test(serialized)) {
      findings.push({
        rule: "forbidden-schema-type", severity: "error", node: type,
        detail: `${type} asserts a legal entity exists. NOVRA Intelligence is a masthead, not a company.`,
      });
    }
  }

  const person = document.person;
  if (!person) {
    findings.push({ rule: "person-missing", severity: "error", node: "person", detail: "No Person node." });
  } else {
    if (typeOf(person) !== "Person") {
      findings.push({ rule: "person-type", severity: "error", node: "person", detail: `@type is "${typeOf(person)}", expected "Person".` });
    }
    if (person["@id"] !== personId) {
      findings.push({ rule: "person-id", severity: "error", node: "person", detail: `@id should be ${personId}.` });
    }
    if (typeof person["name"] !== "string" || !person["name"]) {
      findings.push({ rule: "person-name", severity: "error", node: "person", detail: "Person has no name." });
    } else if (person["name"] !== "Fredrick Mendez") {
      findings.push({
        rule: "person-name-variant", severity: "error", node: "person",
        detail: `Name is "${String(person["name"])}". The canonical spelling is "Fredrick Mendez"; the "Frederick" variant belongs to other people.`,
      });
    }
    const description = person["description"];
    if (typeof description !== "string" || description.trim().length < 40) {
      findings.push({ rule: "person-description", severity: "error", node: "person", detail: "Person description is missing or too thin to be useful." });
    }
    for (const property of FORBIDDEN_PERSON_PROPERTIES) {
      if (property in person) {
        findings.push({
          rule: "person-unverified-property", severity: "error", node: `person.${property}`,
          detail: `${property} asserts something no source in this repository verifies.`,
        });
      }
    }
    if ("jobTitle" in person) {
      findings.push({
        rule: "person-jobtitle", severity: "warning", node: "person.jobTitle",
        detail: '"Technology executive" is a self-description, not a verified title. jobTitle makes it a machine-readable claim.',
      });
    }
    if ("sameAs" in person) {
      const entries = Array.isArray(person["sameAs"]) ? person["sameAs"] : [person["sameAs"]];
      for (const entry of entries) {
        if (typeof entry !== "string" || !options.verifiedProfiles.includes(entry)) {
          findings.push({
            rule: "sameas-unverified", severity: "error", node: "person.sameAs",
            detail: `sameAs "${String(entry)}" is not on the verified list. With 400+ same-name profiles, a wrong entry merges the subject with a stranger.`,
          });
        }
      }
    }
  }

  const website = document.website;
  if (!website) {
    findings.push({ rule: "website-missing", severity: "error", node: "website", detail: "No WebSite node." });
  } else {
    if (typeOf(website) !== "WebSite") {
      findings.push({ rule: "website-type", severity: "error", node: "website", detail: `@type is "${typeOf(website)}", expected "WebSite".` });
    }
    if (!isRef(website["publisher"], personId)) {
      findings.push({
        rule: "website-publisher", severity: "error", node: "website.publisher",
        detail: `publisher must reference the Person (${personId}), never a masthead-shaped Organization.`,
      });
    }
  }

  const article = document.article_template;
  if (!article) {
    findings.push({ rule: "article-template-missing", severity: "error", node: "article_template", detail: "No Article template." });
  } else {
    if (typeOf(article) !== "Article") {
      findings.push({ rule: "article-type", severity: "error", node: "article_template", detail: `@type is "${typeOf(article)}", expected "Article".` });
    }
    if (!isRef(article["author"], personId)) {
      findings.push({
        rule: "article-author", severity: "error", node: "article_template.author",
        detail: `Article.author must resolve to the Person node (${personId}). Authority accrues to a named human, not to a masthead.`,
      });
    }
    if (!isRef(article["publisher"], personId)) {
      findings.push({ rule: "article-publisher", severity: "error", node: "article_template.publisher", detail: `Article.publisher must reference ${personId}.` });
    }
    if (!isRef(article["isPartOf"], websiteId)) {
      findings.push({ rule: "article-ispartof", severity: "error", node: "article_template.isPartOf", detail: `Article.isPartOf must reference ${websiteId}.` });
    }
  }

  return findings;
}

export interface FrontMatter {
  readonly [key: string]: string;
}

export interface FrontMatterFinding {
  readonly rule: string;
  readonly file: string;
  readonly detail: string;
}

const REQUIRED_FRONT_MATTER = ["title", "slug", "meta_description", "status"];

/** Parses the flat `key: value` front matter this repository uses. */
export function parseFrontMatter(source: string): { data: FrontMatter; ok: boolean } {
  if (!source.startsWith("---")) return { data: {}, ok: false };
  const end = source.indexOf("\n---", 3);
  if (end === -1) return { data: {}, ok: false };

  const data: Record<string, string> = {};
  for (const line of source.slice(3, end).split("\n")) {
    if (!line.trim() || line.startsWith(" ") || line.startsWith("-")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^"(.*)"$/, "$1");
    if (key) data[key] = value;
  }
  return { data, ok: true };
}

/**
 * Article front matter.
 *
 * The date rule is the one that matters: a publication date is a factual claim
 * about when something was published, and back-dating an article to look
 * established is exactly the kind of small fabrication this project cannot
 * afford. A future date is equally wrong.
 */
export function auditFrontMatter(
  file: string,
  source: string,
  today: Date,
): readonly FrontMatterFinding[] {
  const findings: FrontMatterFinding[] = [];
  const { data, ok } = parseFrontMatter(source);

  if (!ok) {
    return [{ rule: "front-matter-malformed", file, detail: "No parseable --- front matter block." }];
  }

  for (const key of REQUIRED_FRONT_MATTER) {
    if (!data[key]) findings.push({ rule: "front-matter-missing", file, detail: `Missing "${key}".` });
  }

  const slug = data["slug"];
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    findings.push({ rule: "front-matter-slug", file, detail: `Slug "${slug}" is not lowercase-kebab.` });
  }

  for (const key of ["date", "published", "datePublished"]) {
    const value = data[key];
    if (!value) continue;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
      findings.push({ rule: "front-matter-date", file, detail: `"${key}" is not a parseable date: ${value}` });
    } else if (parsed > today.getTime()) {
      findings.push({ rule: "front-matter-future-date", file, detail: `"${key}" is in the future: ${value}` });
    }
  }

  const hero = data["hero"];
  if (hero && (!data["hero_alt"] || !data["hero_width"] || !data["hero_height"])) {
    findings.push({
      rule: "front-matter-hero-incomplete", file,
      detail: "hero is set but hero_alt/hero_width/hero_height are not all present.",
    });
  }
  if (data["hero_alt"] && data["hero_alt"].length < 40) {
    findings.push({ rule: "front-matter-hero-alt-thin", file, detail: "hero_alt is too short to describe a diagram." });
  }

  return findings;
}
