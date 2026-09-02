/**
 * Flatten the authored design system into inline styles.
 *
 * WHY THIS EXISTS
 * novraintelligence.com is a free WordPress.com site. Three separate routes to
 * a stylesheet were tried against the live site and all three are closed:
 *
 *   - global-styles `styles.css` keeps ordinary declarations but silently drops
 *     every custom-property *declaration* while keeping `var()` *usages* — the
 *     worst possible half-success, since every page here is built on tokens.
 *   - global-styles `settings.custom` comes back as `{}`; not stored at all.
 *   - a <style> element inside a core/html block is stripped by KSES, and its
 *     text is left behind as visible page copy.
 *
 * Inline style attributes, by contrast, survive byte-for-byte — verified by
 * echo comparison on every page save. So the design ships as inline styles.
 *
 * The consequence worth understanding: inline styles cannot express a media
 * query. Rather than shipping a fixed-width desktop layout, the breakpoints are
 * replaced with intrinsically fluid rules — `repeat(auto-fit, minmax(X, 1fr))`
 * for every grid and `clamp()` for the type scale — which reflow continuously
 * instead of at thresholds. Hover and focus-visible states are lost; they have
 * no inline equivalent and nothing structural depends on them.
 *
 * The class-based stylesheet in novra.css remains the authored source and the
 * better artifact: on a plan with Custom CSS it goes in as-is and this whole
 * step disappears. This file is the free-plan path, not a replacement for it.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "wp-payload");
const OUT = join(HERE, "wp-payload-inline");

/** Pull the token values straight out of the authored stylesheet's :root. */
function readTokens() {
  const css = readFileSync(join(HERE, "novra.css"), "utf8");
  const root = css.slice(css.indexOf(":root {"), css.indexOf("\n}", css.indexOf(":root {")));
  const tokens = {};
  for (const [, name, value] of root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens[name] = value.replace(/\s+/g, " ").trim();
  }
  return tokens;
}

const T = readTokens();
const v = (name) => {
  const value = T[name];
  if (!value) throw new Error(`token ${name} is not defined in novra.css`);
  return value;
};

/** Resolve var(--x) to a literal, repeatedly, since tokens reference tokens. */
/**
 * Properties WordPress.com's sanitiser strips from inline styles. Measured by
 * diffing what was sent against what the REST API reads back from the live
 * site, not guessed.
 *
 * Only background-clip is dangerous — paired with color:transparent it renders
 * text invisible. Emitting it fails the build.
 *
 * box-sizing is not harmless, which took a browser render of the real payload
 * to establish. Without it every `.wrap` falls back to content-box, so a
 * `max-width: 1200px` with `padding: 0 1.5rem` occupies 1248px and gives a
 * 1200px column where the design calls for 1152. Every page on the site had
 * been rendering that way since launch. compensateForContentBox() below removes
 * the padding from the max-width so the column lands where it was designed to.
 */
const STRIPPED_BY_WPCOM = [
  "background-clip", "-webkit-background-clip", "box-sizing",
  "-webkit-font-smoothing", "clip",
];

/**
 * Undo the effect of the stripped `box-sizing: border-box`.
 *
 * WordPress.com removes the declaration, so a padded element with a max-width
 * measures content-box on the live site: the column is max-width, and the box
 * around it is max-width plus the padding. Subtracting the horizontal padding
 * from the max-width reproduces border-box arithmetic exactly, using only
 * declarations the sanitiser keeps.
 *
 * Applied only where both a px max-width and symmetric horizontal padding are
 * present, which is the container idiom in this stylesheet. Anything else is
 * left alone.
 */
function compensateForContentBox(declarations) {
  const maxWidth = /(^|;)\s*max-width:\s*(\d+(?:\.\d+)?)px/.exec(declarations);
  if (!maxWidth) return declarations;

  const shorthand = /(^|;)\s*padding:\s*[^;]*?\s(\d+(?:\.\d+)?)(rem|px)(?:\s|;|$)/.exec(declarations);
  const left = /(^|;)\s*padding-left:\s*(\d+(?:\.\d+)?)(rem|px)/.exec(declarations);
  const right = /(^|;)\s*padding-right:\s*(\d+(?:\.\d+)?)(rem|px)/.exec(declarations);

  let inset = null;
  if (shorthand) inset = Number(shorthand[2]) * (shorthand[3] === "rem" ? 16 : 1);
  else if (left && right && left[2] === right[2] && left[3] === right[3]) {
    inset = Number(left[2]) * (left[3] === "rem" ? 16 : 1);
  }
  if (!inset) return declarations;

  const corrected = Number(maxWidth[2]) - inset * 2;
  if (corrected <= 0) return declarations;
  return declarations.replace(/(^|;)(\s*max-width:\s*)\d+(?:\.\d+)?px/, `$1$2${corrected}px`);
}

function dedupe(declarations) {
  const seen = new Map();
  for (const part of declarations.split(";")) {
    const text = part.trim();
    if (!text) continue;
    const property = text.slice(0, text.indexOf(":")).trim();
    seen.delete(property);
    seen.set(property, text);
  }
  return [...seen.values()].join(";");
}

function resolve(value) {
  let out = value;
  for (let pass = 0; pass < 5 && out.includes("var("); pass++) {
    out = out.replace(/var\((--[a-z0-9-]+)\)/g, (_, name) => v(name));
  }
  if (out.includes("var(")) throw new Error(`unresolved token in: ${value}`);
  // These land inside style="..." attributes. A double quote in a token value
  // — --font-sans carries "Inter" and "Segoe UI" — closes the attribute early
  // and silently discards every declaration after it. The page still renders,
  // which is what makes it easy to miss: the first symptom was body copy in
  // Times because the whole font stack had been truncated away.
  return out.replace(/"/g, "'");
}

/**
 * Class -> inline declarations.
 *
 * Grids are the interesting entries. `.grid--4` was `repeat(4, 1fr)` with
 * breakpoints at 1024 and 620; as `repeat(auto-fit, minmax(220px, 1fr))` it
 * lands on 4 / 2 / 1 columns across the same widths without a media query, and
 * at every width in between as well.
 */
const RULES = {
  wrap: "box-sizing:border-box;max-width:var(--container);margin:0 auto;padding:0 var(--s-6)",
  "wrap--narrow": "max-width:760px",

  "hero-split": "display:grid;gap:var(--s-16);align-items:center;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))",

  grid: "display:grid;gap:var(--s-6)",
  "grid--2": "grid-template-columns:repeat(auto-fit,minmax(300px,1fr))",
  "grid--3": "grid-template-columns:repeat(auto-fit,minmax(260px,1fr))",
  "grid--4": "grid-template-columns:repeat(auto-fit,minmax(220px,1fr))",

  "page-head": "padding:var(--s-24) 0 var(--s-12)",
  eyebrow: "font-size:var(--fs-eyebrow);font-weight:600;letter-spacing:var(--tracking-eyebrow);text-transform:uppercase;color:var(--c-accent-bright);margin:0 0 var(--s-6)",
  display: "font-size:var(--fs-h1);line-height:var(--lh-tight);letter-spacing:var(--tracking-hero);font-weight:800;margin:0 0 var(--s-6);color:var(--c-text)",
  lead: "color:var(--c-text-muted);font-size:var(--fs-lead);max-width:52ch",
  rule: "height:2px;width:64px;background:var(--grad-rule);border:0;margin:0 0 var(--s-6)",

  card: "box-sizing:border-box;background:var(--c-bg-raised);border:1px solid var(--c-border);border-radius:var(--radius-lg);padding:var(--s-6);box-shadow:var(--shadow-card);color:var(--c-text)",
  "card--link": "text-decoration:none;display:block",
  card__kicker: "font-size:0.6875rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--c-accent-bright);margin:0 0 var(--s-2)",
  card__meta: "color:var(--c-text-subtle);font-size:0.8125rem;margin-top:var(--s-4)",

  article: "padding:var(--s-16) 0 var(--s-24)",
  article__body: "max-width:var(--measure)",
  sources: "box-sizing:border-box;max-width:var(--measure);margin-top:var(--s-12);padding-top:var(--s-6);border-top:1px solid var(--c-border);color:var(--c-text-subtle);font-size:0.875rem",
  byline: "display:flex;align-items:center;gap:var(--s-3);padding:var(--s-6) 0;border-top:1px solid var(--c-border);border-bottom:1px solid var(--c-border);margin-bottom:var(--s-8)",
  byline__name: "font-weight:600;text-decoration:none",
  byline__meta: "color:var(--c-text-subtle);font-size:0.875rem",
  "author-box": "box-sizing:border-box;margin-top:var(--s-16);padding:var(--s-6);background:var(--c-bg-raised);border:1px solid var(--c-border);border-radius:var(--radius-lg)",

  figure: "margin:var(--s-12) 0",
  figure__frame: "box-sizing:border-box;background:#05070f;border:1px solid var(--c-border);border-radius:var(--radius-lg);overflow:hidden;line-height:0",

  btn: "box-sizing:border-box;display:inline-flex;align-items:center;gap:var(--s-2);padding:var(--s-3) var(--s-6);border-radius:var(--radius);font-size:0.8125rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;border:1px solid transparent",
  "btn--primary": "background:var(--grad-brand);color:#fff;box-shadow:var(--glow-accent)",
  "btn--ghost": "border-color:var(--c-border-strong);color:var(--c-text);background:none",

  "sr-only": "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap",

  /*
   * .accent is a gradient-filled span in the authored stylesheet. It CANNOT be
   * that here: WordPress.com's sanitiser strips background-clip (and its
   * -webkit- prefix) from inline styles while keeping `background` and
   * `color:transparent`. The result is transparent text sitting on a solid
   * gradient block — an invisible headline inside a coloured bar, which is
   * exactly what shipped to production before this was caught.
   *
   * So the flattened build uses a solid accent instead. novra.css keeps the
   * gradient treatment for the day a plan can host it; nothing here may emit
   * background-clip, and the guard below enforces that.
   */
  accent: "color:var(--c-accent-bright)",
};

/**
 * Descendant rules: what the stylesheet reached through `.container tag`.
 *
 * These cannot survive as classes, because the element being styled carries no
 * class of its own — `.article__body p` styles a bare `<p>`. So each container
 * is located, its extent found by tag depth, and the rules applied to the
 * matching descendants inside it.
 */
const DESCENDANT_RULES = {
  card: {
    h3: "font-size:var(--fs-h3);line-height:var(--lh-snug);margin:0 0 var(--s-3);color:var(--c-text)",
    p: "color:var(--c-text-muted);margin:0;font-size:0.9375rem",
  },
  article__body: {
    h2: "font-size:var(--fs-h2);line-height:var(--lh-snug);margin:var(--s-12) 0 var(--s-4);color:var(--c-text)",
    h3: "font-size:var(--fs-h3);margin:var(--s-8) 0 var(--s-3);color:var(--c-text)",
    p: "margin:0 0 var(--s-4)",
    a: "color:var(--c-accent-bright)",
    blockquote: "margin:var(--s-8) 0;padding-left:var(--s-6);border-left:2px solid var(--c-accent);color:var(--c-text-muted)",
    ul: "margin:0 0 var(--s-4);padding-left:1.25rem",
    ol: "margin:0 0 var(--s-4);padding-left:1.35rem",
    li: "margin:0 0 var(--s-2)",
    // display:block + overflow-x lets a wide table scroll inside the measure
    // instead of pushing the page sideways. There is no .table-scroll wrapper
    // to lean on and no media query to add one conditionally.
    table: "display:block;overflow-x:auto;width:100%;border-collapse:collapse;margin:var(--s-6) 0;font-size:0.9375rem",
    th: "border-bottom:1px solid var(--c-border);padding:var(--s-3);text-align:left;color:var(--c-text);font-weight:600",
    td: "border-bottom:1px solid var(--c-border);padding:var(--s-3);text-align:left;color:var(--c-text-muted)",
  },
  sources: {
    h2: "font-size:var(--fs-h3);line-height:var(--lh-snug);margin:var(--s-8) 0 var(--s-3);color:var(--c-text)",
    ul: "margin:0;padding-left:1.25rem",
    li: "margin:0 0 var(--s-2);word-break:break-word",
    a: "color:var(--c-accent-bright)",
  },

  figure__frame: {
    img: "display:block;width:100%;height:auto",
  },
  figure: {
    figcaption: "color:var(--c-text-subtle);font-size:0.8125rem;line-height:1.5;margin:var(--s-3) 0 0;max-width:var(--measure)",
  },
};

const VOID_TAGS = new Set(["img", "br", "hr", "input", "source", "meta", "link"]);

/** Find the extent of the element starting at `open`, by tag depth. */
function extentOf(html, open, tag) {
  const openTag = new RegExp(`<${tag}\\b`, "gi");
  const closeTag = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 0, index = open;
  while (index < html.length) {
    openTag.lastIndex = index; closeTag.lastIndex = index;
    const next = openTag.exec(html);
    const close = closeTag.exec(html);
    if (!close) return html.length;
    if (next && next.index < close.index) { depth++; index = next.index + 1; continue; }
    depth--;
    if (depth === 0) return close.index;
    index = close.index + 1;
  }
  return html.length;
}

function applyDescendantRules(html) {
  let out = html;
  for (const [container, rules] of Object.entries(DESCENDANT_RULES)) {
    let cursor = 0;
    while (true) {
      const match = new RegExp(`<([a-z0-9]+)([^>]*\\bclass="[^"]*\\b${container}\\b[^"]*")`, "i")
        .exec(out.slice(cursor));
      if (!match) break;
      const open = cursor + match.index;
      const tag = match[1];
      const bodyStart = out.indexOf(">", open) + 1;
      const bodyEnd = VOID_TAGS.has(tag.toLowerCase()) ? bodyStart : extentOf(out, open, tag);
      let inner = out.slice(bodyStart, bodyEnd);

      for (const [target, declarations] of Object.entries(rules)) {
        inner = inner.replace(new RegExp(`<${target}(\\s[^>]*)?>`, "gi"), (m, attrs = "") => {
          // A nested container of the same kind styles its own descendants.
          const existing = attrs.match(/\sstyle="([^"]*)"/);
          const combined = existing ? `${declarations};${existing[1]}` : declarations;
          const cleaned = attrs.replace(/\sstyle="[^"]*"/, "");
          return `<${target}${cleaned} style="${combined}">`;
        });
      }
      out = out.slice(0, bodyStart) + inner + out.slice(bodyEnd);
      cursor = bodyStart + inner.length;
    }
  }
  return out;
}

/**
 * The dark ground.
 *
 * Without a stylesheet nothing sets `body`, so the theme's own background and
 * text colour apply. Every surface in this design is dark, and a white theme
 * background behind dark cards with white headings renders the headings
 * invisible. Wrapping the page in one element that establishes background,
 * colour and font means the whole subtree inherits the right values and no
 * element depends on what the theme happens to set.
 */
function wrapRoot(html) {
  const style = [
    `background:${v("--c-bg")}`,
    `color:${v("--c-text")}`,
    `font-family:${resolve(v("--font-sans"))}`,
    `font-size:${v("--fs-body")}`,
    `line-height:${v("--lh-body")}`,
    "-webkit-font-smoothing:antialiased",
    "margin:0",
  ].join(";");
  return `<div class="novra-root" style="${style}">\n${html}\n</div>`;
}

/**
 * Bare-element defaults from the stylesheet that nothing else replaces.
 *
 * `a { color: inherit }` is the one that bites hardest: without it every link
 * that does not set a colour of its own falls back to the browser default, and
 * the author card renders the name in link-blue at heading size. Heading
 * line-height is the same class of loss — headings inherit the 1.65 body value
 * and open up far past the design.
 *
 * These are *prepended*, so any authored declaration on the element still wins.
 */
const ELEMENT_DEFAULTS = {
  a: "color:inherit",
  h1: "line-height:var(--lh-tight)",
  h2: "line-height:var(--lh-snug)",
  h3: "line-height:var(--lh-snug)",
};

function applyElementDefaults(html) {
  return html.replace(/<(a|h1|h2|h3)(\s[^>]*)?>/gi, (match, tag, attrs = "") => {
    const defaults = ELEMENT_DEFAULTS[tag.toLowerCase()];
    const existing = attrs.match(/\sstyle="([^"]*)"/);
    // Only supply what the element does not already state for itself.
    const property = defaults.split(":")[0];
    if (existing && new RegExp(`(^|;)\\s*${property}\\s*:`).test(existing[1])) return match;
    const combined = existing ? `${defaults};${existing[1]}` : defaults;
    const cleaned = attrs.replace(/\sstyle="[^"]*"/, "");
    return `<${tag}${cleaned} style="${combined}">`;
  });
}

function flatten(html) {
  let out = html;

  out = out.replace(/<([a-z0-9]+)([^>]*?)class="([^"]+)"([^>]*?)>/gi, (match, tag, pre, classes, post) => {
    const declarations = classes
      .split(/\s+/)
      .filter((name) => name in RULES)
      .map((name) => RULES[name])
      .filter(Boolean)
      .join(";");
    if (!declarations) return match;

    // An existing style attribute is authored intent and must win, so the
    // class-derived declarations are prepended, not appended.
    const existing = `${pre}${post}`.match(/\sstyle="([^"]*)"/);
    const combined = existing ? `${declarations};${existing[1]}` : declarations;
    const cleaned = `${pre}${post}`.replace(/\sstyle="[^"]*"/, "");
    return `<${tag}${cleaned} class="${classes}" style="${resolve(combined)}">`;
  });

  // Layering, weakest first: element defaults, then descendant rules, then
  // class rules, then whatever the source authored inline. Each pass prepends,
  // so the last thing applied is the first in the string and the weakest.
  out = applyDescendantRules(out);
  out = applyElementDefaults(out);
  out = out.replace(/<([a-z0-9]+)\s\s+/gi, "<$1 ");

  // Resolve tokens only inside style attributes. Running the resolver over the
  // whole document would also rewrite the double quotes that delimit those very
  // attributes, which is a much worse bug than the one it fixes.
  out = wrapRoot(out).replace(
    /style="([^"]*)"/g,
    (_, decls) => `style="${compensateForContentBox(dedupe(resolve(decls)))}"`,
  );
  return out;
}

mkdirSync(OUT, { recursive: true });
let count = 0;
for (const name of readdirSync(SRC).filter((f) => /^\d/.test(f))) {
  const payload = JSON.parse(readFileSync(join(SRC, name), "utf8"));
  const content = payload.params.content;
  const body = content.replace(/^<!-- wp:html -->\n?/, "").replace(/\n?<!-- \/wp:html -->$/, "");
  payload.params.content = `<!-- wp:html -->\n${flatten(body)}\n<!-- /wp:html -->`;
  for (const [, attr] of payload.params.content.matchAll(/style="([^"]*)"/g)) {
    if (attr.includes("var(")) throw new Error(`${name}: unresolved var() in a style attribute`);
  }
  if (/style='/.test(payload.params.content)) throw new Error(`${name}: single-quoted style attribute`);
  for (const property of STRIPPED_BY_WPCOM) {
    if (property === "box-sizing" || property === "-webkit-font-smoothing" || property === "clip") continue;
    if (new RegExp(`(^|;|")\\s*${property}\\s*:`).test(payload.params.content)) {
      throw new Error(
        `${name} emits ${property}, which WordPress.com strips. Paired with color:transparent ` +
        `that renders the text invisible on the live site. Use a solid colour.`,
      );
    }
  }
  if (/color:\s*transparent/.test(payload.params.content)) {
    throw new Error(`${name} emits color:transparent — with background-clip stripped, that is invisible text.`);
  }
  payload._generated = "site/build-inline.mjs — do not edit; edit site/wp-payload/ and rebuild";
  writeFileSync(join(OUT, name), `${JSON.stringify(payload, null, 2)}\n`);
  count++;
  console.log(`${name}: ${content.length} -> ${payload.params.content.length}`);
}
console.log(`${count} payloads flattened`);
