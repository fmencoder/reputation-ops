/**
 * Token normalisation and safe fingerprinting.
 *
 * WHY THIS EXISTS
 * A token that validated successfully at the moment it was issued was rejected
 * minutes later by a different process using the same endpoint and the same
 * Bearer mechanism. When two callers agree on everything except the bytes, the
 * bytes are the suspect — and a value that travels through a browser, a
 * clipboard and a secret-entry field has several ways to pick up a character
 * nobody typed.
 *
 * So: normalise the artifacts a clipboard reliably adds, refuse the ones that
 * indicate the wrong thing was copied, and give both ends a way to prove they
 * hold the same value without either revealing it.
 *
 * The fingerprint is the whole diagnostic. It is deliberately short — twelve
 * hex characters of a SHA-256 — because its job is to answer "same or
 * different", and any more digest material is exposure bought for nothing.
 */

import { createHash } from "node:crypto";

/**
 * Characters that must never appear inside a bearer token: any whitespace, and
 * any C0/C1 control character or DEL.
 */
const FORBIDDEN_INSIDE = /[\s\u0000-\u001F\u007F-\u009F]/;

export type TokenFormatFailure =
  | "empty"
  | "bearer-only"
  | "internal-whitespace"
  | "control-character"
  | "residual-quote";

export class TokenFormatError extends Error {
  constructor(
    override readonly message: string,
    readonly kind: TokenFormatFailure,
  ) {
    super(message);
    this.name = "TokenFormatError";
  }
}

export interface NormalizedToken {
  /** The value to send. Never logged, never printed. */
  readonly token: string;
  readonly length: number;
  /** First 12 hex characters of SHA-256(token). Safe to print and compare. */
  readonly fingerprint: string;
  /** True when the raw input differed from the normalised value. */
  readonly normalizationApplied: boolean;
}

/** SHA-256, truncated. The only value derived from a token that may be shown. */
export function fingerprint(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex").slice(0, 12);
}

function stripSurroundingQuotes(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function stripBearerPrefix(value: string): string {
  return /^bearer\s/i.test(value) ? value.slice(value.indexOf(" ") + 1) : value;
}

function describe(character: string): string {
  if (character === "\n") return "newline";
  if (character === "\r") return "carriage return";
  if (character === "\t") return "tab";
  if (character === " ") return "space";
  const code = character.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase();
  return /\s/.test(character) ? `whitespace U+${code}` : `control character U+${code}`;
}

/**
 * Strip what a clipboard adds; refuse what indicates a copy mistake.
 *
 * Handles the surrounding artifacts in either order — `"Bearer abc"` and
 * `Bearer "abc"` both reduce — by looping until the value stops changing,
 * bounded so a pathological input cannot spin.
 *
 * What it does NOT do is repair internal whitespace. A space in the middle of a
 * token is not a formatting artifact: it means a line wrapped, a label came
 * along, or more than the token box was selected. Silently deleting it would
 * send a plausible-looking wrong value and turn a clear failure into a
 * confusing one.
 */
export function normalizeToken(raw: string): NormalizedToken {
  let value = raw;

  for (let pass = 0; pass < 4; pass++) {
    const before = value;
    value = value.trim();
    value = stripSurroundingQuotes(value);
    value = value.trim();
    value = stripBearerPrefix(value);
    value = value.trim();
    if (value === before) break;
  }

  if (value === "") {
    throw new TokenFormatError(
      'Token is empty after normalisation. If the value was only "Bearer" or a pair of ' +
        "quotes, the token itself was not copied.",
      "empty",
    );
  }

  // "Bearer " trims to "Bearer" before the prefix strip can see its trailing
  // space, so the strip leaves it intact and it would otherwise pass as a
  // perfectly well-formed token. It is never a token: it means the label was
  // copied and the value was not. Caught by the cross-implementation test.
  if (value.toLowerCase() === "bearer") {
    throw new TokenFormatError(
      'The value is just the word "Bearer". The token itself was not copied — ' +
        "select the contents of the token box, not the header line.",
      "bearer-only",
    );
  }

  const offending = FORBIDDEN_INSIDE.exec(value);
  if (offending) {
    const character = offending[0] ?? "";
    throw new TokenFormatError(
      `Token contains an internal ${describe(character)} at position ${offending.index} ` +
        `of ${value.length}. This is not a formatting artifact — it means a line wrapped, ` +
        "a label came along, or more than the token box was selected. Re-copy only the token.",
      /\s/.test(character) ? "internal-whitespace" : "control-character",
    );
  }

  if (value.includes('"') || value.includes("'")) {
    throw new TokenFormatError(
      "Token contains a quote character after normalisation, which means the quoting was " +
        "unbalanced. Re-copy only the token.",
      "residual-quote",
    );
  }

  return {
    token: value,
    length: value.length,
    fingerprint: fingerprint(value),
    normalizationApplied: value !== raw,
  };
}

/**
 * The one line both ends print so they can be compared.
 *
 * Contains no token material: a length and a truncated digest. Two systems
 * printing the same line hold the same bytes; two printing different lines do
 * not, and that settles where the fault is without either disclosing anything.
 */
export function tokenDiagnostic(normalized: NormalizedToken): readonly string[] {
  return [
    "TOKEN_PRESENT=YES",
    `TOKEN_LENGTH=${normalized.length}`,
    `TOKEN_FINGERPRINT=${normalized.fingerprint}`,
    `TOKEN_NORMALIZATION_APPLIED=${normalized.normalizationApplied ? "YES" : "NO"}`,
  ];
}
