---
title: "From AI Prototype to Production System: The Architecture of Recoverability"
slug: recoverability-architecture
meta_description: "A production AI system is not one that avoids failure. It is one whose failures are bounded, observable and recoverable. What that requires, concretely, at the architecture level."
seo_title: "The Architecture of Recoverability in Production AI Systems"
excerpt: "Prototypes are judged on whether they succeed. Production systems are judged on what happens when they do not. Recoverability — idempotency, durable event history, replay, compensation — is the property that separates the two, and it cannot be added afterwards."
primary_keyword: production ai systems
primary_topic: AI systems architecture
secondary_topics: [durable execution, idempotency, event sourcing, auditability, financial automation]
cluster: reliability
schema: Article
hero: /assets/recoverability-hero.webp
hero_width: 1000
hero_height: 563
hero_alt: "A horizontal chain of execution steps with an append-only event log running beneath it. A break in the chain mid-way is met by an arrow that re-enters from the log rather than from the start, showing resumption from recorded history rather than re-execution."
hero_caption: "Recovery reads forward from a durable history. The steps above are replaceable; the record beneath them is the system."
status: draft
supersedes: content/003-idempotency-checkpointing-agents.md
internal_links:
  - { to: "agentic-ai-reliability-budget", anchor: "the compounding arithmetic of multi-step tasks" }
  - { to: "human-oversight-architecture", anchor: "a stop that leaves a known state" }
  - { to: "context-engineering-production-ai", anchor: "the assembled context that produced a decision" }
sources:
  - https://temporal.io/blog/durable-execution-meets-ai-why-temporal-is-the-perfect-foundation-for-ai
  - https://airc.nist.gov/airmf-resources/airmf/5-sec-core/
  - https://arxiv.org/pdf/2602.14849
verified_on: 2026-09-01
---

# From AI Prototype to Production System: The Architecture of Recoverability

An agent thirty steps into a forty-step task hits a timeout. The obvious fix is
to retry. The obvious fix is also how you send the same invoice twice.

That gap — between a system that usually works and a system that can be operated —
is the whole distance between a prototype and a production deployment, and it is
not crossed by improving the model. It is crossed by making failure *bounded*
(the damage has a known ceiling), *observable* (you can determine what happened),
and *recoverable* (there is a defined path back to a correct state). None of the
three can be retrofitted cheaply, because each constrains how the system is
structured rather than what it does.

This matters more for agents than for conventional software for a specific
reason. Deterministic services fail in ways their authors enumerated. An agent
composes its own execution path at runtime, so the set of possible failures is
not fully known in advance — which means recovery cannot be a list of handled
cases. It has to be a property of the architecture.

## Classify side effects before anything else

Every step an agent takes falls into one of four categories, and the category
determines what recovery is even possible.

**Pure.** Reading a file, computing a total, classifying a document. No external
state changes. Retry is free and unconditional. Most reasoning lives here, which
is why the arithmetic of retrying reasoning is comfortable and the arithmetic of
retrying actions is not.

**Idempotent.** Setting a record's status to `approved`; writing a specific value
to a specific key. Running it twice produces the same state as running it once.
Retry is safe, though it still costs time and tokens.

**Compensatable.** Creating a draft, reserving inventory, opening a ticket. The
effect is real but a defined inverse exists. Retry is safe only if the
compensation actually runs — which requires knowing the first attempt happened.

**Irreversible.** Sending an email, executing a payment, deleting a production
record. There is no inverse. A retry here is not recovery; it is a second,
independent event in the world.

Most teams discover this taxonomy in production, because agent frameworks present
every step as a uniform "tool call" — and uniformity is precisely the wrong
abstraction for operations whose recovery semantics differ this much. The first
concrete deliverable of a production hardening effort is a table mapping every
tool the agent can reach to one of these four categories. It is tedious, it
requires knowing what your tools actually do, and it is the artifact everything
else depends on.

## Idempotency keys, and the part that goes wrong

For the second and third categories the standard mechanism is an idempotency key:
a caller-generated identifier the receiver uses to deduplicate. The mechanism is
well understood. What breaks in agent systems is key *derivation*.

The key must be deterministic with respect to intent and stable across retries.
Generate it from a random UUID at call time and every retry produces a new key,
so it deduplicates nothing — ceremony without protection. Derive it from a hash of
the request payload and you are safer, until the payload contains a timestamp or
a model-generated field that differs by a token between attempts, at which point
you are back to a fresh key each time.

The reliable derivation is from the task, not the request:
`{task_id}:{step_index}:{logical_operation}`. That identifier is stable across
attempts because it describes *which step of which task this is*, which does not
change when the model rephrases itself. A system with keys that vary across
retries has all of the complexity and none of the protection, and it looks
correct right up until the first real failure.

## Write the intent before the effect

If you perform an action and then record it, a crash in between leaves an effect
nobody knows about. On resume the system sees no record and does it again.

The fix is the one databases have used for decades — write ahead:

1. Record the *intent*: "about to run step 17 with key `task-4:17:send-invoice`"
2. Perform the effect
3. Record the *outcome*

A crash now lands in one of two recoverable places, and both resolve through the
same path: an intent with no outcome means the step *may* have run, and the
idempotency key makes re-running it safe. Collapsing two failure modes into one
resumption path matters more than it sounds, because it is the path that gets
exercised often enough to actually work.

The uncomfortable implication is that "intent with no outcome" is genuinely
ambiguous. The system cannot distinguish *never ran* from *ran and we lost the
acknowledgement*. That ambiguity does not disappear; it gets handled — by
idempotency where the step allows it, by reconciliation against the external
system where it does not, and by a human where neither is possible. Any design
claiming to eliminate it is hiding it.

## Replay is not re-execution — and for agents that distinction is decisive

Durable execution engines take the write-ahead idea to its conclusion. Rather
than persisting current state, they record an append-only history of events —
every activity invocation, timer and signal — and reconstruct a crashed workflow
by replaying that history deterministically. Temporal is the widely used
implementation of this model; the requirement it imposes is that workflow code
must be deterministic, so that replaying the same history yields the same
execution.

An LLM call is not deterministic. This is where teams get the architecture wrong,
and the correction is precise:

> **The model call must be recorded as an activity whose result is a fact in the
> history — never as logic re-evaluated during replay.**

Put the model inside deterministic workflow code and every recovery re-samples
the model, producing a different plan than the one the system already acted on.
The result is worse than a crash: a system that resumes into a *different task*
while believing it continued the original one. Record the model's output as an
event and replay reads it back as history, so the recovered execution is the one
that actually happened.

This yields a clean architectural rule. Deterministic orchestration code holds
the control flow; every non-deterministic thing — model calls, tool invocations,
clock reads, randomness — is an activity with a recorded result. It is also the
answer to the perennial objection that durable execution and dynamic agents are
incompatible. They are not. What is incompatible is putting non-determinism in
the layer whose entire contract is determinism.

## What belongs in the record

Two failure modes, in opposite directions.

Record too little and resumption is a fiction: the agent restarts, lacks the
context that shaped steps 1 through 16, and makes a different decision at step 17
than it would have. The task technically continues and quietly becomes a
different task.

Record everything — every full conversation, every intermediate result — and state
grows without bound, resumption becomes slower than restarting, and you have
built an expensive way to store transcripts.

The useful line is between *derived* and *load-bearing* state. Load-bearing state
is anything a later step depends on: extracted values, decisions made, external
identifiers returned by prior calls, and
[the assembled context that produced a decision](/context-engineering-production-ai/).
Derived state is anything reconstructible from it. Record the first, recompute the
second.

## The audit trail and the recovery log are the same artifact

This is the part with the strongest organisational consequence, and it is usually
missed because the two requirements arrive from different departments.

The append-only history that makes recovery possible — every input, decision,
action and result, in order, with the model outputs that produced them — is also
precisely the evidence an auditor, a regulator or an incident review needs. Built
once, it satisfies both. Built separately, you get a recovery mechanism engineers
trust and an audit log nobody does, because the second is assembled after the
fact from whatever happened to be logged.

The traceability expectations in frameworks such as the NIST AI Risk Management
Framework are, at an engineering level, requests for exactly this record. Teams
that treat compliance logging as a tax build it twice and get the worse version
of both. Teams that recognise the artifact is shared build it once, for
operational reasons they already believe in, and find the governance requirement
mostly satisfied as a side effect.

It is also the precondition for stopping safely. A kill switch that halts an agent
between its action and its record of that action produces an unknown state; the
same durable history is what makes
[a stop that leaves a known state](/human-oversight-architecture/) possible.

## Irreversibility is a design problem, not an error-handling problem

Nothing above helps with the fourth category. If a step moves money and the
acknowledgement is lost, no key and no log tells you whether the money moved. You
have to ask the external system — and if it cannot tell you either, you have to
ask a person.

Three consequences follow, and they are architectural.

**Order for a single ambiguous window.** A workflow that performs all reversible
work, records, and *then* executes the single irreversible action has one
ambiguous window instead of one per step.

**Make the external system the source of truth on resume.** Query whether the
effect happened rather than trusting local state. Local state is what you just
lost.

**Where neither is possible, gate it.** A confirmation before an irreversible
action is not a failure of autonomy; it is the correct response to a step whose
failure mode cannot be resolved by machinery.

In financial contexts these stop being engineering preferences. Reconciliation
against the ledger of record, exactly-once settlement semantics, and a
reconstructable decision history are the ordinary expectations of the domain, and
an agent that cannot meet them is not deployable there regardless of how well it
reasons.

## What this changes

The reframing is the practical answer to
[the compounding arithmetic of multi-step tasks](/2026/08/31/agentic-ai-reliability-budget/).
A system that records, verifies and resumes is not running one forty-step task
with forty chances to fail irrecoverably. It is running a sequence of short
segments with defined recovery between them, and the exponent that makes long
chains hopeless applies to the segments rather than to the whole trajectory.

That reframing costs something real: it is materially more infrastructure than
calling the model in a loop, and it forces the side-effect classification that
most teams would rather skip. What it buys is the ability to enumerate your
failure modes — which is the difference between a system you can put in front of
consequences and a demonstration.

The strategic version, for anyone deciding where to spend: model capability
determines how often the system is right, and recoverability determines what it
costs when it is wrong. Only the second is under your control, and only the second
compounds into an operational asset. A production AI programme that has not
answered "how do we find out what happened, and how do we get back to a correct
state" has not begun the production work, however well the prototype demonstrates.

## Sources

- Temporal, *Durable Execution meets AI* — https://temporal.io/blog/durable-execution-meets-ai-why-temporal-is-the-perfect-foundation-for-ai
- NIST, *AI Risk Management Framework (AI 100-1), Core* — https://airc.nist.gov/airmf-resources/airmf/5-sec-core/
- *Atomix: Timely, Transactional Tool Use for Reliable Agentic Workflows* — https://arxiv.org/pdf/2602.14849
