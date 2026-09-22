/**
 * POST /api/contact/ — accept an inquiry and hand it to the mail provider.
 *
 * The browser validates too, but nothing here trusts that. Every rule is
 * applied again on this side, because the form is not the only thing that can
 * send a request to this URL.
 *
 * Nothing is persisted. The payload is validated, delivered and dropped: there
 * is no table, no queue and no file, so an inquiry exists in exactly one place
 * afterwards — the mailbox it was addressed to. That is a deliberate
 * minimisation, not an omission.
 */
import { NextResponse } from "next/server";
import { deliverInquiry } from "@/lib/contact/mailer";
import { HONEYPOT_FIELD, MIN_ELAPSED_MS, validateContact } from "@/lib/contact/schema";

// Credentials are read per request and delivery is a side effect, so this
// route must never be prerendered or cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Refuse a body large enough to be an attack rather than an inquiry. */
const MAX_BODY_BYTES = 64 * 1024;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

/**
 * Best-effort rate limiting, and honest about it.
 *
 * This Map lives in one serverless instance. Vercel runs several and recycles
 * them, so a determined sender spread across instances gets more than
 * MAX_PER_WINDOW, and a cold start forgets everything. Doing it properly needs
 * shared state — Redis, Vercel KV, Upstash — which is a new paid dependency
 * this pass was told not to introduce without approval.
 *
 * So this is what it is: it stops the accidental double-click and the
 * single-source flood, and it is documented in docs/contact-form.md as
 * insufficient against a distributed sender. The honeypot and the length caps
 * carry the rest.
 */
const hits = new Map<string, number[]>();

function rateLimited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  // Bound the map so a long-lived instance cannot grow one entry per caller
  // forever. Anything with no hit inside the window is gone anyway.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((at) => now - at >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const now = Date.now();

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "too-large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "malformed" }, { status: 400 });
  }

  const envelope: Record<string, unknown> =
    typeof payload === "object" && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  /*
   * Honeypot, answered with a success.
   *
   * Telling a bot it was caught teaches whoever wrote it which field to leave
   * alone next time. Nothing is sent; the caller is told what a caller is
   * always told. A real visitor never sees this path — the field is
   * off-screen, unfocusable and hidden from assistive technology.
   */
  const honeypot = envelope[HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Same reasoning for a submission that arrived faster than a person types.
  const elapsed = Number(envelope.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_ELAPSED_MS) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const result = validateContact(envelope);
  if (!result.ok) {
    // The field names and the messages, never the values.
    return NextResponse.json({ ok: false, error: "invalid", errors: result.errors }, { status: 400 });
  }

  if (rateLimited(clientKey(request), now)) {
    return NextResponse.json({ ok: false, error: "rate-limited" }, { status: 429 });
  }

  const delivery = await deliverInquiry(result.values);

  if (!delivery.delivered) {
    /*
     * Log the fault, not the inquiry. The visitor's address and the message
     * body stay out of the runtime log: they are the personal data this form
     * exists to move from one place to exactly one other place, and a log is a
     * third place. The operator gets what they need to fix it.
     */
    if (delivery.reason === "not-configured") {
      console.error(`[contact] not configured; missing: ${delivery.missing.join(", ")}`);
    } else {
      console.error(`[contact] provider rejected the send: status=${delivery.status} ${delivery.detail}`);
    }
    return NextResponse.json({ ok: false, error: "delivery" }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

/**
 * Anything other than POST gets a 405 with an Allow header, rather than the
 * framework's 404. A 404 on a URL that exists is a small lie that costs an
 * operator time when they are checking whether the route deployed at all.
 */
export async function GET() {
  return NextResponse.json({ ok: false, error: "method-not-allowed" }, { status: 405, headers: { Allow: "POST" } });
}
