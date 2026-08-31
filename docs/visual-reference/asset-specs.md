# Asset specifications — E–J and article graphics

Derived from direct observation of the A/B/C/D concept board. The board governs;
this file translates it into buildable specifications.

**Read `README.md` first** for the palette, typography and prohibitions. This
file assumes them.

---

## What the board actually does

Four observations that govern everything below. These are what make the panels
cohere, and they are what a new graphic has to reproduce to belong.

**1. One bright focal mass, everything else recessive.** A has the illuminated
globe limb; B has one large glowing cube among smaller dim ones; D has the wave
crest. Never two competing focal points. Roughly 15–20% of the canvas carries
real luminance; the rest is near-black with structure barely visible in it.

**2. Structure is drawn in hairlines, not fills.** Cube edges, orbital rings,
mesh lines — all 1–1.5px, mostly at 25–45% opacity. Nothing is a solid shape.
Depth comes from opacity falloff, not from perspective shading.

**3. Nodes are small, bright, and few.** Discrete points at 3–6px with a tight
glow halo, roughly 6–12 per composition. They read as termini on a network, not
as scattered stars. The particle dust in B and D is a separate, much dimmer
layer and never competes with them.

**4. Violet is spatial, not decorative.** It marks depth and secondary paths —
the far side of D's wave, the recessive cubes in B. Blue holds the foreground.
Reversing this is the fastest way to make a graphic look off-system.

---

## E — Convergence architecture

The spine of the set. Vertical flow, eight stages, wrapped by four cross-cutting
concerns.

- Canvas 1600×1000. Stages as horizontal bands, spacing tightening slightly
  toward the base so the composition settles rather than marching.
- Each stage a hairline-bordered plate (`#1b2340`, 1px, 14px radius) on
  near-black, with a node on its left edge.
- Flow: DATA + EVENTS → AI / INTELLIGENCE → AUTONOMOUS AGENTS → POLICY +
  AUTHORIZATION → SMART CONTRACTS → BLOCKCHAIN / DISTRIBUTED STATE → DIGITAL +
  FINANCIAL INFRASTRUCTURE → VERIFIED OUTCOMES.
- **Focal mass at POLICY + AUTHORIZATION** — the gate is the argument of the
  diagram, so it carries the brightest plate and the widest glow.
- Connecting paths: 1px vertical runs, blue, 40% opacity, with a subtle brightness
  gradient downward suggesting direction without arrowheads.
- SECURITY / GOVERNANCE / OBSERVABILITY / HUMAN OVERSIGHT as a violet hairline
  frame enclosing stages 2–7, labels set small and uppercase along the left edge
  at 25% opacity. They surround; they do not interrupt.
- Labels: white, 15–16px effective, uppercase, 0.1em tracking.

## F — Blockchain and smart contracts

Horizontal sequence with a distributed field beneath it.

- Canvas 1600×900. Upper two-thirds: APPLICATION / AGENT → AUTHORIZATION →
  SMART CONTRACT → EXECUTION → CONSENSUS / VALIDATION → DISTRIBUTED STATE →
  VERIFIED OUTCOME.
- Lower third: 14–18 nodes in an irregular scatter, connected by hairlines at
  20–30% opacity. This is the ledger substrate; it should read as depth below
  the sequence, not as a second diagram.
- **Focal mass at SMART CONTRACT**, rendered as a hexagonal hairline plate —
  borrowing B's cube-facet language without repeating the cube.
- CONSENSUS drawn as three-to-four converging paths meeting at one bright node.
- No coins. No currency glyphs. No candlesticks. The subject is execution and
  verification, and the visual should be legible as such with the labels removed.

## G — AI and autonomous agents

Radial, not linear — the one composition in the set that should not flow.

- Canvas 1600×1000. INTELLIGENCE LAYER at centre as the focal mass.
- Four to five SPECIALIZED AGENTS on an inner orbit, echoing A's ring geometry.
- Outer ring: MEMORY + CONTEXT, TOOLS + APIs, DATA SOURCES, EXECUTION,
  OBSERVABILITY, CHECKPOINT / RECOVERY.
- **POLICY / PERMISSION BOUNDARY as a closed violet hairline ring** between the
  agent orbit and the outer ring — every path to execution crosses it, visibly.
  That crossing is the point of the graphic.
- HUMAN OVERSIGHT sits outside the boundary, connected by a single distinct path
  drawn slightly brighter than the rest.
- No robot, no humanoid, no brain. The intelligence layer is geometry.

## H — Financial technology

Institutional, restrained, the most sober of the set.

- Canvas 1600×900. MARKET / BUSINESS DATA → INTELLIGENCE → DECISION →
  POLICY / RISK → TRANSACTION → SMART CONTRACT / FINANCIAL RAIL → SETTLEMENT →
  RECONCILIATION.
- **Focal mass at SETTLEMENT** — the point of irreversibility.
- RECONCILIATION drawn as a return path to DATA, a thin violet arc closing the
  loop. It is the only curved element; that is what makes it read.
- POLICY / RISK gets a hairline gate treatment matching E's boundary language.
- Infrastructure, not trading. No charts, no tickers, no arrows implying price.

## I — Digital infrastructure

Layered stack, the most structural composition.

- Canvas 1600×1000. Eleven horizontal strata: APPLICATIONS, APIs, AI SERVICES,
  DATA, COMPUTE, CLOUD, DATABASES, BLOCKCHAIN NODES, NETWORKS, SECURITY,
  OBSERVABILITY.
- Each a full-width hairline plate; opacity decreasing with depth so the stack
  recedes.
- Vertical connector paths crossing multiple layers, not just adjacent ones —
  the interconnection is the subject.
- SECURITY and OBSERVABILITY rendered as vertical violet bands spanning the full
  stack rather than as layers of their own. They are cross-cutting and should
  look it.
- **Focal mass at AI SERVICES**, consistent with the site's positioning.

## J — Research

Modular, not diagrammatic. Closest to panel C.

- Canvas 1600×900. Six bordered modules in a 3×2 grid: AI & AUTONOMOUS SYSTEMS,
  BLOCKCHAIN & SMART CONTRACTS, FINANCIAL TECHNOLOGY, DIGITAL INFRASTRUCTURE,
  SOFTWARE ARCHITECTURE, AI GOVERNANCE.
- Each module carries a small distinct network motif, echoing C's article
  thumbnails — related but individually recognisable.
- **No publication counts, citation figures, impact scores, h-indices or
  institutional affiliations.** None exist. This is the panel where invented
  metrics would be most tempting and most damaging; C's counters were removed for
  exactly this reason and J must not reintroduce them.
- Modules link to real published articles or render as empty states.

---

## Article hero graphics

Same system, deliberately quieter than the page heroes — 1600×600, single idea,
no labels beyond two or three words. The article carries the argument; the
graphic sets the register.

| Article | Concept | Focal mass |
| --- | --- | --- |
| Reliability Budgets for Agentic AI | Chain of step-nodes, brightness decaying left to right as reliability compounds away | The first node, brightest, against the dimmest at the far right |
| Idempotency and Checkpointing | Execution path, break, checkpoint marker, resumed path | The checkpoint marker |
| Limiting Blast Radius | Agent node inside three nested hairline containment rings | The innermost ring, the tightest constraint |
| Architecture of Human Oversight | Autonomous loop with one supervisory path crossing a boundary | The boundary crossing |
| AI + Blockchain convergence | Agent → contract → distributed state → verified node | The verified terminal node |

The reliability-budget graphic is the one to build first. Decaying brightness
along a chain states the article's whole argument without a word of label, which
is the standard the others should be held to.

---

## Delivery

WebP quality 80, PNG fallback, `#05070f` ground (not transparent — the glow
compositing depends on it). Strokes 1–1.5px at 1×. Labels ≥14px effective.

Deliver to `site/assets/`. Upload through wp-admin Media, then reference as
`<img>` — that path is proven. Inline SVG is stripped and SVG upload is
rejected, so raster is the only route for these.

Set `loading="lazy"` on everything below the fold. Above-fold heroes load eagerly.
