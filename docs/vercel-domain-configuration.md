# Vercel custom-domain configuration

Recorded 2026-09-20. Vercel project configuration only. **No DNS record was
changed, no nameserver was touched, no email was configured, and no cutover was
initiated.**

## What was done

Two domains were added to the existing project `novra-intelligence-web`
(`prj_zqBKYpUd7lJquswPSsA8dVdqg7UM`):

| Domain | redirect | status code | verified |
| --- | --- | --- | --- |
| `novraintelligence.com` | none — canonical host | — | `true` |
| `www.novraintelligence.com` | → `novraintelligence.com` | `308` | `true` |

`verified: true` is **domain ownership** verification. It is not a statement
that DNS points at Vercel, and it is not a certificate. Those are separate and
both still pending, correctly, until DNS changes.

The apex carries the content; `www` is a redirect entry, so Vercel answers it
at the edge with a 308 to the apex. The application's own canonical tags,
sitemap, Open Graph URLs and structured data all already use
`https://novraintelligence.com` — verified by `npm run qa:seo`, which asserts
the canonical host on all 13 URLs — so nothing in the application needed to
change to make the apex canonical.

## BLOCKER: production is 13 commits behind

A custom domain on Vercel serves the project's **production** deployment. This
project has exactly one, and it is not the reviewed build:

    production deployment  dpl_6uxrCBQXGm8c4tUkvYQFGLGzJGbp
    commit                 492ab6e  (2026-09-03)
    reviewed head          d4d0ab2
    gap                    13 commits

Checked against that commit's tree, the production build does **not** contain:

| | |
| --- | --- |
| `frontend/app/capabilities/page.tsx` | ABSENT |
| `frontend/app/global-development/page.tsx` | ABSENT |
| `frontend/app/error.tsx` | ABSENT |
| `frontend/scripts/a11y-qa.mjs` | ABSENT |
| Content-Security-Policy in `next.config.mjs` | ABSENT |

**Cutting DNS over today would publish a build from 3 September with no
security headers, no institutional pages, no error boundaries, the external
Google Fonts request, the duplicate image fetches and the contrast failure.**

Every deployment made during this migration has been a *preview* build, because
they were pushed to `claude/optimistic-darwin-b249sn` while the project's
production branch is the repository default,
`claude/fredrick-mendez-reputation-ijjnbq`. Preview builds are what the review
URLs point at; none of them is what a custom domain would serve.

This must be resolved before cutover. It was not resolved here because creating
a production deployment is part of the cutover the owner has not authorised.

## Vercel's required DNS records

The project API does not expose the per-domain configuration endpoint through
this connector, so the values below come from **Vercel's current published
documentation**, retrieved 2026-09-20, not from memory:

| Source | Record |
| --- | --- |
| `vercel.com/docs/domains/set-up-custom-domain` | `A` `@` → `76.76.21.21` |
| `vercel.com/docs/domains/set-up-custom-domain` | `CNAME` `www` → `cname.vercel-dns-0.com` |
| `vercel.com/docs/domains/pre-generating-ssl-certs` | corroborates the apex address in its `--resolve example.com:443:76.76.21.21` example |

**One caveat, stated because it is a real inconsistency in Vercel's own docs.**
A second page, `docs/platforms/platform-elements/blocks/dns-table`, shows
`cname.vercel-dns.com` (without `-0`) in a generic UI-component example. The
setup guide is the instruction page and shows `cname.vercel-dns-0.com`. Vercel
also assigns per-account CNAME targets in some cases.

**Confirm both values against Project → Settings → Domains before editing
Cloudflare.** Now that the domains are added, that screen displays the exact
records for these two names, and if it disagrees with the table above, the
dashboard is right.

## Certificate state

`GET /certs` returns an empty list: no certificate exists for either name yet.
That is the expected state and not an error — Vercel issues on first successful
validation, which requires DNS to resolve to Vercel.

Vercel does support pre-issuing a certificate before cutover, via a DNS-01 TXT
challenge (`vercel certs issue "*.example.com" example.com --challenge-only`,
documented at `docs/domains/pre-generating-ssl-certs`). It was not used: it
needs the Vercel CLI with an account token, and it requires adding TXT records
to Cloudflare, which is a DNS change and outside the authorisation given.

The same documentation page gives a way to test the site over TLS *before*
moving DNS, once a certificate exists:

    curl https://novraintelligence.com --resolve novraintelligence.com:443:76.76.21.21 -I

## Cloudflare proxy state: keep DNS-only

**Recommendation: DNS-only (grey cloud) for the initial cutover.** The apex is
already DNS-only today, so this is also the no-change option.

A documentation search returned no Vercel page specifically about Cloudflare,
so the following is engineering reasoning, not a Vercel instruction:

- Proxying puts Cloudflare in front of the TLS handshake, so Vercel's own
  domain validation and certificate issuance are answered by Cloudflare rather
  than by Vercel. That is the common cause of certificates that stay pending.
- Proxying makes Cloudflare serve its own certificate to visitors, and the
  origin leg then depends on the zone's SSL mode. Anything other than Full
  (strict) against Vercel risks a redirect loop, because the application
  already sends `upgrade-insecure-requests` and Vercel redirects HTTP to HTTPS.
- The site is statically prerendered and served from Vercel's edge, so a second
  CDN in front of it adds a hop and a cache layer without adding much.

Proxying can be enabled later, deliberately, once the certificate is issued and
the site is confirmed healthy. It should not be switched on for convenience
during the cutover.
