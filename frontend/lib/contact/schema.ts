/**
 * The contact inquiry contract, shared by the browser, the route handler and
 * the tests.
 *
 * One module rather than two so that client and server cannot disagree. The
 * browser runs this to show a message next to the offending field; the route
 * runs the same function again and trusts only its result. Client validation
 * here is a convenience, never a gate — every rule below is re-applied on the
 * server, because anything the browser checks can be skipped by not using a
 * browser.
 *
 * Deliberately dependency-free and free of Node APIs: it is imported into a
 * client component, so anything it pulls in ships to the visitor.
 */

export const INQUIRY_TYPES = [
  "Research",
  "Institutional Collaboration",
  "Technology",
  "Media",
  "General",
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

/**
 * Maximum accepted lengths.
 *
 * `email` is 254 because that is the longest address an SMTP path can carry.
 * The rest are set where a genuine institutional inquiry comfortably fits and
 * a paste-bomb does not: the point is to bound what reaches the mail provider,
 * not to second-guess how much someone needs to write.
 */
export const LIMITS = {
  name: 120,
  email: 254,
  organization: 160,
  subject: 200,
  message: 5000,
} as const;

/** The hidden field a human never fills in and a naive bot always does. */
export const HONEYPOT_FIELD = "website";

/**
 * A submission completed faster than this was almost certainly not typed.
 *
 * This is a weak signal and is treated as one: the elapsed time is reported by
 * the client and a determined sender can report anything. It costs nothing,
 * catches indiscriminate form-fillers, and is never the only control.
 */
export const MIN_ELAPSED_MS = 2000;

export interface ContactSubmission {
  name: string;
  email: string;
  organization: string;
  inquiryType: InquiryType;
  subject: string;
  message: string;
}

export type FieldName = keyof ContactSubmission;

export const FIELD_ORDER: FieldName[] = [
  "name",
  "email",
  "organization",
  "inquiryType",
  "subject",
  "message",
];

export type FieldErrors = Partial<Record<FieldName, string>>;

export interface ValidationResult {
  ok: boolean;
  /** Cleaned values. Populated even when `ok` is false, so a form can be redrawn. */
  values: ContactSubmission;
  errors: FieldErrors;
}

/**
 * Remove the characters that turn one header into two.
 *
 * Delivery goes out over a JSON API rather than raw SMTP, so this is not the
 * only thing standing between a visitor and an injected Bcc. It is still done
 * here: the value is bound for a mail header either way, and a sanitiser that
 * depends on the transport staying the same is a sanitiser that breaks quietly
 * when the transport changes. Other C0 control characters go too — they have
 * no business in a name or a subject.
 */
export function stripControlCharacters(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ");
}

/** Collapse runs of whitespace, then trim. Applied to single-line fields. */
function normalizeLine(value: string): string {
  return stripControlCharacters(value).replace(/\s+/g, " ").trim();
}

/**
 * Normalise the message without flattening it: the author's paragraphs are
 * part of what they wrote. Line endings are unified and control characters
 * other than newline and tab are dropped.
 */
function normalizeBlock(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
}

/**
 * A pragmatic address check.
 *
 * Full RFC 5322 is not expressible in a regex worth reading, and a stricter
 * pattern rejects real addresses. This requires a local part, a single @, a
 * dotted domain and no whitespace — enough to catch a typo and a malformed
 * payload, while leaving the authoritative answer to the mail provider.
 */
const EMAIL = /^[^\s@,;:<>"'\\]+@[^\s@,;:<>"'\\]+\.[^\s@,;:<>"'\\]{2,}$/;

export function isValidEmail(value: string): boolean {
  return value.length <= LIMITS.email && EMAIL.test(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isInquiryType(value: string): value is InquiryType {
  return (INQUIRY_TYPES as readonly string[]).includes(value);
}

/**
 * Validate an inbound payload of unknown shape.
 *
 * Takes `unknown` rather than a typed object on purpose: on the server this is
 * whatever `request.json()` produced, which is to say anything at all. A
 * non-object, a null, an array, a field holding a number — all of them land
 * here and all of them come out as a populated error set rather than a throw.
 */
export function validateContact(raw: unknown): ValidationResult {
  const input: Record<string, unknown> =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const name = normalizeLine(asString(input.name));
  const email = normalizeLine(asString(input.email));
  const organization = normalizeLine(asString(input.organization));
  const inquiryRaw = normalizeLine(asString(input.inquiryType));
  const subject = normalizeLine(asString(input.subject));
  const message = normalizeBlock(asString(input.message));

  const errors: FieldErrors = {};

  if (!name) errors.name = "Please enter your name.";
  else if (name.length > LIMITS.name) errors.name = `Please keep this under ${LIMITS.name} characters.`;

  if (!email) errors.email = "Please enter your email address.";
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address.";

  if (organization.length > LIMITS.organization) {
    errors.organization = `Please keep this under ${LIMITS.organization} characters.`;
  }

  if (!inquiryRaw) errors.inquiryType = "Please choose an inquiry type.";
  else if (!isInquiryType(inquiryRaw)) errors.inquiryType = "Please choose one of the listed inquiry types.";

  if (!subject) errors.subject = "Please enter a subject.";
  else if (subject.length > LIMITS.subject) errors.subject = `Please keep this under ${LIMITS.subject} characters.`;

  if (!message) errors.message = "Please enter a message.";
  else if (message.length > LIMITS.message) errors.message = `Please keep this under ${LIMITS.message} characters.`;

  return {
    ok: Object.keys(errors).length === 0,
    values: {
      name,
      email,
      organization,
      // Falls back to a valid member so the type holds; `ok` is already false
      // when the submitted value was not one of ours, and the route reads `ok`.
      inquiryType: isInquiryType(inquiryRaw) ? inquiryRaw : "General",
      subject,
      message,
    },
    errors,
  };
}

/** The empty form. */
export const EMPTY_SUBMISSION: ContactSubmission = {
  name: "",
  email: "",
  organization: "",
  inquiryType: "" as InquiryType,
  subject: "",
  message: "",
};
