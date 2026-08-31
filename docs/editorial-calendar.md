# Editorial calendar

## Objective

Build a genuine authorial entity for the subject on an owned WordPress property:
substantive technical writing in the domains he actually works in, published
under his real name, accumulating topical authority over time.

Quality bar: every piece should be worth reading on its own merits by someone who
has never searched the author's name. If a draft only makes sense as an SEO
asset, it does not ship.

## Constraints

- No fabricated credentials, accomplishments, clients, or war stories. Articles
  argue from reasoning and public evidence, never from an invented résumé.
- No mention of BuildFlow (`BUILDFLOW_PUBLIC_DISCLOSURE=false`).
- No reference to search results, legal history, or this project.
- Every statistic, date, standard, or regulatory claim is verified before
  publication and linked to a primary source.

## Architecture

One pillar, four clusters. The pillar is the page that should eventually rank for
the author's name plus a topic; the clusters feed it authority through internal
links.

```
PILLAR: Reliability engineering for agentic AI systems
   |
   +-- Cluster A: Reliability & architecture   (posts 2, 3, 6)
   +-- Cluster B: Governance & assurance       (posts 4, 8, 11)
   +-- Cluster C: Construction technology      (posts 5, 9)
   +-- Cluster D: Fintech & business automation(posts 7, 10, 12)
```

Every cluster post links up to the pillar with descriptive anchor text. The
pillar links down to two or three of the strongest cluster posts. Cross-cluster
links only where genuinely relevant — forced interlinking reads as manipulation
and ages badly.

## Cadence

One substantive piece every two weeks. Twelve pieces over roughly six months.
This is deliberately slow: two strong articles a month builds a credible body of
work, where twenty thin ones builds a content farm.

## Schedule

| # | Working title | Cluster | Primary keyword | Status |
| --: | --- | --- | --- | --- |
| 1 | Why agentic AI systems fail at scale: a reliability budget | Pillar | agentic ai reliability | **Drafted** |
| 2 | ~~Step accuracy is not task accuracy~~ | A | agent task success rate | **Cut — merged into #1** |
| 3 | Idempotency and checkpointing for long-running agents | A | idempotent ai agents | **Drafted** |
| 4 | The EU AI Act timeline moved. What that changes | B | eu ai act timeline 2027 | **Drafted** |
| 5 | Where AI actually helps on a construction schedule | C | ai construction scheduling | Outlined |
| 6 | Limiting blast radius in autonomous agent architectures | A | ai agent blast radius | **Drafted** |
| 7 | Reconciliation is the hard part of finance automation | D | finance automation reconciliation | Outlined |
| 8 | Mapping NIST AI RMF onto an engineering backlog | B | nist ai rmf implementation | Outlined |
| 9 | Submittals, RFIs, and document-heavy construction workflows | C | construction document automation | Outlined |
| 10 | Autonomous systems and the architecture of human oversight | B | human in the loop automation | **Drafted** |
| 11 | Evaluating agents: offline benchmarks vs production traces | B | agent evaluation production | Outlined |
| 12 | The automation cases that do not pay for themselves | D | business automation roi | Outlined |

### Change log

**Two more merged into existing pieces.** The suppression brief requested
"Designing Production AI Agents for Recoverability" and "AI Infrastructure: From
Prototype Agents to Reliable Systems". Both are already covered: recoverability
*is* #3 (idempotency and checkpointing), and prototype-to-production *is* #1 (the
reliability budget). Writing them separately would have produced two articles
restating existing arguments at lower quality — the content-farm outcome the
cadence exists to prevent. Five distinct pieces, not six near-duplicates.

**#2 cut.** Drafting #1 absorbed the step-accuracy-vs-task-accuracy argument
entirely — the compounding arithmetic *is* that argument, and a separate post
would have restated it at lower quality. Publishing both would have looked like
padding the schedule, which is the failure mode the cadence exists to avoid.
Eleven pieces, not twelve. A slot is not a reason to write something.

## On-page checklist

Applied to every post before publication:

- Title under 60 characters, primary keyword early, no clickbait.
- Meta description 140–160 characters, written for a human deciding whether to click.
- One `H1`; `H2`/`H3` structure that reads as an outline on its own.
- `Article` schema with a real `author` reference resolving to the author page.
- `Person` schema on the author page — the entity every article points back to.
- Descriptive internal anchor text. Never "click here", never exact-match stuffing.
- Every external factual claim linked to a primary source.
- Canonical URL set; slug short and stable.

## Author entity

The single highest-value asset is the author page, not any individual post. It
should carry `Person` schema with `name`, `jobTitle`, `knowsAbout` (the seven
topic areas), `url`, and `sameAs` links to real, verifiable professional
profiles. Every article's `Article.author` resolves to it.

This is what search engines use to connect a name to a body of work. It is also
the piece that takes longest to earn, which is why it goes up first.
