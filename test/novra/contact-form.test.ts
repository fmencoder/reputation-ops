/**
 * The contact form's server-side contract.
 *
 * These exercise the route handler itself — imported and called with real
 * Request objects — rather than a re-implementation of its rules, so a change
 * to the route that loosens validation fails here instead of shipping.
 *
 * `fetch` is stubbed at the global, which is the only thing the mailer uses to
 * reach the provider. That makes "what would have been sent" inspectable: the
 * destination address, the Reply-To, and whether a request was attempted at all.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  INQUIRY_TYPES,
  LIMITS,
  validateContact,
  stripControlCharacters,
} from "../../frontend/lib/contact/schema";

const DEST = "contact@novraintelligence.com";

type Captured = { url: string; body: Record<string, unknown>; auth: string };

let captured: Captured[] = [];

/** A submission that should pass every rule. */
const valid = () => ({
  name: "Test Sender",
  email: "test.sender@example.org",
  organization: "Example Institute",
  inquiryType: "Research",
  subject: "Test subject line",
  message: "This is a test message with enough substance to be a real inquiry.",
  elapsedMs: 30_000,
});

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://novraintelligence.com/api/contact/", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** Import the route fresh so its in-memory rate-limit map starts empty. */
async function loadRoute() {
  vi.resetModules();
  return import("../../frontend/app/api/contact/route");
}

beforeEach(() => {
  captured = [];
  process.env.RESEND_API_KEY = "re_test_key_not_a_real_credential";
  process.env.CONTACT_FROM_EMAIL = "inquiries@example-sender.test";
  delete process.env.CONTACT_INBOX;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      captured.push({
        url: String(url),
        body: JSON.parse(String(init.body)),
        auth: String((init.headers as Record<string, string>).Authorization ?? ""),
      });
      return new Response(JSON.stringify({ id: "test-message-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("validation rules", () => {
  it("accepts a complete, well-formed submission", () => {
    expect(validateContact(valid()).ok).toBe(true);
  });

  it("rejects each missing required field, and never the optional one", () => {
    for (const field of ["name", "email", "inquiryType", "subject", "message"] as const) {
      const result = validateContact({ ...valid(), [field]: "" });
      expect(result.ok, `${field} should be required`).toBe(false);
      expect(result.errors[field]).toBeTruthy();
    }
    const withoutOrg = validateContact({ ...valid(), organization: "" });
    expect(withoutOrg.ok).toBe(true);
  });

  it("rejects malformed email addresses and accepts ordinary ones", () => {
    for (const bad of ["plainstring", "no@domain", "two@@at.com", "spaces in@example.com", "@example.com"]) {
      expect(validateContact({ ...valid(), email: bad }).ok, bad).toBe(false);
    }
    for (const good of ["a@b.co", "first.last+tag@sub.example.org"]) {
      expect(validateContact({ ...valid(), email: good }).ok, good).toBe(true);
    }
  });

  it("accepts only the five published inquiry types", () => {
    for (const type of INQUIRY_TYPES) {
      expect(validateContact({ ...valid(), inquiryType: type }).ok, type).toBe(true);
    }
    for (const bad of ["Sales", "research", "<script>", "Research; DROP", ""]) {
      expect(validateContact({ ...valid(), inquiryType: bad }).ok, bad).toBe(false);
    }
  });

  it("rejects overlong input on every bounded field", () => {
    const cases: [keyof typeof LIMITS, number][] = [
      ["name", LIMITS.name],
      ["email", LIMITS.email],
      ["organization", LIMITS.organization],
      ["subject", LIMITS.subject],
      ["message", LIMITS.message],
    ];
    for (const [field, limit] of cases) {
      const over = field === "email" ? `${"a".repeat(limit)}@example.com` : "a".repeat(limit + 1);
      expect(validateContact({ ...valid(), [field]: over }).ok, `${field} over limit`).toBe(false);
    }
  });

  it("survives payloads that are not objects at all", () => {
    for (const junk of [null, undefined, 42, "a string", [], [1, 2, 3], { name: 7, email: {} }]) {
      expect(() => validateContact(junk)).not.toThrow();
      expect(validateContact(junk).ok).toBe(false);
    }
  });

  it("strips the characters that would split one mail header into two", () => {
    const injected = "Subject line\r\nBcc: attacker@example.com";
    expect(stripControlCharacters(injected)).not.toMatch(/[\r\n]/);
    const result = validateContact({ ...valid(), subject: injected });
    expect(result.values.subject).not.toMatch(/[\r\n]/);
    expect(result.values.name).not.toMatch(/[\r\n]/);
  });
});

describe("route handler", () => {
  it("delivers a valid submission and answers 200", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post(valid()));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(captured).toHaveLength(1);
  });

  it("sends to the fixed destination, which the payload cannot change", async () => {
    const { POST } = await loadRoute();
    await POST(
      post({
        ...valid(),
        // Every shape an attacker might try to redirect delivery with.
        to: ["attacker@example.com"],
        destination: "attacker@example.com",
        recipient: "attacker@example.com",
        CONTACT_INBOX: "attacker@example.com",
      }),
    );
    expect(captured[0].body.to).toEqual([DEST]);
    expect(JSON.stringify(captured[0].body)).not.toContain("attacker@example.com");
  });

  it("uses the visitor's address as Reply-To only, never as the destination", async () => {
    const { POST } = await loadRoute();
    await POST(post(valid()));
    const sent = captured[0].body;
    expect(sent.reply_to).toBe("test.sender@example.org");
    expect(sent.to).toEqual([DEST]);
    expect(sent.to).not.toContain("test.sender@example.org");
  });

  it("carries all six fields into the notification", async () => {
    const { POST } = await loadRoute();
    await POST(post(valid()));
    const text = String(captured[0].body.text);
    for (const fragment of [
      "Test Sender",
      "test.sender@example.org",
      "Example Institute",
      "Research",
      "Test subject line",
      "This is a test message",
    ]) {
      expect(text, fragment).toContain(fragment);
    }
  });

  it("escapes visitor content in the HTML part", async () => {
    const { POST } = await loadRoute();
    await POST(post({ ...valid(), message: "<img src=x onerror=alert(1)>", name: "A & B <tag>" }));
    const html = String(captured[0].body.html);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("A &amp; B &lt;tag&gt;");
  });

  it("answers 400 with field errors and sends nothing when invalid", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post({ ...valid(), email: "not-an-email", subject: "" }));
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.errors.email).toBeTruthy();
    expect(payload.errors.subject).toBeTruthy();
    expect(captured).toHaveLength(0);
  });

  it("answers 400 on a malformed body rather than throwing", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post("{not json at all"));
    expect(response.status).toBe(400);
    expect(captured).toHaveLength(0);
  });

  it("silently drops a submission that filled the honeypot", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post({ ...valid(), website: "http://spam.example" }));
    // 200 on purpose: telling a bot it was caught teaches it which field to skip.
    expect(response.status).toBe(200);
    expect(captured).toHaveLength(0);
  });

  it("silently drops a submission that arrived faster than a person types", async () => {
    const { POST } = await loadRoute();
    const response = await POST(post({ ...valid(), elapsedMs: 40 }));
    expect(response.status).toBe(200);
    expect(captured).toHaveLength(0);
  });

  it("rate limits a single source after five accepted submissions", async () => {
    const { POST } = await loadRoute();
    const from = { "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 5; i += 1) {
      expect((await POST(post(valid(), from))).status).toBe(200);
    }
    const sixth = await POST(post(valid(), from));
    expect(sixth.status).toBe(429);
    expect(captured).toHaveLength(5);
  });

  it("answers 502 when the provider rejects the send", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("domain is not verified", { status: 403 })),
    );
    const { POST } = await loadRoute();
    const response = await POST(post(valid()));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "delivery" });
  });

  it("answers 502 when the provider is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const { POST } = await loadRoute();
    expect((await POST(post(valid()))).status).toBe(502);
  });

  it("answers 502 — not 200 — when no credentials are configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_FROM_EMAIL;
    const { POST } = await loadRoute();
    const response = await POST(post(valid()));
    expect(response.status).toBe(502);
    expect(captured).toHaveLength(0);
  });

  it("keeps the visitor's address and message body out of the runtime log", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("provider says no", { status: 500 })));
    const { POST } = await loadRoute();
    await POST(post(valid()));
    const logged = errorLog.mock.calls.flat().join(" ");
    expect(logged).not.toContain("test.sender@example.org");
    expect(logged).not.toContain("This is a test message");
    // It must still say enough to be actionable.
    expect(logged).toContain("500");
  });

  it("answers 405 with an Allow header on GET", async () => {
    const { GET } = await loadRoute();
    const response = await GET();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});

describe("secrets stay on the server", () => {
  const FRONTEND = join(__dirname, "..", "..", "frontend");

  it("never marks a mail credential NEXT_PUBLIC_", () => {
    const source = [
      readFileSync(join(FRONTEND, "lib", "contact", "mailer.ts"), "utf8"),
      readFileSync(join(FRONTEND, "app", "api", "contact", "route.ts"), "utf8"),
      readFileSync(join(FRONTEND, "components", "ContactForm.tsx"), "utf8"),
    ].join("\n");
    expect(source).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN|PASSWORD)/);
  });

  it("keeps the client component clear of process.env and the mailer", () => {
    const form = readFileSync(join(FRONTEND, "components", "ContactForm.tsx"), "utf8");
    expect(form).toContain('"use client"');
    expect(form).not.toContain("process.env");
    expect(form).not.toContain("contact/mailer");
    expect(form).not.toContain("RESEND");
  });

  it("leaves no credential name in the built client bundle", () => {
    // Skips rather than fails when there is no build to inspect, so the suite
    // still runs on a clean checkout; CI builds before it gets here.
    const chunks = join(FRONTEND, ".next", "static", "chunks");
    let files: string[];
    try {
      files = readdirSync(chunks).filter((f) => f.endsWith(".js"));
    } catch {
      return;
    }
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const full = join(chunks, file);
      if (!statSync(full).isFile()) continue;
      const content = readFileSync(full, "utf8");
      expect(content, file).not.toContain("RESEND_API_KEY");
      expect(content, file).not.toContain("api.resend.com");
      expect(content, file).not.toContain("CONTACT_FROM_EMAIL");
    }
  });
});
