---
title: "Idempotency and Checkpointing for Long-Running Agents"
slug: idempotent-agents-checkpointing
meta_description: "Retry is the obvious fix when an agent dies mid-task. It is also the fastest way to send the same email twice. What has to be true before retry is safe."
primary_keyword: idempotent ai agents
cluster: reliability
schema: Article
status: superseded
superseded_by: recoverability-architecture
superseded_note: "Folded into content/011-recoverability-architecture.md, which keeps this material and adds durable execution, replay semantics, auditability and the financial-systems implications. Do not schedule both."
internal_links:
  - { to: "agentic-ai-reliability-budget", anchor: "budgeting reliability across an agentic system" }
---

# Idempotency and Checkpointing for Long-Running Agents

An agent thirty steps into a forty-step task hits a timeout. The obvious fix is
to retry. The obvious fix is also how you send the same invoice twice.

Retry is the correct instinct and it is not, by itself, a safety mechanism. What
makes it safe is a set of properties the system has to have *before* the failure
happens, and almost none of them can be added afterwards.

## Start by classifying the side effects

Every step an agent takes falls into one of four categories, and the category
determines what recovery is even possible.

**Pure.** Reading a file, computing a total, classifying a document. No external
state changes. Retry is free and unconditional. Most reasoning steps live here,
which is why the arithmetic of retrying reasoning is comfortable and the
arithmetic of retrying actions is not.

**Idempotent.** Setting a record's status to `approved`. Writing a specific value
to a specific key. Running it twice produces the same state as running it once.
Retry is safe, though not free — it still costs time and tokens.

**Compensatable.** Creating a draft, reserving inventory, opening a ticket. The
effect is real but there is a defined inverse: delete the draft, release the
reservation, close the ticket. Retry is safe only if you actually run the
compensation, which means you have to know the first attempt happened.

**Irreversible.** Sending an email. Executing a payment. Deleting a production
record. There is no inverse. A retry here is not recovery; it is a second,
independent event in the world.

Most teams discover this taxonomy the hard way, in production, because the agent
framework presents every step as a uniform "tool call" and uniformity is exactly
the wrong abstraction for something whose recovery semantics differ this much.

## Idempotency keys, and the part people get wrong

For anything in the second or third category, the standard mechanism is an
idempotency key: a caller-generated identifier the receiver uses to deduplicate.
Send the same key twice, get the first result back rather than a second effect.

The mechanism is well understood. The part that goes wrong in agent systems is
key *derivation*.

The key must be deterministic with respect to the intent and stable across
retries. Generate it with a random UUID at call time and every retry produces a
new key, which means it deduplicates nothing — you have added ceremony without
adding safety. Derive it from a hash of the request payload and you are safer,
until the payload contains a timestamp, or a model-generated field that differs
by a token between attempts, at which point you are back to a fresh key each
time.

The reliable derivation is from the task, not the request: something like
`{task_id}:{step_index}:{logical_operation}`. That identifier is the same on
every attempt because it describes *which step of which task this is*, which does
not change when the model rephrases itself. If you can only fix one thing from
this article, fix this — a system with idempotency keys that vary across retries
has all of the complexity and none of the protection, and it will look correct
right up until the first real failure.

## Checkpoint the intent before the effect

Here is the ordering problem. If you perform an action and then record that you
performed it, a crash in between leaves you with an effect nobody knows about. On
resume, the system sees no record and does it again.

The fix is the same one databases have used for decades: write ahead.

1. Record the *intent* — "about to run step 17 with key `task-4:17:send-invoice`"
2. Perform the effect
3. Record the *outcome*

Now a crash lands in one of two recoverable places. Between 1 and 2, you have an
intent with no outcome: on resume, you know a step *may* have run, and the
idempotency key makes re-running it safe. Between 2 and 3, the same state, and
the same resolution. In both cases the resumption logic is identical, which is
the point — you have collapsed two failure modes into one path that gets
exercised often enough to actually work.

The uncomfortable implication: "intent with no outcome" is genuinely ambiguous.
The system cannot distinguish *never ran* from *ran and we lost the
acknowledgement*. That ambiguity does not disappear; it gets **handled** — by
idempotency where the step allows it, by reconciliation against the external
system where it does not, and by a human where neither is possible. Any design
that claims to eliminate the ambiguity is hiding it.

## What belongs in a checkpoint

Two failure modes here, in opposite directions.

Checkpoint too little and resumption is a fiction: the agent restarts, lacks the
context that shaped steps 1 through 16, and makes a different decision at step 17
than it would have. The task technically continues and quietly becomes a
different task.

Checkpoint everything — the full conversation, every intermediate result — and
the state grows without bound, resumption gets slower than restarting, and you
have built an expensive way to store transcripts.

The useful line is between *derived* and *load-bearing* state. Load-bearing state
is anything a later step depends on: extracted values, decisions made, external
identifiers returned by prior calls. Derived state is anything reconstructible
from it. Checkpoint the first, recompute the second.

In practice this means the checkpoint looks less like a memory dump and more like
a structured record of what the task has established so far. Which is a
significantly more useful artifact anyway — it is the thing you read when you
want to know why the agent did what it did.

## Irreversible steps are a design problem, not a recovery problem

Nothing above helps with the fourth category. If a step sends money and the
acknowledgement is lost, no key and no checkpoint tells you whether the money
moved. You have to ask the external system, and if it cannot tell you either,
you have to ask a person.

This is why irreversibility belongs in the architecture rather than the error
handling. Three things follow.

Put irreversible steps last where the task allows it. A workflow that does all
its reversible work, checkpoints, and *then* performs the single irreversible
action has one ambiguous window instead of one per step.

Make the external system the source of truth for whether the effect happened,
and query it on resume rather than trusting local state. Local state is what you
just lost.

Where neither is possible, gate it. A confirmation step before an irreversible
action is not a failure of autonomy; it is the correct response to a step whose
failure mode cannot be resolved by machinery.

## The connection back to reliability

This is the practical answer to the compounding-reliability arithmetic: a system
that checkpoints, verifies, and resumes is not running one forty-step task with
forty chances to fail irrecoverably. It is running a sequence of short segments
with defined recovery between them, and the exponent that makes long chains
hopeless applies to the segments rather than the whole.

That reframing costs something real. It is more infrastructure than "call the
model in a loop," and it forces the side-effect classification above, which is
tedious and requires knowing what your tools actually do. The payoff is a system
whose failure modes you can enumerate — which is the difference between an agent
you can put in front of consequences and a demo.
