---
title: "Limiting Blast Radius in Autonomous Agent Architectures"
slug: agent-blast-radius
meta_description: "You cannot make every agent step reliable. You can decide, in advance, how much any single wrong step is allowed to cost."
primary_keyword: ai agent blast radius
cluster: reliability
schema: Article
status: backlog
backlog_note: "Not in the launch corpus. Overlaps the containment material now carried in human-oversight-architecture and recoverability-architecture; needs a distinct thesis before it is scheduled."
internal_links:
  - { to: "agentic-ai-reliability-budget", anchor: "budgeting reliability across an agentic system" }
  - { to: "recoverability-architecture", anchor: "idempotency and checkpointing" }
---

# Limiting Blast Radius in Autonomous Agent Architectures

There is a class of agent failure that no amount of reliability engineering
removes. The step cannot be verified more cheaply than it can be performed, it
has an irreversible effect, and it is going to be wrong some fraction of the
time. You have run out of ways to make it right.

What remains is a different question, and a more useful one: when it is wrong,
how much does it cost?

## Reliability and blast radius are different axes

Most agent discussions collapse these. They are orthogonal, and the design moves
they imply are unrelated.

**Reliability** is how often a step produces the correct result. You improve it
with better prompts, better models, retrieval, verification, retries.

**Blast radius** is how much damage one incorrect result can do. You improve it
by constraining what the step is permitted to touch.

A step can be highly reliable with an enormous blast radius — a 99.9% accurate
`DELETE` against production is still a system one bad call away from a very long
evening. A step can be unreliable with a trivial blast radius: a draft summary
that is wrong a third of the time costs a reader ten seconds.

The mistake is spending all your effort on the first axis. Reliability work has
diminishing returns and a hard ceiling. Blast radius has neither: you can
usually take an action from catastrophic to annoying with an afternoon of
plumbing, and no model improvement is required.

## Four containment mechanisms

**Scope.** What the agent can address at all. An agent with credentials for one
project's staging database cannot damage another project's production database,
regardless of what it decides to do. This is the crudest mechanism and the most
effective, because it fails closed: capability the agent does not hold cannot be
misused by a confused plan.

**Rate.** How much it can do per unit time. An agent permitted three refunds an
hour has a bounded worst case. The same agent with an unbounded loop does not.
Rate limits are the cheapest insurance in the entire stack and are routinely
omitted because in testing nothing ever loops.

**Magnitude.** How large a single action may be. Refunds under $100 auto-approve;
above that, a human sees it. This is where most of the practical value sits,
because consequence in real systems is usually continuous rather than binary, and
a threshold converts a scary capability into a mundane one.

**Reversibility.** Whether the effect can be undone. Prefer soft-delete over
delete, draft over publish, reserve over charge. Every action moved from
irreversible to reversible converts a correctness problem into an operational
one, and operational problems have a fix: notice and roll back.

## The containment table

Enumerate the agent's actions and give each one explicit limits. This is
tedious, which is why teams skip it, and it is also the artifact that makes the
system's worst case knowable rather than a matter of hope.

| Action | Reversible | Scope | Rate limit | Magnitude gate | Worst case |
| --- | --- | --- | --- | --- | --- |
| Read documents | n/a | Team workspace | 1000/hr | none | Wasted tokens |
| Draft reply | Yes | Draft folder | 100/hr | none | Bad draft, human discards |
| Update ticket status | Yes | Assigned tickets | 200/hr | none | Wrong status, revert |
| Send email | **No** | Verified contacts | 20/hr | none | Wrong email, cannot recall |
| Issue refund | Partly | Own orders | 10/hr | Human above $100 | Bounded at $1,000/hr |
| Delete record | Soft only | Non-prod | 50/hr | Human on bulk | Recoverable 30 days |

Two things fall out of writing this down that never fall out of discussing it.

First, the **worst case becomes a number.** "The refund agent can cost us at most
$1,000 an hour before a human is involved" is a sentence a business can actually
evaluate. "The agent might make mistakes" is not.

Second, the expensive rows become obvious. In the table above, send-email is the
only genuinely irreversible action, and it has no magnitude gate — which is
exactly where the next hour of work should go.

## Where the boundary belongs

The containment must live outside the agent. This is the part most
implementations get wrong.

An agent instructed "only refund up to $100" will mostly comply and will
occasionally not — because the instruction is text competing with other text, in
a system whose entire nature is to interpret. A refund API that rejects requests
over $100 from that credential complies always, including when the agent is
confused, when the prompt has been manipulated, and when a model upgrade changes
behaviour in ways nobody predicted.

The rule: **every limit that matters is enforced by something that cannot be
argued with.** Instructions are for guidance. Boundaries are for guarantees, and
guarantees live in the API, the credential scope, the rate limiter, and the
approval gate.

This also happens to be the only containment that survives prompt injection. If
a hostile document can convince the agent of anything, then everything relying
on the agent's judgment is void — and everything relying on what its credentials
permit is untouched.

## Approval gates, honestly

A human approval gate is the standard answer for high-magnitude actions, and it
works only if the human can actually exercise judgment. Three conditions, all
required:

**Context.** The reviewer sees what the agent saw, not just what it decided. An
approval screen showing "Refund $4,200 — approve?" produces rubber-stamping,
because there is nothing to reason about.

**Time.** A gate that fires forty times an hour is not a gate. Attention is
finite, and a queue that exceeds it converts every approval into a reflex. If
the volume is too high for genuine review, the threshold is wrong — raise it
until the queue is small enough to think about.

**Standing to say no.** If declining is treated as obstruction, or the reviewer
has no authority to override, the gate is theatre. This is an organisational
property, not a technical one, and it is the one most often missing.

A gate failing any of these is worse than none, because it manufactures a record
of human oversight without the substance — and that record is what everyone
relies on afterwards.

## What this changes

Start with the containment table, before the prompts. It takes an afternoon and
it tells you which steps deserve reliability investment: precisely the ones whose
blast radius you cannot reduce.

Push limits into infrastructure. If a constraint exists only in a system prompt,
assume it will be violated eventually and design for that.

Prefer reversible primitives everywhere they exist, even at some cost in
elegance. Soft-delete, draft-then-publish and reserve-then-commit are unglamorous
and they convert the failures you cannot prevent into failures you can absorb.

And treat the worst case as a specification. A system whose maximum damage per
hour is known, bounded and written down is one you can responsibly point at real
consequences. A system whose worst case is unbounded is a demo, however
impressive its success rate — because the number that matters is not how often it
works, but what happens the time it does not.
