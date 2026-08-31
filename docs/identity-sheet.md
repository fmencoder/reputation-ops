# Canonical identity sheet

Source of truth for every platform profile. Copy from here; do not improvise
per-platform variants, because inconsistent bios across profiles weaken exactly
the entity association this is meant to build.

**Unknown fields are blank and marked `[UNVERIFIED]`. Nothing here is guessed.**
A blank field costs nothing. A wrong one is checkable, and this is a footprint
built for an audience that checks.

---

## Identity

| Field | Value |
| --- | --- |
| `DISPLAY_NAME` | Fredrick Mendez |
| `PROFESSIONAL_HEADLINE` | `[UNVERIFIED]` — see note below |
| `SHORT_BIO` (≤160 chars) | `[UNVERIFIED]` |
| `LONG_BIO` (~250 words) | `[UNVERIFIED]` |
| `AUTHOR_DESCRIPTION` (1 sentence, Person.description) | `[UNVERIFIED]` |
| `PROFILE_PHOTO_REFERENCE` | `[UNVERIFIED]` |

## Owned properties

| Field | Value | Status |
| --- | --- | --- |
| `NOVRA_URL` | https://novraintelligence.com | Live, Coming Soon |
| `AUTHOR_URL` | https://novraintelligence.com/about/#fredrick-mendez | Draft |
| `GITHUB_URL` | https://github.com/fmencoder | **Confirm** — handle inferred from repo ownership, not verified as a public profile |
| `LINKEDIN_URL` | `[UNVERIFIED]` — a profile surfaced during discovery; confirm it is current and intended for the professional footprint |
| `LABLAB_URL` | `[UNVERIFIED]` — profile reported under "Fredrick Mendez / Fmencoder"; paste exact URL |
| `DEVTO_URL` | Not created |
| `RESEARCH_URLS` | None |

## Name variants

Consistency matters more than any single choice. **Use "Fredrick Mendez"
everywhere**, spelled exactly this way.

The "Frederick" spelling belongs to other people — 400+ LinkedIn profiles under
that variant alone. Do not claim it, do not add it as an alias, and do not list
same-name profiles under `sameAs`.

---

## Headline guidance

The headline is the highest-leverage unverified field: it appears in search
snippets, LinkedIn previews and schema.

It must be a factual description of current work. Not aspirational, not a
positioning statement. Two tests before using one:

1. If a stranger asked "is that true?", could you show them something?
2. Does it describe what you do, or what you would like to be seen as?

The second test disqualifies most headlines people write.

---

## sameAs rules

`sameAs` in the Person schema tells search engines which profiles are the same
entity. It is the mechanism that consolidates a scattered footprint into one
recognisable person — and it is fragile.

Only include a URL if **all four** hold:

1. The profile genuinely belongs to Fredrick Mendez.
2. It resolves publicly, without login.
3. It is intended as part of the professional footprint.
4. It carries substantive content, not just a name.

A dead link, an unowned profile, or an empty placeholder actively weakens the
association. Two verified profiles beat six uncertain ones.

Ship the Person schema with whatever survives this test, even if that is one
entry. `sameAs` accepts additions later at no cost.

---

## Profiles NOT to link

Per the low-value-results rule: personal or non-professional profiles that rank
for the name must not be linked from any professional property. Linking them
consolidates them into the entity, which is the opposite of the intent.

If such a profile is controlled by the subject and no longer needed, it belongs
in the privacy-reduction track (`outreach/broker-worklist.md`), not here.

| Profile | Action |
| --- | --- |
| `[none identified yet]` | Audit pending — needs a live scan |

---

## Per-platform mapping

| Platform | Uses | Notes |
| --- | --- | --- |
| NOVRA About | `LONG_BIO`, photo, all `sameAs` | Canonical profile; everything points here |
| Article schema | `DISPLAY_NAME`, `AUTHOR_URL` | `Article.author` resolves to the Person `@id` |
| LinkedIn | `PROFESSIONAL_HEADLINE`, `SHORT_BIO` | Link to NOVRA in the website field |
| GitHub | `SHORT_BIO`, NOVRA link | Profile README if repos are public |
| lablab.ai | `SHORT_BIO`, NOVRA + GitHub links | Only factual project history |
| DEV.to | `SHORT_BIO`, NOVRA link | Set `canonical_url` to the NOVRA original |

---

## Blocking status

Five identity fields are unverified. Until `AUTHOR_DESCRIPTION` and at least one
`sameAs` URL are filled, the Person schema cannot ship complete — and the Person
schema is the single asset the whole entity architecture rests on.

This is the same blocker as the site's `PLACEHOLDER_ONE_SENTENCE_VERIFIED` and
`PLACEHOLDER_VERIFIED_PROFILE_URL`. One answer clears both.
