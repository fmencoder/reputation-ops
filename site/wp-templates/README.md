# WordPress block templates (pub/assembler)

These files are the source of truth *in this repository* for the block markup
installed on novraintelligence.com via the WordPress.com site-editing API
(`templates.update` / `template-parts.update`, theme `pub/assembler`).

They are recorded here because the live site is the only other place this
markup exists. There is no automated deploy: an edit here must be pushed with
the site-editing API and the response read back before it counts as applied.

## Why these files look the way they do

The site runs on a **free WordPress.com plan** (`wpcom_free_grace`, platform
`simple`). Three consequences shaped every decision below:

1. **Custom CSS is plan-gated.** All NOVRA styling therefore lives either in
   inline styles inside the page payloads (see `site/build-inline.mjs`) or in
   block `style` attributes here. There is no stylesheet.
2. **Block-level global styles DO persist** even though Custom CSS does not.
   The dark shell (`styles.color.background = #05070f`) is set through
   `global-styles.update` and is what keeps the page background continuous
   behind these templates.
3. **The WordPress.com footer credit is injected by the platform**, not by the
   theme. It is not present in `parts/footer.html` and no API exposed to this
   toolchain removes it.

## Layout note that is easy to regress

`wp:post-content` must use `{"layout":{"type":"default"}}`, NOT
`{"type":"constrained"}`. Constrained layout caps every direct child at the
theme's 620px content size, which would squeeze the entire NOVRA payload —
each page brings its own `.wrap` widths (1200px, or 760px for articles).

## Files

| File | Template ID |
| --- | --- |
| `parts/header.html` | `pub/assembler//header` |
| `parts/footer.html` | `pub/assembler//footer` |
| `page.html` | `pub/assembler//page` |
| `single.html` | `pub/assembler//single` |
| `index.html` | `pub/assembler//index` |
| `archive.html` | `pub/assembler//archive` |
| `home.html` | `pub/assembler//home` |
| `search.html` | `pub/assembler//search` |
| `404.html` | `pub/assembler//404` |
