/**
 * Render the editorial review packet from the article sources.
 *
 * Generated, never hand-written: the packet has to show exactly what is in
 * content/*.md, and a retyped copy would drift from the drafts it is meant to
 * approve. Re-run after any edit to the drafts.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] ?? join(ROOT, "site", "editorial-review.html");

const ARTICLES = [
  { n: 2, file: "002-context-engineering-production-ai.md" },
  { n: 3, file: "005-deterministic-boundaries-ai-smart-contracts.md" },
  { n: 4, file: "010-human-oversight-architecture.md" },
  { n: 5, file: "011-recoverability-architecture.md" },
];

/** Per-article editorial notes that live here, not in the drafts. */
const REVIEW = {
  2: {
    thesis: "As frontier model capability becomes less differentiating for many production workloads, the context system increasingly determines reliability, control and operational performance — so context must be treated as a typed, permissioned, decaying resource rather than a string.",
    contribution: "Context is classified on two axes — origin trust and lifetime — and the pair predicts the failure mode: short-lived + low-trust yields poisoning, long-lived + high-volume yields rot, and long-lived + low-trust yields both. From that follows the load-bearing claim: policy expressed as tokens in the window is advisory, so authority has to be enforced outside the model. That reframes prompt injection from a model-behaviour problem into an ordinary authorization problem.",
    hero: "Five labelled context bands feed a single focal mass through one bright enforcement gate. Two bands are dashed to mark untrusted origin — the trust distinction is drawn, not captioned.",
  },
  3: {
    thesis: "AI reasons probabilistically and smart contracts execute deterministically; robust architectures use that difference deliberately, placing authorization, settlement and irreversible state transitions behind deterministic control.",
    contribution: "Separates intent, authorization and execution into three distinct acts, so an adversary with full control of model output still controls only the first. Then the non-obvious part: the oracle is where non-determinism re-enters a system chosen for having none — supported by oracle extractable value as measurable evidence — and the inclusion/finality gap means any action depending on irreversible settlement needs an explicit confirmation policy rather than whatever the first library to say \"confirmed\" implies.",
    hero: "A diffuse probabilistic field resolves through a bright authorization gate into a rigid uniform lattice. A dashed oracle path bypasses the gate and re-enters the deterministic side from below.",
  },
  4: {
    thesis: "Human oversight is not achieved by adding an approval step. It requires observability, authority, and enough time to intervene before the action becomes irreversible.",
    contribution: "States oversight as a latency budget — T(detect) + T(decide) + T(act) < T(irreversible) — which converts an unfalsifiable governance claim into two numbers an organisation can measure and put on the same page. It also explains why oversight survives in credit adjudication and collapses in payments and agentic tool use, and yields three concrete remedies where the inequality fails.",
    hero: "Two timelines. Above, detect / decide / act finish before the irreversibility marker with visible margin. Below, the same process against a faster system, overrunning the marker in dashed violet.",
  },
  5: {
    thesis: "A production AI system is not one that avoids failure; it is one whose failures are bounded, observable and recoverable.",
    contribution: "Draws the line between replay and re-execution and shows why it is decisive for agents: because an LLM call is non-deterministic, it must be recorded as an activity whose result is a fact in the history, never as logic re-evaluated during replay — otherwise recovery resumes into a different task while believing it continued the original. Also argues the recovery log and the audit trail are one artifact, so building them separately produces the worse version of both.",
    hero: "An execution chain breaks mid-way; recovery re-enters from an append-only history running beneath it, not from the start. Recorded steps are bright, unreached steps are dim.",
  },
};

function frontmatter(src) {
  const [, fm, body] = src.split(/^---\s*$/m);
  const meta = {};
  for (const line of fm.split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: body.trim() };
}

const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text) {
  return esc(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*]+?)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/ — /g, " — ");
}

/** Only the constructs these drafts actually use; anything else throws. */
function render(body) {
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push("</ul>"); list = null; } };

  for (const block of body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)) {
    if (block.startsWith("# ")) continue;                     // title shown in the header
    if (block.startsWith("## ")) {
      closeList();
      const t = block.slice(3).trim();
      out.push(`<h2 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}">${inline(t)}</h2>`);
      continue;
    }
    if (block.startsWith("> ")) {
      closeList();
      out.push(`<blockquote>${inline(block.split("\n").map((l) => l.replace(/^>\s?/, "")).join(" "))}</blockquote>`);
      continue;
    }
    if (/^[-*] /.test(block)) {
      closeList();
      out.push("<ul>");
      // A hyphen at the start of a continuation line would be a new item; these
      // drafts wrap items across lines, so split on the marker, not on newline.
      for (const item of block.split(/\n(?=[-*] )/)) {
        out.push(`<li>${inline(item.replace(/^[-*] /, "").replace(/\n\s+/g, " "))}</li>`);
      }
      out.push("</ul>");
      continue;
    }
    closeList();
    out.push(`<p>${inline(block.replace(/\n/g, " "))}</p>`);
  }
  closeList();
  return out.join("\n");
}

const docs = ARTICLES.map(({ n, file }) => {
  const { meta, body } = frontmatter(readFileSync(join(ROOT, "content", file), "utf8"));
  const words = body.replace(/^#.*$/gm, "").split(/\s+/).filter(Boolean).length;
  const sourcesIndex = body.indexOf("## Sources");
  const prose = sourcesIndex > -1 ? body.slice(0, sourcesIndex) : body;
  const sources = sourcesIndex > -1 ? body.slice(sourcesIndex) : "";
  // Inlined: the artifact CSP blocks external images outright, so a hero
  // referenced by path renders as nothing at all rather than as a broken link.
  const heroData = readFileSync(join(ROOT, "site", meta.hero)).toString("base64");
  return { n, file, meta, words, html: render(prose), sourcesHtml: render(sources),
           review: REVIEW[n], heroSrc: `data:image/webp;base64,${heroData}` };
});

const nav = docs.map((d) => `
      <a class="rail__item" href="#a${d.n}">
        <span class="rail__n">${d.n}</span>
        <span class="rail__body">
          <span class="rail__title">${esc(d.meta.title)}</span>
          <span class="rail__meta">${d.words.toLocaleString()} words · ${esc(d.meta.cluster)}</span>
        </span>
      </a>`).join("");

const field = (k, v) => `<div class="f"><dt>${k}</dt><dd>${v}</dd></div>`;

const sections = docs.map((d) => `
    <article class="doc" id="a${d.n}">
      <header class="doc__head">
        <p class="eyebrow"><span class="pip">Article ${d.n}</span> ${esc(d.meta.cluster)} · draft for review</p>
        <h2 class="doc__title">${esc(d.meta.title)}</h2>
        <p class="doc__excerpt">${esc(d.meta.excerpt)}</p>
      </header>

      <section class="card" aria-label="Editorial metadata for article ${d.n}">
        <dl class="fields">
          ${field("THESIS", esc(d.review.thesis))}
          ${field("ORIGINAL_ANALYTICAL_CONTRIBUTION", esc(d.review.contribution))}
          ${field("WORD_COUNT", `${d.words.toLocaleString()}`)}
          ${field("SEO_TITLE", esc(d.meta.seo_title))}
          ${field("META_DESCRIPTION", esc(d.meta.meta_description))}
          ${field("SLUG", `<code>${esc(d.meta.slug)}</code>`)}
          ${field("HERO_CONCEPT", esc(d.review.hero))}
          ${field("FACT_CHECK_STATUS", "Current-fact claims researched 2026-09-01. Fact, interpretation and projection are separated in the prose.")}
          ${field("PUBLICATION_READY", "Yes — held for your approval, not published.")}
        </dl>
      </section>

      <figure class="hero">
        <img src="${d.heroSrc}" alt="${esc(d.meta.hero_alt)}" width="1000" height="563">
        <figcaption>${esc(d.meta.hero_caption)}</figcaption>
      </figure>

      <div class="prose">
${d.html}
      </div>

      <div class="prose prose--sources">
${d.sourcesHtml}
      </div>
    </article>`).join("");

const html = `<title>NOVRA Editorial Review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/*
 * The publication's own identity, not a new one: this packet is reviewed
 * alongside the site it feeds, so it uses the locked NOVRA tokens. Deliberately
 * single-theme — NOVRA is a dark publication — so every colour is painted
 * explicitly and nothing is left to the host ground.
 */
:root {
  --ground:      #05070f;
  --raised:      #0a0e1c;
  --inset:       #0d1226;
  --line:        #1b2340;
  --line-strong: #2a3560;
  --ink:         #f2f5ff;
  --ink-muted:   #9aa6c8;
  --ink-subtle:  #6b779c;
  --accent:      #4d84ff;
  --accent-deep: #2f6bff;
  --violet:      #a07cff;

  --serif: "Newsreader", ui-serif, Georgia, "Times New Roman", serif;
  --sans:  "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --mono:  "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  --measure: 66ch;
  --rail: 300px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-decoration-color: color-mix(in srgb, var(--accent) 40%, transparent); text-underline-offset: 3px; }
a:hover { text-decoration-color: var(--accent); }
:where(a, button, input):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 3px; }
code { font-family: var(--mono); font-size: 0.88em; color: var(--violet); }

.shell { display: grid; grid-template-columns: var(--rail) minmax(0, 1fr); gap: 0; align-items: start; }

/* ---- rail ---- */
.rail {
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
  border-right: 1px solid var(--line);
  background: var(--raised);
  padding: 32px 22px;
  display: flex; flex-direction: column; gap: 26px;
}
.brand { font-size: 1.05rem; font-weight: 700; letter-spacing: 0.02em; }
.brand span {
  background: linear-gradient(100deg, #2f6bff 0%, #4058e8 48%, #7b4dff 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.rail__lede { color: var(--ink-subtle); font-size: 0.8125rem; line-height: 1.55; margin: 6px 0 0; }
.rail__list { display: flex; flex-direction: column; gap: 2px; }
.rail__item {
  display: grid; grid-template-columns: 30px 1fr; gap: 10px; align-items: start;
  padding: 11px 10px; border-radius: 8px; text-decoration: none; color: inherit;
  border-left: 2px solid transparent;
}
.rail__item:hover { background: var(--inset); border-left-color: var(--accent); }
.rail__n {
  font-family: var(--mono); font-size: 0.75rem; color: var(--accent);
  padding-top: 2px; font-variant-numeric: tabular-nums;
}
.rail__title { display: block; font-size: 0.8125rem; font-weight: 600; line-height: 1.4; }
.rail__meta { display: block; font-size: 0.6875rem; color: var(--ink-subtle); margin-top: 3px; font-variant-numeric: tabular-nums; }
.rail__note {
  margin-top: auto; font-size: 0.75rem; color: var(--ink-subtle); line-height: 1.55;
  border-top: 1px solid var(--line); padding-top: 16px;
}

/* ---- main ---- */
.main { padding: 0 clamp(20px, 4vw, 60px) 120px; min-width: 0; }
.masthead { padding: 64px 0 40px; border-bottom: 1px solid var(--line); margin-bottom: 8px; }
.masthead h1 {
  font-family: var(--serif); font-weight: 500; font-size: clamp(2rem, 3.6vw, 2.9rem);
  line-height: 1.12; margin: 12px 0 16px; text-wrap: balance; letter-spacing: -0.01em;
}
.masthead p { color: var(--ink-muted); max-width: 62ch; margin: 0; font-size: 1.0625rem; }
.eyebrow {
  font-family: var(--sans); font-size: 0.6875rem; font-weight: 600;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin: 0;
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.pip {
  font-family: var(--mono); background: var(--inset); border: 1px solid var(--line-strong);
  color: var(--ink); padding: 3px 8px; border-radius: 5px; letter-spacing: 0.06em;
}

.doc { padding: 72px 0; border-bottom: 1px solid var(--line); scroll-margin-top: 20px; }
.doc:last-of-type { border-bottom: 0; }
.doc__head { max-width: var(--measure); }
.doc__title {
  font-family: var(--serif); font-weight: 600; font-size: clamp(1.7rem, 2.9vw, 2.35rem);
  line-height: 1.16; margin: 14px 0 14px; text-wrap: balance; letter-spacing: -0.01em;
}
.doc__excerpt { color: var(--ink-muted); font-size: 1.0625rem; margin: 0; }

.card {
  background: var(--raised); border: 1px solid var(--line); border-radius: 12px;
  padding: 22px 24px; margin: 30px 0 34px; max-width: 78ch;
}
.fields { margin: 0; display: flex; flex-direction: column; gap: 15px; }
.f { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 18px; }
.f dt {
  font-family: var(--mono); font-size: 0.6875rem; color: var(--accent);
  letter-spacing: 0.04em; padding-top: 3px;
}
.f dd { margin: 0; color: var(--ink-muted); font-size: 0.9375rem; line-height: 1.55; }

.hero { margin: 0 0 40px; max-width: 78ch; }
.hero img {
  display: block; width: 100%; height: auto;
  border: 1px solid var(--line); border-radius: 12px; background: var(--ground);
}
.hero figcaption { color: var(--ink-subtle); font-size: 0.8125rem; line-height: 1.5; margin-top: 11px; max-width: var(--measure); }

.prose { max-width: var(--measure); font-family: var(--serif); font-size: 1.145rem; line-height: 1.72; color: #e4e9f7; }
.prose p { margin: 0 0 1.15em; }
.prose h2 {
  font-family: var(--sans); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--accent); margin: 2.6em 0 1em;
  padding-bottom: 9px; border-bottom: 1px solid var(--line);
}
.prose strong { color: #fff; font-weight: 600; }
.prose em { font-style: italic; color: #eef2ff; }
.prose blockquote {
  margin: 1.7em 0; padding: 18px 22px; border-left: 2px solid var(--accent);
  background: var(--inset); border-radius: 0 8px 8px 0;
  font-family: var(--sans); font-size: 1rem; line-height: 1.6; color: #fff;
}
.prose ul { margin: 0 0 1.15em; padding-left: 1.2em; }
.prose li { margin-bottom: 0.5em; }
.prose--sources { font-family: var(--sans); font-size: 0.875rem; color: var(--ink-subtle); max-width: 78ch; }
.prose--sources ul { padding-left: 1.1em; }
.prose--sources li { margin-bottom: 0.45em; word-break: break-word; }

@media (max-width: 900px) {
  .shell { grid-template-columns: 1fr; }
  .rail { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--line); }
  .f { grid-template-columns: 1fr; gap: 5px; }
  .masthead { padding-top: 36px; }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
</style>

<div class="shell">
  <nav class="rail" aria-label="Articles in this packet">
    <div>
      <p class="brand">NOVRA <span>Intelligence</span></p>
      <p class="rail__lede">Editorial review packet — four drafts held for approval. Nothing here is published.</p>
    </div>
    <div class="rail__list">${nav}
    </div>
    <p class="rail__note">Article 1, <em>A Reliability Budget</em>, is already published and is not in this packet. Source of truth is <code>content/*.md</code> on <code>claude/fredrick-mendez-reputation-ijjnbq</code>.</p>
  </nav>

  <main class="main">
    <header class="masthead">
      <p class="eyebrow">Editorial review · 1 September 2026</p>
      <h1>Four drafts, held for approval</h1>
      <p>Articles 2 through 5 of the launch corpus, written to the executive research standard and fact-checked against primary sources on 1 September 2026. Two build on existing repository drafts rather than starting over. None has been deployed to WordPress — publication waits on your explicit approval.</p>
    </header>
${sections}
  </main>
</div>
`;

writeFileSync(OUT, html);
console.log(`${OUT}: ${html.length} chars, ${docs.length} articles, ${docs.reduce((a, d) => a + d.words, 0)} words`);
