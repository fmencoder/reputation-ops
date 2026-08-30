# Privacy and data-broker playbook

This is the cluster where the subject has an actual entitlement rather than a
request, which makes it the highest-certainty work in the whole project. It is
also the one most people skip.

Verified 2026-08-30.

## PII audit of the known negative surfaces

Inspected via search evidence only; direct page fetch was blocked.

| Data type | Found? | Notes |
| --- | --- | --- |
| Phone number | NO | None in any surface |
| Personal email | NO | None |
| Home/residential address | NO | City only ("Boca Raton"), which does not qualify |
| Financial identifiers | NO | Restitution amount is a court figure, not an account identifier |
| Government IDs | NO | None |
| Signatures | NO | None |
| Login credentials | NO | None |
| Medical/private records | NO | None |
| Doxxing combination | NO | Name + age + city is not a qualifying combination |
| Photograph of subject | NO | No images found on any negative surface |

**Result: no qualifying PII on C1–C4.** There is therefore no privacy-based
removal path against DOJ, Bloomberg Law, Hoodline, or MoreLaw, and none has been
manufactured. This is a genuine finding, not a concession.

## Data brokers — actionable now

No broker profile for this specific subject was confirmed (searches surfaced
same-name and similar-name records only). Opt-out is still worth doing
prophylactically: brokers aggregate from public records continuously, and a
federal case is exactly the kind of record they ingest.

Unlike everything else in this project, these do not require anyone's permission.

| Broker | Route | Notes |
| --- | --- | --- |
| Spokeo | spokeo.com/optout | Paste listing URL, confirm by email. 24–72h. |
| Whitepages | whitepages.com/suppression-requests | Requires phone verification. |
| BeenVerified | beenverified.com/app/optout/search | Search, select record, confirm by email. |
| Radaris | radaris.com/control-privacy | Repeat per listing. |
| TruePeopleSearch | Find listing, request removal | |

**Each broker is independent.** Removing from one does nothing to the others.
And records typically reappear within 3–6 months, so this is recurring
maintenance, not a one-time task — set a quarterly reminder.

## What blocks automation here

Every one of these requires either a CAPTCHA, an email confirmation loop, or
phone verification. Those are access controls, and §10 puts bypassing them out of
scope. They are also each about two minutes of manual work.

This is the highest-value hour available in the entire project and it has to be
spent by a human. Do these before anything else on the removal side.

## Identity confusion — a real and useful angle

Search results surface a large number of unrelated people named Frederick or
Fredrick Mendez, including 400+ LinkedIn profiles under the "Frederick Mendez"
spelling alone, plus a FINRA BrokerCheck record whose subject was **not**
established as the same individual.

Two consequences:

1. **Verify before acting.** Any broker profile or third-party record must be
   confirmed as this individual before a removal request is filed against it.
   Filing against a same-name stranger's record is both wrong and the kind of
   error that discredits every other request.

2. **Ambient dilution already exists.** A common name is a genuine asset here.
   The name is not a unique identifier, which measurably weakens any single
   result's association with this individual — and it does so without anyone
   doing anything.

## Not done, and why

**Copyright.** No path found. Nothing on C1–C4 reproduces material the subject
owns — no photograph of his, no text of his authorship. §10 and the standing
instruction both prohibit claiming copyright over third-party reporting, so
there is nothing to file. If he holds the copyright to a photograph that a site
has reproduced without licence, that changes and a real notice becomes possible;
supply it if so.

**Impersonation reporting.** No false profile found. The LinkedIn profile
discovered during the sweep appears to be the subject's own, which makes it an
owned asset rather than an impersonation report.
