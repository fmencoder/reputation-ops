/**
 * Delivery for contact inquiries. Server-side only.
 *
 * This module must never be imported by a client component. It reads
 * credentials from the environment, and anything a client component imports is
 * compiled into the bundle the visitor downloads. The route handler is the only
 * caller; test/novra/contact-form.test.ts asserts that no client file reaches
 * it and that no secret name appears in the built client chunks.
 *
 * Resend over its HTTPS API rather than an SDK: the repository has no mail
 * dependency and no SMTP path of any kind (checked — nothing in either
 * package.json, no credential in the environment, no variable on the Vercel
 * project), so one had to be chosen. Calling the REST endpoint with the
 * platform's own fetch adds no package, no transitive tree and nothing to the
 * client bundle, and the provider is reachable through a single function that
 * another provider could replace without touching the route or the form.
 */
import { site } from "@/lib/site";
import type { ContactSubmission } from "./schema";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Where inquiries go.
 *
 * Read from a server-side constant, never from the request. A destination that
 * can be influenced by the payload turns a contact form into an open relay,
 * which is the single most consequential mistake available here.
 *
 * CONTACT_INBOX exists because `novraintelligence.com` currently publishes no
 * MX record, so the address below cannot receive mail yet; it lets the inbox be
 * pointed somewhere that can while that is arranged. It is a server variable —
 * not user input — and it is read at call time so a deployment can change it
 * without a rebuild.
 */
export function destinationAddress(): string {
  const override = process.env.CONTACT_INBOX?.trim();
  return override && override.includes("@") ? override : site.email;
}

export interface MailerConfig {
  apiKey: string;
  from: string;
}

export type ConfigResult =
  | { configured: true; config: MailerConfig }
  | { configured: false; missing: string[] };

/**
 * Report configuration rather than assume it.
 *
 * Returning the missing names lets the route log precisely what an operator
 * has to set, without a credential ever appearing in that log.
 */
export function readMailerConfig(): ConfigResult {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.CONTACT_FROM_EMAIL?.trim() ?? "";
  const missing: string[] = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!from) missing.push("CONTACT_FROM_EMAIL");
  return missing.length ? { configured: false, missing } : { configured: true, config: { apiKey, from } };
}

/** HTML-escape. Visitor text is data; it must not become markup in the email. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FIELD_LABELS: [keyof ContactSubmission, string][] = [
  ["name", "Name"],
  ["email", "Email"],
  ["organization", "Organization"],
  ["inquiryType", "Inquiry type"],
  ["subject", "Subject"],
  ["message", "Message"],
];

export function composeSubject(submission: ContactSubmission): string {
  return `[${submission.inquiryType}] ${submission.subject}`;
}

export function composeText(submission: ContactSubmission): string {
  return FIELD_LABELS.map(([key, label]) => {
    const value = submission[key] || "—";
    return key === "message" ? `${label}:\n\n${value}` : `${label}: ${value}`;
  }).join("\n");
}

export function composeHtml(submission: ContactSubmission): string {
  const rows = FIELD_LABELS.filter(([key]) => key !== "message")
    .map(
      ([key, label]) =>
        `<tr><th align="left" style="padding:4px 16px 4px 0;font-weight:600;">${escapeHtml(label)}</th>` +
        `<td style="padding:4px 0;">${escapeHtml(submission[key] || "—")}</td></tr>`,
    )
    .join("");
  // White-space is preserved rather than the newlines being turned into <br>,
  // so the message arrives shaped the way it was typed without any of it being
  // reinterpreted as markup.
  const body = `<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtml(
    submission.message,
  )}</pre>`;
  return (
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;">` +
    `<table style="border-collapse:collapse;margin-bottom:16px;">${rows}</table>` +
    `<hr style="border:0;border-top:1px solid #ddd;margin:16px 0;" />${body}</div>`
  );
}

export type DeliveryResult =
  | { delivered: true; id: string | null }
  | { delivered: false; reason: "not-configured"; missing: string[] }
  | { delivered: false; reason: "provider-error"; status: number; detail: string };

/**
 * Hand the inquiry to the provider.
 *
 * Resolves rather than throws for every outcome the route has to distinguish,
 * so that the failure path is part of the type instead of a catch block that
 * has to guess what went wrong.
 */
export async function deliverInquiry(submission: ContactSubmission): Promise<DeliveryResult> {
  const configResult = readMailerConfig();
  if (!configResult.configured) {
    return { delivered: false, reason: "not-configured", missing: configResult.missing };
  }
  const { apiKey, from } = configResult.config;

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [destinationAddress()],
        // The visitor's address goes here and nowhere else. Replying to the
        // notification reaches them; the message itself was never addressed to
        // anything the visitor chose.
        reply_to: submission.email,
        subject: composeSubject(submission),
        text: composeText(submission),
        html: composeHtml(submission),
      }),
    });
  } catch (error) {
    // A DNS failure, a TLS failure, a timeout. The visitor sees the same
    // message either way; this distinguishes it in the type for the route.
    return {
      delivered: false,
      reason: "provider-error",
      status: 0,
      detail: error instanceof Error ? error.name : "network",
    };
  }

  if (!response.ok) {
    // Read the provider's own words, capped. This is the provider talking
    // about the request, not visitor content, so it is safe to log — and it is
    // where "the domain is not verified" or "no MX record" actually shows up.
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    return { delivered: false, reason: "provider-error", status: response.status, detail };
  }

  const payload: unknown = await response.json().catch(() => null);
  const id =
    typeof payload === "object" && payload !== null && typeof (payload as { id?: unknown }).id === "string"
      ? (payload as { id: string }).id
      : null;
  return { delivered: true, id };
}
