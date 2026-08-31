# Live execution queue

Updated 2026-08-31. Status values per spec.

**Transport reality: this session has no send capability.** There is no email
tool, no form-submission tool, and general web egress is blocked. Every item
below is therefore `READY`, never `SUBMITTED`. Marking anything `SUBMITTED`
would be a false entry in the very record the campaign depends on.

Everything here is prepared to the point where sending is copy, paste, send.

---

## T1 — MoreLaw (P0)

    TARGET                      MoreLaw case + index entries
    DOMAIN                      morelaw.com
    URL                         UNVERIFIED — see blocker below
    OWNER/PUBLISHER             MoreLaw; Kent Morlan, Esq., Editor & Publisher
    CONTACT_ROUTE               verdicts@morelaw.com, info@morelaw.com
    CONTENT_TYPE               Case-summary aggregation + practice-area indexes
    CURRENT_INDEX_STATUS        Indexed (category pages surfaced in search)
    FACTUAL_ERROR               ASSERTED BY SUBJECT, NOT INDEPENDENTLY VERIFIED
    DUPLICATE_STATUS            Multiple category/index surfaces
    SOURCE_REMOVAL_PATH         Discretionary — moderate
    CORRECTION_PATH             Primary route, pending predicate verification
    ANONYMIZATION_PATH          Fallback B
    HEADLINE_REMOVAL_PATH       Fallback C
    URL_SLUG_REMOVAL_PATH       Unknown — needs page inspection
    CATEGORY_INDEX_REMOVAL_PATH Strongest realistic ask
    NOINDEX_PATH                Fallback F
    CANONICALIZATION_PATH       Fallback C
    PRIVACY_PATH                None — no qualifying PII found
    SEARCH_ENGINE_PATH          AFTER_SOURCE_CHANGE only
    PRIORITY                    P0
    STATUS                      READY (letter drafted, predicate slots empty)
    NEXT_ACTION                 Subject fills exact URL + verbatim quote, then sends
    FOLLOW_UP_DATE              +10 days from send

**Prior-send check:** no MoreLaw request has been sent at any point in this
project. Nothing is pending; this is not a duplicate.

**Blocker on the factual predicate.** Three search sweeps have failed to surface
either a dedicated MoreLaw case page for this subject or any "found guilty"
wording. Only Colorado practice-area index pages appear. Direct page fetch is
impossible — general web egress is blocked in this environment.

I cannot confirm the wording, so I have not written it into the letter as an
assertion of mine. The letter instead has two required slots the sender fills
from the page in front of him: the exact URL and the verbatim quoted sentence.
The letter cannot go out containing a claim nobody has checked.

---

## T2 — Hoodline (P0)

    TARGET                      January 2025 article
    DOMAIN                      hoodline.com
    URL                         hoodline.com/2025/01/boca-raton-man-sentenced-to-over-3-years-for-fraudulently-obtaining-covid-19-relief-funds/
    OWNER/PUBLISHER             Hoodline
    CONTACT_ROUTE               Site contact form / editorial address — verify current
    CONTENT_TYPE                Local-news summary derived from a DOJ release
    CURRENT_INDEX_STATUS        Indexed, ranks for the exact name
    FACTUAL_ERROR               NONE FOUND
    DUPLICATE_STATUS            Category/tag surfaces unverified
    SOURCE_REMOVAL_PATH         Discretionary — best realistic odds of the three
    CORRECTION_PATH             None — nothing inaccurate to correct
    ANONYMIZATION_PATH          Primary ask after deletion
    HEADLINE_REMOVAL_PATH       Name is not in the headline; slug is generic
    URL_SLUG_REMOVAL_PATH       N/A — slug carries no personal name
    CATEGORY_INDEX_REMOVAL_PATH Requested
    NOINDEX_PATH                Requested
    CANONICALIZATION_PATH       N/A
    PRIVACY_PATH                None — no qualifying PII
    SEARCH_ENGINE_PATH          AFTER_SOURCE_CHANGE only
    PRIORITY                    P0
    STATUS                      READY
    NEXT_ACTION                 Send; escalate to editorial leadership if declined at tier 1
    FOLLOW_UP_DATE              +10 days, one follow-up only

Worth noting: the headline says "Boca Raton Man", not the subject's name, and
the slug carries no name either. Items 3, 4 and 6 of the requested ladder are
therefore already satisfied — the remaining exposure is body text and indexing.

---

## T3 — Bloomberg Law (P1)

    TARGET                      "Florida Man Sentenced to Prison for Stealing Covid Relief Funds"
    DOMAIN                      news.bloomberglaw.com
    URL                         /us-law-week/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds
                                /white-collar-and-criminal-law/florida-man-sentenced-to-prison-for-stealing-covid-relief-funds
    OWNER/PUBLISHER             Bloomberg Industry Group
    CONTACT_ROUTE               Editorial contact — verify current
    CONTENT_TYPE                Trade-press brief, publication of record
    CURRENT_INDEX_STATUS        Indexed on both paths
    FACTUAL_ERROR               NONE — states "pleading guilty", which is correct
    DUPLICATE_STATUS            CONFIRMED — one article, two URL paths
    SOURCE_REMOVAL_PATH         Discretionary — low odds, publication of record
    CORRECTION_PATH             NONE. Do not allege inaccuracy here.
    ANONYMIZATION_PATH          Low
    HEADLINE_REMOVAL_PATH       Name not in headline
    URL_SLUG_REMOVAL_PATH       N/A
    CATEGORY_INDEX_REMOVAL_PATH Requested
    NOINDEX_PATH                Requested, low odds
    CANONICALIZATION_PATH       STRONGEST ASK — ordinary housekeeping, two paths to one
    PRIVACY_PATH                None
    SEARCH_ENGINE_PATH          AFTER_SOURCE_CHANGE only
    PRIORITY                    P1
    STATUS                      READY
    NEXT_ACTION                 Send, led by the canonicalisation ask
    FOLLOW_UP_DATE              +10 days, one follow-up only

---

## T4 — DOJ (suppress and monitor)

    TARGET                      justice.gov/usao-co/pr/florida-man-sentenced-41-months-stealing-covid-19-relief-funds
    OWNER/PUBLISHER             U.S. Attorney's Office, District of Colorado
    FACTUAL_ERROR               NONE FOUND
    PRIVACY_PATH                None — name, age, city only
    ALL REMOVAL PATHS           NO — government public record
    SEARCH_ENGINE_PATH          NO
    PRIORITY                    P3
    STATUS                      SUPPRESS_AND_MONITOR
    NEXT_ACTION                 None. Reopens only on a genuine factual or legal basis.

---

## T5 — Data brokers (P0)

See `outreach/broker-worklist.md`. All seventeen are
`HUMAN_VERIFICATION_REQUIRED`; none can be completed from this session.

---

## Syndication sweep result

Swept 2026-08-31 across the seven required query forms plus figure-based
variants ("41 months", "1,589,565").

**No syndicated copies, scraped copies, RSS mirrors, translated versions, print
versions or AMP variants were found.** The footprint has not spread beyond the
four known surfaces. Bloomberg's two URL paths remain the only confirmed
duplicate.

This is a real finding and it changes priorities: there is no long tail to chase.
The whole private-publisher surface is three targets.

No broker profile for this subject is discoverable through search either —
brokers gate their records behind on-site search forms that search engines do
not index. Verification has to happen on each broker site by hand.

---

## Search-engine actions

    GOOGLE_OUTDATED_CONTENT_REFRESH   NOT ELIGIBLE — no source has changed
    GOOGLE_POLICY_REMOVAL             NOT ELIGIBLE — newsworthiness carve-out
    GOOGLE_LEGAL_REMOVAL              NO BASIS
    BING_CONTENT_REMOVAL              NOT ELIGIBLE
    BING_OUTDATED_CACHE               NOT ELIGIBLE — no source has changed

Every one of these arms the moment a publisher actually changes something. The
monitor built in `bf21afc` detects the trigger (`dropped_out`, rank and title
deltas). Submitting any of them now would be a false submission.
