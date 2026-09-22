/**
 * Merging derived page copy over authored page copy, without losing either.
 *
 * `build-snapshot.mjs` derives page copy by scraping the legacy WordPress HTML
 * in `site/pages/*.html`. That HTML is the authority for the six pages that
 * were published to WordPress, and it is the authority for nothing else —
 * because `frontend/content/pages.json` has since acquired content that never
 * existed in WordPress and therefore has no HTML to be scraped from:
 *
 *   - `capabilities` and `globalDevelopment`, two whole pages added by the
 *     migration, which no file in site/pages/ describes;
 *   - `home.institutional`, a *field* on a page that IS derived, which is the
 *     subtler case — a page-level merge would still drop it, because the
 *     derived `home` object simply has no such key.
 *
 * The generator used to build its six-key object and write it over pages.json
 * wholesale. Anything in the file that it could not derive was deleted, with no
 * error and no diff worth noticing, because the write succeeded.
 *
 * So the merge here is per-field, not per-page: a derived field wins over an
 * authored one (the HTML remains authoritative for what it describes), and any
 * key the generator does not produce is carried through untouched.
 */

/**
 * @param {Record<string, Record<string, unknown>>} authored  pages.json as it stands
 * @param {Record<string, Record<string, unknown>>} derived   what the scrape produced
 */
export function mergePageContent(authored, derived) {
  const pages = { ...authored };
  const preservedPages = [];
  const preservedFields = [];

  for (const [name, authoredPage] of Object.entries(authored)) {
    const derivedPage = derived[name];
    if (!derivedPage) {
      preservedPages.push(name);
      continue;
    }
    // Derived fields win; authored fields the generator cannot produce survive.
    pages[name] = { ...authoredPage, ...derivedPage };
    for (const field of Object.keys(authoredPage)) {
      if (!(field in derivedPage)) preservedFields.push(`${name}.${field}`);
    }
  }

  for (const [name, derivedPage] of Object.entries(derived)) {
    if (!(name in pages)) pages[name] = derivedPage;
  }

  return { pages, preservedPages: preservedPages.sort(), preservedFields: preservedFields.sort() };
}

/**
 * Every page and field in `authored` that is absent from `merged`.
 *
 * With the merge above this is always empty, which is the point: it is an
 * invariant check rather than a recovery step. It exists so that a future
 * change to the merge cannot quietly reintroduce the data loss — the build
 * fails instead, in the same fail-closed style as the rest of the generator.
 */
export function findLostContent(authored, merged) {
  const lost = [];
  for (const [name, authoredPage] of Object.entries(authored)) {
    if (!(name in merged)) {
      lost.push(name);
      continue;
    }
    for (const field of Object.keys(authoredPage)) {
      if (!(field in merged[name])) lost.push(`${name}.${field}`);
    }
  }
  return lost.sort();
}
