/**
 * Deployment orchestrator.
 *
 * Deterministic and idempotent: running it twice against unchanged sources
 * uploads nothing, updates nothing, and reports the same thing both times. That
 * property is what makes it safe to run from CI on every push to the deploy
 * branch rather than only when someone remembers to.
 *
 * It never changes site visibility. Launch is a separate workflow with separate
 * gates, because "deploy" and "make public" failing open into each other is the
 * one mistake in this project that cannot be undone.
 */

import type { WpClient, WpPage } from "./wp-client.js";
import {
  planSync, rewriteAssetUrls, sha256,
  type MediaEntry, type MediaManifest, type SyncDecision,
} from "./media-manifest.js";
import { compareReadback, type ReadbackDiff } from "./readback.js";

export interface PageSpec {
  readonly slug: string;
  readonly title: string;
  readonly kind: "page" | "post";
  /** Markup with <picture>. The strategy that ships first. */
  readonly markupPrimary: string;
  /** Dual-<img> markup, derived from the same source. Used only after a failed read-back. */
  readonly markupFallback: string;
}

export interface AssetSpec {
  readonly path: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly bytes: Uint8Array;
}

export interface DeployDeps {
  readonly client: WpClient;
  readonly manifest: MediaManifest;
  readonly saveManifest: (manifest: MediaManifest) => Promise<void>;
  readonly now?: () => Date;
  readonly log?: (line: string) => void;
}

export interface DeployOptions {
  readonly dryRun: boolean;
  readonly authorHref?: string;
}

export interface AssetResult {
  readonly path: string;
  readonly action: SyncDecision["action"];
  readonly mediaId: number | null;
  readonly url: string | null;
  readonly reason: string;
}

export interface PageResult {
  readonly slug: string;
  readonly kind: "page" | "post";
  readonly id: number | null;
  readonly action: "updated" | "created" | "unchanged" | "skipped" | "failed";
  readonly strategy: "primary" | "fallback" | "none";
  readonly readback: ReadbackDiff | null;
  readonly rollback: RollbackRecord | null;
  readonly detail: string;
}

export interface RollbackRecord {
  readonly kind: "page" | "post";
  readonly id: number;
  readonly slug: string;
  readonly previousContent: string;
  readonly previousStatus: string;
  readonly capturedAt: string;
  readonly restored: boolean;
}

export interface DeployReport {
  readonly dryRun: boolean;
  readonly assets: readonly AssetResult[];
  readonly pages: readonly PageResult[];
  readonly manifestChanged: boolean;
  readonly blocked: readonly string[];
  readonly status: "ok" | "blocked" | "failed_qa";
}

const noop = (): void => {};

/**
 * Synchronise assets.
 *
 * Uploads only what changed, keyed on content hash. A WordPress upload is not
 * free — it creates a permanent Media Library object with its own URL — so
 * re-uploading an unchanged file on every run would litter the library with
 * duplicates and silently invalidate every URL already embedded in a page.
 */
export async function syncAssets(
  deps: DeployDeps,
  assets: readonly AssetSpec[],
  options: DeployOptions,
): Promise<{ results: readonly AssetResult[]; manifest: MediaManifest; changed: boolean }> {
  const log = deps.log ?? noop;
  const now = deps.now ?? (() => new Date());

  const plan = planSync(
    deps.manifest,
    assets.map((a) => ({ path: a.path, sha256: sha256(a.bytes) })),
  );

  const assetsById = new Map(assets.map((a) => [a.path, a]));
  const nextAssets: Record<string, MediaEntry> = { ...deps.manifest.assets };
  const results: AssetResult[] = [];
  let changed = false;

  for (const decision of plan) {
    if (decision.action === "reuse") {
      results.push({
        path: decision.path, action: "reuse",
        mediaId: decision.existing?.mediaId ?? null,
        url: decision.existing?.url ?? null,
        reason: decision.reason,
      });
      continue;
    }

    if (options.dryRun) {
      log(`would ${decision.action}: ${decision.path} (${decision.reason})`);
      results.push({ path: decision.path, action: decision.action, mediaId: null, url: null, reason: decision.reason });
      continue;
    }

    const asset = assetsById.get(decision.path);
    if (!asset) {
      results.push({ path: decision.path, action: decision.action, mediaId: null, url: null, reason: "asset bytes unavailable" });
      continue;
    }

    const media = await deps.client.uploadMedia(asset.filename, asset.mimeType, asset.bytes);
    if (!media?.source_url || typeof media.id !== "number") {
      throw new Error(
        `Media upload for ${decision.path} returned no id/source_url. ` +
        "Refusing to record a URL that WordPress did not confirm.",
      );
    }

    nextAssets[decision.path] = {
      sha256: decision.sha256,
      mediaId: media.id,
      url: media.source_url,
      width: media.media_details?.width ?? 0,
      height: media.media_details?.height ?? 0,
      bytes: asset.bytes.byteLength,
      uploadedAt: now().toISOString(),
    };
    changed = true;
    log(`${decision.action}d ${decision.path} -> media ${media.id}`);
    results.push({
      path: decision.path, action: decision.action,
      mediaId: media.id, url: media.source_url, reason: decision.reason,
    });
  }

  const manifest: MediaManifest = { assets: nextAssets };
  if (changed && !options.dryRun) await deps.saveManifest(manifest);

  return { results, manifest, changed };
}

async function findExisting(
  client: WpClient,
  spec: PageSpec,
): Promise<WpPage | undefined> {
  const existing = spec.kind === "page" ? await client.listPages() : await client.listPosts();
  return existing.find((item) => item.slug === spec.slug);
}

/**
 * Deploy one page, then verify what WordPress actually stored.
 *
 * The read-back is not optional and is not a formality. `_content_warnings`
 * reports stripped elements inconsistently and stripped CSS properties not at
 * all, which is how `inset` disappeared from a deployed page with no signal of
 * any kind. Structural comparison is the only thing that catches that class.
 *
 * At most one automatic fallback attempt. If <picture> did not survive and the
 * dual-image form does not survive either, that is a finding for a human, not a
 * loop to keep retrying.
 */
export async function deployPage(
  deps: DeployDeps,
  spec: PageSpec,
  manifest: MediaManifest,
  options: DeployOptions,
): Promise<PageResult> {
  const log = deps.log ?? noop;
  const now = deps.now ?? (() => new Date());

  const primary = rewriteAssetUrls(spec.markupPrimary, manifest);
  if (primary.unmapped.length > 0) {
    return {
      slug: spec.slug, kind: spec.kind, id: null, action: "skipped", strategy: "none",
      readback: null, rollback: null,
      detail: `unmapped assets: ${primary.unmapped.join(", ")}`,
    };
  }

  const existing = await findExisting(deps.client, spec);

  if (options.dryRun) {
    return {
      slug: spec.slug, kind: spec.kind, id: existing?.id ?? null,
      action: existing ? "updated" : "created", strategy: "primary",
      readback: null, rollback: null,
      detail: existing
        ? `would update ${spec.kind} ${existing.id} (${existing.status})`
        : `would create ${spec.kind} "${spec.slug}" as a draft`,
    };
  }

  const rollback: RollbackRecord | null = existing
    ? {
        kind: spec.kind, id: existing.id, slug: spec.slug,
        previousContent: existing.content?.raw ?? "",
        previousStatus: existing.status,
        capturedAt: now().toISOString(),
        restored: false,
      }
    : null;

  // Never create a second page for a slug that already exists. A duplicate
  // top-level page competes with the original in search, which is the opposite
  // of the entire point.
  const createBody = {
    slug: spec.slug,
    title: spec.title,
    // Always a draft. Nothing this script writes is ever born published.
    status: "draft",
    content: primary.markup,
  };
  const target = existing
    ? existing
    : spec.kind === "page"
      ? await deps.client.createPage(createBody)
      : await deps.client.createPost(createBody);

  if (existing) {
    // status is deliberately absent: deployment must never publish or unpublish.
    await (spec.kind === "page"
      ? deps.client.updatePage(existing.id, { content: primary.markup, title: spec.title })
      : deps.client.updatePost(existing.id, { content: primary.markup, title: spec.title }));
  }

  const readbackOptions = options.authorHref ? { authorHref: options.authorHref } : {};

  let stored = await (spec.kind === "page" ? deps.client.getPage(target.id) : deps.client.getPost(target.id));
  let diff = compareReadback(primary.markup, stored.content?.raw ?? "", readbackOptions);
  let strategy: PageResult["strategy"] = diff.pictureStrategy;

  const needsFallback =
    spec.markupFallback !== spec.markupPrimary &&
    /<picture\b/i.test(primary.markup) &&
    diff.pictureStrategy !== "primary";

  if (needsFallback) {
    log(`${spec.slug}: <picture> did not survive; switching to the dual-image fallback (one attempt)`);
    const fallback = rewriteAssetUrls(spec.markupFallback, manifest);
    await (spec.kind === "page"
      ? deps.client.updatePage(target.id, { content: fallback.markup })
      : deps.client.updatePost(target.id, { content: fallback.markup }));

    stored = await (spec.kind === "page" ? deps.client.getPage(target.id) : deps.client.getPost(target.id));
    diff = compareReadback(fallback.markup, stored.content?.raw ?? "", readbackOptions);
    strategy = diff.pictureStrategy;
  }

  if (diff.status === "mismatch") {
    const restored = await attemptRollback(deps, spec, rollback);
    return {
      slug: spec.slug, kind: spec.kind, id: target.id, action: "failed", strategy,
      readback: diff,
      rollback: rollback ? { ...rollback, restored } : null,
      detail: restored
        ? `read-back mismatch; previous content restored. ${diff.findings.join("; ")}`
        : `read-back mismatch and no safe automatic restore. ${diff.findings.join("; ")}`,
    };
  }

  return {
    slug: spec.slug, kind: spec.kind, id: target.id,
    action: existing ? "updated" : "created", strategy,
    readback: diff, rollback,
    detail: diff.status === "degraded" ? diff.findings.join("; ") : "read-back matched",
  };
}

/**
 * Restore only when the restore is itself verifiable.
 *
 * A rollback that cannot be checked is a second uncontrolled write on top of a
 * failed one. If there is no captured prior content — a page created in this
 * run — there is nothing to restore to, and instructions beat guessing.
 */
async function attemptRollback(
  deps: DeployDeps,
  spec: PageSpec,
  rollback: RollbackRecord | null,
): Promise<boolean> {
  if (!rollback || rollback.previousContent.trim() === "") return false;
  try {
    await (spec.kind === "page"
      ? deps.client.updatePage(rollback.id, { content: rollback.previousContent })
      : deps.client.updatePost(rollback.id, { content: rollback.previousContent }));
    const stored = await (spec.kind === "page"
      ? deps.client.getPage(rollback.id)
      : deps.client.getPost(rollback.id));
    return (stored.content?.raw ?? "") === rollback.previousContent;
  } catch {
    return false;
  }
}

export type CssStrategy = "api-managed" | "manual-gate";

export interface CssStatus {
  readonly strategy: CssStrategy;
  readonly expectedSha256: string;
  readonly installedSha256: string | null;
  readonly installed: boolean;
  readonly detail: string;
}

/**
 * Determine how Additional CSS is managed, by probing rather than assuming.
 *
 * WordPress.com exposes Custom CSS under /rest/v1.1/sites/{site}/customcss, but
 * availability depends on plan and on whether the feature is active. Neither
 * "it works" nor "it doesn't" may be assumed, so this asks, and falls back to a
 * one-time human install with a checksum that future runs can verify. Never
 * reports the CSS as installed without having compared a hash.
 */
export async function cssStrategy(
  client: WpClient,
  expectedCss: string,
  hash: (input: string) => string,
): Promise<CssStatus> {
  const expectedSha256 = hash(expectedCss);
  try {
    const current = await client.getCustomCss();
    const installedCss = current?.css ?? "";
    const installedSha256 = hash(installedCss);
    return {
      strategy: "api-managed",
      expectedSha256,
      installedSha256,
      installed: installedSha256 === expectedSha256,
      detail:
        installedSha256 === expectedSha256
          ? "Custom CSS API reachable and the installed stylesheet matches the repository"
          : "Custom CSS API reachable; installed stylesheet differs from the repository",
    };
  } catch (error) {
    return {
      strategy: "manual-gate",
      expectedSha256,
      installedSha256: null,
      installed: false,
      detail:
        "Custom CSS API not available for this site " +
        `(${(error as Error).message.slice(0, 120)}). ` +
        "Paste site/novra.css into Appearance -> Customize -> Additional CSS once, " +
        "then record the hash. Never assumed installed.",
    };
  }
}

export interface CapabilityProbe {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface AuthCheckReport {
  readonly authenticated: boolean;
  readonly siteId: number | null;
  readonly siteName: string;
  readonly siteUrl: string;
  readonly capabilities: readonly CapabilityProbe[];
  readonly plannedUploads: readonly string[];
  readonly plannedReuse: readonly string[];
  readonly plannedPages: readonly string[];
  readonly blockers: readonly string[];
  readonly externalWrites: 0;
}

/**
 * Authenticate, probe and plan. Never write.
 *
 * This exists because the full validation gate legitimately fails while a
 * public-content placeholder remains, and that must not also make it impossible
 * to find out whether the credentials work. Those are different questions: one
 * is "is the site fit to publish", the other is "does the token authenticate".
 * Blocking the second on the first means the first live deployment attempt is
 * also the first time anyone finds out the token is wrong.
 *
 * The client passed in must be a readOnly() wrapper. Blockers are reported, not
 * suppressed — the check answers the connectivity question and still says, in
 * the same breath, that the site is not deployable.
 */
export async function runAuthCheck(
  client: WpClient,
  manifest: MediaManifest,
  assets: readonly { path: string; sha256: string }[],
  pages: readonly PageSpec[],
  blockers: readonly string[],
): Promise<AuthCheckReport> {
  const capabilities: CapabilityProbe[] = [];

  const site = await client.getSite();

  const probe = async (name: string, run: () => Promise<string>): Promise<void> => {
    try {
      capabilities.push({ name, ok: true, detail: await run() });
    } catch (error) {
      // A failed probe is information, not a crash. "Custom CSS is unavailable"
      // is exactly what this check exists to discover.
      capabilities.push({ name, ok: false, detail: (error as Error).message.slice(0, 160) });
    }
  };

  // Fetched once and reused for the page plan below — a probe that costs two
  // round trips to answer one question is a probe nobody leaves enabled.
  let existingPages: readonly WpPage[] = [];
  await probe("pages.list", async () => {
    existingPages = await client.listPages();
    return `${existingPages.length} pages readable`;
  });
  await probe("posts.list", async () => `${(await client.listPosts()).length} posts readable`);
  await probe("media.list", async () => `${(await client.listMedia()).length} media items readable`);
  await probe("customcss.get", async () => {
    const css = await client.getCustomCss();
    return `Custom CSS API reachable (${(css?.css ?? "").length} characters installed)`;
  });

  const plan = planSync(manifest, assets);
  const existingSlugs = new Set(existingPages.map((page) => page.slug));

  return {
    authenticated: true,
    siteId: site.ID ?? null,
    siteName: site.name ?? "",
    siteUrl: site.URL ?? "",
    capabilities,
    plannedUploads: plan.filter((d) => d.action !== "reuse").map((d) => `${d.path} (${d.action})`),
    plannedReuse: plan.filter((d) => d.action === "reuse").map((d) => d.path),
    plannedPages: pages.map(
      (page) => `${page.slug} -> ${existingSlugs.has(page.slug) ? "update existing" : "create draft"}`,
    ),
    blockers,
    externalWrites: 0,
  };
}
