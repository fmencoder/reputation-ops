/**
 * Token normalisation, fingerprinting, and cross-implementation equivalence.
 *
 * The fingerprint comparison between the bootstrap and the deployer is only
 * evidence if both compute it identically. The last suite here proves that over
 * a corpus rather than asserting it in a comment.
 *
 * No real token appears anywhere. The fixtures are obviously synthetic.
 */

import { describe, expect, it } from "vitest";

import {
  fingerprint, normalizeToken, tokenDiagnostic, TokenFormatError,
} from "../../src/novra/token.js";
import {
  fingerprint as bootstrapFingerprint,
  normalizeToken as bootstrapNormalize,
  TokenFormatError as BootstrapTokenFormatError,
} from "../../oauth-bootstrap/lib/token";

const TOKEN = "fakeTokenValue0123456789abcdefXYZ";

describe("accepted clipboard artifacts", () => {
  const cases: [string, string][] = [
    ["raw token", TOKEN],
    ["leading whitespace", `   ${TOKEN}`],
    ["trailing whitespace", `${TOKEN}   `],
    ["trailing newline", `${TOKEN}\n`],
    ["leading newline", `\n${TOKEN}`],
    ["CRLF", `${TOKEN}\r\n`],
    ["CR only", `${TOKEN}\r`],
    ["tabs either side", `\t${TOKEN}\t`],
    ["Bearer prefix", `Bearer ${TOKEN}`],
    ["bearer prefix, lowercase", `bearer ${TOKEN}`],
    ["BEARER prefix, shouting", `BEARER ${TOKEN}`],
    ["double quoted", `"${TOKEN}"`],
    ["single quoted", `'${TOKEN}'`],
    ["quoted Bearer", `"Bearer ${TOKEN}"`],
    ["Bearer then quoted", `Bearer "${TOKEN}"`],
    ["everything at once", `\n  "Bearer ${TOKEN}"  \r\n`],
  ];

  for (const [name, input] of cases) {
    it(`normalises ${name}`, () => {
      const result = normalizeToken(input);
      expect(result.token).toBe(TOKEN);
      expect(result.length).toBe(TOKEN.length);
      expect(result.fingerprint).toBe(fingerprint(TOKEN));
    });
  }

  it("reports whether anything was repaired", () => {
    expect(normalizeToken(TOKEN).normalizationApplied).toBe(false);
    expect(normalizeToken(`  ${TOKEN}\n`).normalizationApplied).toBe(true);
  });
});

describe("rejected inputs", () => {
  it("rejects an embedded newline rather than deleting it", () => {
    // A wrapped line is not a formatting artifact. Repairing it would send a
    // plausible wrong value and turn a clear failure into a confusing one.
    expect(() => normalizeToken("abc\ndef")).toThrow(TokenFormatError);
    try {
      normalizeToken("abc\ndef");
    } catch (error) {
      expect((error as TokenFormatError).kind).toBe("internal-whitespace");
      expect((error as Error).message).toContain("newline");
      expect((error as Error).message).toContain("position 3");
    }
  });

  it("rejects embedded spaces", () => {
    expect(() => normalizeToken("abc def")).toThrow(/internal space/);
  });

  it("rejects an embedded carriage return", () => {
    expect(() => normalizeToken("abc\rdef")).toThrow(/carriage return/);
  });

  it("rejects an embedded control character", () => {
    expect(() => normalizeToken("abcdef")).toThrow(/control character U\+0007/);
  });

  it("rejects a value that is only the word Bearer, with or without a space", () => {
    // "Bearer " trims to "Bearer" before the prefix strip sees its space, so
    // without an explicit rule it passes as a well-formed token. It never is
    // one: it means the label was copied and the value was not.
    for (const input of ["Bearer ", "Bearer", "bearer", "  BEARER  "]) {
      expect(() => normalizeToken(input)).toThrow(TokenFormatError);
    }
    try {
      normalizeToken("Bearer ");
    } catch (error) {
      expect((error as TokenFormatError).kind).toBe("bearer-only");
    }
  });

  it("rejects an empty quoted token", () => {
    expect(() => normalizeToken('""')).toThrow(/empty after normalisation/);
    expect(() => normalizeToken("''")).toThrow(/empty after normalisation/);
  });

  it("rejects an empty and a whitespace-only value", () => {
    expect(() => normalizeToken("")).toThrow(/empty/);
    expect(() => normalizeToken("   \n\t ")).toThrow(/empty/);
  });

  it("rejects unbalanced quoting rather than half-stripping it", () => {
    expect(() => normalizeToken(`"${TOKEN}`)).toThrow(/quote character/);
  });

  it("never includes the token in a rejection message", () => {
    try {
      normalizeToken(`${TOKEN} ${TOKEN}`);
    } catch (error) {
      expect((error as Error).message).not.toContain(TOKEN);
    }
  });
});

describe("fingerprint", () => {
  it("is 12 hex characters and deterministic", () => {
    expect(fingerprint(TOKEN)).toMatch(/^[0-9a-f]{12}$/);
    expect(fingerprint(TOKEN)).toBe(fingerprint(TOKEN));
  });

  it("differs for values that differ by one character", () => {
    expect(fingerprint(TOKEN)).not.toBe(fingerprint(`${TOKEN}x`));
  });

  it("reveals no token material", () => {
    const digest = fingerprint(TOKEN);
    expect(TOKEN).not.toContain(digest);
    expect(digest).not.toContain(TOKEN.slice(0, 4));
  });

  it("is what distinguishes a corrupted handoff from a bad credential", () => {
    // Same bytes on both ends -> the credential itself is the problem.
    expect(normalizeToken(`Bearer ${TOKEN}\n`).fingerprint).toBe(normalizeToken(TOKEN).fingerprint);
    // Different bytes -> the transfer is the problem.
    expect(normalizeToken(`${TOKEN}x`).fingerprint).not.toBe(normalizeToken(TOKEN).fingerprint);
  });
});

describe("diagnostic output", () => {
  it("contains a length and a digest and no token material", () => {
    const lines = tokenDiagnostic(normalizeToken(`  ${TOKEN}  `)).join("\n");
    expect(lines).toContain(`TOKEN_LENGTH=${TOKEN.length}`);
    expect(lines).toContain("TOKEN_NORMALIZATION_APPLIED=YES");
    expect(lines).not.toContain(TOKEN);
    expect(lines).not.toContain(TOKEN.slice(0, 6));
  });
});

describe("bootstrap and production implementations agree", () => {
  const corpus = [
    TOKEN,
    `  ${TOKEN}`,
    `${TOKEN}\n`,
    `${TOKEN}\r\n`,
    `Bearer ${TOKEN}`,
    `bearer ${TOKEN}`,
    `"${TOKEN}"`,
    `'${TOKEN}'`,
    `"Bearer ${TOKEN}"`,
    `Bearer "${TOKEN}"`,
    `\n  "Bearer ${TOKEN}"  \r\n`,
    "a",
    "0123456789",
    "with|pipe%and.dots-and_underscores",
  ];

  for (const input of corpus) {
    it(`agrees on ${JSON.stringify(input).slice(0, 40)}`, () => {
      const mine = normalizeToken(input);
      const theirs = bootstrapNormalize(input);
      expect(theirs.token).toBe(mine.token);
      expect(theirs.length).toBe(mine.length);
      expect(theirs.fingerprint).toBe(mine.fingerprint);
      expect(theirs.normalizationApplied).toBe(mine.normalizationApplied);
    });
  }

  const rejects = ["", "   ", '""', "Bearer ", "Bearer", "bearer", "abc def", "abc\ndef", "abc\rdef", `"${TOKEN}`];
  for (const input of rejects) {
    it(`both reject ${JSON.stringify(input)}`, () => {
      expect(() => normalizeToken(input)).toThrow(TokenFormatError);
      expect(() => bootstrapNormalize(input)).toThrow(BootstrapTokenFormatError);
      let mineKind = "";
      let theirsKind = "";
      try { normalizeToken(input); } catch (error) { mineKind = (error as TokenFormatError).kind; }
      try { bootstrapNormalize(input); } catch (error) { theirsKind = (error as TokenFormatError).kind; }
      expect(theirsKind).toBe(mineKind);
    });
  }

  it("computes identical fingerprints", () => {
    for (const input of corpus) {
      expect(bootstrapFingerprint(input)).toBe(fingerprint(input));
    }
  });
});
