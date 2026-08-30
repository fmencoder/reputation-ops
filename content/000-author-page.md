---
title: "About"
slug: about
meta_description: "PLACEHOLDER — one sentence, written last, describing what this person works on. 140-160 characters."
schema: Person
status: template
---

# Author page — template

This is the anchor of the whole content architecture. Every article's
`Article.author` resolves here, and this is the page search engines use to
connect a name to a body of work.

**It is filled in by the subject, not generated.** Every field below is a factual
claim about a real person. Nothing here may be invented, inflated, or inferred —
an author page with a fabricated credential is worse than no author page, because
it is checkable and it will be checked.

## Fields required

| Field | Notes |
| --- | --- |
| Full name | As used professionally and consistently everywhere. |
| Current role and organization | Only if public. Omit rather than approximate. |
| Areas of work | The subset of the seven topic areas that is genuinely true. |
| Background | Real experience only. No years-of-experience claims that cannot be substantiated. |
| Profile links | Only profiles that exist and that you control. |
| Contact | A working address or form. |

## Draft copy structure

Three short paragraphs, roughly 250 words total:

1. **What you work on now** — present tense, concrete, specific enough to be
   falsifiable. "I work on reliability in agentic systems" beats "I am passionate
   about AI."
2. **How you got there** — the actual path, stated plainly. Gaps are fine; every
   real career has them. Vagueness invites more scrutiny than brevity does.
3. **What you write about here** — pointing at the article clusters, which gives
   the page a reason to link out and gives the internal link graph its root.

Write it in first person. Author pages written in third person about a person who
is obviously writing them read as marketing copy, and marketing copy is exactly
the register to avoid.

## JSON-LD

Replace every `PLACEHOLDER`. Delete any field that cannot be filled truthfully —
an absent field costs nothing; a false one is a liability.

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://PLACEHOLDER_DOMAIN/about#person",
  "name": "PLACEHOLDER_FULL_NAME",
  "url": "https://PLACEHOLDER_DOMAIN/about",
  "jobTitle": "PLACEHOLDER_ROLE",
  "description": "PLACEHOLDER_ONE_SENTENCE",
  "knowsAbout": [
    "Artificial intelligence",
    "Agentic AI systems",
    "AI systems architecture",
    "Construction technology",
    "Financial technology",
    "Business automation",
    "AI governance and reliability"
  ],
  "sameAs": [
    "PLACEHOLDER_REAL_PROFILE_URL_1",
    "PLACEHOLDER_REAL_PROFILE_URL_2"
  ]
}
```

`sameAs` should list only profiles that exist and are controlled by the subject.
Listing a profile you do not control, or one that does not resolve, actively
weakens the entity association rather than strengthening it.

## Article schema

Each post carries `Article` schema whose `author` references the `@id` above, so
the whole body of work resolves to one entity:

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "PLACEHOLDER_TITLE",
  "datePublished": "PLACEHOLDER_ISO_DATE",
  "dateModified": "PLACEHOLDER_ISO_DATE",
  "author": { "@id": "https://PLACEHOLDER_DOMAIN/about#person" },
  "mainEntityOfPage": "https://PLACEHOLDER_DOMAIN/PLACEHOLDER_SLUG"
}
```
