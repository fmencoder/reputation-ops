# ADIF — research architecture

**Status: architecture only. Nothing here is published, and nothing here is
written.** This document records the structure of a planned working paper so
that the work can begin without re-deciding its shape. It contains no findings.

## Why this lives in docs/ and not content/

`content/` is not an internal drafts folder. `src/novra/placeholders.ts` defines
it as one of the *public prefixes* — "paths whose contents are deployed to a
reader" — and `src/novra/policy.ts` applies the same boundary to its claims
rules. A half-written paper placed there would be unfinished material sitting on
the deployable track, checked by the publication gates and one deploy away from
a reader.

`docs/` is not a public prefix. It is not built, not deployed, not crawlable, and
not referenced by the frontend. That is the correct home until there is a paper.

When there is one, it moves to `content/` as a numbered document with front
matter matching the existing drafts (`title`, `slug`, `meta_description`,
`schema`, `status: draft`, `sources`), and follows the on-page checklist in
`docs/editorial-calendar.md` like anything else.

---

## The paper

| | |
| --- | --- |
| Working title | AI Infrastructure as Development Infrastructure: A Constraint-Based Framework for Prioritizing AI Investment in Emerging Economies |
| Series | NOVRA Intelligence Working Paper No. 01 |
| Status | Not started. Not published. |

### Research question

> How can heterogeneous AI-readiness deficiencies be converted into
> country-specific, sequenced and financially actionable development
> interventions without assuming that weaknesses in one foundational capability
> can be compensated for by strengths in others?

The second clause carries the weight. A framework that averages nine dimensions
into a score permits exactly the substitution the question rules out, so the
non-compensatory treatment is a structural commitment, not a caveat.

## The nine diagnostic dimensions

Nine. **There is no tenth dimension, and the investment translation layer below
is not one** — it is downstream of diagnosis, not another thing being diagnosed.

1. Connectivity
2. Compute & Cloud
3. Energy
4. Data & Local Context
5. Human Capital & Competency
6. Institutions & Governance
7. Financing & Capital
8. Innovation & Diffusion
9. Digital Public Infrastructure

## The chain

    INDICATORS
      ↓
    CAPABILITY THRESHOLDS
      ↓
    DEVELOPMENT STAGE
      ↓
    CONSTRAINT DIAGNOSIS
      ↓
    COMPLEMENTARITIES
      ↓
    INTERVENTION SEQUENCING
      ↓
    FINANCING INSTRUMENT
      ↓
    CAPITAL MOBILIZATION PATHWAY
      ↓
    DEVELOPMENT OUTCOME

Each arrow is a claim the paper has to earn. The two that will take the most
work are `DEVELOPMENT STAGE → CONSTRAINT DIAGNOSIS`, because thresholds are
stage-dependent and a threshold asserted without justification is a number
pretending to be a finding; and `INTERVENTION SEQUENCING → FINANCING
INSTRUMENT`, because that is where a diagnosis becomes an actionable claim and
therefore where it can most easily overreach.

## The investment translation record

The unit the framework produces for a single diagnosed constraint. Seven fields,
and a record is incomplete until all seven are populated from evidence:

| | Field | Note |
| --- | --- | --- |
| A | Constraint | Which of the nine, at what stage, on what indicator |
| B | Intervention | What would relieve it |
| C | Potential financing instrument | Candidate, not a commitment |
| D | Capital-mobilization pathway | How the instrument reaches the intervention |
| E | Complementary requirements | What must hold for B to work at all |
| F | Intended development outcome | From the list below |
| G | Measurable outcome indicators | How F would be observed, and over what period |

**C and D are the fields most likely to be filled in with something plausible
rather than something supported.** A named instrument implies availability and a
counterparty. Where neither is established, the field says so.

### Development outcomes in scope

Employment and job creation · SME technology adoption · firm productivity ·
digital-service access · private-capital mobilization · public-service
productivity · economic diversification · infrastructure resilience · financial
inclusion.

## How the contribution is framed

The defensible statement:

> ADIF integrates stage-dependent capability thresholds, non-compensatory
> constraint diagnosis, complementarity analysis, intervention sequencing and
> investment translation into a development-oriented framework for AI
> infrastructure.

That is working research language. It is a claim about **integration**, and it
is not a claim of academic novelty until the literature review supports one.

Not claimed, because each is prior work:

- binding constraints as an analytical approach
- complementarities between capabilities
- AI readiness as a construct
- adoption / adaptation / innovation as development stages

The paper cites these rather than reinventing them. Getting this wrong is the
fastest way for an institutional reader to stop taking the rest seriously.

## What must not be invented

Hard constraints on any future draft, listed because they are the failure modes
this kind of framework invites:

- **No country scores.** A populated matrix looks like a result. Until real
  indicator data is sourced and its provenance recorded, the matrix stays empty.
- **No empirical results, and no illustrative numbers that could be read as
  results.** An example clearly marked hypothetical is still quoted out of
  context.
- **No financing amounts.**
- **No World Bank, IFC, MIGA or other institutional involvement**, in any form
  — not as a partner, not as a reviewer, not as a source of endorsement.
- **No ADIF deployments and no completed country diagnostics.** The framework
  has not been applied.
- **No fabricated citations.** Every reference resolves to a real document.

The existing site-wide disclosure position holds here too: naming an institution
as context is not a claim of a relationship, and the paper should be written so
that no reader could mistake one for the other.

## Recommended structure, when writing begins

    docs/research/adif-architecture.md      this file — structure, no findings
    docs/research/adif-literature.md        prior work, with real citations
    docs/research/adif-indicators.md        candidate indicators + provenance
                                            for each, empty until sourced
    content/0NN-adif-working-paper-01.md    the draft, only once it is one

The move into `content/` is the moment the paper joins the publication track and
the placeholder and claims gates begin to apply. It should be the last step, not
the first.
