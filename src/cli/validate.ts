/**
 * Deterministic validation gate.
 *
 * One command, run identically in CI and locally, that decides whether the
 * repository is in a state fit to deploy. Fails closed: a check that cannot run
 * is a failure, not a pass, because the alternative is a gate that silently
 * stops gating.
 *
 * Usage: npm run site:validate [-- --json]
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import { scanPlaceholders, blockingPlaceholders, type PlaceholderHit } from "../novra/placeholders.js";
import { checkPolicy, type PolicyFinding } from "../novra/policy.js";
import { auditPages, referencedAssets, type AuditFinding, type PageInput } from "../novra/html-audit.js";
import {
  auditSchema, auditFrontMatter, parseFrontMatter,
  type SchemaFinding, type FrontMatterFinding,
} from "../novra/schema-audit.js";

const ROOT = process.cwd();
const DOMAIN = "novraintelligence.com";

/** Empty is the correct state. A URL is added only after control is verified. */
const VERIFIED_PROFILES: readonly string[] = [];

const DEPLOYED_PATHS = ["/", "/insights/", "/research/", "/technology/", "/about/", "/contact/"];

/**
 * Article paths that exist as drafts in content/ but are not yet deployed.
 *
 * A link to one of these is *planned*, not broken — the article is written and
 * queued. A link to nothing at all is broken. Collapsing the two would either
 * force the index page to hide its own queue or train everyone to ignore the
 * link checker, and both are worse than the distinction.
 */
async function plannedArticlePaths(): Promise<string[]> {
  const files = await walk(join(ROOT, "content"), (p) => p.endsWith(".md"));
  const paths: string[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const { data } = parseFrontMatter(source);
    if (!data["slug"] || data["status"] === "template") continue;
    paths.push(`/insights/${data["slug"]}/`);
  }
  return paths;
}

async function walk(dir: string, filter: (path: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...(await walk(full, filter)));
    else if (filter(full)) out.push(full);
  }
  return out;
}

async function readAll(paths: readonly string[]): Promise<{ path: string; content: string }[]> {
  return Promise.all(
    paths.map(async (path) => ({
      path: relative(ROOT, path).replace(/\\/g, "/"),
      content: await readFile(path, "utf8"),
    })),
  );
}

interface Result {
  placeholders: readonly PlaceholderHit[];
  policy: readonly PolicyFinding[];
  html: readonly AuditFinding[];
  schema: readonly SchemaFinding[];
  frontMatter: readonly FrontMatterFinding[];
  missingAssets: string[];
  errors: number;
}

async function main(): Promise<void> {
  const json = process.argv.includes("--json");

  const sourceFiles = await readAll([
    ...(await walk(join(ROOT, "site", "pages"), (p) => p.endsWith(".html"))),
    ...(await walk(join(ROOT, "site", "partials"), (p) => p.endsWith(".html"))),
    ...(await walk(join(ROOT, "site", "templates"), (p) => p.endsWith(".html"))),
    ...(await walk(join(ROOT, "content"), (p) => p.endsWith(".md"))),
    join(ROOT, "site", "structured-data.json"),
  ]);

  const placeholders = scanPlaceholders(sourceFiles);
  const policy = checkPolicy(sourceFiles);

  // Built HTML. Absent dist is a hard failure: validating sources while
  // claiming to validate the deployable artifact is exactly the kind of gap
  // that lets a broken build through.
  const distFiles = await walk(join(ROOT, "site", "dist"), (p) => p.endsWith("index.html"));
  if (distFiles.length === 0) {
    console.error("site/dist is empty. Run `npm run site:build` first — validation covers built HTML, not just sources.");
    process.exit(1);
  }

  const pages: PageInput[] = [];
  const referenced = new Set<string>();
  for (const file of distFiles) {
    const html = await readFile(file, "utf8");
    const dir = relative(join(ROOT, "site", "dist"), file).replace(/index\.html$/, "").replace(/\\/g, "/");
    pages.push({ path: dir === "" ? "/" : `/${dir}`, html });
    for (const asset of referencedAssets(html)) referenced.add(asset);
  }

  const planned = await plannedArticlePaths();
  const html = auditPages(pages, {
    domain: DOMAIN,
    knownPaths: [...DEPLOYED_PATHS, ...planned],
  });

  const missingAssets: string[] = [];
  for (const asset of referenced) {
    try {
      await stat(join(ROOT, "site", asset.replace(/^\//, "")));
    } catch {
      missingAssets.push(asset);
    }
  }

  const schemaDocument = JSON.parse(await readFile(join(ROOT, "site", "structured-data.json"), "utf8")) as Record<string, unknown>;
  const schema = auditSchema(schemaDocument, { domain: DOMAIN, verifiedProfiles: VERIFIED_PROFILES });

  const frontMatter: FrontMatterFinding[] = [];
  const today = new Date();
  for (const file of await walk(join(ROOT, "content"), (p) => p.endsWith(".md"))) {
    const source = await readFile(file, "utf8");
    frontMatter.push(...auditFrontMatter(relative(ROOT, file), source, today));
  }

  const blocking = blockingPlaceholders(placeholders);
  const htmlErrors = html.filter((f) => f.severity === "error");
  const schemaErrors = schema.filter((f) => f.severity === "error");

  const errors =
    blocking.length + policy.length + htmlErrors.length + schemaErrors.length +
    frontMatter.length + missingAssets.length;

  const result: Result = { placeholders, policy, html, schema, frontMatter, missingAssets, errors };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    report(result);
  }

  process.exit(errors > 0 ? 1 : 0);
}

function report(result: Result): void {
  const section = (title: string, lines: readonly string[]): void => {
    if (lines.length === 0) return;
    console.log(`\n${title}`);
    for (const line of lines) console.log(`  ${line}`);
  };

  section(
    "BLOCKING PLACEHOLDERS (reach a reader)",
    blockingPlaceholders(result.placeholders).map((h) => `${h.file}:${h.line} ${h.token}`),
  );
  section(
    "template placeholders (resolved per article — not blocking)",
    result.placeholders.filter((h) => h.severity === "template").map((h) => `${h.file}:${h.line} ${h.token}`),
  );
  section("POLICY", result.policy.map((f) => `[${f.rule}] ${f.file}:${f.line} — ${f.detail}`));
  section(
    "HTML ERRORS",
    result.html.filter((f) => f.severity === "error").map((f) => `[${f.rule}] ${f.page} — ${f.detail}`),
  );
  section(
    "html warnings",
    result.html.filter((f) => f.severity === "warning").map((f) => `[${f.rule}] ${f.page} — ${f.detail}`),
  );
  section("SCHEMA", result.schema.map((f) => `[${f.rule}] ${f.node} — ${f.detail}`));
  section("FRONT MATTER", result.frontMatter.map((f) => `[${f.rule}] ${f.file} — ${f.detail}`));
  section("MISSING ASSETS", result.missingAssets);

  if (result.errors === 0) {
    console.log("\nVALIDATION=PASS");
    return;
  }

  console.log(`\nVALIDATION=FAIL (${result.errors} error${result.errors === 1 ? "" : "s"})`);

  // A red build that nobody can explain is a red build everyone learns to
  // ignore. When the only failure is a known, tracked launch blocker, say so in
  // as many words rather than leaving it to be inferred from a list.
  const blocking = blockingPlaceholders(result.placeholders);
  const onlyBlocker =
    result.errors === blocking.length &&
    blocking.every((h) => h.token === "PLACEHOLDER_CONTACT_EMAIL");
  if (onlyBlocker) {
    console.log(
      "\nThe only failure is PLACEHOLDER_CONTACT_EMAIL, the tracked launch blocker.\n" +
      "This build is red on purpose: the site is not in a publishable state until a\n" +
      "real address replaces it. Set it in site/pages/contact.html and close\n" +
      "CONTACT_EMAIL_CONFIRMED in site/launch-state.json.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
