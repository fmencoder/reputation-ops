# Data-broker worklist

**Every item is `HUMAN_VERIFICATION_REQUIRED`.** Not one can be completed from
this session, and the reason is uniform: every broker gates opt-out behind a
CAPTCHA, an email confirmation loop, or SMS/voice verification. Those are access
controls. Working around them is out of scope and would also invalidate the
opt-out.

This is still the highest-certainty work in the entire project. Everywhere else
you are asking a publisher for a favour. Here you are exercising a right the
broker has already published a process for, and the process works.

Budget roughly 45–60 minutes for the full pass.

---

## Verify before you submit — this matters

Searches for this subject returned **no** broker profile. That is expected:
brokers keep records behind on-site search forms that search engines do not
index. It does **not** mean no record exists.

It does mean **every listing must be confirmed as you before you submit against
it.** There are 400+ LinkedIn profiles under the "Frederick Mendez" spelling
alone, plus a FINRA BrokerCheck record never established as the same person.

Match on **at least two** of: age (45), Boca Raton FL, known relatives, prior
addresses you recognise. One weak signal — a name and a state — is not a match.

Submitting a removal against a stranger's record is both wrong and the fastest
way to have your legitimate requests treated as bad-faith noise.

---

## Worklist

| # | Broker | Opt-out URL | Verification | Fields required | Time |
| --- | --- | --- | --- | --- | --- |
| 1 | Spokeo | spokeo.com/optout | Email confirm | Listing URL, email | 24–72h |
| 2 | Whitepages | whitepages.com/suppression-requests | **Phone (call or SMS)** | Profile URL, phone | ~24h |
| 3 | BeenVerified | beenverified.com/app/optout/search | Email confirm | Name, state, select record, email | 24h |
| 4 | TruthFinder | truthfinder.com/opt-out | Email confirm | Listing, email | 48h |
| 5 | Instant Checkmate | instantcheckmate.com/opt-out | Email confirm | Listing, email | 48h |
| 6 | Intelius | intelius.com/opt-out | Email confirm | Listing, email | 72h |
| 7 | US Search | ussearch.com/opt-out | Email confirm | Listing, email | 72h |
| 8 | PeopleFinders | peoplefinders.com/opt-out | Email confirm | Listing URL, email | 24–48h |
| 9 | Radaris | radaris.com/control/privacy | Email + account | Profile URL, email | 48h |
| 10 | TruePeopleSearch | truepeoplesearch.com/removal | CAPTCHA + email | Record URL, email | ~24h |
| 11 | FastPeopleSearch | fastpeoplesearch.com/removal | CAPTCHA + email | Record URL, email | ~24h |
| 12 | Nuwber | nuwber.com/removal/link | Email confirm | Profile URL, email | 48h |
| 13 | That'sThem | thatsthem.com/optout | CAPTCHA | Record URL | ~24h |
| 14 | ClustrMaps | clustrmaps.com/bl/opt-out | Email confirm | Record URL, email | 48h |
| 15 | FamilyTreeNow | familytreenow.com/optout | CAPTCHA | Record URL | ~24h |
| 16 | PeopleLooker | peoplelooker.com/f/optout/search | Email confirm | Name, state, email | 24h |
| 17 | NeighborWho | neighborwho.com/optout | Email confirm | Record URL, email | 48h |

Verify each URL on arrival — brokers move these pages, sometimes deliberately.

---

## Order of work

1. **Whitepages first.** It needs phone verification, which is the slowest step,
   and several smaller brokers source from it.
2. **Spokeo, BeenVerified, Radaris** next — largest indexes, highest visibility.
3. **The CAPTCHA-only four** (TruePeopleSearch, FastPeopleSearch, That'sThem,
   FamilyTreeNow) are the fastest; no email round-trip.
4. Everything else in any order.

Use a dedicated email address for the confirmation loops rather than a primary
one — brokers retain whatever you hand them, which is a mild irony worth
sidestepping.

---

## Rights basis

Use whichever legitimate mechanism actually applies. Do **not** assert
California residency, or any other jurisdictional status, unless it is true —
a false residency claim is a false statement, it voids the request, and it is
trivially checkable against the very record you are trying to suppress.

Every broker above offers a self-service opt-out to any US resident regardless
of state. That process is sufficient on its own. No statutory claim is needed,
and none should be manufactured to add weight.

Where a broker separately offers "do not sell or share my personal
information", submit that too. It is a distinct control from record suppression
and suppressing one does not trigger the other.

---

## This is maintenance, not a task

Records typically reappear within **3–6 months**. Brokers re-ingest from public
records continuously, and a federal case is exactly the kind of record they
pull. One pass is not a fix.

Set a quarterly reminder. Re-running the list takes a fraction of the first pass
because the listing URLs are already known.

---

## Recording results

Log each outcome in `outreach/execution-queue.md` under T5 as:

    <broker> | <listing URL> | SUBMITTED <date> | CONFIRMED <date> | REAPPEARED <date>

`REMOVED` only after you have re-searched the broker and seen the record gone.
A confirmation email is the broker's claim, not verification.
