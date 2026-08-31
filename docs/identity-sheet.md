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
| `PROFESSIONAL_HEADLINE` | Technology Executive \| AI Strategy \| Autonomous Systems \| Blockchain & Digital Infrastructure |
| `SHORT_BIO` | **RESOLVED** — see Approved copy below |
| `LONG_BIO` | **RESOLVED** — see Approved copy below |
| `AUTHOR_DESCRIPTION` | Technology executive and strategist focused on artificial intelligence, autonomous systems, blockchain technology, smart contracts, software architecture, and next-generation digital infrastructure. |
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

## Approved copy — 2026-08-31

**SHORT_BIO**

> Fredrick Mendez is a technology executive and strategist focused on artificial
> intelligence, autonomous systems, blockchain technology, smart contracts,
> software architecture, and next-generation digital infrastructure. His work
> centers on designing scalable intelligent platforms, decentralized systems, and
> automation architectures that translate emerging technologies into measurable
> business and operational value.

**LONG_BIO** — four paragraphs, deployed on the About page under the headings
Executive Focus / Technology Leadership / AI, Blockchain & Smart Contracts /
Research & Innovation. Full text lives in `site/pages/about.html`; that file is
the deployed source, so edit it there rather than maintaining a second copy here.

**One standing caution.** "Technology executive" is a self-conferred role
description, not a verified title, and the bio carries no employer, no dates and
no credential to anchor it. That is internally consistent — nothing is
fabricated, because nothing specific is claimed. But it is the sentence a
sceptical reader will test first, and it is the one place on the site where
substance has to come from the published work rather than the copy. The articles
are what make it true.

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

## Blocking status — 2026-08-31

**Resolved:** `PROFESSIONAL_HEADLINE`, `SHORT_BIO`, `LONG_BIO`,
`AUTHOR_DESCRIPTION`. The Person schema now ships with a real description and an
eleven-entry `knowsAbout`.

**Still blank, deliberately:**

| Field | Why it stays blank |
| --- | --- |
| `PROFILE_PHOTO_REFERENCE` | No verified photograph supplied |
| `SAMEAS` | **Key removed from the schema entirely**, not left as a placeholder |
| `GITHUB_URL` | Handle inferred from repo ownership; unconfirmed as a public profile |
| `LINKEDIN_URL` | Surfaced in discovery; not confirmed as current or intended |
| `LABLAB_URL` | Reported to exist; exact URL never supplied |
| `CONTACT_EMAIL` | Last remaining site placeholder — blocks launch |

On `sameAs`: shipping it with a placeholder string would be worse than omitting
it. `sameAs` instructs search engines to treat profiles as the same entity, so a
wrong entry actively merges the subject with someone else — the precise failure
this project exists to avoid, given 400+ same-name profiles. The key is gone
from the schema and returns only when a specific URL is confirmed.

**One value now blocks public launch: `CONTACT_EMAIL`.**
