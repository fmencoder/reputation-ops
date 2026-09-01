/**
 * Deployment tests.
 *
 * Every WordPress interaction is against a fake client. Nothing here touches a
 * network, and nothing here can write to a production site — a test suite that
 * could is a test suite nobody dares run.
 */

import { describe, expect, it } from "vitest";

import {
  readOnly, redact, ReadOnlyViolationError, WpClient, WpError, WRITE_METHODS,
} from "../../src/novra/wp-client.js";
import {
  parseManifest, planSync, rewriteAssetUrls, serializeManifest, sha256,
  type MediaManifest,
} from "../../src/novra/media-manifest.js";
import { compareReadback, detectPictureStrategy } from "../../src/novra/readback.js";
import { cssStrategy, deployPage, runAuthCheck, syncAssets, type PageSpec } from "../../src/novra/deploy.js";

const TOKEN = "wpcom-secret-token-value";

function manifestWith(entries: Record<string, string>): MediaManifest {
  const assets: MediaManifest["assets"] = {};
  for (const [path, url] of Object.entries(entries)) {
    assets[path] = {
      sha256: "a".repeat(64), mediaId: 1, url,
      width: 1600, height: 900, bytes: 10, uploadedAt: "2026-08-31T00:00:00.000Z",
    };
  }
  return { assets };
}

/** Minimal in-memory WordPress. Records every write so tests can assert on them. */
class FakeWp {
  pages = new Map<number, { id: number; slug: string; status: string; content: { raw: string } }>();
  media: { id: number; source_url: string }[] = [];
  writes: { kind: string; id: number; content?: string }[] = [];
  nextId = 100;
  /** Applied to content on store, standing in for KSES. */
  sanitiser: (html: string) => string = (html) => html;
  uploadFails = false;
  updateFails = false;

  seedPage(slug: string, content: string): number {
    const id = this.nextId++;
    this.pages.set(id, { id, slug, status: "draft", content: { raw: content } });
    return id;
  }

  asClient(): WpClient {
    const self = this;
    const client = {
      async listPages() { return [...self.pages.values()]; },
      async listPosts() { return []; },
      async getPage(id: number) { return self.pages.get(id); },
      async getPost(id: number) { return self.pages.get(id); },
      async updatePage(id: number, body: Record<string, unknown>) {
        if (self.updateFails) throw new WpError("500 boom", 500, "/pages");
        const page = self.pages.get(id);
        if (page && typeof body["content"] === "string") {
          page.content = { raw: self.sanitiser(body["content"]) };
        }
        self.writes.push({ kind: "updatePage", id, content: String(body["content"] ?? "") });
        return page;
      },
      async updatePost(id: number, body: Record<string, unknown>) {
        return client.updatePage(id, body);
      },
      async createPage(body: Record<string, unknown>) {
        const id = self.nextId++;
        const content = self.sanitiser(String(body["content"] ?? ""));
        self.pages.set(id, { id, slug: String(body["slug"]), status: "draft", content: { raw: content } });
        self.writes.push({ kind: "createPage", id });
        return self.pages.get(id);
      },
      async createPost(body: Record<string, unknown>) { return client.createPage(body); },
      async uploadMedia(filename: string) {
        if (self.uploadFails) throw new WpError("413 too large", 413, "/media");
        const id = self.nextId++;
        const media = { id, source_url: `https://cdn.example/${filename}`, media_details: { width: 1600, height: 900 } };
        self.media.push(media);
        return media;
      },
      async getCustomCss() { throw new WpError("404 not found", 404, "/customcss"); },
      // Real clients expose this from the normalisation done at construction;
      // the fake carries a fixed synthetic identity so tests can assert the
      // report surfaces it.
      tokenIdentity: { length: 33, fingerprint: "abcdef012345", normalizationApplied: false },
    };
    return client as unknown as WpClient;
  }
}

const PRIMARY = `<figure class="figure"><div class="figure__frame"><picture>` +
  `<source media="(max-width: 620px)" srcset="/assets/e-mobile.webp" width="900" height="1200">` +
  `<img src="/assets/e.webp" width="1600" height="900" alt="A described diagram of the convergence path.">` +
  `</picture></div><figcaption>Caption.</figcaption></figure>`;

const FALLBACK = `<figure class="figure"><div class="figure__frame">` +
  `<img class="figure__desktop" src="/assets/e.webp" width="1600" height="900" alt="A described diagram of the convergence path.">` +
  `<img class="figure__mobile" src="/assets/e-mobile.webp" width="900" height="1200" alt="A described diagram of the convergence path.">` +
  `</div><figcaption>Caption.</figcaption></figure>`;

const SPEC: PageSpec = {
  slug: "technology", title: "Technology", kind: "page",
  markupPrimary: PRIMARY, markupFallback: FALLBACK,
};

const MAPPED = manifestWith({
  "/assets/e.webp": "https://cdn.example/e.webp",
  "/assets/e-mobile.webp": "https://cdn.example/e-mobile.webp",
});

function deps(wp: FakeWp, manifest: MediaManifest = MAPPED) {
  return {
    client: wp.asClient(),
    manifest,
    saveManifest: async () => {},
    now: () => new Date("2026-08-31T12:00:00Z"),
  };
}

describe("credentials and secrets", () => {
  it("refuses to construct without a site or a token", () => {
    expect(() => new WpClient({ site: "", token: TOKEN })).toThrow(/site/i);
    expect(() => new WpClient({ site: "x.com", token: "" })).toThrow(/token/i);
  });

  it("redacts the token and any bearer header out of error text", () => {
    const leaked = `Authorization: Bearer ${TOKEN} failed; {"access_token":"${TOKEN}"}`;
    const safe = redact(leaked, TOKEN);
    expect(safe).not.toContain(TOKEN);
    expect(safe).toContain("[REDACTED]");
  });

  it("never puts the token into a thrown API error", async () => {
    const client = new WpClient({
      site: "x.com", token: TOKEN,
      fetchImpl: async () => new Response(`denied for ${TOKEN}`, { status: 403, statusText: "Forbidden" }),
    });
    await expect(client.getSite()).rejects.toThrow(/403/);
    await client.getSite().catch((error: WpError) => {
      expect(error.message).not.toContain(TOKEN);
    });
  });
});

describe("media manifest", () => {
  it("treats a bare URL string as unverifiable and discards it", () => {
    const { manifest, discarded } = parseManifest('{"assets":{"/assets/a.webp":"https://cdn/a.webp"}}');
    expect(discarded).toEqual(["/assets/a.webp"]);
    expect(manifest.assets).toEqual({});
  });

  it("reuses an unchanged asset and re-uploads a changed one", () => {
    const hash = sha256(new Uint8Array([1, 2, 3]));
    const manifest: MediaManifest = {
      assets: {
        "/assets/same.webp": { sha256: hash, mediaId: 1, url: "https://cdn/same.webp", width: 1, height: 1, bytes: 3, uploadedAt: "" },
        "/assets/changed.webp": { sha256: "b".repeat(64), mediaId: 2, url: "https://cdn/changed.webp", width: 1, height: 1, bytes: 3, uploadedAt: "" },
      },
    };
    const plan = planSync(manifest, [
      { path: "/assets/same.webp", sha256: hash },
      { path: "/assets/changed.webp", sha256: hash },
      { path: "/assets/new.webp", sha256: hash },
    ]);
    expect(plan.map((p) => p.action)).toEqual(["reuse", "replace", "upload"]);
  });

  it("reports unmapped assets instead of guessing a URL", () => {
    const result = rewriteAssetUrls('<img src="/assets/missing.webp">', { assets: {} });
    expect(result.unmapped).toEqual(["/assets/missing.webp"]);
    expect(result.markup).toContain("/assets/missing.webp");
  });

  it("refuses an SVG referenced as an image source", () => {
    expect(() => rewriteAssetUrls('<img src="/assets/panel.svg">', { assets: {} }))
      .toThrow(/svg\+xml/);
  });

  it("round-trips and never serialises a credential", () => {
    const text = serializeManifest(MAPPED);
    // Matches credential-shaped values, not the word "secret" in the file's own
    // comment explaining that it holds none.
    expect(text).not.toContain(TOKEN);
    expect(text).not.toMatch(/Bearer\s+\S/);
    expect(text).not.toMatch(/"(?:access_token|api_key|password)"/i);
    expect(parseManifest(text).manifest.assets["/assets/e.webp"]?.url).toBe("https://cdn.example/e.webp");
  });
});

describe("asset sync", () => {
  it("uploads nothing on a dry run", async () => {
    const wp = new FakeWp();
    const result = await syncAssets(
      deps(wp, { assets: {} }),
      [{ path: "/assets/e.webp", filename: "e.webp", mimeType: "image/webp", bytes: new Uint8Array([1]) }],
      { dryRun: true },
    );
    expect(wp.media).toHaveLength(0);
    expect(result.results[0]?.action).toBe("upload");
    expect(result.results[0]?.url).toBeNull();
  });

  it("is idempotent: a second run with unchanged bytes uploads nothing", async () => {
    const wp = new FakeWp();
    const bytes = new Uint8Array([1, 2, 3]);
    const asset = { path: "/assets/e.webp", filename: "e.webp", mimeType: "image/webp", bytes };
    const first = await syncAssets(deps(wp, { assets: {} }), [asset], { dryRun: false });
    expect(wp.media).toHaveLength(1);
    const second = await syncAssets(deps(wp, first.manifest), [asset], { dryRun: false });
    expect(wp.media).toHaveLength(1);
    expect(second.results[0]?.action).toBe("reuse");
    expect(second.changed).toBe(false);
  });

  it("surfaces an upload failure rather than recording a placeholder URL", async () => {
    const wp = new FakeWp();
    wp.uploadFails = true;
    await expect(
      syncAssets(
        deps(wp, { assets: {} }),
        [{ path: "/assets/e.webp", filename: "e.webp", mimeType: "image/webp", bytes: new Uint8Array([1]) }],
        { dryRun: false },
      ),
    ).rejects.toThrow(/413/);
  });
});

describe("page deployment", () => {
  it("skips a page whose assets are not in the manifest", async () => {
    const wp = new FakeWp();
    const result = await deployPage(deps(wp, { assets: {} }), SPEC, { assets: {} }, { dryRun: false });
    expect(result.action).toBe("skipped");
    expect(result.detail).toContain("/assets/e.webp");
    expect(wp.writes).toHaveLength(0);
  });

  it("updates an existing page rather than creating a duplicate", async () => {
    const wp = new FakeWp();
    const id = wp.seedPage("technology", "<p>old</p>");
    const result = await deployPage(deps(wp), SPEC, MAPPED, { dryRun: false });
    expect(result.id).toBe(id);
    expect(result.action).toBe("updated");
    expect(wp.pages.size).toBe(1);
    expect(wp.writes.some((w) => w.kind === "createPage")).toBe(false);
  });

  it("writes nothing at all on a dry run", async () => {
    const wp = new FakeWp();
    wp.seedPage("technology", "<p>old</p>");
    await deployPage(deps(wp), SPEC, MAPPED, { dryRun: true });
    expect(wp.writes).toHaveLength(0);
  });

  it("keeps <picture> when WordPress preserves it, and does not attempt a fallback", async () => {
    const wp = new FakeWp();
    wp.seedPage("technology", "<p>old</p>");
    const result = await deployPage(deps(wp), SPEC, MAPPED, { dryRun: false });
    expect(result.strategy).toBe("primary");
    expect(result.readback?.status).toBe("match");
    expect(wp.writes.filter((w) => w.kind === "updatePage")).toHaveLength(1);
  });

  it("switches to the dual-image fallback when <source> is stripped, exactly once", async () => {
    const wp = new FakeWp();
    wp.seedPage("technology", "<p>old</p>");
    wp.sanitiser = (html) => html.replace(/<source\b[^>]*>/gi, "").replace(/<\/?picture>/gi, "");
    const result = await deployPage(deps(wp), SPEC, MAPPED, { dryRun: false });
    expect(result.strategy).toBe("fallback");
    expect(result.action).toBe("updated");
    // primary attempt + one fallback attempt, and no third try.
    expect(wp.writes.filter((w) => w.kind === "updatePage")).toHaveLength(2);
  });

  it("fails QA and restores the previous content when a figure is stripped entirely", async () => {
    const wp = new FakeWp();
    wp.seedPage("technology", "<p>previous good content</p>");
    wp.sanitiser = (html) => html.replace(/<figure[\s\S]*?<\/figure>/gi, "");
    const result = await deployPage(deps(wp), SPEC, MAPPED, { dryRun: false });
    expect(result.action).toBe("failed");
    expect(result.readback?.status).toBe("mismatch");
    expect(result.rollback?.restored).toBe(true);
    expect([...wp.pages.values()][0]?.content.raw).toBe("<p>previous good content</p>");
  });

  it("returns instructions rather than restoring when there is no prior content", async () => {
    const wp = new FakeWp();
    wp.sanitiser = (html) => html.replace(/<figure[\s\S]*?<\/figure>/gi, "");
    const result = await deployPage(deps(wp), SPEC, MAPPED, { dryRun: false });
    expect(result.action).toBe("failed");
    expect(result.rollback).toBeNull();
    expect(result.detail).toContain("no safe automatic restore");
  });
});

describe("read-back comparison", () => {
  it("detects a silently stripped CSS property", () => {
    const sent = '<div style="inset: 0; color: red"></div>';
    const stored = '<div style="color: red"></div>';
    const diff = compareReadback(sent, stored);
    expect(diff.missingStyleProperties).toContain("inset");
    expect(diff.status).toBe("degraded");
  });

  it("detects a lost alt attribute as a mismatch, not a warning", () => {
    const diff = compareReadback(
      '<img src="/a.webp" alt="described" width="1" height="1">',
      '<img src="/a.webp" width="1" height="1">',
    );
    expect(diff.missingAttributes).toContainEqual({ tag: "img", attribute: "alt" });
    expect(diff.status).toBe("mismatch");
  });

  it("tolerates a CDN rewrite of an image URL", () => {
    const diff = compareReadback(
      '<img src="/assets/e.webp" alt="x" width="1" height="1">',
      '<img src="https://cdn.example/e.webp" alt="x" width="1" height="1">',
    );
    expect(diff.rewrittenUrls).toHaveLength(0);
    expect(diff.status).toBe("match");
  });

  it("reports a missing author link", () => {
    const diff = compareReadback(
      '<a href="/about/#fredrick-mendez">Fredrick Mendez</a>',
      "<span>Fredrick Mendez</span>",
      { authorHref: "/about/#fredrick-mendez" },
    );
    expect(diff.findings.join(" ")).toMatch(/author link/);
  });

  it("identifies each responsive strategy from stored markup", () => {
    expect(detectPictureStrategy(PRIMARY)).toBe("primary");
    expect(detectPictureStrategy(FALLBACK)).toBe("fallback");
    expect(detectPictureStrategy("<img src=x>")).toBe("none");
  });
});

describe("custom CSS", () => {
  it("falls back to the manual gate when the API is unavailable, and never claims installed", async () => {
    const wp = new FakeWp();
    const status = await cssStrategy(wp.asClient(), ".figure{}", (input) => `hash:${input.length}`);
    expect(status.strategy).toBe("manual-gate");
    expect(status.installed).toBe(false);
    expect(status.installedSha256).toBeNull();
    expect(status.detail).toMatch(/Additional CSS/);
  });
});

describe("read-only client", () => {
  it("throws on every write method rather than relying on nobody calling one", () => {
    const wp = new FakeWp();
    const guarded = readOnly(wp.asClient());
    for (const method of WRITE_METHODS) {
      expect(() => (guarded as unknown as Record<string, () => unknown>)[method]?.())
        .toThrow(ReadOnlyViolationError);
    }
    expect(wp.writes).toHaveLength(0);
    expect(wp.media).toHaveLength(0);
  });

  it("passes reads through unchanged", async () => {
    const wp = new FakeWp();
    wp.seedPage("technology", "<p>x</p>");
    const guarded = readOnly(wp.asClient());
    expect(await guarded.listPages()).toHaveLength(1);
  });
});

describe("auth check", () => {
  /**
   * A FakeWp plus the one client it will be probed through. asClient() builds a
   * fresh object each call, so the patched client is returned alongside the
   * recorder rather than rebuilt per assertion.
   */
  function probeWp(): { wp: FakeWp; client: WpClient } {
    const wp = new FakeWp();
    wp.seedPage("technology", "<p>existing</p>");
    const client = wp.asClient() as unknown as Record<string, unknown>;
    client["getSite"] = async () => ({ ID: 246, name: "NOVRA Intelligence", URL: "https://novraintelligence.com" });
    return { wp, client: client as unknown as WpClient };
  }

  const assets = [
    { path: "/assets/e.webp", sha256: "a".repeat(64) },
    { path: "/assets/e-mobile.webp", sha256: "b".repeat(64) },
  ];

  it("authenticates, probes and plans without a single write", async () => {
    const { wp, client } = probeWp();
    const report = await runAuthCheck(readOnly(client), { assets: {} }, assets, [SPEC], []);

    expect(report.authenticated).toBe(true);
    expect(report.siteId).toBe(246);
    expect(report.externalWrites).toBe(0);
    expect(report.plannedUploads).toHaveLength(2);
    expect(report.plannedPages[0]).toContain("update existing");
    expect(wp.writes).toHaveLength(0);
    expect(wp.media).toHaveLength(0);
  });

  it("surfaces the token fingerprint so both ends can be compared", async () => {
    const { client } = probeWp();
    const report = await runAuthCheck(readOnly(client), { assets: {} }, assets, [SPEC], []);
    expect(report.tokenFingerprint).toBe("abcdef012345");
    expect(report.tokenLength).toBe(33);
  });

  it("tests the credential first and skips the probes when it is rejected", async () => {
    const { wp, client } = probeWp();
    (client as unknown as Record<string, unknown>)["getSite"] = async () => {
      throw new WpError('400 Bad Request: {"error":"invalid_token"}', 400, "/sites/x");
    };
    const report = await runAuthCheck(readOnly(client), { assets: {} }, assets, [SPEC], []);

    expect(report.authenticated).toBe(false);
    expect(report.tokenRejectedByWordPress).toBe(true);
    expect(report.stages.getSite).toBe("fail");
    // The probes must not run and must not be reported as failures of their
    // own — one rejected credential is one finding, not five.
    expect(report.stages.pages).toBe("skipped");
    expect(report.stages.posts).toBe("skipped");
    expect(report.stages.media).toBe("skipped");
    expect(report.stages.customCss).toBe("skipped");
    expect(report.capabilities).toHaveLength(0);
    expect(wp.writes).toHaveLength(0);
    // The fingerprint is still reported — it is the whole point of the failure
    // path, because it is what tells you whether to re-copy or stop copying.
    expect(report.tokenFingerprint).toBe("abcdef012345");
  });

  it("does not call a 500 a rejected credential", async () => {
    const { client } = probeWp();
    (client as unknown as Record<string, unknown>)["getSite"] = async () => {
      throw new WpError("500 Internal Server Error", 500, "/sites/x");
    };
    const report = await runAuthCheck(readOnly(client), { assets: {} }, assets, [SPEC], []);
    expect(report.authenticated).toBe(false);
    expect(report.tokenRejectedByWordPress).toBe(false);
  });

  it("records the customcss probe failing without failing the check", async () => {
    const { client } = probeWp();
    const report = await runAuthCheck(readOnly(client), { assets: {} }, assets, [SPEC], []);
    expect(report.stages.customCss).toBe("fail");
    expect(report.stages.getSite).toBe("pass");
    expect(report.authenticated).toBe(true);
  });

  it("records a failed capability probe instead of aborting the check", async () => {
    const { client } = probeWp();
    // getCustomCss throws on the fake, standing in for a site where the API is
    // unavailable. That is a finding, not a crash.
    const report = await runAuthCheck(readOnly(client), { assets: {} }, assets, [SPEC], []);
    const css = report.capabilities.find((c) => c.name === "customcss.get");
    expect(css?.ok).toBe(false);
    expect(report.authenticated).toBe(true);
  });

  it("normalises a token carrying clipboard artifacts at client construction", () => {
    const clean = new WpClient({ site: "x.com", token: TOKEN });
    const dirty = new WpClient({ site: "x.com", token: `  Bearer "${TOKEN}"\n` });
    expect(dirty.tokenIdentity.fingerprint).toBe(clean.tokenIdentity.fingerprint);
    expect(dirty.tokenIdentity.normalizationApplied).toBe(true);
    expect(clean.tokenIdentity.normalizationApplied).toBe(false);
  });

  it("refuses to construct a client around a malformed token", () => {
    expect(() => new WpClient({ site: "x.com", token: "two words" })).toThrow(/internal space/);
    expect(() => new WpClient({ site: "x.com", token: "Bearer " })).toThrow(/just the word/);
  });

  it("still reports a content blocker while confirming the credentials work", async () => {
    const { client } = probeWp();
    const report = await runAuthCheck(
      readOnly(client), { assets: {} }, assets, [SPEC],
      ["contact: unresolved PLACEHOLDER_CONTACT_EMAIL"],
    );
    expect(report.authenticated).toBe(true);
    expect(report.blockers).toHaveLength(1);
    expect(report.blockers[0]).toContain("PLACEHOLDER_CONTACT_EMAIL");
  });

  it("marks an already-mapped asset for reuse rather than upload", async () => {
    const { client } = probeWp();
    const manifest = manifestWith({ "/assets/e.webp": "https://cdn.example/e.webp" });
    const report = await runAuthCheck(
      readOnly(client), manifest,
      [{ path: "/assets/e.webp", sha256: "a".repeat(64) }], [SPEC], [],
    );
    expect(report.plannedReuse).toEqual(["/assets/e.webp"]);
    expect(report.plannedUploads).toHaveLength(0);
  });
});
