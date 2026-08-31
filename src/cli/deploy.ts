/**
 * Production deployment CLI.
 *
 * Usage:
 *   npm run site:deploy:dry-run     no external writes; prints what would change
 *   npm run site:deploy             performs the deployment
 *
 * Authentication comes from the environment. Nothing is read from a file in the
 * repository, nothing is echoed, and the token never reaches the report.
 *
 *   NOVRA_WP_SITE          site ID or domain, e.g. novraintelligence.com
 *   NOVRA_WP_ACCESS_TOKEN  WordPress.com OAuth2 bearer token
 *
 * Deployment never changes site visibility. That is `npm run site:launch`, with
 * its own gates, and the separation is deliberate: a routine content push must
 * not be able to make a Coming Soon site public by accident.
 */

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { WpClient } from "../novra/wp-client.js";
import { parseManifest, serializeManifest, type MediaManifest } from "../novra/media-manifest.js";
import {
  syncAssets, deployPage, cssStrategy,
  type AssetSpec, type DeployReport, type PageResult, type PageSpec,
} from "../novra/deploy.js";

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes("--dry-run");
const AUTHOR_HREF = "/about/#fredrick-mendez";

/** Assets the deployed site references. SVG sources are never included. */
const ASSET_PATHS = [
  "/assets/novra-convergence-architecture.webp",
  "/assets/novra-convergence-architecture-mobile.webp",
  "/assets/reliability-budget-agentic-ai.webp",
  "/assets/share-card.png",
  "/assets/logo.webp",
];

const MIME: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Generate both markup strategies through the existing exporter rather than
 * reimplementing it here. One source of truth for what gets deployed; the
 * fallback is derived from the same <picture> markup, so the two cannot drift.
 */
async function exportPayloads(): Promise<{ primary: Map<string, PayloadFile>; fallback: Map<string, PayloadFile> }> {
  const dir = await mkdtemp(join(tmpdir(), "novra-export-"));
  try {
    for (const [flags, out] of [[[], "primary"], [["--picture-fallback"], "fallback"]] as [string[], string][]) {
      const result = spawnSync(
        process.execPath,
        [join(ROOT, "site", "wp-export.mjs"), ...flags, "--out", join(dir, out)],
        { cwd: ROOT, encoding: "utf8" },
      );
      // Exit code 1 means a gate tripped (unmapped asset, placeholder). The
      // payloads are still written, and the gates are evaluated below with the
      // manifest in hand — an asset unmapped *before* the media sync is the
      // normal starting state, not an error.
      if (result.status !== 0 && result.status !== 1) {
        throw new Error(`wp-export failed (${result.status}): ${result.stderr}`);
      }
    }
    return {
      primary: await readPayloads(join(dir, "primary")),
      fallback: await readPayloads(join(dir, "fallback")),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

interface PayloadFile {
  readonly slug: string;
  readonly title: string;
  readonly content: string;
  readonly placeholders: readonly string[];
}

async function readPayloads(dir: string): Promise<Map<string, PayloadFile>> {
  const out = new Map<string, PayloadFile>();
  for (const name of await readdir(dir)) {
    if (name === "manifest.json" || !name.endsWith(".json")) continue;
    const parsed = JSON.parse(await readFile(join(dir, name), "utf8")) as {
      params: { slug: string; title: string; content: string };
      _placeholders?: string[];
    };
    out.set(parsed.params.slug, {
      slug: parsed.params.slug,
      title: parsed.params.title,
      content: parsed.params.content,
      placeholders: parsed._placeholders ?? [],
    });
  }
  return out;
}

async function loadAssets(): Promise<AssetSpec[]> {
  const specs: AssetSpec[] = [];
  for (const path of ASSET_PATHS) {
    const file = join(ROOT, "site", path.replace(/^\//, ""));
    const bytes = new Uint8Array(await readFile(file));
    const extension = path.split(".").pop() ?? "";
    const mimeType = MIME[extension];
    if (!mimeType) throw new Error(`No MIME type registered for ${path}`);
    if (path.endsWith(".svg")) throw new Error(`${path} must never be uploaded — WordPress rejects image/svg+xml`);
    specs.push({ path, filename: basename(path), mimeType, bytes });
  }
  return specs;
}

async function main(): Promise<void> {
  const site = process.env["NOVRA_WP_SITE"];
  const token = process.env["NOVRA_WP_ACCESS_TOKEN"];

  const manifestPath = join(ROOT, "site", "wp-media.json");
  const { manifest: loaded, discarded } = parseManifest(await readFile(manifestPath, "utf8"));
  for (const path of discarded) {
    console.log(`discarded unverifiable manifest entry (no hash or media id): ${path}`);
  }

  const { primary, fallback } = await exportPayloads();

  const specs: PageSpec[] = [];
  const blocked: string[] = [];
  for (const [slug, payload] of primary) {
    if (payload.placeholders.length > 0) {
      blocked.push(`${slug}: unresolved ${payload.placeholders.join(", ")}`);
      continue;
    }
    specs.push({
      slug, title: payload.title, kind: "page",
      markupPrimary: payload.content,
      markupFallback: fallback.get(slug)?.content ?? payload.content,
    });
  }

  if (!site || !token) {
    if (!DRY_RUN) {
      console.error(
        "NOVRA_WP_SITE and NOVRA_WP_ACCESS_TOKEN are required for a real deployment.\n" +
        "See the runbook in site/DEPLOY.md for the one-time token setup.\n" +
        "AUTH_SETUP_REQUIRED=YES",
      );
      process.exit(2);
    }
    // A dry run without credentials still has real work to do: it proves what
    // the deployment would attempt and which gates are open.
    console.log("DRY RUN (no credentials present — no site was contacted)\n");
    printPlan(specs, blocked, loaded);
    process.exit(blocked.length > 0 ? 1 : 0);
  }

  const client = new WpClient({ site, token });
  const deps = {
    client,
    manifest: loaded,
    saveManifest: async (next: MediaManifest): Promise<void> => {
      await writeFile(manifestPath, serializeManifest(next), "utf8");
    },
    log: (line: string) => console.log(line),
  };
  const options = { dryRun: DRY_RUN, authorHref: AUTHOR_HREF };

  const identity = await client.getSite();
  console.log(`site: ${identity.name} (${identity.URL}), id ${identity.ID}`);

  const assets = await loadAssets();
  const sync = await syncAssets(deps, assets, options);

  const pages: PageResult[] = [];
  for (const spec of specs) {
    pages.push(await deployPage({ ...deps, manifest: sync.manifest }, spec, sync.manifest, options));
  }

  const css = await cssStrategy(client, await readFile(join(ROOT, "site", "novra.css"), "utf8"), sha256Hex);

  const failedQa = pages.some((p) => p.action === "failed");
  const report: DeployReport & { css: typeof css } = {
    dryRun: DRY_RUN,
    assets: sync.results,
    pages,
    manifestChanged: sync.changed,
    blocked,
    status: failedQa ? "failed_qa" : blocked.length > 0 ? "blocked" : "ok",
    css,
  };

  await writeFile(join(ROOT, "site", "deploy-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  printReport(report);
  process.exit(report.status === "ok" ? 0 : 1);
}

function printPlan(specs: readonly PageSpec[], blocked: readonly string[], manifest: MediaManifest): void {
  console.log(`pages that would deploy: ${specs.map((s) => s.slug).join(", ") || "none"}`);
  console.log(`assets in manifest: ${Object.keys(manifest.assets).length} of ${ASSET_PATHS.length}`);
  for (const path of ASSET_PATHS) {
    const entry = manifest.assets[path];
    console.log(`  ${entry ? "mapped  " : "UPLOAD  "} ${path}`);
  }
  if (blocked.length > 0) {
    console.log("\nBLOCKED:");
    for (const line of blocked) console.log(`  ${line}`);
  }
  console.log(`\nDEPLOY_READY=${blocked.length === 0 ? "YES" : "NO"}`);
}

function printReport(report: DeployReport & { css: { strategy: string; installed: boolean; detail: string } }): void {
  console.log("\n--- DEPLOYMENT REPORT ---");
  console.log(`DRY_RUN=${report.dryRun}`);
  for (const asset of report.assets) {
    console.log(`  asset ${asset.action.padEnd(7)} ${asset.path}${asset.mediaId ? ` -> ${asset.mediaId}` : ""}`);
  }
  for (const page of report.pages) {
    console.log(`  page  ${page.action.padEnd(9)} ${page.slug} strategy=${page.strategy} ${page.detail}`);
  }
  console.log(`CSS_STRATEGY=${report.css.strategy} CSS_INSTALLED=${report.css.installed}`);
  console.log(`STATUS=${report.status}`);
  console.log("SITE_VISIBILITY=UNCHANGED (deployment never touches visibility)");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
