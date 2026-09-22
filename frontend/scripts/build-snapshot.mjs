/**
 * Builds the committed CMS snapshot the frontend falls back to.
 *
 * The snapshot is derived from the exact payloads that were published to
 * WordPress (site/wp-payload/*.json), the permalinks WordPress returned at
 * publish time, and the live post metadata recorded in
 * artifacts/phase0-production-record.json. It is one copy of the content, not a
 * second one: the same bytes the CMS holds, re-expressed as typed data with the
 * presentation stripped out.
 *
 * Presentation is exactly what gets stripped. The whole point of the migration
 * is that WordPress could only be given flattened inline styles; carrying those
 * into the new frontend would import the problem along with the content. What
 * survives is semantic structure — headings, paragraphs, figures, tables,
 * citations — which the frontend then styles with real CSS.
 *
 * Every extraction asserts. A silent miss would ship an empty section that
 * looks deliberate, which is the failure mode this file exists to prevent.
 *
 * Usage: node frontend/scripts/build-snapshot.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergePageContent, findLostContent } from "./lib/page-content.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const read = (p) => readFileSync(join(REPO, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

/*
 * The two halves of this script have different lifetimes, and conflating them
 * is why `npm run snapshot` could not run at all in a clean checkout.
 *
 * PAGE COPY is live. Its input, site/pages/*.html, is tracked, and its output,
 * frontend/content/pages.json, is imported by the frontend on every build. It
 * regenerates deterministically from a fresh clone, every run.
 *
 * ARTICLES are historical. They were reconstructed once, during the migration,
 * from a WordPress export: site/wp-payload/*.json and
 * artifacts/phase0-production-record.json. Neither is in the repository —
 * wp-payload was never committed at all, and artifacts/ is gitignored — while
 * the *output*, frontend/content/cms-snapshot.json, is committed and carries
 * all five articles with the dates that export recorded.
 *
 * So the script used to open a gitignored file unconditionally on line three
 * and die with ENOENT before it could do the half it was still capable of. The
 * dependency is now explicit: articles are regenerated only when their inputs
 * are actually present, or when --articles demands it, in which case their
 * absence is a loud failure rather than a crash.
 */
const ARTICLE_SOURCES = {
  payloads: "site/wp-payload",
  liveMetadata: "artifacts/phase0-production-record.json",
};
const missingArticleSources = Object.values(ARTICLE_SOURCES).filter(
  (rel) => !existsSync(join(REPO, rel)),
);
const articleSourcesPresent = missingArticleSources.length === 0;
const demandArticles = process.argv.includes("--articles");

if (demandArticles && !articleSourcesPresent) {
  console.error(
    "SNAPSHOT FAILED\n" +
      "  --articles was requested but the migration inputs are not present:\n" +
      missingArticleSources.map((rel) => `    ${rel}`).join("\n") +
      "\n\n  These are one-time WordPress export artefacts. They are not tracked in\n" +
      "  this repository, and their output is already committed at\n" +
      "  frontend/content/cms-snapshot.json. Restore them from the migration\n" +
      "  export before asking for article regeneration.",
  );
  process.exit(1);
}

const permalinks = readJson("site/wp-permalinks.json");
const media = readJson("site/wp-media.json").assets;

const problems = [];
const need = (value, what) => {
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    problems.push(`missing: ${what}`);
    return "";
  }
  return value;
};

/*
 * Plain-text fields are decoded once, here. The old markup carried HTML
 * entities because it was HTML; React escapes its text children, so an
 * undecoded "&amp;" would render as those five literal characters on the page.
 * bodyHtml is deliberately left alone — it stays HTML and is set as such.
 */
const ENTITIES = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&mdash;": "\u2014", "&ndash;": "\u2013", "&bull;": "\u2022", "&middot;": "\u00b7",
  "&nbsp;": "\u00a0", "&rarr;": "\u2192", "&hellip;": "\u2026",
};
const text = (value) =>
  typeof value === "string"
    ? value.replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity] ?? entity)
    : value;

/** One capture group, or "" plus a recorded problem. */
const grab = (html, re, what) => text(need((html.match(re) ?? [])[1]?.trim(), what));
const grabAll = (html, re) => [...html.matchAll(re)].map((m) => text(m[1].trim()));

/**
 * Strip presentation, keep meaning.
 *
 * class and style are the two attributes that encode the old design; both go.
 * Local /assets/ and Media Library URLs are rewritten to the frontend's own
 * public paths so the markup no longer points at wordpress.com for its images.
 */
const mediaFile = new Map(
  Object.entries(media).map(([local, url]) => [url, local.replace("/assets/", "/assets/")]),
);
const normalize = (html) =>
  html
    .replace(/\s+class="[^"]*"/g, "")
    .replace(/\s+style="[^"]*"/g, "")
    .replace(/src="([^"]+)"/g, (whole, url) => `src="${mediaFile.get(url) ?? url}"`)
    .replace(/\n\s{4,}/g, "\n")
    .trim();

// ------------------------------------------------------------------ articles -
const snapshotFile = join(HERE, "..", "content", "cms-snapshot.json");
const committedSnapshot = existsSync(snapshotFile)
  ? JSON.parse(readFileSync(snapshotFile, "utf8"))
  : null;

/** Derive the five articles from the WordPress export. Only ever called when
 *  that export is on disk. */
function deriveArticles() {
const production = readJson(ARTICLE_SOURCES.liveMetadata);
const payloadDir = ARTICLE_SOURCES.payloads;
const articleFiles = readdirSync(join(REPO, payloadDir)).filter((f) => /^2\d-article-/.test(f));

/* The editorial kicker each article carries on its cards. It is not a WordPress
 * category — the site has exactly one of those, "Analysis" — so it is read from
 * the Insights index, which is where those kickers are authored. */
const insightsHtml = read("site/pages/insights.html");
const kickerFor = (permalink) => {
  const card = insightsHtml.match(
    new RegExp(`href="${permalink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[\\s\\S]*?card__kicker">([^<]+)<`),
  );
  return card ? card[1].trim() : "Analysis";
};

const articles = articleFiles.map((file) => {
  const { params } = readJson(`${payloadDir}/${file}`);
  const html = params.content;
  const slug = params.slug;
  const permalink = need(permalinks.permalinks[slug], `permalink for ${slug}`);
  const live = production.posts[String(params.id)];
  need(live, `live record for post ${params.id}`);

  const heroBlock = grab(html, /<figure class="figure">([\s\S]*?)<\/figure>/, `${slug} hero figure`);
  const bodyRaw = grab(html, /<div class="article__body">([\s\S]*?)<\/div>\n\n/, `${slug} body`);
  const sourcesBlock = (html.match(/<aside class="sources">([\s\S]*?)<\/aside>/) ?? [])[1] ?? "";

  return {
    id: params.id,
    slug,
    title: text(params.title),
    excerpt: text(params.excerpt),
    permalink,
    path: new URL(permalink).pathname,
    date: live.date,
    modified: live.modified,
    dateDisplay: grab(html, /<time datetime="[^"]+">([^<]+)<\/time>/, `${slug} display date`),
    dateMachine: grab(html, /<time datetime="([^"]+)"/, `${slug} machine date`),
    readingTime: grab(html, /&middot; ([0-9]+ min read)/, `${slug} reading time`),
    topic: kickerFor(permalink),
    category: "Analysis",
    hero: {
      src: mediaFile.get(grab(heroBlock, /src="([^"]+)"/, `${slug} hero src`)) ?? "",
      alt: grab(heroBlock, /alt="([^"]*)"/, `${slug} hero alt`),
      width: Number(grab(heroBlock, /width="([0-9]+)"/, `${slug} hero width`)),
      height: Number(grab(heroBlock, /height="([0-9]+)"/, `${slug} hero height`)),
      caption: grab(heroBlock, /<figcaption>([\s\S]*?)<\/figcaption>/, `${slug} hero caption`),
    },
    bodyHtml: normalize(bodyRaw),
    sources: grabAll(sourcesBlock, /<li>([\s\S]*?)<\/li>/g).map((item) => {
      const url = (item.match(/(https?:\/\/\S+)/) ?? [])[1] ?? "";
      return {
        text: text(item.replace(/\s*&mdash;\s*https?:\/\/\S+\s*$/, "").replace(/<[^>]+>/g, "").trim()),
        url,
      };
    }),
  };
});
articles.sort((a, b) => b.date.localeCompare(a.date));
  return { articles, source: {
    blogId: production.wordpress.blogId,
    origin: "site/wp-payload/*.json (the exact payloads published to the CMS)",
    liveMetadata: ARTICLE_SOURCES.liveMetadata,
  } };
}

/**
 * Validate the committed articles rather than rebuild them.
 *
 * This is the path a fresh clone takes. The committed snapshot is the only
 * copy of this content left, so it is checked rather than trusted: five
 * articles, each with the fields the frontend reads and a body substantial
 * enough not to be a hollow shell.
 */
function loadCommittedArticles() {
  if (!committedSnapshot) {
    problems.push(`no article source and no committed snapshot at ${snapshotFile}`);
    return { articles: [], source: {} };
  }
  const list = committedSnapshot.articles ?? [];
  if (list.length !== 5) problems.push(`committed snapshot has ${list.length} articles, expected 5`);
  for (const a of list) {
    for (const field of ["slug", "title", "path", "date", "modified", "bodyHtml"]) {
      if (!a?.[field]) problems.push(`committed article ${a?.slug ?? "?"} is missing ${field}`);
    }
    if (typeof a?.bodyHtml === "string" && a.bodyHtml.length < 400) {
      problems.push(`committed article ${a.slug} has a suspiciously short body`);
    }
  }
  return { articles: list, source: committedSnapshot.source ?? {} };
}

const { articles, source: articleSource } = articleSourcesPresent
  ? deriveArticles()
  : loadCommittedArticles();

// --------------------------------------------------------------- page copy --
const page = (name) => read(`site/pages/${name}.html`);
const domainsFrom = (html) =>
  grabAll(html, /class="domain__label"[^>]*>([\s\S]*?)<\/p>/g).map((label) => label.trim());

const home = page("home");
const about = page("about");
const technology = page("technology");
const insights = page("insights");
const research = page("research");
const contact = page("contact");

const heading = (html, what) => {
  const h1 = grab(html, /<h1 class="display">([\s\S]*?)<\/h1>/, `${what} headline`);
  // The headline is authored with an accent span; the frontend needs the two
  // halves separately so it can set them on their own lines.
  const accent = (h1.match(/<span class="accent"[^>]*>([\s\S]*?)<\/span>/) ?? [])[1] ?? "";
  const lead = h1.replace(/<span class="accent"[^>]*>[\s\S]*?<\/span>/, "").replace(/<br\s*\/?>/g, " ");
  return { lead: lead.replace(/\s+/g, " ").trim(), accent: accent.replace(/\s+/g, " ").trim() };
};

const cardsFrom = (html) =>
  grabAll(html, /<article class="card">([\s\S]*?)<\/article>/g).map((card) => ({
    icon: (card.match(/src="\/assets\/([^"]+)"/) ?? [])[1] ?? "",
    title: text((card.match(/<h3>([\s\S]*?)<\/h3>/) ?? ["", ""])[1].trim()),
    body: text((card.match(/<p>([\s\S]*?)<\/p>/) ?? ["", ""])[1].trim()),
  }));

/*
 * A heading plus every paragraph that follows it before the next heading.
 * Taking only the first paragraph silently truncated the Technology page's
 * two-paragraph explanation the first time this ran.
 */
const proseSections = (html) =>
  [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>((?:\s*<p[^>]*>[\s\S]*?<\/p>)+)/g)].map((match) => ({
    heading: text(match[1].trim()),
    paragraphs: [...match[2].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((p) =>
      text(p[1].replace(/\s+/g, " ").trim()),
    ),
  }));

/*
 * What the legacy WordPress HTML can tell us. These six pages, and no others —
 * site/pages/ contains exactly six files because WordPress only ever had six
 * pages. Anything authored into pages.json since is merged back in below.
 */
const derivedPages = {
  home: {
    eyebrow: grab(home, /<p class="eyebrow">([^<]+)</, "home eyebrow"),
    headline: heading(home, "home"),
    lead: grab(home, /<p class="lead"[^>]*>([\s\S]*?)<\/p>/, "home lead"),
    domains: domainsFrom(home),
  },
  insights: {
    eyebrow: grab(insights, /<p class="eyebrow">([^<]+)</, "insights eyebrow"),
    headline: heading(insights, "insights"),
    lead: grab(insights, /<p class="lead"[^>]*>([\s\S]*?)<\/p>/, "insights lead"),
    domains: domainsFrom(insights),
  },
  research: {
    eyebrow: grab(research, /<p class="eyebrow">([^<]+)</, "research eyebrow"),
    headline: heading(research, "research"),
    lead: grab(research, /<p class="lead"[^>]*>([\s\S]*?)<\/p>/, "research lead"),
    intro: proseSections(research)[0],
    openQuestions: grab(
      research,
      /<h3>Open questions<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/,
      "research open questions",
    ).replace(/\s+/g, " ").trim(),
  },
  technology: {
    eyebrow: grab(technology, /<p class="eyebrow">([^<]+)</, "technology eyebrow"),
    headline: heading(technology, "technology"),
    lead: grab(technology, /<p class="lead"[^>]*>([\s\S]*?)<\/p>/, "technology lead"),
    cards: cardsFrom(technology),
    convergence: proseSections(technology),
  },
  about: {
    eyebrow: grab(about, /<p class="eyebrow">([^<]+)</, "about eyebrow"),
    headline: heading(about, "about"),
    lead: grab(about, /<p class="lead"[^>]*>([\s\S]*?)<\/p>/, "about lead"),
    identity: {
      name: grab(about, /class="identity__name">([^<]+)</, "identity name"),
      role: grab(about, /class="identity__role">([^<]+)</, "identity role"),
      descriptor: grab(about, /class="identity__desc">([^<]+)</, "identity descriptor"),
    },
    portrait: {
      src: "/assets/author-portrait.webp",
      alt: grab(about, /<img src="\/assets\/author-portrait\.webp"[^>]*alt="([^"]+)"/, "portrait alt"),
      width: 506,
      height: 509,
    },
    researchFocus: cardsFrom(about),
    profile: proseSections(about).filter((s) => s.heading !== "Our research focus"),
    manifesto: {
      eyebrow: need(
        about.includes('<p class="eyebrow">The idea behind NOVRA</p>') ? "The idea behind NOVRA" : "",
        "manifesto eyebrow",
      ),
      headline: {
        lead: "Intelligence begins",
        accent: "with awe.",
      },
      paragraphs: grabAll(
        (about.match(/The idea behind NOVRA<\/p>([\s\S]*?)<\/section>/) ?? ["", ""])[1],
        /<p[^>]*>([\s\S]*?)<\/p>/g,
      ).map((p) => p.replace(/\s+/g, " ").trim()),
    },
    publication: {
      kicker: "About the publication",
      title: need(
        about.includes("<h3>What NOVRA Intelligence is</h3>") ? "What NOVRA Intelligence is" : "",
        "publication heading",
      ),
      body: grab(
        about,
        /<h3>What NOVRA Intelligence is<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/,
        "publication body",
      ).replace(/\s+/g, " ").trim(),
    },
  },
  contact: {
    eyebrow: grab(contact, /<p class="eyebrow">([^<]+)</, "contact eyebrow"),
    headline: heading(contact, "contact"),
    lead: grab(contact, /<p class="lead"[^>]*>([\s\S]*?)<\/p>/, "contact lead"),
    email: grab(contact, /mailto:([^"]+)"/, "contact email"),
    note: grab(contact, /class="card__meta">([\s\S]*?)<\/p>/, "contact note").replace(/\s+/g, " ").trim(),
  },
};

/*
 * Merge the derived six over whatever pages.json already holds.
 *
 * This is the step whose absence was the defect. The generator wrote its
 * six-key object straight over pages.json, so `capabilities`,
 * `globalDevelopment` and `home.institutional` — content authored directly
 * into the file, for pages WordPress never had — were deleted on every run,
 * silently, because the write itself succeeded.
 */
const pagesFile = join(HERE, "..", "content", "pages.json");
const authoredPages = existsSync(pagesFile)
  ? (JSON.parse(readFileSync(pagesFile, "utf8")).pages ?? {})
  : {};
const { pages, preservedPages, preservedFields } = mergePageContent(authoredPages, derivedPages);

/*
 * Fail closed. The merge above cannot drop anything, so this is an invariant
 * rather than a rescue — it is here so a later edit to the merge cannot
 * reintroduce the data loss without the build saying so.
 */
const lost = findLostContent(authoredPages, pages);
if (lost.length) problems.push(`snapshot would drop authored content: ${lost.join(", ")}`);

// The manifesto is approved copy reproduced verbatim. If it ever stops being
// three paragraphs, something has rewritten it and the build should say so.
if (pages.about.manifesto.paragraphs.length !== 3) {
  problems.push(`manifesto has ${pages.about.manifesto.paragraphs.length} paragraphs, expected 3`);
}
if (articleSourcesPresent && articles.length !== 5) {
  problems.push(`found ${articles.length} articles, expected 5`);
}
for (const domain of ["home", "insights"]) {
  if (pages[domain].domains.length !== 4) {
    problems.push(`${domain} lists ${pages[domain].domains.length} domains, expected 4`);
  }
}

if (problems.length) {
  console.error("SNAPSHOT FAILED\n  " + problems.join("\n  "));
  process.exit(1);
}

const snapshot = {
  _comment: [
    "Generated by frontend/scripts/build-snapshot.mjs — do not edit by hand.",
    "Derived from the payloads published to WordPress, with presentation stripped.",
    "The frontend prefers a live fetch from the WordPress REST API and falls back",
    "to this file when the API is unreachable at build time.",
  ],
  generatedAt: "",
  source: articleSource,
  articles,
  pages,
};

/*
 * generatedAt moves only when the content moves.
 *
 * Stamping today's date unconditionally made the output non-deterministic
 * across a midnight boundary: two runs of an unchanged repository produced a
 * one-line diff in two files and nothing else, which trains a reader to ignore
 * the diff this script produces. The date now answers "when did this content
 * last change", which is the question it looked like it was answering anyway.
 */
const sameContent = (a, b) => {
  if (!a || !b) return false;
  const strip = ({ generatedAt: _ignored, ...rest }) => JSON.stringify(rest);
  return strip(a) === strip(b);
};
const today = new Date().toISOString().slice(0, 10);
snapshot.generatedAt = sameContent(snapshot, committedSnapshot)
  ? committedSnapshot.generatedAt
  : today;

writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2) + "\n");

/*
 * Page copy is written separately because the two halves have different
 * lifetimes. Articles are CMS-owned and the frontend fetches them live; this
 * file is the editorial text that lives in a page's composition — an eyebrow,
 * a headline split across two lines, a card descriptor — which the REST API has
 * no structure for. It is small, it is always required, and it is therefore
 * always shipped, while the article snapshot is an optional offline fallback.
 */
const committedPagesFile = existsSync(pagesFile)
  ? JSON.parse(readFileSync(pagesFile, "utf8"))
  : null;
const pagesOut = {
  _comment: "Generated by frontend/scripts/build-snapshot.mjs — do not edit by hand.",
  generatedAt: "",
  pages,
};
pagesOut.generatedAt = sameContent(pagesOut, committedPagesFile)
  ? committedPagesFile.generatedAt
  : today;

writeFileSync(pagesFile, JSON.stringify(pagesOut, null, 2) + "\n");
console.log(
  `snapshot written — ${articles.length} articles, ${Object.keys(pages).length} pages ` +
    `(${Object.keys(derivedPages).length} derived from site/pages/)`,
);
console.log(
  articleSourcesPresent
    ? "  articles: regenerated from the WordPress export"
    : "  articles: carried over from the committed snapshot and validated — " +
      `the migration export is not in this repository (${missingArticleSources.join(", ")}). ` +
      "Run with --articles to require regeneration.",
);
if (preservedPages.length) console.log(`  preserved authored pages: ${preservedPages.join(", ")}`);
if (preservedFields.length) console.log(`  preserved authored fields: ${preservedFields.join(", ")}`);
